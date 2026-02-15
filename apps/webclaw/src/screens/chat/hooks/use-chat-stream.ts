import { useCallback, useEffect, useRef } from 'react'

import { getMessageTimestamp, textFromMessage } from '../utils'
import {
  chatQueryKeys,
  updateHistoryMessages,
  updateSessionLastMessage,
} from '../chat-queries'
import type { QueryClient } from '@tanstack/react-query'
import type { GatewayMessage, MessageContent } from '../types'

type UseChatStreamInput = {
  activeFriendlyId: string
  isNewChat: boolean
  isRedirecting: boolean
  resolvedSessionKey: string
  sessionKeyForHistory: string
  queryClient: QueryClient
  refreshHistory: () => void
  onChatEvent?: (payload: {
    runId?: string
    sessionKey?: string
    state?: string
    message?: GatewayMessage
  }) => void
}

type StreamChatPayload = {
  runId?: string
  sessionKey?: string
  state?: string
  message?: GatewayMessage
  seq?: number
}

export function useChatStream({
  activeFriendlyId,
  isNewChat,
  isRedirecting,
  resolvedSessionKey,
  sessionKeyForHistory,
  queryClient,
  refreshHistory,
  onChatEvent,
}: UseChatStreamInput) {
  const streamSourceRef = useRef<EventSource | null>(null)
  const streamReconnectTimer = useRef<number | null>(null)
  const streamReconnectAttempt = useRef(0)
  const streamRunSeqRef = useRef(new Map<string, number>())
  const streamRunStateVersionRef = useRef(new Map<string, number>())
  const streamRunSourceRef = useRef(new Map<string, 'agent' | 'chat'>())
  const streamSeenEventKeysRef = useRef(new Set<string>())
  const streamSeenPayloadKeysRef = useRef(new Set<string>())
  const refreshHistoryRef = useRef(refreshHistory)
  refreshHistoryRef.current = refreshHistory

  const stopStream = useCallback(() => {
    if (streamReconnectTimer.current) {
      window.clearTimeout(streamReconnectTimer.current)
      streamReconnectTimer.current = null
    }
    if (streamSourceRef.current) {
      streamSourceRef.current.close()
      streamSourceRef.current = null
    }
    streamRunSeqRef.current.clear()
    streamRunStateVersionRef.current.clear()
    streamRunSourceRef.current.clear()
    streamSeenEventKeysRef.current.clear()
    streamSeenPayloadKeysRef.current.clear()
  }, [])

  useEffect(() => {
    if (!activeFriendlyId || isNewChat || isRedirecting) return
    let cancelled = false

    function startStream() {
      if (cancelled) return
      if (streamSourceRef.current) {
        streamSourceRef.current.close()
        streamSourceRef.current = null
      }
      const params = new URLSearchParams()
      const streamSessionKey = resolvedSessionKey || sessionKeyForHistory
      if (streamSessionKey) params.set('sessionKey', streamSessionKey)
      if (activeFriendlyId) params.set('friendlyId', activeFriendlyId)
      const source = new EventSource(`/api/stream?${params.toString()}`)
      streamSourceRef.current = source

      function handleStreamEvent(event: MessageEvent) {
        try {
          const parsed = JSON.parse(String(event.data || '{}')) as {
            event?: string
            payload?: unknown
            seq?: unknown
            stateVersion?: unknown
          }
          if (parsed.event === 'chat.history') {
            const payload = parsed.payload as { messages?: Array<unknown> } | null
            if (payload && Array.isArray(payload.messages)) {
              queryClient.setQueryData(
                chatQueryKeys.history(activeFriendlyId, sessionKeyForHistory),
                {
                  sessionKey: sessionKeyForHistory,
                  messages: payload.messages,
                },
              )
              return
            }
            return
          }
          if (!parsed.event) return
          if (parsed.event === 'chat' || parsed.event === 'agent') {
            const payloads: Array<StreamChatPayload | null> =
              parsed.event === 'chat'
                ? [parsed.payload as StreamChatPayload | null]
                : extractChatPayloadsFromAgentPayload(parsed.payload)

            if (parsed.event === 'agent' && payloads.length === 0) {
              return
            }

            for (const payload of payloads) {
              if (!payload) continue
              const streamRunId =
                typeof payload.runId === 'string' ? payload.runId : ''
              const payloadSource: 'agent' | 'chat' =
                parsed.event === 'agent' ? 'agent' : 'chat'
              if (streamRunId) {
                const currentSource = streamRunSourceRef.current.get(streamRunId)
                if (payloadSource === 'chat' && currentSource === 'agent') {
                  continue
                }
                if (payloadSource === 'agent' || !currentSource) {
                  streamRunSourceRef.current.set(streamRunId, payloadSource)
                }
              }

              const payloadSeq =
                typeof payload.seq === 'number' && Number.isFinite(payload.seq)
                  ? payload.seq
                  : undefined
              const eventSeq =
                payloadSource === 'agent'
                  ? payloadSeq
                  : typeof parsed.seq === 'number' && Number.isFinite(parsed.seq)
                    ? parsed.seq
                    : undefined
              const eventStateVersion =
                typeof parsed.stateVersion === 'number' &&
                Number.isFinite(parsed.stateVersion)
                  ? parsed.stateVersion
                  : undefined

              if (
                shouldSkipDuplicateEvent(
                  streamSeenEventKeysRef.current,
                  payloadSource,
                  streamRunId,
                  payload.state,
                  eventSeq,
                )
              ) {
                continue
              }

              if (
                shouldSkipDuplicatePayload(
                  streamSeenPayloadKeysRef.current,
                  payloadSource,
                  payload,
                )
              ) {
                continue
              }

            if (
              shouldSkipStaleRunEvent(
                streamRunId,
                eventSeq,
                eventStateVersion,
                streamRunSeqRef.current,
                streamRunStateVersionRef.current,
              )
            ) {
              continue
            }

            onChatEvent?.(payload)
            const payloadState =
              typeof payload.state === 'string' ? payload.state : ''
              if (
                payloadState === 'final' ||
                payloadState === 'error' ||
                payloadState === 'aborted'
              ) {
                refreshHistoryRef.current()
              }
            if (payload.message && typeof payload.message === 'object') {
              const payloadSessionKey = payload.sessionKey
              if (
                payloadSessionKey &&
                resolvedSessionKey &&
                payloadSessionKey !== resolvedSessionKey &&
                payloadSessionKey !== sessionKeyForHistory
              ) {
                continue
              }
              const state = typeof payload.state === 'string' ? payload.state : ''
              const nextMessage: GatewayMessage = {
                ...payload.message,
                __streamRunId: streamRunId || undefined,
              }

                if (
                  streamRunId &&
                  (state === 'final' || state === 'error' || state === 'aborted')
                ) {
                  streamRunSeqRef.current.delete(streamRunId)
                  streamRunStateVersionRef.current.delete(streamRunId)
                  streamRunSourceRef.current.delete(streamRunId)
                }

              function upsert(messages: Array<GatewayMessage>) {
                const lastUserIndex = [...messages]
                  .reverse()
                  .findIndex((message) => message.role === 'user')
                const resolvedLastUserIndex =
                  lastUserIndex >= 0 ? messages.length - 1 - lastUserIndex : -1

                const nextId = getMessageId(nextMessage)
                if (nextId) {
                  const existingById = messages.findIndex(
                    (message) => getMessageId(message) === nextId,
                  )
                  if (existingById >= 0) {
                    const next = [...messages]
                    next[existingById] = mergeStreamMessage(
                      messages[existingById],
                      nextMessage,
                    )
                    return next
                  }
                }

                if (streamRunId) {
                  const index = findStreamMessageIndex(
                    messages,
                    nextMessage,
                    streamRunId,
                  )
                  if (index >= 0) {
                    if (index > resolvedLastUserIndex) {
                      const next = [...messages]
                      next[index] = mergeStreamMessage(messages[index], nextMessage)
                      return next
                    }
                    return [...messages, nextMessage]
                  }
                }
                if (nextMessage.role === 'assistant') {
                  const nextTime = getMessageTimestamp(nextMessage)
                  const index = [...messages]
                    .reverse()
                    .findIndex((message) => message.role === 'assistant')
                  if (index >= 0) {
                    const target = messages.length - 1 - index
                    if (target > resolvedLastUserIndex) {
                      const targetTime = getMessageTimestamp(messages[target])
                      const targetText = textFromMessage(messages[target])
                      const nextText = textFromMessage(nextMessage)
                      const textMatches = shouldMergeAssistantByText(
                        targetText,
                        nextText,
                      )
                      if (
                        Math.abs(nextTime - targetTime) <= 15000 || textMatches
                      ) {
                        const next = [...messages]
                        next[target] = mergeStreamMessage(messages[target], nextMessage)
                        return next
                      }
                    }
                    if (resolvedLastUserIndex >= 0 && target <= resolvedLastUserIndex) {
                      const next = [...messages]
                      next.push(nextMessage)
                      return next
                    }
                  }
                }
                return [...messages, nextMessage]
              }

              updateHistoryMessages(
                queryClient,
                activeFriendlyId,
                sessionKeyForHistory,
                upsert,
              )
              if (payloadSessionKey && payloadSessionKey !== sessionKeyForHistory) {
                updateHistoryMessages(
                  queryClient,
                  activeFriendlyId,
                  payloadSessionKey,
                  upsert,
                )
              }
              if (payloadSessionKey) {
                updateSessionLastMessage(
                  queryClient,
                  payloadSessionKey,
                  activeFriendlyId,
                  nextMessage,
                )
              }
            }
            }
            return
          }
          if (!parsed.event.startsWith('chat.')) {
            return
          }
        } catch {
          // ignore parse errors
        }
      }

      function handleStreamOpen() {
        streamReconnectAttempt.current = 0
        refreshHistoryRef.current()
      }

      function handleStreamError() {
        if (cancelled) return
        if (streamReconnectTimer.current) return
        if (streamSourceRef.current) {
          streamSourceRef.current.close()
          streamSourceRef.current = null
        }
        streamReconnectAttempt.current += 1
        const backoff = Math.min(8000, 1000 * streamReconnectAttempt.current)
        streamReconnectTimer.current = window.setTimeout(() => {
          streamReconnectTimer.current = null
          startStream()
        }, backoff)
      }

      source.addEventListener('message', handleStreamEvent)
      source.addEventListener('open', handleStreamOpen)
      source.addEventListener('error', handleStreamError)
    }

    startStream()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [
    activeFriendlyId,
    isNewChat,
    isRedirecting,
    resolvedSessionKey,
    sessionKeyForHistory,
    stopStream,
  ])

  return { stopStream }
}

function mergeStreamMessage(
  previousMessage: GatewayMessage,
  nextMessage: GatewayMessage,
): GatewayMessage {
  const previousContent = Array.isArray(previousMessage.content)
    ? previousMessage.content
    : []
  const nextContent = Array.isArray(nextMessage.content) ? nextMessage.content : []

  if (previousContent.length === 0) {
    return nextMessage
  }

  if (nextContent.length === 0) {
    return { ...previousMessage, ...nextMessage }
  }

  return {
    ...previousMessage,
    ...nextMessage,
    content: mergeMessageContent(previousContent, nextContent),
  }
}

function mergeMessageContent(
  previousContent: Array<MessageContent>,
  nextContent: Array<MessageContent>,
): Array<MessageContent> {
  const mergedByIdentity = new Map<string, MessageContent>()
  const orderedKeys: Array<string> = []

  function upsertPart(part: MessageContent) {
    const identity = partIdentity(part)
    if (!mergedByIdentity.has(identity)) {
      orderedKeys.push(identity)
    }
    mergedByIdentity.set(identity, part)
  }

  for (const part of previousContent) {
    upsertPart(part)
  }
  for (const part of nextContent) {
    upsertPart(part)
  }

  return orderedKeys
    .map((key) => mergedByIdentity.get(key))
    .filter((part): part is MessageContent => Boolean(part))
}

function partIdentity(part: MessageContent): string {
  switch (part.type) {
    case 'text':
      return 'text'
    case 'thinking':
      return 'thinking'
    case 'toolCall': {
      const toolCallId = normalizeString((part as { id?: unknown }).id)
      const toolName = normalizeString((part as { name?: unknown }).name)
      if (toolCallId || toolName) {
        return `toolCall:${toolCallId}:${toolName}`
      }
      return `toolCall:${JSON.stringify(part)}`
    }
    default:
      return 'unknown'
  }
}

function shouldSkipStaleRunEvent(
  runId: string,
  seq: number | undefined,
  stateVersion: number | undefined,
  runSeqMap: Map<string, number>,
  runStateVersionMap: Map<string, number>,
): boolean {
  if (!runId) return false

  if (typeof seq === 'number') {
    const previousSeq = runSeqMap.get(runId)
    if (typeof previousSeq === 'number' && seq <= previousSeq) {
      return true
    }
    runSeqMap.set(runId, seq)
  }

  if (typeof stateVersion === 'number') {
    const previousStateVersion = runStateVersionMap.get(runId)
    if (
      typeof previousStateVersion === 'number' &&
      stateVersion < previousStateVersion
    ) {
      return true
    }
    runStateVersionMap.set(runId, stateVersion)
  }

  return false
}

function findStreamMessageIndex(
  messages: Array<GatewayMessage>,
  targetMessage: GatewayMessage,
  streamRunId: string,
): number {
  const targetId = getMessageId(targetMessage)
  if (targetId) {
    const byId = messages.findIndex((message) => getMessageId(message) === targetId)
    if (byId >= 0) return byId
  }

  const targetRole = normalizeString(targetMessage.role)
  const targetToolCallId = normalizeString(targetMessage.toolCallId)
  let index = -1
  messages.forEach((message, currentIndex) => {
    const runId = normalizeString((message as { __streamRunId?: unknown }).__streamRunId)
    if (!runId || runId !== streamRunId) return
    if (normalizeString(message.role) !== targetRole) return
    const messageToolCallId = normalizeString(message.toolCallId)
    if (targetToolCallId || messageToolCallId) {
      if (targetToolCallId !== messageToolCallId) return
    }
    index = currentIndex
  })
  return index
}

function getMessageId(message: GatewayMessage): string {
  return normalizeString((message as { id?: unknown }).id)
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function shouldSkipDuplicateEvent(
  seen: Set<string>,
  source: 'agent' | 'chat',
  runId: string,
  state: string | undefined,
  seq: number | undefined,
): boolean {
  if (!runId || typeof seq !== 'number') return false
  const key = `${source}:${runId}:${state ?? ''}:${seq}`
  if (seen.has(key)) return true
  seen.add(key)
  if (seen.size > 4000) {
    seen.clear()
  }
  return false
}

function shouldSkipDuplicatePayload(
  seen: Set<string>,
  source: 'agent' | 'chat',
  payload: StreamChatPayload,
): boolean {
  const runId = normalizeString(payload.runId)
  const state = normalizeString(payload.state)
  const sessionKey = normalizeString(payload.sessionKey)
  const message = payload.message
  const messageId = message ? getMessageId(message) : ''
  const role = normalizeString(message?.role)
  const toolCallId = normalizeString(message?.toolCallId)
  const text = message ? textFromMessage(message).slice(0, 512) : ''

  if (!runId && !messageId && !text) return false

  const key = `${source}:${runId}:${state}:${sessionKey}:${role}:${messageId}:${toolCallId}:${text}`
  if (seen.has(key)) return true
  seen.add(key)
  if (seen.size > 4000) {
    seen.clear()
  }
  return false
}

function shouldMergeAssistantByText(previousText: string, nextText: string): boolean {
  if (!previousText || !nextText) return false
  if (previousText === nextText) return true

  const previousNormalized = normalizeAssistantTextForDedup(previousText)
  const nextNormalized = normalizeAssistantTextForDedup(nextText)
  if (!previousNormalized || !nextNormalized) return false
  if (previousNormalized === nextNormalized) return true
  if (previousNormalized.includes(nextNormalized)) return true
  if (nextNormalized.includes(previousNormalized)) return true
  return false
}

function normalizeAssistantTextForDedup(text: string): string {
  return text
    .replace(/\[\[reply_to:[^\]]*\]\]\s*/gi, '')
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractChatPayloadsFromAgentPayload(
  payload: unknown,
): Array<StreamChatPayload | null> {
  if (!payload || typeof payload !== 'object') return []
  const value = payload as Record<string, unknown>
  const runId = normalizeString(value.runId)
  const sessionKey = normalizeString(value.sessionKey)
  const stream = normalizeString(value.stream)
  const seq =
    typeof value.seq === 'number' && Number.isFinite(value.seq)
      ? value.seq
      : undefined
  const data =
    value.data && typeof value.data === 'object'
      ? (value.data as Record<string, unknown>)
      : null

  if (stream === 'assistant') {
    const text =
      normalizeString(data?.text) || normalizeString(data?.delta) || ''
    if (!text) return []
    return [
      {
        runId,
        sessionKey,
        state: 'delta',
        seq,
        message: {
          role: 'assistant',
          content: [{ type: 'text', text }],
        },
      },
    ]
  }

  if (stream === 'thinking') {
    const thinking =
      normalizeString(data?.thinking) || normalizeString(data?.text) || ''
    if (!thinking) return []
    return [
      {
        runId,
        sessionKey,
        state: 'delta',
        seq,
        message: {
          role: 'assistant',
          content: [{ type: 'thinking', thinking }],
        },
      },
    ]
  }

  if (stream === 'lifecycle') {
    const phase = normalizeString(data?.phase)
    if (phase === 'end') {
      return [
        {
          runId,
          sessionKey,
          state: 'final',
          seq,
        },
      ]
    }
    return []
  }

  if (stream.includes('tool')) {
    const toolCallId =
      normalizeString(data?.toolCallId) ||
      normalizeString(data?.id) ||
      normalizeString(data?.callId)
    const toolName =
      normalizeString(data?.toolName) || normalizeString(data?.name)

    if (stream.includes('call')) {
      const partialJson = normalizeString(data?.partialJson)
      const input =
        data && typeof data.input === 'object'
          ? (data.input as Record<string, unknown>)
          : data && typeof data.arguments === 'object'
            ? (data.arguments as Record<string, unknown>)
            : undefined

      return [
        {
          runId,
          sessionKey,
          state: 'delta',
          seq,
          message: {
            role: 'assistant',
            content: [
              {
                type: 'toolCall',
                id: toolCallId || undefined,
                name: toolName || undefined,
                partialJson: partialJson || undefined,
                arguments: input,
              },
            ],
          },
        },
      ]
    }

    if (stream.includes('result') || stream.includes('output')) {
      const output = data?.output
      const errorText = normalizeString(data?.error)
      return [
        {
          runId,
          sessionKey,
          state: 'delta',
          seq,
          message: {
            role: 'toolResult',
            toolCallId: toolCallId || undefined,
            toolName: toolName || undefined,
            details:
              output && typeof output === 'object'
                ? (output as Record<string, unknown>)
                : undefined,
            isError: Boolean(errorText),
            content: [
              {
                type: 'text',
                text: errorText || (typeof output === 'string' ? output : ''),
              },
            ],
          },
        },
      ]
    }

    return []
  }

  return []
}
