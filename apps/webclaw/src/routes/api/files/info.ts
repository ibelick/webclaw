import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getFileInfo } from '../../../server/filesystem'
import { validatePath } from '../../../server/path-utils'
import type { FileItem } from '../../../lib/file-types'
import type { FileSystemError } from '../../../server/filesystem'

type InfoResponse = FileItem

type ErrorResponse = {
  error: string
  code: string
}

export const Route = createFileRoute('/api/files/info')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const rawPath = url.searchParams.get('path')

          if (!rawPath) {
            return json<ErrorResponse>(
              { 
                error: 'path parameter is required',
                code: 'MISSING_PATH',
              }, 
              { status: 400 }
            )
          }

          // Validate and sanitize the path
          const path = validatePath(rawPath, 'Path parameter')

          const fileInfo = await getFileInfo(path)

          return json<InfoResponse>(fileInfo)
        } catch (err) {
          const error = err as Error & FileSystemError
          
          if (error.message.includes('invalid characters') || 
              error.message.includes('traversal attempts')) {
            return json<ErrorResponse>(
              {
                error: error.message,
                code: 'INVALID_PATH',
              },
              { status: 400 },
            )
          }

          const status = error.status || 500
          const code = error.code || 'INTERNAL_ERROR'
          
          return json<ErrorResponse>(
            {
              error: error.message || 'An unexpected error occurred',
              code,
            },
            { status },
          )
        }
      },
    },
  },
})