import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { renameFile, getFileInfo } from '../../../server/filesystem'
import { validatePath, validateFilename } from '../../../server/path-utils'
import type { FileSystemError } from '../../../server/filesystem'

type RenameResponse = {
  ok: true
  message: string
  src: string
  dst: string
}

type ErrorResponse = {
  error: string
  code: string
}

export const Route = createFileRoute('/api/files/rename')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >

          const rawSrc = typeof body.src === 'string' ? body.src.trim() : ''
          const rawDst = typeof body.dst === 'string' ? body.dst.trim() : ''

          if (!rawSrc) {
            return json<ErrorResponse>(
              { 
                error: 'src path is required',
                code: 'MISSING_SRC_PATH',
              }, 
              { status: 400 }
            )
          }

          if (!rawDst) {
            return json<ErrorResponse>(
              { 
                error: 'dst path is required',
                code: 'MISSING_DST_PATH',
              }, 
              { status: 400 }
            )
          }

          // Validate and sanitize both paths
          const src = validatePath(rawSrc, 'Source path')
          const dst = validatePath(rawDst, 'Destination path')

          // Prevent renaming root
          if (src === '/' || src === '') {
            return json<ErrorResponse>(
              {
                error: 'Cannot rename the root directory',
                code: 'FORBIDDEN_RENAME_ROOT',
              },
              { status: 403 }
            )
          }

          // Check if it's just a filename (for validation)
          const dstFilename = dst.split('/').pop() || ''
          if (dstFilename && !validateFilename(dstFilename)) {
            return json<ErrorResponse>(
              {
                error: `Invalid destination filename: "${dstFilename}". Filenames cannot contain path separators or control characters`,
                code: 'INVALID_FILENAME',
              },
              { status: 400 }
            )
          }

          // Check if destination already exists to prevent overwriting
          let overwriteWarning = false
          try {
            await getFileInfo(dst)
            overwriteWarning = true
          } catch (err) {
            // File doesn't exist, which is what we want for rename
          }

          // Allow override with explicit query parameter
          const url = new URL(request.url)
          const allowOverwrite = url.searchParams.get('override') === 'true'

          if (overwriteWarning && !allowOverwrite) {
            return json<ErrorResponse>(
              {
                error: `Destination "${dst}" already exists. Use ?override=true to overwrite`,
                code: 'DESTINATION_EXISTS',
              },
              { status: 409 } // Conflict
            )
          }

          await renameFile(src, dst)

          return json<RenameResponse>({ 
            ok: true, 
            message: overwriteWarning ? 'File renamed successfully (existing file overwritten)' : 'File renamed successfully',
            src,
            dst,
          })
        } catch (err) {
          const error = err as Error & FileSystemError
          
          if (error.message.includes('invalid characters') || 
              error.message.includes('traversal attempts') ||
              error.message.includes('Invalid destination') ||
              error.message.includes('Cannot rename') ||
              error.message.includes('already exists')) {
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