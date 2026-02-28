import type {
  GatewayMessage,
  SessionMeta,
  SessionSummary,
  ToolCallContent,
} from './types'

export function deriveFriendlyIdFromKey(key: string | undefined): string {
  if (!key) return 'main'
  const trimmed = key.trim()
  if (trimmed.length === 0) return 'main'
  const parts = trimmed.split(':')
  const tail = parts[parts.length - 1] ?? ''
  const tailTrimmed = tail.trim()
  return tailTrimmed.length > 0 ? tailTrimmed : trimmed
}

export function deriveAgentIdFromKey(key: string | undefined): string | null {
  if (!key) return null
  const trimmed = key.trim()
  if (trimmed.length === 0) return null
  const parts = trimmed.split(':')
  // format is typically agent:<agentId>:<uuid>
  if (parts.length >= 3 && parts[0] === 'agent') {
    const agentId = parts[1]
    return agentId && agentId.trim().length > 0 ? agentId.trim() : null
  }
  return null
}

export function textFromMessage(msg: GatewayMessage): string {
  const parts = Array.isArray(msg.content) ? msg.content : []
  return parts
    .map((part) => (part.type === 'text' ? String(part.text ?? '') : ''))
    .join('')
    .trim()
}

export function getToolCallsFromMessage(
  msg: GatewayMessage,
): Array<ToolCallContent> {
  const parts = Array.isArray(msg.content) ? msg.content : []
  return parts.filter(
    (part): part is ToolCallContent => part.type === 'toolCall',
  )
}

export function findToolResultForCall(
  toolCallId: string,
  messages: Array<GatewayMessage>,
): GatewayMessage | undefined {
  return messages.find(
    (msg) => msg.role === 'toolResult' && msg.toolCallId === toolCallId,
  )
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 1_000_000_000_000) return value * 1000
    return value
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
  }
  return null
}

export function getMessageTimestamp(message: GatewayMessage): number {
  const candidates = [
    (message as any).createdAt,
    (message as any).created_at,
    (message as any).timestamp,
    (message as any).time,
    (message as any).ts,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeTimestamp(candidate)
    if (normalized) return normalized
  }

  return Date.now()
}

export function normalizeSessions(
  rows: Array<SessionSummary> | undefined,
): Array<SessionMeta> {
  if (!Array.isArray(rows)) return []
  return rows.map((session) => {
    const key =
      typeof session.key === 'string' && session.key.trim().length > 0
        ? session.key.trim()
        : deriveFriendlyIdFromKey(session.friendlyId ?? session.key)
    const friendlyIdCandidate =
      typeof session.friendlyId === 'string' &&
      session.friendlyId.trim().length > 0
        ? session.friendlyId.trim()
        : deriveFriendlyIdFromKey(key)

    return {
      key,
      friendlyId: friendlyIdCandidate,
      title: typeof session.title === 'string' ? session.title : undefined,
      derivedTitle:
        typeof session.derivedTitle === 'string'
          ? session.derivedTitle
          : undefined,
      label: typeof session.label === 'string' ? session.label : undefined,
      updatedAt:
        typeof session.updatedAt === 'number' ? session.updatedAt : undefined,
      lastMessage: session.lastMessage ?? null,
      totalTokens:
        typeof session.totalTokens === 'number'
          ? session.totalTokens
          : undefined,
      contextTokens:
        typeof session.contextTokens === 'number'
          ? session.contextTokens
          : undefined,
    }
  })
}

export async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (data?.error) return String(data.error)
    if (data?.message) return String(data.message)
    return JSON.stringify(data)
  } catch {
    try {
      return await res.text()
    } catch {
      return res.statusText || 'Request failed'
    }
  }
}

export const missingGatewayAuthMessage =
  'Missing gateway auth. Set CLAWDBOT_GATEWAY_TOKEN (recommended) or CLAWDBOT_GATEWAY_PASSWORD in the server environment.'

export function isMissingGatewayAuth(message: string): boolean {
  return message.includes(missingGatewayAuthMessage)
}

export function isSessionNotFound(message: string): boolean {
  if (!message) return false
  const normalized = message.toLowerCase()
  if (normalized.includes('session not found')) return true
  if (normalized.includes('unknown session')) return true
  if (normalized.includes('chat not found')) return true
  if (normalized.includes('not found') && normalized.includes('session')) {
    return true
  }
  return false
}
