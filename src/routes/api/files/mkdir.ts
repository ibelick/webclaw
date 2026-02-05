import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { createFolder } from '../../../server/filesystem'
import { validatePath } from '../../../server/path-utils'
import type { FileSystemError } from '../../../server/filesystem'

type MkdirResponse = {
  ok: true
  message: string
  path: string
}

type ErrorResponse = {
  error: string
  code: string
}

function validateFolderName(path: string): void {
  // Extract folder name from path
  const folderName = path.split('/').pop() || ''
  
  if (!folderName) {
    throw new Error('Folder name cannot be empty')
  }

  // Check for invalid characters in folder name
  const invalidChars = /[<>:"|*?]/
  if (invalidChars.test(folderName)) {
    throw new Error(`Folder name contains invalid characters: ${folderName}`)
  }

  // Prevent creating system-like paths
  const systemPaths = [
    'bin', 'boot', 'dev', 'etc', 'lib', 'lib64', 'mnt', 'opt', 'proc', 
    'root', 'run', 'sbin', 'srv', 'sys', 'tmp', 'usr', 'var',
    'System', 'Windows', 'Program Files', 'Program Files (x86)'
  ]
  
  if (systemPaths.includes(folderName)) {
    throw new Error(`Cannot create system directory: ${folderName}`)
  }

  // Prevent names that are just dots or whitespace
  if (folderName.trim() === '' || /^\.+$/.test(folderName)) {
    throw new Error('Invalid folder name')
  }
}

export const Route = createFileRoute('/api/files/mkdir')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >

          const rawPath = typeof body.path === 'string' ? body.path.trim() : ''

          if (!rawPath) {
            return json<ErrorResponse>(
              { 
                error: 'path is required',
                code: 'MISSING_PATH',
              }, 
              { status: 400 }
            )
          }

          // Validate and sanitize the path
          const path = validatePath(rawPath, 'Path parameter')

          // Additional validation for folder names
          validateFolderName(path)

          await createFolder(path)

          return json<MkdirResponse>({ 
            ok: true, 
            message: 'Directory created successfully',
            path,
          })
        } catch (err) {
          const error = err as Error & FileSystemError
          
          if (error.message.includes('invalid characters') || 
              error.message.includes('traversal attempts') ||
              error.message.includes('Invalid folder') ||
              error.message.includes('Cannot create system') ||
              error.message.includes('Folder name')) {
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