import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { gatewayRpc } from '../../server/gateway'

type SessionListResponse = {
  sessions?: Array<{
    key?: string
    friendlyId?: string
    title?: string
    derivedTitle?: string
    label?: string
  }>
}

type ChatHistoryResponse = {
  sessionKey: string
  messages: Array<{
    role?: string
    content?: Array<{ type?: string; text?: string }>
  }>
}

function textFromContent(
  content: Array<{ type?: string; text?: string }> | undefined,
): string {
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => (part.type === 'text' ? String(part.text ?? '') : ''))
    .join('')
    .trim()
}

export const Route = createFileRoute('/api/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const query = url.searchParams.get('q')?.trim() ?? ''
          const sessionKey = url.searchParams.get('sessionKey')?.trim()

          if (!query) {
            return json({ results: [] })
          }

          const lowerQuery = query.toLowerCase()

          // Single-session search
          if (sessionKey) {
            const history = await gatewayRpc<ChatHistoryResponse>(
              'chat.history',
              { sessionKey, limit: 500 },
            )
            const matches = (history.messages ?? [])
              .map((msg, index) => ({
                text: textFromContent(msg.content),
                role: msg.role ?? 'assistant',
                index,
              }))
              .filter(
                (m) =>
                  m.role !== 'toolResult' &&
                  m.text.toLowerCase().includes(lowerQuery),
              )

            return json({
              results: [
                {
                  sessionKey,
                  sessionTitle: sessionKey,
                  friendlyId: sessionKey,
                  messages: matches,
                },
              ],
            })
          }

          // Global search: iterate all sessions
          const sessionsData = await gatewayRpc<SessionListResponse>(
            'sessions.list',
            {},
          )
          const sessions = sessionsData.sessions ?? []

          const results: Array<{
            sessionKey: string
            sessionTitle: string
            friendlyId: string
            messages: Array<{ text: string; role: string; index: number }>
          }> = []

          // Search up to 20 sessions to avoid timeouts
          const searchSessions = sessions.slice(0, 20)

          for (const session of searchSessions) {
            const key = session.key ?? session.friendlyId ?? ''
            if (!key) continue
            try {
              const history = await gatewayRpc<ChatHistoryResponse>(
                'chat.history',
                { sessionKey: key, limit: 200 },
              )
              const matches = (history.messages ?? [])
                .map((msg, index) => ({
                  text: textFromContent(msg.content),
                  role: msg.role ?? 'assistant',
                  index,
                }))
                .filter(
                  (m) =>
                    m.role !== 'toolResult' &&
                    m.text.toLowerCase().includes(lowerQuery),
                )

              if (matches.length > 0) {
                results.push({
                  sessionKey: key,
                  sessionTitle:
                    session.title ??
                    session.derivedTitle ??
                    session.label ??
                    key,
                  friendlyId: session.friendlyId ?? key,
                  messages: matches.slice(0, 10), // limit per session
                })
              }
            } catch {
              // skip sessions that fail to load
            }
          }

          return json({ results })
        } catch (err) {
          return json(
            {
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
