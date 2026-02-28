import { getMessageTimestamp, normalizeSessions, readError } from './utils'
import type { QueryClient } from '@tanstack/react-query'
import type {
  GatewayMessage,
  HistoryResponse,
  SessionListResponse,
  SessionMeta,
} from './types'

type GatewayStatusResponse = {
  ok: boolean
  error?: string
}

export const chatQueryKeys = {
  sessions: ['chat', 'sessions'] as const,
  agents: ['chat', 'agents'] as const,
  history: function history(friendlyId: string, sessionKey: string) {
    return ['chat', 'history', friendlyId, sessionKey] as const
  },
} as const

export async function fetchSessions(): Promise<Array<SessionMeta>> {
  const res = await fetch('/api/sessions')
  if (!res.ok) throw new Error(await readError(res))
  const data = (await res.json()) as SessionListResponse
  return normalizeSessions(data.sessions)
}

export async function fetchHistory(payload: {
  sessionKey: string
  friendlyId: string
}): Promise<HistoryResponse> {
  const query = new URLSearchParams({ limit: '200' })
  if (payload.sessionKey) query.set('sessionKey', payload.sessionKey)
  if (payload.friendlyId) query.set('friendlyId', payload.friendlyId)
  const res = await fetch(`/api/history?${query.toString()}`)
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as HistoryResponse
}

export async function fetchGatewayStatus(): Promise<GatewayStatusResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 2500)

  try {
    const res = await fetch('/api/ping', { signal: controller.signal })
    if (!res.ok) throw new Error(await readError(res))
    return (await res.json()) as GatewayStatusResponse
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Gateway check timed out')
    }
    throw err
  } finally {
    window.clearTimeout(timeout)
  }
}

type AgentsResult = {
  agents: Array<{ id: string; name: string }>
  defaultAgentId: string
}

export async function fetchAgents(): Promise<AgentsResult> {
  const res = await fetch('/api/agents')
  if (!res.ok) throw new Error(await readError(res))
  const data = await res.json() as {
    agents?: Array<{ id: string; name?: string }>
    defaultAgentId?: string
  }
  const agents = Array.isArray(data.agents)
    ? data.agents.map((agent) => ({
        id: agent.id,
        name: agent.name || agent.id,
      }))
    : []
  const defaultAgentId =
    typeof data.defaultAgentId === 'string' && data.defaultAgentId.trim().length > 0
      ? data.defaultAgentId.trim()
      : 'main'
  return { agents, defaultAgentId }
}

export function updateHistoryMessages(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
  updater: (messages: Array<GatewayMessage>) => Array<GatewayMessage>,
) {
  const queryKey = chatQueryKeys.history(friendlyId, sessionKey)
  queryClient.setQueryData(queryKey, function update(data: unknown) {
    const current = data as HistoryResponse | undefined
    const messages = Array.isArray(current?.messages) ? current.messages : []
    const nextMessages = updater(messages)
    return {
      sessionKey: current?.sessionKey ?? sessionKey,
      sessionId: current?.sessionId,
      messages: nextMessages,
    }
  })
}

export function appendHistoryMessage(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
  message: GatewayMessage,
) {
  updateHistoryMessages(
    queryClient,
    friendlyId,
    sessionKey,
    function append(messages) {
      return [...messages, message]
    },
  )
}

export function updateHistoryMessageByClientId(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
  clientId: string,
  updater: (message: GatewayMessage) => GatewayMessage,
) {
  const optimisticId = `opt-${clientId}`
  updateHistoryMessages(
    queryClient,
    friendlyId,
    sessionKey,
    function update(messages) {
      return messages.map((message) => {
        if (
          message.clientId === clientId ||
          message.__optimisticId === clientId ||
          message.__optimisticId === optimisticId
        ) {
          return updater(message)
        }
        return message
      })
    },
  )
}

export function removeHistoryMessageByClientId(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
  clientId: string,
  optimisticId?: string,
) {
  updateHistoryMessages(
    queryClient,
    friendlyId,
    sessionKey,
    function remove(messages) {
      return messages.filter((message) => {
        if (message.clientId === clientId) return false
        if (message.__optimisticId === clientId) return false
        if (optimisticId && message.__optimisticId === optimisticId)
          return false
        return true
      })
    },
  )
}

export function clearHistoryMessages(
  queryClient: QueryClient,
  friendlyId: string,
  sessionKey: string,
) {
  const queryKey = chatQueryKeys.history(friendlyId, sessionKey)
  queryClient.setQueryData(queryKey, {
    sessionKey,
    messages: [],
  })
}

export function moveHistoryMessages(
  queryClient: QueryClient,
  fromFriendlyId: string,
  fromSessionKey: string,
  toFriendlyId: string,
  toSessionKey: string,
) {
  const fromKey = chatQueryKeys.history(fromFriendlyId, fromSessionKey)
  const toKey = chatQueryKeys.history(toFriendlyId, toSessionKey)
  const fromData = queryClient.getQueryData<HistoryResponse>(fromKey)
  if (!fromData) return
  const messages = Array.isArray(fromData.messages) ? fromData.messages : []
  queryClient.setQueryData(toKey, {
    sessionKey: toSessionKey,
    sessionId: fromData.sessionId,
    messages,
  })
  queryClient.removeQueries({ queryKey: fromKey, exact: true })
}

export function updateSessionLastMessage(
  queryClient: QueryClient,
  sessionKey: string,
  friendlyId: string,
  message: GatewayMessage,
) {
  const messageUpdatedAt = getMessageTimestamp(message)
  queryClient.setQueryData(
    chatQueryKeys.sessions,
    function update(messages: unknown) {
      if (!Array.isArray(messages)) return messages
      const nextSessions = (messages as Array<SessionMeta>).map((session) => {
        if (session.key !== sessionKey && session.friendlyId !== friendlyId) {
          return session
        }
        return {
          ...session,
          lastMessage: message,
          updatedAt:
            typeof session.updatedAt === 'number' &&
            Number.isFinite(session.updatedAt) &&
            session.updatedAt > messageUpdatedAt
              ? session.updatedAt
              : messageUpdatedAt,
        }
      })

      return [...nextSessions].sort((a, b) => {
        const aUpdatedAt =
          typeof a.updatedAt === 'number' && Number.isFinite(a.updatedAt)
            ? a.updatedAt
            : 0
        const bUpdatedAt =
          typeof b.updatedAt === 'number' && Number.isFinite(b.updatedAt)
            ? b.updatedAt
            : 0
        return bUpdatedAt - aUpdatedAt
      })
    },
  )
}

export function removeSessionFromCache(
  queryClient: QueryClient,
  sessionKey: string,
  friendlyId: string,
) {
  queryClient.setQueryData(
    chatQueryKeys.sessions,
    function update(messages: unknown) {
      if (!Array.isArray(messages)) return messages
      return (messages as Array<SessionMeta>).filter((session) => {
        return session.key !== sessionKey && session.friendlyId !== friendlyId
      })
    },
  )

  queryClient.removeQueries({
    queryKey: ['chat', 'history', friendlyId],
    exact: false,
  })
  if (sessionKey && sessionKey !== friendlyId) {
    queryClient.removeQueries({
      queryKey: ['chat', 'history', sessionKey],
      exact: false,
    })
  }
}
