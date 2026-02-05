import { createFileRoute } from '@tanstack/react-router'
import { downloadFile, getFileInfo } from '../../../server/filesystem'
import { validatePath } from '../../../server/path-utils'
import type { FileSystemError } from '../../../server/filesystem'

type ErrorResponse = {
  error: string
  code: string
}

const MAX_TEXT_SIZE = 5 * 1024 * 1024 // 5MB max for text editing

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'log', 'json', 'xml', 'yaml', 'yml', 'csv', 'ini', 'conf', 'cfg',
  'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'htm',
  'php', 'rb', 'go', 'rs', 'sh', 'bash', 'zsh', 'toml', 'env', 'gitignore',
  'dockerfile', 'makefile', 'sql', 'graphql', 'svelte', 'vue', 'scss', 'less',
  'diff', 'patch',
])

export const Route = createFileRoute('/api/files/read')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const rawPath = url.searchParams.get('path')

          if (!rawPath) {
            return new Response(
              JSON.stringify({ error: 'path parameter is required', code: 'MISSING_PATH' } as ErrorResponse),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const path = validatePath(rawPath, 'Path parameter')
          const fileInfo = await getFileInfo(path)

          if (fileInfo.isDir) {
            return new Response(
              JSON.stringify({ error: 'Cannot read a directory', code: 'IS_DIRECTORY' } as ErrorResponse),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          // Check extension
          const ext = fileInfo.extension.toLowerCase()
          if (!TEXT_EXTENSIONS.has(ext) && ext !== '') {
            return new Response(
              JSON.stringify({ error: 'File type not supported for text editing', code: 'UNSUPPORTED_TYPE' } as ErrorResponse),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          if (fileInfo.size > MAX_TEXT_SIZE) {
            return new Response(
              JSON.stringify({ error: 'File too large for text editing (max 5MB)', code: 'FILE_TOO_LARGE' } as ErrorResponse),
              { status: 413, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const content = await downloadFile(path)
          const text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(content))

          return new Response(
            JSON.stringify({ content: text, name: fileInfo.name, extension: fileInfo.extension, size: fileInfo.size }),
            { headers: { 'Content-Type': 'application/json' } },
          )
        } catch (err) {
          const error = err as Error & FileSystemError
          const status = error.status || 500
          const code = error.code || 'INTERNAL_ERROR'
          return new Response(
            JSON.stringify({ error: error.message || 'An unexpected error occurred', code } as ErrorResponse),
            { status, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})
