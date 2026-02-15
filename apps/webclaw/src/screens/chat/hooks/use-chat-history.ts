import { useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'

import { chatQueryKeys, fetchHistory } from '../chat-queries'
import { getMessageTimestamp, textFromMessage } from '../utils'
import type { QueryClient } from '@tanstack/react-query'
import type { GatewayMessage, HistoryResponse } from '../types'

type UseChatHistoryInput = {
  activeFriendlyId: string
  activeSessionKey: string
  forcedSessionKey?: string
  isNewChat: boolean
  isRedirecting: boolean
  activeExists: boolean
  sessionsReady: boolean
  queryClient: QueryClient
}

export function useChatHistory({
  activeFriendlyId,
  activeSessionKey,
  forcedSessionKey,
  isNewChat,
  isRedirecting,
  activeExists,
  sessionsReady,
  queryClient,
}: UseChatHistoryInput) {
  const sessionKeyForHistory = forcedSessionKey || activeSessionKey || ''
  const historyKey = chatQueryKeys.history(
    activeFriendlyId,
    sessionKeyForHistory,
  )
  const historyQuery = useQuery({
    queryKey: historyKey,
    queryFn: async function fetchHistoryForSession() {
      const cached = queryClient.getQueryData<HistoryResponse>(historyKey)
      const cachedMessages = Array.isArray(cached?.messages)
        ? cached.messages
        : []
      const optimisticMessages = cachedMessages.filter((message) => {
        if (message.status === 'sending') return true
        if (message.__optimisticId) return true
        return Boolean(message.clientId)
      })
      const streamingMessages = cachedMessages.filter((message) => {
        const runId = (message as { __streamRunId?: unknown }).__streamRunId
        return typeof runId === 'string' && runId.trim().length > 0
      })

      const serverData = await fetchHistory({
        sessionKey: sessionKeyForHistory,
        friendlyId: activeFriendlyId,
      })
      if (!optimisticMessages.length && !streamingMessages.length) {
        return serverData
      }

      const mergedWithOptimistic = mergeOptimisticHistoryMessages(
        serverData.messages,
        optimisticMessages,
      )
      const merged = mergeStreamingHistoryMessages(
        mergedWithOptimistic,
        streamingMessages,
      )

      return {
        ...serverData,
        messages: merged,
      }
    },
    enabled:
      !isNewChat &&
      Boolean(activeFriendlyId) &&
      !isRedirecting &&
      (!sessionsReady || activeExists),
    retry: false,
    placeholderData: function useCachedHistory(): HistoryResponse | undefined {
      return queryClient.getQueryData(historyKey)
    },
    gcTime: 1000 * 60 * 10,
  })

  const stableHistorySignatureRef = useRef('')
  const stableHistoryMessagesRef = useRef<Array<GatewayMessage>>([])
  const historyMessages = useMemo(() => {
    const messages = Array.isArray(historyQuery.data?.messages)
      ? historyQuery.data.messages
      : []
    const last = messages.at(-1)
    const lastId = typeof last?.id === 'string' ? last.id : ''
    const lastRole = typeof last?.role === 'string' ? last.role : ''
    const lastText = last ? textFromMessage(last) : ''
    const lastContentSignature = last ? contentSignatureFromMessage(last) : ''
    const signature = `${messages.length}:${lastRole}:${lastId}:${lastText.slice(-32)}:${lastContentSignature}`
    if (signature === stableHistorySignatureRef.current) {
      return stableHistoryMessagesRef.current
    }
    stableHistorySignatureRef.current = signature
    stableHistoryMessagesRef.current = messages
    return messages
  }, [historyQuery.data?.messages])

  const historyError =
    historyQuery.error instanceof Error ? historyQuery.error.message : null
  const resolvedSessionKey = useMemo(() => {
    if (forcedSessionKey) return forcedSessionKey
    const key = historyQuery.data?.sessionKey
    if (typeof key === 'string' && key.trim().length > 0) return key.trim()
    return activeSessionKey
  }, [activeSessionKey, forcedSessionKey, historyQuery.data?.sessionKey])
  const activeCanonicalKey = isNewChat
    ? 'new'
    : resolvedSessionKey || activeFriendlyId

  return {
    historyQuery,
    historyMessages,
    displayMessages: historyMessages,
    historyError,
    resolvedSessionKey,
    activeCanonicalKey,
    sessionKeyForHistory,
  }
}

function contentSignatureFromMessage(message: GatewayMessage): string {
  const content = Array.isArray(message.content) ? message.content : []
  return content
    .map((part) => {
      if (part.type === 'text') {
        return `text:${String(part.text ?? '').length}`
      }
      if (part.type === 'thinking') {
        return `thinking:${String(part.thinking ?? '').length}`
      }
      const id = 'id' in part ? String(part.id ?? '') : ''
      const name = 'name' in part ? String(part.name ?? '') : ''
      const partialJson = 'partialJson' in part ? String(part.partialJson ?? '') : ''
      return `toolCall:${id}:${name}:${partialJson.length}`
    })
    .join('|')
}

function mergeStreamingHistoryMessages(
  serverMessages: Array<GatewayMessage>,
  streamingMessages: Array<GatewayMessage>,
): Array<GatewayMessage> {
  if (!streamingMessages.length) return serverMessages

  const merged = [...serverMessages]
  for (const streamingMessage of streamingMessages) {
    const runId = (streamingMessage as { __streamRunId?: unknown }).__streamRunId
    if (typeof runId !== 'string' || runId.trim().length === 0) continue

    const hasMatch = merged.some((serverMessage) => {
      const serverRunId = (serverMessage as { __streamRunId?: unknown })
        .__streamRunId

      if (serverMessage.role !== streamingMessage.role) return false
      const streamingTime = getMessageTimestamp(streamingMessage)
      const serverTime = getMessageTimestamp(serverMessage)
      if (Math.abs(streamingTime - serverTime) > 15000) return false

      if (
        typeof serverRunId === 'string' &&
        serverRunId.trim().length > 0 &&
        serverRunId === runId
      ) {
        return messageCoversStreamingMessage(serverMessage, streamingMessage)
      }

      const streamingText = textFromMessage(streamingMessage)
      const serverText = textFromMessage(serverMessage)
      if (streamingText && streamingText !== serverText) {
        const normalizedStreamingText = normalizeAssistantTextForDedup(streamingText)
        const normalizedServerText = normalizeAssistantTextForDedup(serverText)
        const textLikelySameResponse =
          normalizedStreamingText.length > 0 &&
          normalizedServerText.length > 0 &&
          (normalizedStreamingText === normalizedServerText ||
            normalizedStreamingText.includes(normalizedServerText) ||
            normalizedServerText.includes(normalizedStreamingText))

        if (!textLikelySameResponse && !serverText.startsWith(streamingText)) {
          return false
        }
      }

      return messageCoversStreamingMessage(serverMessage, streamingMessage)
    })

    if (!hasMatch) {
      merged.push(streamingMessage)
    }
  }

  return merged
}

function messageCoversStreamingMessage(
  serverMessage: GatewayMessage,
  streamingMessage: GatewayMessage,
): boolean {
  const serverSignatures = nonTextPartSignatures(serverMessage)
  const streamingSignatures = nonTextPartSignatures(streamingMessage)
  if (streamingSignatures.size === 0) return true

  for (const signature of streamingSignatures) {
    if (!serverSignatures.has(signature)) {
      return false
    }
  }

  return true
}

function nonTextPartSignatures(message: GatewayMessage): Set<string> {
  const signatures = new Set<string>()
  const parts = Array.isArray(message.content) ? message.content : []
  for (const part of parts) {
    if (part.type === 'text') continue
    try {
      signatures.add(`${part.type}:${JSON.stringify(part)}`)
    } catch {
      signatures.add(`${part.type}:unserializable`)
    }
  }
  return signatures
}

function normalizeAssistantTextForDedup(text: string): string {
  return text
    .replace(/\[\[reply_to:[^\]]*\]\]\s*/gi, '')
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function mergeOptimisticHistoryMessages(
  serverMessages: Array<GatewayMessage>,
  optimisticMessages: Array<GatewayMessage>,
): Array<GatewayMessage> {
  if (!optimisticMessages.length) return serverMessages

  const merged = [...serverMessages]
  for (const optimisticMessage of optimisticMessages) {
    const hasMatch = merged.some((serverMessage) => {
      if (
        optimisticMessage.clientId &&
        serverMessage.clientId &&
        optimisticMessage.clientId === serverMessage.clientId
      ) {
        return true
      }
      if (
        optimisticMessage.__optimisticId &&
        serverMessage.__optimisticId &&
        optimisticMessage.__optimisticId === serverMessage.__optimisticId
      ) {
        return true
      }
      if (optimisticMessage.role && serverMessage.role) {
        if (optimisticMessage.role !== serverMessage.role) return false
      }
      const optimisticText = textFromMessage(optimisticMessage)
      if (!optimisticText) return false
      if (optimisticText !== textFromMessage(serverMessage)) return false
      const optimisticTime = getMessageTimestamp(optimisticMessage)
      const serverTime = getMessageTimestamp(serverMessage)
      return Math.abs(optimisticTime - serverTime) <= 10000
    })

    if (!hasMatch) {
      merged.push(optimisticMessage)
    }
  }

  return merged
}
