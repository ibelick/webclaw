import { HugeiconsIcon } from '@hugeicons/react'
import { Upload04Icon, File01Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useFileUpload } from '../hooks/use-files'
import { type UploadStatus } from '../types'
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath: string
}

interface SelectedFile {
  file: File
  id: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function FileUploadDialog({ open, onOpenChange, currentPath }: FileUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useFileUpload()

  const handleReset = useCallback(() => {
    setSelectedFiles([])
    setUploadStatus('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files) return
    
    const newFiles: SelectedFile[] = Array.from(files).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
    }))
    
    setSelectedFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesSelected(e.target.files)
  }, [handleFilesSelected])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFilesSelected(e.dataTransfer.files)
  }, [handleFilesSelected])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleRemoveFile = useCallback((id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const handleChooseFiles = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleDropZoneKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleChooseFiles()
    }
  }, [handleChooseFiles])

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return

    const fileList = new DataTransfer()
    selectedFiles.forEach(({ file }) => {
      fileList.items.add(file)
    })

    setUploadStatus('uploading')

    try {
      await uploadMutation.mutateAsync({
        files: fileList.files,
        path: currentPath,
      })
      setUploadStatus('success')
      handleReset()
      onOpenChange(false)
    } catch (error) {
      setUploadStatus('error')
      console.error('Upload failed:', error)
    }
  }, [selectedFiles, currentPath, uploadMutation, handleReset, onOpenChange])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      handleReset()
    }
    onOpenChange(newOpen)
  }, [handleReset, onOpenChange])

  const totalSize = selectedFiles.reduce((total, { file }) => total + file.size, 0)
  const fileCount = selectedFiles.length

  const getUploadButtonText = () => {
    if (uploadMutation.isPending || uploadStatus === 'uploading') {
      return 'Uploading…'
    }
    if (fileCount === 0) {
      return 'Upload'
    }
    return fileCount === 1 ? 'Upload 1 File' : `Upload ${fileCount} Files`
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(500px,92vw)]">
        <div className="p-6">
          <DialogTitle className="mb-2">Upload Files</DialogTitle>
          <DialogDescription className="mb-6">
            Upload files to {currentPath === '/' ? 'root directory' : currentPath}
          </DialogDescription>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleChooseFiles}
            onKeyDown={handleDropZoneKeyDown}
            tabIndex={0}
            role="button"
            aria-label="Drop files here or click to choose files"
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer',
              'transition-colors duration-150 ease-out',
              'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
              'touch-manipulation',
              dragActive
                ? 'border-primary-400 bg-primary-50'
                : 'border-primary-200 hover:border-primary-300 hover:bg-primary-50'
            )}
          >
            <HugeiconsIcon
              icon={Upload04Icon}
              size={48}
              strokeWidth={1}
              className="mx-auto text-primary-400 mb-4"
              aria-hidden="true"
            />
            <p className="text-primary-600 font-medium mb-2">
              Drag and drop files here
            </p>
            <p className="text-sm text-primary-500 mb-4">or</p>
            <Button
              variant="outline"
              className={cn(
                'gap-2',
                'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                'touch-manipulation'
              )}
              aria-label="Choose files from computer"
            >
              <HugeiconsIcon
                icon={File01Icon}
                size={18}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span>Choose Files</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
              aria-hidden="true"
            />
          </div>

          {/* Selected Files List */}
          <AnimatePresence>
            {selectedFiles.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <h4 className="text-sm font-medium text-primary-900 mb-3">
                  Selected Files ({selectedFiles.length})
                </h4>
                <div className="max-h-32 overflow-y-auto border border-primary-200 rounded-lg">
                  {selectedFiles.map(({ file, id }) => (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center justify-between p-2 border-b border-primary-100 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <HugeiconsIcon
                          icon={File01Icon}
                          size={16}
                          strokeWidth={1.5}
                          className="text-primary-600 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="text-sm text-primary-900 truncate min-w-0">
                          {file.name}
                        </span>
                        <span className="text-xs text-primary-500 shrink-0 tabular-nums">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleRemoveFile(id)}
                        className={cn(
                          'text-primary-500 hover:text-red-600 shrink-0',
                          'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                          'touch-manipulation'
                        )}
                        aria-label={`Remove ${file.name} from upload list`}
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          size={14}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      </Button>
                    </motion.div>
                  ))}
                </div>
                <p className="text-xs text-primary-600 mt-2 tabular-nums">
                  Total size: {formatFileSize(totalSize)}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Upload Progress */}
          {uploadMutation.isPending || uploadStatus === 'uploading' ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-3 bg-primary-50 rounded-lg"
              aria-live="polite"
            >
              <p className="text-sm text-primary-600 mb-2">Uploading files…</p>
              <div className="bg-primary-200 rounded-full h-2" role="progressbar" aria-label="Upload progress">
                <div className="bg-primary-600 h-2 rounded-full w-1/2 animate-pulse" />
              </div>
            </motion.div>
          ) : null}

          {/* Upload Status Messages */}
          {uploadStatus === 'success' ? (
            <div className="mt-4 p-3 bg-green-50 rounded-lg" aria-live="polite">
              <p className="text-sm text-green-700">Files uploaded successfully!</p>
            </div>
          ) : null}

          {uploadStatus === 'error' ? (
            <div className="mt-4 p-3 bg-red-50 rounded-lg" aria-live="polite">
              <p className="text-sm text-red-700">
                Upload failed. Please try again.
              </p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <DialogClose 
              disabled={uploadMutation.isPending || uploadStatus === 'uploading'}
              className={cn(
                'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                'touch-manipulation'
              )}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploadMutation.isPending || uploadStatus === 'uploading'}
              className={cn(
                'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                'touch-manipulation'
              )}
            >
              {getUploadButtonText()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}