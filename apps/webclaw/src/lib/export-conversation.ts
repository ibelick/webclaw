import type { GatewayMessage } from '@/screens/chat/types'
import { textFromMessage, getMessageTimestamp } from '@/screens/chat/utils'

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function roleLabel(role: string | undefined): string {
  switch (role) {
    case 'user':
      return 'User'
    case 'assistant':
      return 'Assistant'
    default:
      return role ?? 'Unknown'
  }
}

function isExportableMessage(msg: GatewayMessage): boolean {
  return msg.role === 'user' || msg.role === 'assistant'
}

function sanitizeFilename(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 64)
}

export function exportAsMarkdown(
  messages: GatewayMessage[],
  title: string,
): string {
  const now = formatDate(new Date())
  const lines: string[] = [`# Chat: ${title}`, `*Exported on ${now}*`, '']

  for (const msg of messages) {
    if (!isExportableMessage(msg)) continue
    const content = textFromMessage(msg)
    if (!content) continue
    lines.push(`## ${roleLabel(msg.role)}`, '', content, '')
  }

  return lines.join('\n')
}

export function exportAsJson(
  messages: GatewayMessage[],
  title: string,
): string {
  const exportedAt = new Date().toISOString()
  const exportMessages = messages
    .filter(isExportableMessage)
    .map((msg) => {
      const ts = getMessageTimestamp(msg)
      const d = new Date(ts)
      const isoTime = Number.isNaN(d.getTime()) ? 'unknown' : d.toISOString()
      return {
        role: msg.role ?? 'unknown',
        content: textFromMessage(msg),
        timestamp: isoTime,
      }
    })
    .filter((m) => m.content.length > 0)

  return JSON.stringify(
    { title, exportedAt, messages: exportMessages },
    null,
    2,
  )
}

export function exportAsText(
  messages: GatewayMessage[],
  title: string,
): string {
  const now = formatDate(new Date())
  const lines: string[] = [`Chat: ${title}`, `Exported on ${now}`, '']

  for (const msg of messages) {
    if (!isExportableMessage(msg)) continue
    const content = textFromMessage(msg)
    if (!content) continue
    lines.push(`${roleLabel(msg.role)}: ${content}`, '')
  }

  return lines.join('\n')
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export type ExportFormat = 'markdown' | 'json' | 'text'

export function exportConversation(
  messages: GatewayMessage[],
  title: string,
  format: ExportFormat,
): void {
  const safeName = sanitizeFilename(title) || 'chat-export'

  switch (format) {
    case 'markdown': {
      const content = exportAsMarkdown(messages, title)
      downloadFile(content, `${safeName}.md`, 'text/markdown')
      break
    }
    case 'json': {
      const content = exportAsJson(messages, title)
      downloadFile(content, `${safeName}.json`, 'application/json')
      break
    }
    case 'text': {
      const content = exportAsText(messages, title)
      downloadFile(content, `${safeName}.txt`, 'text/plain')
      break
    }
  }
}
