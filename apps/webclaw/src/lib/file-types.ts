export type FileItem = {
  path: string
  name: string
  size: number
  extension: string
  modified: string
  mode: number
  isDir: boolean
  isSymlink: boolean
  type: string // 'directory' | 'text' | 'image' | 'video' | 'audio' | 'blob'
}

export type FileListing = {
  items: FileItem[]
  path: string
  name: string
  isDir: boolean
  size: number
  modified: string
  mode: number
  numDirs: number
  numFiles: number
  sorting: {
    by: string
    asc: boolean
  }
}
