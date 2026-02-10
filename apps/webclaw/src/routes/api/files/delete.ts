import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { deleteFile } from '../../../server/filesystem'
import { validatePath } from '../../../server/path-utils'
import type { FileSystemError } from '../../../server/filesystem'

type DeleteResponse = {
  ok: true
  message: string
  path: string
}

type ErrorResponse = {
  error: string
  code: string
}

export const Route = createFileRoute('/api/files/delete')({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
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

          // Prevent deleting root path
          if (path === '/' || path === '') {
            return json<ErrorResponse>(
              {
                error: 'Cannot delete the root directory',
                code: 'FORBIDDEN_DELETE_ROOT',
              },
              { status: 403 } // Forbidden
            )
          }

          await deleteFile(path)

          return json<DeleteResponse>({ 
            ok: true, 
            message: 'File deleted successfully',
            path,
          })
        } catch (err) {
          const error = err as Error & FileSystemError
          
          if (error.message.includes('invalid characters') || 
              error.message.includes('traversal attempts') ||
              error.message.includes('Cannot delete')) {
            return json<ErrorResponse>(
              {
                error: error.message,
                code: 'VALIDATION_ERROR',
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