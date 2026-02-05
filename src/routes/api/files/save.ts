import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { uploadFile } from '../../../server/filesystem'
import { validatePath } from '../../../server/path-utils'
import type { FileSystemError } from '../../../server/filesystem'

type SaveResponse = {
  ok: true
  message: string
  path: string
  size: number
}

type ErrorResponse = {
  error: string
  code: string
}

const MAX_TEXT_SIZE = 5 * 1024 * 1024 // 5MB

export const Route = createFileRoute('/api/files/save')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

          const rawPath = typeof body.path === 'string' ? body.path.trim() : ''
          const content = typeof body.content === 'string' ? body.content : null

          if (!rawPath) {
            return json<ErrorResponse>({ error: 'path is required', code: 'MISSING_PATH' }, { status: 400 })
          }

          if (content === null) {
            return json<ErrorResponse>({ error: 'content is required', code: 'MISSING_CONTENT' }, { status: 400 })
          }

          const path = validatePath(rawPath, 'Path parameter')

          const encoded = new TextEncoder().encode(content)
          if (encoded.byteLength > MAX_TEXT_SIZE) {
            return json<ErrorResponse>(
              { error: 'Content too large (max 5MB)', code: 'CONTENT_TOO_LARGE' },
              { status: 413 },
            )
          }

          await uploadFile(path, encoded.buffer as ArrayBuffer)

          return json<SaveResponse>({
            ok: true,
            message: 'File saved successfully',
            path,
            size: encoded.byteLength,
          })
        } catch (err) {
          const error = err as Error & FileSystemError
          const status = error.status || 500
          const code = error.code || 'INTERNAL_ERROR'
          return json<ErrorResponse>(
            { error: error.message || 'An unexpected error occurred', code },
            { status },
          )
        }
      },
    },
  },
})
