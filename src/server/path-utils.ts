import { posix } from 'path'

/**
 * Sanitize and validate file paths to prevent directory traversal attacks
 */
export function sanitizePath(path: string): string {
  if (typeof path !== 'string' || path.length === 0) {
    return '/'
  }

  // Normalize path using posix path handling (works consistently across platforms)
  let normalized = posix.normalize(path)
  
  // Ensure path starts with /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized
  }

  // Remove any remaining .. components that might have escaped normalization
  const parts = normalized.split('/').filter(part => part !== '' && part !== '.')
  const safeParts: string[] = []
  
  for (const part of parts) {
    if (part === '..') {
      // Remove the last safe part (go up one directory)
      // but never go above root
      if (safeParts.length > 0) {
        safeParts.pop()
      }
    } else {
      safeParts.push(part)
    }
  }

  // Reconstruct path
  return '/' + safeParts.join('/')
}

/**
 * Check if a path is safe (no traversal attempts)
 */
export function isPathSafe(path: string): boolean {
  if (typeof path !== 'string') {
    return false
  }

  // Check for obvious traversal attempts
  if (path.includes('../') || path.includes('..\\') || path === '..') {
    return false
  }

  // Check for null bytes (security concern)
  if (path.includes('\0')) {
    return false
  }

  // Check for Windows-style paths (security concern on Unix systems)
  if (path.includes('\\')) {
    return false
  }

  // Sanitize and compare - if they differ, original was unsafe
  const sanitized = sanitizePath(path)
  return path === sanitized || (path.endsWith('/') && sanitized === path.slice(0, -1))
}

/**
 * Validate that a path is safe for file operations
 * Throws an error if the path is unsafe
 */
export function validatePath(path: string, context: string = 'Path'): string {
  if (!path || typeof path !== 'string') {
    throw new Error(`${context} is required`)
  }

  if (!isPathSafe(path)) {
    throw new Error(`${context} contains invalid characters or traversal attempts`)
  }

  return sanitizePath(path)
}

/**
 * Validate filename to ensure it doesn't contain path separators or other dangerous chars
 */
export function validateFilename(filename: string): boolean {
  if (typeof filename !== 'string' || filename.length === 0) {
    return false
  }

  // Reject filenames with path separators
  if (filename.includes('/') || filename.includes('\\')) {
    return false
  }

  // Reject null bytes
  if (filename.includes('\0')) {
    return false
  }

  // Reject control characters (0-31)
  for (let i = 0; i < filename.length; i++) {
    const code = filename.charCodeAt(i)
    if (code >= 0 && code <= 31) {
      return false
    }
  }

  // Reject reserved names on Windows (even on Unix, for consistency)
  const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 
                   'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 
                   'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  
  const nameUpper = filename.toUpperCase()
  if (reserved.includes(nameUpper) || reserved.some(res => nameUpper.startsWith(res + '.'))) {
    return false
  }

  // Reject names that are just dots
  if (filename === '.' || filename === '..') {
    return false
  }

  return true
}