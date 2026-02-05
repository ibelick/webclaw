import { HugeiconsIcon } from '@hugeicons/react'
import {
  Download04Icon,
  Edit02Icon,
  Delete02Icon,
  FolderOpenIcon,
  FileEditIcon,
} from '@hugeicons/core-free-icons'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useFileDownload, useFileDelete, useFileRename } from '../hooks/use-files'
import { useFileExplorerState } from '../hooks/use-file-explorer-state'
import type { FileAction } from '../types'

const EDITABLE_EXTENSIONS = new Set([
  'txt', 'md', 'log', 'json', 'xml', 'yaml', 'yml', 'csv', 'ini', 'conf', 'cfg',
  'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'htm',
  'php', 'rb', 'go', 'rs', 'sh', 'bash', 'zsh', 'toml', 'env', 'gitignore',
  'dockerfile', 'makefile', 'sql', 'graphql', 'svelte', 'vue', 'scss', 'less',
])
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FileItem } from '../types'

interface FileContextMenuProps {
  item: FileItem
  children: React.ReactNode
  onOpenFile?: (filePath: string) => void
}

export function FileContextMenu({ item, children, onOpenFile }: FileContextMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [newName, setNewName] = useState(item.name)
  const [renameError, setRenameError] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const { navigateTo } = useFileExplorerState()
  const downloadMutation = useFileDownload()
  const deleteMutation = useFileDelete()
  const renameMutation = useFileRename()

  const handleAction = useCallback((action: FileAction) => {
    switch (action) {
      case 'open':
        if (item.isDir) {
          navigateTo(item.path)
        }
        break
      case 'edit':
        if (onOpenFile) {
          onOpenFile(item.path)
        }
        break
      case 'download':
        if (!item.isDir) {
          downloadMutation.mutate(item.path)
        }
        break
      case 'rename':
        setNewName(item.name)
        setRenameError('')
        setRenameDialogOpen(true)
        break
      case 'delete':
        setDeleteDialogOpen(true)
        break
    }
  }, [item, downloadMutation, navigateTo])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuPosition({ x: e.clientX, y: e.clientY })
    setMenuOpen(true)
  }, [])

  const confirmRename = useCallback(async () => {
    if (!newName || newName === item.name) {
      setRenameDialogOpen(false)
      return
    }

    setRenameError('')

    try {
      await renameMutation.mutateAsync({
        oldPath: item.path,
        newName: newName.trim(),
      })
      setRenameDialogOpen(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to rename'
      setRenameError(errorMessage)
    }
  }, [newName, item, renameMutation])

  const confirmDelete = useCallback(async () => {
    try {
      await deleteMutation.mutateAsync(item.path)
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Delete failed:', error)
      // Error will be shown via the mutation's error handling
    }
  }, [item.path, deleteMutation])

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmRename()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setRenameDialogOpen(false)
    }
  }, [confirmRename])

  const handleRenameInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewName(e.target.value)
    if (renameError) {
      setRenameError('')
    }
  }, [renameError])

  // Focus and select filename without extension when rename dialog opens
  useEffect(() => {
    if (renameDialogOpen && renameInputRef.current) {
      const input = renameInputRef.current
      input.focus()
      
      // Select filename without extension
      if (!item.isDir && item.extension) {
        const nameWithoutExt = item.name.replace(new RegExp(`\\.${item.extension}$`), '')
        input.setSelectionRange(0, nameWithoutExt.length)
      } else {
        input.select()
      }
    }
  }, [renameDialogOpen, item])

  const isValidRename = newName.trim().length > 0 && 
    !/[<>:"/\\|?*]/.test(newName) && 
    !newName.includes('..') && 
    newName !== item.name

  const getDownloadText = () => {
    return downloadMutation.isPending ? 'Downloading…' : 'Download'
  }

  const getRenameText = () => {
    return renameMutation.isPending ? 'Renaming…' : 'Rename'
  }

  const getDeleteText = () => {
    return deleteMutation.isPending ? 'Deleting…' : 'Delete'
  }

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!menuOpen) return
    const handleClose = () => setMenuOpen(false)
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    // Delay to avoid closing immediately from the same click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClose)
      document.addEventListener('contextmenu', handleClose)
      document.addEventListener('keydown', handleEsc)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClose)
      document.removeEventListener('contextmenu', handleClose)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [menuOpen])

  const handleMenuItemClick = useCallback((action: FileAction) => {
    setMenuOpen(false)
    handleAction(action)
  }, [handleAction])

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-50"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="fixed min-w-[140px] rounded-lg bg-primary-50 p-1 text-sm text-primary-900 shadow-lg outline outline-primary-900/10 z-50"
            style={{
              left: menuPosition.x,
              top: menuPosition.y,
            }}
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            {item.isDir ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuItemClick('open')}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary-900',
                  'hover:bg-primary-100 select-none font-[450]',
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                )}
              >
                <HugeiconsIcon icon={FolderOpenIcon} size={16} strokeWidth={1.5} aria-hidden="true" />
                Open
              </button>
            ) : null}
            {!item.isDir ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuItemClick('download')}
                disabled={downloadMutation.isPending}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary-900',
                  'hover:bg-primary-100 select-none font-[450]',
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                )}
              >
                <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={1.5} aria-hidden="true" />
                {getDownloadText()}
              </button>
            ) : null}
            {!item.isDir && EDITABLE_EXTENSIONS.has(item.extension.toLowerCase()) ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuItemClick('edit')}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary-900',
                  'hover:bg-primary-100 select-none font-[450]',
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                )}
              >
                <HugeiconsIcon icon={FileEditIcon} size={16} strokeWidth={1.5} aria-hidden="true" />
                Edit
              </button>
            ) : null}

            <button
              type="button"
              role="menuitem"
              onClick={() => handleMenuItemClick('rename')}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-primary-900',
                'hover:bg-primary-100 select-none font-[450]',
                'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
              )}
            >
              <HugeiconsIcon icon={Edit02Icon} size={16} strokeWidth={1.5} aria-hidden="true" />
              Rename
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleMenuItemClick('delete')}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                'text-red-600 hover:bg-red-50 select-none font-[450]',
                'focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:outline-none',
              )}
            >
              <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.5} aria-hidden="true" />
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {/* Rename Dialog */}
      <DialogRoot open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <div className="p-6">
            <DialogTitle className="mb-2">
              Rename {item.isDir ? 'Folder' : 'File'}
            </DialogTitle>
            <DialogDescription className="mb-4">
              Enter a new name for "{item.name}"
            </DialogDescription>
            
            <div className="mb-6">
              <label 
                htmlFor="rename-input"
                className="block text-sm font-medium text-primary-900 mb-2"
              >
                {item.isDir ? 'Folder' : 'File'} Name
              </label>
              <input
                id="rename-input"
                ref={renameInputRef}
                type="text"
                value={newName}
                onChange={handleRenameInputChange}
                onKeyDown={handleRenameKeyDown}
                autoFocus
                spellCheck={false}
                aria-describedby={renameError ? 'rename-error' : undefined}
                aria-invalid={renameError ? 'true' : 'false'}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg',
                  'transition-colors duration-150 ease-out',
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                  'touch-manipulation',
                  renameError 
                    ? 'border-red-300 focus-visible:ring-red-300'
                    : 'border-primary-200 focus:border-primary-300'
                )}
              />
              {renameError ? (
                <p 
                  id="rename-error"
                  className="text-sm text-red-600 mt-1"
                  role="alert"
                  aria-live="polite"
                >
                  {renameError}
                </p>
              ) : null}
            </div>

            {/* Loading indicator */}
            {renameMutation.isPending ? (
              <div className="mb-4 p-3 bg-primary-50 rounded-lg" aria-live="polite">
                <p className="text-sm text-primary-600">Renaming…</p>
              </div>
            ) : null}
            
            <div className="flex justify-end gap-2">
              <DialogClose
                disabled={renameMutation.isPending}
                className={cn(
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                  'touch-manipulation'
                )}
              >
                Cancel
              </DialogClose>
              <Button
                onClick={confirmRename}
                disabled={!isValidRename || renameMutation.isPending}
                className={cn(
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                  'touch-manipulation',
                  (!isValidRename || renameMutation.isPending) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {getRenameText()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogRoot>

      {/* Delete Confirmation Dialog */}
      <DialogRoot open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <div className="p-6">
            <DialogTitle className="mb-2">
              Delete {item.isDir ? 'Folder' : 'File'}
            </DialogTitle>
            <DialogDescription className="mb-4">
              Are you sure you want to delete "{item.name}"?
              {item.isDir ? ' This will delete the folder and all its contents.' : ''}
              {' '}This action cannot be undone.
            </DialogDescription>

            {/* Loading indicator */}
            {deleteMutation.isPending ? (
              <div className="mb-4 p-3 bg-red-50 rounded-lg" aria-live="polite">
                <p className="text-sm text-red-700">Deleting…</p>
              </div>
            ) : null}
            
            <div className="flex justify-end gap-2">
              <DialogClose
                disabled={deleteMutation.isPending}
                className={cn(
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                  'touch-manipulation'
                )}
              >
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className={cn(
                  'focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:outline-none',
                  'touch-manipulation',
                  deleteMutation.isPending && 'opacity-50 cursor-not-allowed'
                )}
              >
                {getDeleteText()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogRoot>
    </>
  )
}