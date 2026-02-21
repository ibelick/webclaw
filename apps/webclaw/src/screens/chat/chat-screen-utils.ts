import type { GatewayMessage } from './types'
import type { AttachmentFile } from '@/components/attachment-button'
import { randomUUID } from '@/lib/utils'

type OptimisticMessagePayload = {
  clientId: string
  optimisticId: string
  optimisticMessage: GatewayMessage
}

export function createOptimisticMessage(
  body: string,
  attachments?: Array<AttachmentFile>,
): OptimisticMessagePayload {
  const clientId = randomUUID()
  const optimisticId = `opt-${clientId}`
  const timestamp = Date.now()

  const content: Array<{
    type: string
    text?: string
    source?: { type: string; media_type: string; data: string }
  }> = []

  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.base64) {
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

  if (body.trim()) {
    content.push({ type: 'text', text: body })
  } else if (attachments && attachments.length > 0) {
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
