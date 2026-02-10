import { createFileRoute } from '@tanstack/react-router'
import { downloadFile, getFileInfo } from '../../../server/filesystem'
import { validatePath } from '../../../server/path-utils'
import type { FileSystemError } from '../../../server/filesystem'

type ErrorResponse = {
  error: string
  code: string
}

// Expanded MIME type map
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mimeTypes: Record<string, string> = {
    // Text files
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'json': 'application/json',
    'xml': 'application/xml',
    'csv': 'text/csv',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
    
    // Programming languages
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'py': 'text/x-python',
    
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    
    // Audio/Video
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Archives
    'zip': 'application/zip',
    'tar.gz': 'application/gzip',
    'gz': 'application/gzip',
    
    // Fonts
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

function encodeFilename(filename: string): string {
  // RFC 6266 compliant UTF-8 filename encoding
  const encodedFilename = encodeURIComponent(filename)
  return `filename*=UTF-8''${encodedFilename}`
}

function isStaticAsset(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const staticExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'css', 'js', 'woff', 'woff2', 'ttf', 'otf']
  return staticExts.includes(ext)
}

export const Route = createFileRoute('/api/files/download')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const rawPath = url.searchParams.get('path')

          if (!rawPath) {
            return new Response(
              JSON.stringify({ 
                error: 'path parameter is required',
                code: 'MISSING_PATH',
              } as ErrorResponse),
              { 
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          // Validate and sanitize the path
          const path = validatePath(rawPath, 'Path parameter')

          // Get file info to determine mime type and filename
          const fileInfo = await getFileInfo(path)
          const content = await downloadFile(path)

          const contentType = getContentType(fileInfo.name)
          const contentDisposition = `attachment; ${encodeFilename(fileInfo.name)}`
          
          const headers: Record<string, string> = {
            'Content-Type': contentType,
            'Content-Disposition': contentDisposition,
            'Content-Length': content.byteLength.toString(),
          }

          // Add cache control for static assets
          if (isStaticAsset(fileInfo.name)) {
            headers['Cache-Control'] = 'public, max-age=31536000' // 1 year
          } else {
            headers['Cache-Control'] = 'no-cache'
          }

          return new Response(content, { headers })
        } catch (err) {
          const error = err as Error & FileSystemError
          
          if (error.message.includes('invalid characters') || 
              error.message.includes('traversal attempts')) {
            return new Response(
              JSON.stringify({
                error: error.message,
                code: 'INVALID_PATH',
              } as ErrorResponse),
              { 
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          const status = error.status || 500
          const code = error.code || 'INTERNAL_ERROR'

          return new Response(
            JSON.stringify({
              error: error.message || 'An unexpected error occurred',
              code,
            } as ErrorResponse),
            { 
              status,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      },
    },
  },
})