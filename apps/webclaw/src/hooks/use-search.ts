import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { chatQueryKeys, fetchHistory } from '../screens/chat/chat-queries'
import { textFromMessage } from '../screens/chat/utils'
import type {
  GatewayMessage,
  HistoryResponse,
  SessionMeta,
} from '../screens/chat/types'

export type SearchMatch = {
  sessionKey: string
  friendlyId: string
  sessionTitle: string
  message: GatewayMessage
  messageIndex: number
  messageText: string
}

export type HighlightMatch = {
  before: string
  match: string
  after: string
}

type UseSearchInput = {
  sessions: Array<SessionMeta>
  currentFriendlyId: string
  currentSessionKey: string
}

const contextWindow = 48

export function useSearch({
  sessions,
  currentFriendlyId,
  currentSessionKey,
}: UseSearchInput) {
  const queryClient = useQueryClient()

  const searchCurrentConversation = useCallback(
    function searchCurrentConversation(query: string): Array<SearchMatch> {
      const normalizedQuery = normalizeQuery(query)
      if (!normalizedQuery) return []

      const historyKey = chatQueryKeys.history(
        currentFriendlyId,
        currentSessionKey || currentFriendlyId,
      )
      const cached = queryClient.getQueryData<HistoryResponse>(historyKey)
      const messages = Array.isArray(cached?.messages) ? cached.messages : []

      return collectMatches(
        messages,
        normalizedQuery,
        getSessionMeta(sessions, currentFriendlyId, currentSessionKey),
        cached?.sessionKey ?? currentSessionKey,
        currentFriendlyId,
      )
    },
    [currentFriendlyId, currentSessionKey, queryClient, sessions],
  )

  const searchAllSessions = useCallback(
    async function searchAllSessions(query: string): Promise<Array<SearchMatch>> {
      const normalizedQuery = normalizeQuery(query)
      if (!normalizedQuery) return []

      const historyResponses = await Promise.all(
        sessions.map(async (session) => {
          try {
            const history = await fetchHistory({
              sessionKey: session.key,
              friendlyId: session.friendlyId,
            })
            return { session, history }
          } catch {
            return { session, history: null }
          }
        }),
      )

      const matches: Array<SearchMatch> = []
      for (const entry of historyResponses) {
        if (!entry.history) continue
        matches.push(
          ...collectMatches(
            entry.history.messages,
            normalizedQuery,
            entry.session,
            entry.history.sessionKey,
            entry.session.friendlyId,
          ),
        )
      }
      return matches
    },
    [sessions],
  )

  const highlightMatch = useCallback(function highlightMatch(
    text: string,
    query: string,
  ): HighlightMatch {
    const normalizedQuery = normalizeQuery(query)
    if (!normalizedQuery) {
      return { before: text, match: '', after: '' }
    }
    const lowerText = text.toLowerCase()
    const matchIndex = lowerText.indexOf(normalizedQuery)
    if (matchIndex === -1) {
      return { before: text, match: '', after: '' }
    }
    const matchEnd = matchIndex + normalizedQuery.length
    const beforeStart = Math.max(0, matchIndex - contextWindow)
    const afterEnd = Math.min(text.length, matchEnd + contextWindow)

    return {
      before: text.slice(beforeStart, matchIndex),
      match: text.slice(matchIndex, matchEnd),
      after: text.slice(matchEnd, afterEnd),
    }
  }, [])

  return {
    searchCurrentConversation,
    searchAllSessions,
    highlightMatch,
  }
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

function getSessionMeta(
  sessions: Array<SessionMeta>,
  friendlyId: string,
  sessionKey: string,
): SessionMeta {
  const found = sessions.find((session) => {
    if (session.friendlyId === friendlyId) return true
    if (sessionKey && session.key === sessionKey) return true
    return false
  })

  return (
    found || {
      key: sessionKey || friendlyId,
      friendlyId,
    }
  )
}

function collectMatches(
  messages: Array<GatewayMessage>,
  query: string,
  session: SessionMeta,
  sessionKey: string,
  friendlyId: string,
): Array<SearchMatch> {
  const matches: Array<SearchMatch> = []
  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i]
    const messageText = textFromMessage(message)
    if (!messageText) continue
    if (!messageText.toLowerCase().includes(query)) continue

    matches.push({
      sessionKey,
      friendlyId,
      sessionTitle: getSessionTitle(session),
      message,
      messageIndex: i,
      messageText,
    })
  }
  return matches
}

function getSessionTitle(session: SessionMeta): string {
  return (
    session.label ||
    session.title ||
    session.derivedTitle ||
    session.friendlyId
  )
}
