import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { uploadFile } from '../../../server/filesystem'
import { validatePath, validateFilename } from '../../../server/path-utils'
import type { FileSystemError } from '../../../server/filesystem'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

type UploadedFileInfo = {
  filename: string
  size: number
  path: string
}

type UploadResponse = {
  ok: true
  message: string
  files: UploadedFileInfo[]
}

type ErrorResponse = {
  error: string
  code: string
}

export const Route = createFileRoute('/api/files/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData()
          const rawPath = formData.get('path') as string | null

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

          // Get all files from FormData (supports multiple file uploads)
          const files: File[] = []
          for (const [key, value] of formData.entries()) {
            if (key === 'file' || key.startsWith('file')) {
              if (value instanceof File) {
                files.push(value)
              }
            }
          }

          if (files.length === 0) {
            return json<ErrorResponse>(
              { 
                error: 'At least one file is required',
                code: 'NO_FILES',
              }, 
              { status: 400 }
            )
          }

          const uploadedFiles: UploadedFileInfo[] = []

          for (const file of files) {
            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
              return json<ErrorResponse>(
                {
                  error: `File "${file.name}" is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
                  code: 'FILE_TOO_LARGE',
                },
                { status: 413 } // Payload Too Large
              )
            }

            // Validate filename
            if (!validateFilename(file.name)) {
              return json<ErrorResponse>(
                {
                  error: `Invalid filename: "${file.name}". Filenames cannot contain path separators or control characters`,
                  code: 'INVALID_FILENAME',
                },
                { status: 400 }
              )
            }

            // Convert file to ArrayBuffer
            const content = await file.arrayBuffer()
            
            // Construct full file path
            const fullPath = path.endsWith('/') ? `${path}${file.name}` : `${path}/${file.name}`
            
            await uploadFile(fullPath, content)

            uploadedFiles.push({
              filename: file.name,
              size: content.byteLength,
              path: fullPath,
            })
          }

          return json<UploadResponse>({ 
            ok: true, 
            message: `${uploadedFiles.length} file(s) uploaded successfully`,
            files: uploadedFiles,
          })
        } catch (err) {
          const error = err as Error & FileSystemError
          
          if (error.message.includes('invalid characters') || 
              error.message.includes('traversal attempts') ||
              error.message.includes('Invalid filename')) {
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