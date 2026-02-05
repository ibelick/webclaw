import { readdir, stat, readFile, writeFile, rm, mkdir, rename, lstat, realpath } from 'node:fs/promises'
import { join, resolve, relative, extname } from 'node:path'
import type { FileListing, FileItem } from '../lib/file-types'

export type FileSystemError = {
  message: string
  status: number
  code: string
}

function createError(message: string, status: number, code: string): Error & FileSystemError {
  const err = new Error(message) as Error & FileSystemError
  err.status = status
  err.code = code
  return err
}

/** Cache the resolved root so we only realpath once */
let _cachedRoot: string | null = null

/**
 * Get the root directory for file operations.
 * Configurable via FILES_ROOT env var.
 * Defaults to the user's home directory.
 */
function getFilesRoot(): string {
  if (_cachedRoot) return _cachedRoot
  const root = process.env.FILES_ROOT?.trim()
  _cachedRoot = root ? resolve(root) : (process.env.HOME || '/home')
  return _cachedRoot
}

/**
 * Resolve a virtual path to an absolute filesystem path,
 * ensuring it stays within the root directory (jail).
 * Checks both the logical path and the real path (following symlinks).
 */
async function resolveSafePath(virtualPath: string): Promise<string> {
  const root = getFilesRoot()

  // Reject null bytes early
  if (virtualPath.includes('\0')) {
    throw createError('Invalid path', 400, 'INVALID_PATH')
  }

  // Strip leading slashes and normalize
  const cleaned = virtualPath.replace(/^\/+/, '')
  const resolved = resolve(root, cleaned)

  // Check logical path stays within root
  const rel = relative(root, resolved)
  if (rel.startsWith('..') || resolve(root, rel) !== resolved) {
    throw createError('Path is outside the allowed directory', 403, 'FORBIDDEN')
  }

  // If the path exists, also verify the real path (following symlinks)
  try {
    const real = await realpath(resolved)
    const realRoot = await realpath(root)
    if (!real.startsWith(realRoot + '/') && real !== realRoot) {
      throw createError('Path is outside the allowed directory', 403, 'FORBIDDEN')
    }
  } catch (err: any) {
    // ENOENT is OK — path doesn't exist yet (upload, mkdir)
    if (err.code !== 'ENOENT' && err.status !== 403) {
      // For other errors, just continue with the logical path check
    }
    if (err.status === 403) throw err
  }

  return resolved
}

/**
 * Classify file type based on extension
 */
function classifyFile(name: string, isDirectory: boolean): string {
  if (isDirectory) return 'directory'

  const ext = extname(name).toLowerCase().slice(1)

  const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'])
  const videoExts = new Set(['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'])
  const audioExts = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'])
  const textExts = new Set([
    'txt', 'md', 'log', 'json', 'xml', 'yaml', 'yml', 'csv', 'ini', 'conf', 'cfg',
    'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'htm',
    'php', 'rb', 'go', 'rs', 'sh', 'bash', 'zsh', 'fish', 'toml', 'env', 'gitignore',
    'dockerfile', 'makefile',
  ])

  if (imageExts.has(ext)) return 'image'
  if (videoExts.has(ext)) return 'video'
  if (audioExts.has(ext)) return 'audio'
  if (textExts.has(ext)) return 'text'
  return 'blob'
}

/**
 * Build a FileItem from fs.Stats
 */
async function buildFileItem(absolutePath: string, name: string, virtualPath: string): Promise<FileItem> {
  const [stats, linkStats] = await Promise.all([
    stat(absolutePath),
    lstat(absolutePath),
  ])
  const isDir = stats.isDirectory()
  return {
    path: virtualPath,
    name,
    size: stats.size,
    extension: isDir ? '' : extname(name).slice(1).toLowerCase(),
    modified: stats.mtime.toISOString(),
    mode: stats.mode,
    isDir,
    isSymlink: linkStats.isSymbolicLink(),
    type: classifyFile(name, isDir),
  }
}

// ── Public API ──────────────────────────────────────────────────────

export async function listFiles(path: string = '/'): Promise<FileListing> {
  const absolutePath = await resolveSafePath(path)

  let stats
  try {
    stats = await stat(absolutePath)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw createError(`Path not found: ${path}`, 404, 'NOT_FOUND')
    }
    throw createError(`Failed to access path: ${err.message}`, 500, 'FS_ERROR')
  }

  if (!stats.isDirectory()) {
    throw createError('Path is not a directory', 400, 'NOT_DIRECTORY')
  }

  let entries
  try {
    entries = await readdir(absolutePath, { withFileTypes: true })
  } catch (err: any) {
    if (err.code === 'EACCES') {
      throw createError('Permission denied', 403, 'PERMISSION_DENIED')
    }
    throw createError(`Failed to read directory: ${err.message}`, 500, 'FS_ERROR')
  }

  const visibleEntries = entries

  const items: FileItem[] = []
  let numDirs = 0
  let numFiles = 0

  for (const entry of visibleEntries) {
    const entryPath = join(absolutePath, entry.name)
    const virtualEntryPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`

    try {
      const item = await buildFileItem(entryPath, entry.name, virtualEntryPath)
      items.push(item)
      if (item.isDir) numDirs++
      else numFiles++
    } catch {
      // Skip entries we can't stat (broken symlinks, permission issues, etc.)
    }
  }

  // Sort: directories first, then alphabetically
  items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  const dirName = path === '/' ? '/' : path.split('/').pop() || '/'

  return {
    items,
    path,
    name: dirName,
    isDir: true,
    size: stats.size,
    modified: stats.mtime.toISOString(),
    mode: stats.mode,
    numDirs,
    numFiles,
    sorting: { by: 'name', asc: true },
  }
}

export async function getFileInfo(path: string): Promise<FileItem> {
  const absolutePath = await resolveSafePath(path)

  try {
    const name = path.split('/').pop() || ''
    return await buildFileItem(absolutePath, name, path)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw createError(`File not found: ${path}`, 404, 'NOT_FOUND')
    }
    throw createError(`Failed to get file info: ${err.message}`, 500, 'FS_ERROR')
  }
}

export async function downloadFile(path: string): Promise<ArrayBuffer> {
  const absolutePath = await resolveSafePath(path)

  try {
    const buffer = await readFile(absolutePath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw createError(`File not found: ${path}`, 404, 'NOT_FOUND')
    }
    if (err.code === 'EACCES') {
      throw createError('Permission denied', 403, 'PERMISSION_DENIED')
    }
    throw createError(`Failed to read file: ${err.message}`, 500, 'FS_ERROR')
  }
}

export async function uploadFile(
  path: string,
  content: ArrayBuffer,
): Promise<void> {
  const absolutePath = await resolveSafePath(path)

  // Ensure parent directory exists
  const parentDir = absolutePath.substring(0, absolutePath.lastIndexOf('/'))
  await mkdir(parentDir, { recursive: true }).catch(() => {})

  try {
    await writeFile(absolutePath, Buffer.from(content))
  } catch (err: any) {
    if (err.code === 'EACCES') {
      throw createError('Permission denied', 403, 'PERMISSION_DENIED')
    }
    throw createError(`Failed to write file: ${err.message}`, 500, 'FS_ERROR')
  }
}

export async function deleteFile(path: string): Promise<void> {
  const absolutePath = await resolveSafePath(path)

  try {
    await rm(absolutePath, { recursive: true })
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw createError(`File not found: ${path}`, 404, 'NOT_FOUND')
    }
    if (err.code === 'EACCES') {
      throw createError('Permission denied', 403, 'PERMISSION_DENIED')
    }
    throw createError(`Failed to delete: ${err.message}`, 500, 'FS_ERROR')
  }
}

export async function createFolder(path: string): Promise<void> {
  const absolutePath = await resolveSafePath(path)

  try {
    await mkdir(absolutePath, { recursive: true })
  } catch (err: any) {
    if (err.code === 'EACCES') {
      throw createError('Permission denied', 403, 'PERMISSION_DENIED')
    }
    if (err.code === 'EEXIST') {
      throw createError('Directory already exists', 409, 'ALREADY_EXISTS')
    }
    throw createError(`Failed to create directory: ${err.message}`, 500, 'FS_ERROR')
  }
}

export async function renameFile(src: string, dst: string): Promise<void> {
  const absoluteSrc = await resolveSafePath(src)
  const absoluteDst = await resolveSafePath(dst)

  // Ensure destination parent exists
  const parentDir = absoluteDst.substring(0, absoluteDst.lastIndexOf('/'))
  await mkdir(parentDir, { recursive: true }).catch(() => {})

  try {
    await rename(absoluteSrc, absoluteDst)
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw createError(`Source not found: ${src}`, 404, 'NOT_FOUND')
    }
    if (err.code === 'EACCES') {
      throw createError('Permission denied', 403, 'PERMISSION_DENIED')
    }
    throw createError(`Failed to rename: ${err.message}`, 500, 'FS_ERROR')
  }
}
