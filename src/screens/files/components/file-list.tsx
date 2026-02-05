import { HugeiconsIcon } from '@hugeicons/react'
import {
  Folder01Icon,
  File01Icon,
  Image01Icon,
  Video01Icon,
  MusicNote01Icon,
  Archive01Icon,
  Doc01Icon,
  CodeIcon,
} from '@hugeicons/core-free-icons'
import { motion } from 'motion/react'
import { useCallback, useMemo, memo, useState, useRef, useEffect } from 'react'
import { useFileExplorerState } from '../hooks/use-file-explorer-state'
import { FileContextMenu } from './file-context-menu'
import type { FileListing, FileItem } from '../types'
import { cn } from '@/lib/utils'

const EDITABLE_EXTENSIONS = new Set([
  'txt', 'md', 'log', 'json', 'xml', 'yaml', 'yml', 'csv', 'ini', 'conf', 'cfg',
  'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'htm',
  'php', 'rb', 'go', 'rs', 'sh', 'bash', 'zsh', 'toml', 'env', 'gitignore',
  'dockerfile', 'makefile', 'sql', 'graphql', 'svelte', 'vue', 'scss', 'less',
])

interface FileListProps {
  listing?: FileListing
  loading: boolean
  onOpenFile?: (filePath: string) => void
}

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Helper to format date relative to now
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 7) {
    return date.toLocaleDateString()
  } else if (diffDay > 0) {
    return diffDay === 1 ? 'yesterday' : `${diffDay} days ago`
  } else if (diffHour > 0) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`
  } else if (diffMin > 0) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`
  } else {
    return 'just now'
  }
}

// Helper to get file icon based on extension
function getFileIcon(item: FileItem) {
  if (item.isDir) return Folder01Icon

  const ext = item.extension.toLowerCase()
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return Image01Icon
  }
  
  // Video files
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
    return Video01Icon
  }
  
  // Audio files
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) {
    return MusicNote01Icon
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return Archive01Icon
  }
  
  // Text files
  if (['txt', 'md', 'log', 'json', 'xml', 'yaml', 'yml'].includes(ext)) {
    return Doc01Icon
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'php', 'rb', 'go', 'rs'].includes(ext)) {
    return CodeIcon
  }

  return File01Icon
}

// Sort items with useMemo optimization
function useSortedItems(items: FileItem[], sortBy: string, sortAsc: boolean): FileItem[] {
  return useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      // Always sort directories first
      if (a.isDir && !b.isDir) return -1
      if (!a.isDir && b.isDir) return 1
      
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'modified':
          comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime()
          break
        default:
          comparison = a.name.localeCompare(b.name)
      }
      
      return sortAsc ? comparison : -comparison
    })
    
    return sorted
  }, [items, sortBy, sortAsc])
}

// Check for reduced motion preference
function useReducedMotion(): boolean {
  return useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])
}

// Loading skeleton component with proper accessibility
function FileListSkeleton({ viewMode }: { viewMode: 'list' | 'grid' }) {
  const skeletonCount = viewMode === 'grid' ? 12 : 8

  if (viewMode === 'grid') {
    return (
      <div 
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 p-4"
        aria-busy="true"
        aria-label="Loading files"
      >
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div key={i} className="flex flex-col items-center p-3 rounded-lg">
            <div className="w-12 h-12 bg-primary-200 rounded animate-pulse mb-2" />
            <div className="w-16 h-4 bg-primary-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div 
      className="divide-y divide-primary-200"
      aria-busy="true"
      aria-label="Loading files"
    >
      {Array.from({ length: skeletonCount }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="w-6 h-6 bg-primary-200 rounded animate-pulse" />
          <div className="flex-1 min-w-0 h-4 bg-primary-200 rounded animate-pulse" />
          <div className="w-16 h-4 bg-primary-200 rounded animate-pulse" />
          <div className="w-20 h-4 bg-primary-200 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// Memoized grid item component for performance
interface GridItemProps {
  item: FileItem
  isSelected: boolean
  onClick: (item: FileItem) => void
  onDoubleClick: (item: FileItem) => void
  onKeyDown: (e: React.KeyboardEvent, item: FileItem) => void
  onOpenFile?: (filePath: string) => void
  reduceMotion: boolean
}

const GridItem = memo(function GridItem({ 
  item, 
  isSelected, 
  onClick,
  onDoubleClick,
  onKeyDown,
  onOpenFile,
  reduceMotion,
}: GridItemProps) {
  const handleClick = useCallback(() => {
    onClick(item)
  }, [onClick, item])

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(item)
  }, [onDoubleClick, item])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    onKeyDown(e, item)
  }, [onKeyDown, item])

  const getItemAriaLabel = () => {
    if (item.isDir) {
      return `${item.name}, folder`
    }
    return `${item.name}, ${item.extension} file, ${formatFileSize(item.size)}, modified ${formatRelativeTime(item.modified)}`
  }

  const itemComponent = (
    <motion.button
      type="button"
      whileHover={reduceMotion ? {} : { scale: 1.02 }}
      whileTap={reduceMotion ? {} : { scale: 0.98 }}
      transition={{ duration: reduceMotion ? 0 : 0.1 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      aria-label={getItemAriaLabel()}
      className={cn(
        'flex flex-col items-center p-3 rounded-lg w-full',
        'transition-colors duration-150 ease-out',
        'hover:bg-primary-100 focus-visible:bg-primary-100',
        'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
        'touch-manipulation',
        isSelected && 'bg-primary-200'
      )}
    >
      <HugeiconsIcon
        icon={getFileIcon(item)}
        size={48}
        strokeWidth={1}
        className={cn(
          'mb-2',
          item.isDir ? 'text-blue-500' : 'text-primary-600'
        )}
        aria-hidden="true"
      />
      <span className="text-xs text-center text-primary-900 font-medium truncate w-full min-w-0">
        {item.name}
      </span>
      {!item.isDir ? (
        <span className="text-xs text-primary-500 mt-1 tabular-nums">
          {formatFileSize(item.size)}
        </span>
      ) : null}
    </motion.button>
  )

  return (
    <FileContextMenu item={item} onOpenFile={onOpenFile}>
      {itemComponent}
    </FileContextMenu>
  )
})

// Memoized list item component for performance
interface ListItemProps {
  item: FileItem
  isSelected: boolean
  onClick: (item: FileItem) => void
  onDoubleClick: (item: FileItem) => void
  onKeyDown: (e: React.KeyboardEvent, item: FileItem) => void
  onOpenFile?: (filePath: string) => void
  reduceMotion: boolean
}

const ListItem = memo(function ListItem({ 
  item, 
  isSelected, 
  onClick,
  onDoubleClick,
  onKeyDown,
  onOpenFile,
  reduceMotion,
}: ListItemProps) {
  const handleClick = useCallback(() => {
    onClick(item)
  }, [onClick, item])

  const handleDoubleClick = useCallback(() => {
    onDoubleClick(item)
  }, [onDoubleClick, item])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    onKeyDown(e, item)
  }, [onKeyDown, item])

  const getItemAriaLabel = () => {
    if (item.isDir) {
      return `${item.name}, folder, modified ${formatRelativeTime(item.modified)}`
    }
    return `${item.name}, ${item.extension} file, ${formatFileSize(item.size)}, modified ${formatRelativeTime(item.modified)}`
  }

  const itemComponent = (
    <motion.button
      type="button"
      whileHover={reduceMotion ? {} : { backgroundColor: 'rgb(248 250 252)' }}
      transition={{ duration: reduceMotion ? 0 : 0.1 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      aria-label={getItemAriaLabel()}
      className={cn(
        'w-full grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 text-left',
        'transition-colors duration-150 ease-out',
        'hover:bg-primary-100 focus-visible:bg-primary-100',
        'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
        'touch-manipulation',
        isSelected && 'bg-primary-200'
      )}
    >
      <HugeiconsIcon
        icon={getFileIcon(item)}
        size={20}
        strokeWidth={1.5}
        className={cn(
          'mt-0.5 shrink-0',
          item.isDir ? 'text-blue-500' : 'text-primary-600'
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <span className="text-primary-900 font-medium truncate block">
          {item.name}
        </span>
      </div>
      <div className="text-sm text-primary-600 text-right w-16 tabular-nums shrink-0">
        {item.isDir ? '—' : formatFileSize(item.size)}
      </div>
      <div className="text-sm text-primary-600 text-right w-20 tabular-nums shrink-0">
        {formatRelativeTime(item.modified)}
      </div>
    </motion.button>
  )

  return (
    <FileContextMenu item={item} onOpenFile={onOpenFile}>
      {itemComponent}
    </FileContextMenu>
  )
})

// Static empty state JSX
const emptyState = (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <HugeiconsIcon
        icon={Folder01Icon}
        size={48}
        strokeWidth={1}
        className="mx-auto text-primary-400 mb-3"
        aria-hidden="true"
      />
      <p className="text-primary-600 font-medium">This folder is empty</p>
      <p className="text-sm text-primary-500 mt-1">
        Upload files or create a new folder to get started
      </p>
    </div>
  </div>
)

export function FileList({ listing, loading, onOpenFile }: FileListProps) {
  const {
    viewMode,
    sortBy,
    sortAsc,
    selectedFiles,
    navigateTo,
    toggleFileSelection,
  } = useFileExplorerState()

  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const sortedItems = useSortedItems(listing?.items || [], sortBy, sortAsc)

  const handleItemClick = useCallback((item: FileItem) => {
    toggleFileSelection(item.path)
  }, [toggleFileSelection])

  const handleItemDoubleClick = useCallback((item: FileItem) => {
    if (item.isDir) {
      navigateTo(item.path)
    } else if (onOpenFile && EDITABLE_EXTENSIONS.has(item.extension.toLowerCase())) {
      onOpenFile(item.path)
    }
  }, [navigateTo, onOpenFile])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, item: FileItem) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (item.isDir) {
        navigateTo(item.path)
      } else {
        toggleFileSelection(item.path)
      }
    } else if (e.key === ' ') {
      e.preventDefault()
      toggleFileSelection(item.path)
    }
  }, [navigateTo, toggleFileSelection])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sortedItems.length) return
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => Math.min(prev + 1, sortedItems.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setFocusedIndex(sortedItems.length - 1)
          break
      }
    }

    if (containerRef.current) {
      containerRef.current.addEventListener('keydown', handleKeyDown)
      return () => {
        containerRef.current?.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [sortedItems.length])

  if (loading) {
    return <FileListSkeleton viewMode={viewMode} />
  }

  if (!listing) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-primary-500">No listing available</p>
      </div>
    )
  }

  if (sortedItems.length === 0) {
    return emptyState
  }

  if (viewMode === 'grid') {
    return (
      <div 
        ref={containerRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 p-4 overflow-y-auto"
        role="grid"
        aria-label="Files grid"
        tabIndex={0}
      >
        {sortedItems.map((item, index) => (
          <div key={item.path} role="gridcell">
            <GridItem
              item={item}
              isSelected={selectedFiles.has(item.path)}
              onClick={handleItemClick}
              onDoubleClick={handleItemDoubleClick}
              onKeyDown={handleKeyDown}
              onOpenFile={onOpenFile}
              reduceMotion={reduceMotion}
            />
          </div>
        ))}
      </div>
    )
  }

  // List view
  return (
    <div 
      ref={containerRef}
      className="overflow-y-auto"
      role="table"
      aria-label="Files list"
      tabIndex={0}
    >
      <div className="divide-y divide-primary-200">
        {/* Header */}
        <div 
          className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50"
          role="row"
        >
          <div className="w-6" role="columnheader" aria-label="File type" />
          <div role="columnheader">Name</div>
          <div className="w-16 text-right tabular-nums" role="columnheader">Size</div>
          <div className="w-20 text-right tabular-nums" role="columnheader">Modified</div>
        </div>
        
        {/* Items */}
        {sortedItems.map((item, index) => (
          <div key={item.path} role="row">
            <ListItem
              item={item}
              isSelected={selectedFiles.has(item.path)}
              onClick={handleItemClick}
              onDoubleClick={handleItemDoubleClick}
              onKeyDown={handleKeyDown}
              onOpenFile={onOpenFile}
              reduceMotion={reduceMotion}
            />
          </div>
        ))}
      </div>
    </div>
  )
}