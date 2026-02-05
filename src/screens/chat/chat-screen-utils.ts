import type { GatewayMessage } from './types'
import type { AttachmentFile } from '@/components/attachment-button'

type OptimisticMessagePayload = {
  clientId: string
  optimisticId: string
  optimisticMessage: GatewayMessage
}

/**
 * Creates an optimistic user message for immediate UI display while
 * the actual message is being sent to the server.
 *
 * @param body - The text content of the message
 * @param attachments - Optional array of file attachments (images)
 * @returns Payload containing IDs and the optimistic message
 */
export function createOptimisticMessage(
  body: string,
  attachments?: AttachmentFile[],
): OptimisticMessagePayload {
  const clientId = crypto.randomUUID()
  const optimisticId = `opt-${clientId}`
  const timestamp = Date.now()

  // Build content array with text and images
  const content: Array<{
    type: string
    text?: string
    source?: { type: string; media_type: string; data: string }
  }> = []

  // Add images first
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.type === 'image' && att.base64) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: att.file.type,
            data: att.base64,
          },
        })
      }
    }
  }

  // Add text
  if (body.trim()) {
    content.push({ type: 'text', text: body })
  } else if (attachments && attachments.length > 0) {
    // If no text but has attachments, add placeholder
    content.push({ type: 'text', text: '' })
  }

  const optimisticMessage: GatewayMessage = {
    role: 'user',
    content: content as GatewayMessage['content'],
    __optimisticId: optimisticId,
    clientId,
    status: 'sending',
    timestamp,
  }

  return { clientId, optimisticId, optimisticMessage }
}
