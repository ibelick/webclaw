export type ToolCallContent = {
  type: 'toolCall'
  id?: string
  name?: string
  arguments?: Record<string, unknown>
  partialJson?: string
}

export type ToolResultContent = {
  type: 'toolResult'
  toolCallId?: string
  toolName?: string
  content?: Array<{ type?: string; text?: string }>
  details?: Record<string, unknown>
  isError?: boolean
}

export type TextContent = {
  type: 'text'
  text?: string
  textSignature?: string
}

export type ThinkingContent = {
  type: 'thinking'
  thinking?: string
  thinkingSignature?: string
}

export type ImageContent = {
  type: 'image'
  mimeType?: string
  data?: string
  content?: string
  source?: { type?: string; media_type?: string; data?: string }
}

export type MessageContent =
  | TextContent
  | ToolCallContent
  | ThinkingContent
  | ImageContent

export type GatewayMessage = {
  role?: string
  content?: Array<MessageContent>
  toolCallId?: string
  toolName?: string
  details?: Record<string, unknown>
  isError?: boolean
  timestamp?: number
  [key: string]: unknown
  __optimisticId?: string
}

export type SessionSummary = {
  key?: string
  label?: string
  title?: string
  derivedTitle?: string
  updatedAt?: number
  lastMessage?: GatewayMessage | null
  friendlyId?: string
  totalTokens?: number
  contextTokens?: number
}

export type SessionListResponse = {
  sessions?: Array<SessionSummary>
}

export type HistoryResponse = {
  sessionKey: string
  sessionId?: string
  messages: Array<GatewayMessage>
}

export type SessionMeta = {
  key: string
  friendlyId: string
  title?: string
  derivedTitle?: string
  label?: string
  updatedAt?: number
  lastMessage?: GatewayMessage | null
  totalTokens?: number
  contextTokens?: number
}

export type PathsPayload = {
  agentId: string
  stateDir: string
  sessionsDir: string
  storePath: string
}
