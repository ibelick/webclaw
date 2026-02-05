import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { listFiles } from '../../../server/filesystem'
import { validatePath } from '../../../server/path-utils'
import type { FileListing } from '../../../lib/file-types'
import type { FileSystemError } from '../../../server/filesystem'

type ListResponse = FileListing

type ErrorResponse = {
  error: string
  code: string
}

export const Route = createFileRoute('/api/files/list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const rawPath = url.searchParams.get('path') || '/'

          // Validate and sanitize the path
          const path = validatePath(rawPath, 'Path parameter')

          const listing = await listFiles(path)

          return json<ListResponse>(listing)
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