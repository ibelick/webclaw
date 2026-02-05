import { useState, useCallback } from 'react'
import { useCreateFolder } from '../hooks/use-files'
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath: string
}

export function CreateFolderDialog({ open, onOpenChange, currentPath }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('')
  const [error, setError] = useState('')
  const createFolderMutation = useCreateFolder()

  const handleCreate = useCallback(async () => {
    if (!folderName.trim()) return

    setError('')

    try {
      await createFolderMutation.mutateAsync({
        path: currentPath,
        name: folderName.trim(),
      })
      setFolderName('')
      onOpenChange(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create folder'
      setError(errorMessage)
      console.error('Create folder failed:', error)
    }
  }, [folderName, currentPath, createFolderMutation, onOpenChange])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setFolderName('')
      setError('')
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreate()
    }
  }, [handleCreate])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFolderName(value)
    
    // Clear error when user starts typing
    if (error) {
      setError('')
    }
  }, [error])

  // Validate folder name
  const isValidName = folderName.trim().length > 0 && 
    !/[<>:"/\\|?*]/.test(folderName) && 
    !folderName.includes('..')

  const getButtonText = () => {
    if (createFolderMutation.isPending) {
      return 'Creating…'
    }
    return 'Create Folder'
  }

  const getValidationError = () => {
    if (!folderName.trim()) {
      return ''
    }
    
    if (folderName.includes('..')) {
      return 'Folder name cannot contain ".."'
    }
    
    if (/[<>:"/\\|?*]/.test(folderName)) {
      return 'Invalid characters: < > : " / \\ | ? *'
    }
    
    return ''
  }

  const validationError = getValidationError()
  const showError = error || validationError

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <div className="p-6">
          <DialogTitle className="mb-2">Create New Folder</DialogTitle>
          <DialogDescription className="mb-4">
            Create a new folder in {currentPath === '/' ? 'root directory' : currentPath}
          </DialogDescription>

          <div className="mb-6">
            <label 
              htmlFor="folder-name" 
              className="block text-sm font-medium text-primary-900 mb-2"
            >
              Folder Name
            </label>
            <input
              id="folder-name"
              type="text"
              value={folderName}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter folder name"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              aria-describedby={showError ? 'folder-name-error' : undefined}
              aria-invalid={showError ? 'true' : 'false'}
              className={cn(
                'w-full px-3 py-2 border rounded-lg',
                'transition-colors duration-150 ease-out',
                'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                'touch-manipulation',
                showError
                  ? 'border-red-300 focus-visible:ring-red-300'
                  : 'border-primary-200 focus:border-primary-300'
              )}
            />
            {showError ? (
              <p 
                id="folder-name-error"
                className="text-sm text-red-600 mt-1"
                role="alert"
                aria-live="polite"
              >
                {error || validationError}
              </p>
            ) : null}
          </div>

          {/* Loading indicator */}
          {createFolderMutation.isPending ? (
            <div className="mb-4 p-3 bg-primary-50 rounded-lg" aria-live="polite">
              <p className="text-sm text-primary-600">Creating folder…</p>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <DialogClose 
              disabled={createFolderMutation.isPending}
              className={cn(
                'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                'touch-manipulation'
              )}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleCreate}
              disabled={!isValidName || createFolderMutation.isPending}
              className={cn(
                'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                'touch-manipulation',
                (!isValidName || createFolderMutation.isPending) && 'opacity-50 cursor-not-allowed'
              )}
              aria-describedby={!isValidName ? 'create-button-help' : undefined}
            >
              {getButtonText()}
            </Button>
          </div>
          
          {!isValidName && folderName.length > 0 ? (
            <p 
              id="create-button-help"
              className="text-xs text-primary-500 mt-2"
            >
              Please enter a valid folder name
            </p>
          ) : null}
        </div>
      </DialogContent>
    </DialogRoot>
  )
}