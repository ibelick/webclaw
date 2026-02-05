import { useCallback, useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FilesSidebar } from './components/files-sidebar'
import { FileBreadcrumb } from './components/file-breadcrumb'
import { FileToolbar } from './components/file-toolbar'
import { FileList } from './components/file-list'
import { FileUploadDialog } from './components/file-upload-dialog'
import { CreateFolderDialog } from './components/create-folder-dialog'
import { FileEditor } from './components/file-editor'
import { useFileListing } from './hooks/use-files'
import { useFileExplorerState } from './hooks/use-file-explorer-state'
import { chatUiQueryKey, getChatUiState, setChatUiState } from '../chat/chat-ui'
import { cn } from '@/lib/utils'

export function FileExplorerScreen() {
  const queryClient = useQueryClient()
  const { currentPath } = useFileExplorerState()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [editingFile, setEditingFile] = useState<string | null>(null)

  const listingQuery = useFileListing(currentPath)

  const uiQuery = useQuery({
    queryKey: chatUiQueryKey,
    queryFn: function readUiState() {
      return getChatUiState(queryClient)
    },
    initialData: function initialUiState() {
      return getChatUiState(queryClient)
    },
    staleTime: Infinity,
  })

  const isSidebarCollapsed = uiQuery.data?.isSidebarCollapsed ?? false

  const handleToggleSidebarCollapse = useCallback(() => {
    setChatUiState(queryClient, function toggle(state) {
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed }
    })
  }, [queryClient])

  const handleUploadDialogOpen = useCallback(() => {
    setUploadDialogOpen(true)
  }, [])

  const handleCreateFolderDialogOpen = useCallback(() => {
    setCreateFolderDialogOpen(true)
  }, [])

  const handleOpenFile = useCallback((filePath: string) => {
    setEditingFile(filePath)
  }, [])

  const handleCloseEditor = useCallback(() => {
    setEditingFile(null)
  }, [])

  const mainStyles = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    minHeight: 0,
  }), [])

  const sidebar = (
    <FilesSidebar
      isCollapsed={isSidebarCollapsed}
      onToggleCollapse={handleToggleSidebarCollapse}
      onSelectAction={() => {}}
    />
  )

  return (
    <div className="h-screen bg-surface text-primary-900">
      <div className={cn('h-full overflow-hidden grid grid-cols-[auto_1fr]')}>
        {sidebar}

        <main aria-label="File explorer" style={mainStyles}>
          {/* Header */}
          <header className="border-b border-primary-200 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <FileBreadcrumb path={currentPath} />
            </div>
            <FileToolbar
              onUpload={handleUploadDialogOpen}
              onCreateFolder={handleCreateFolderDialogOpen}
            />
          </header>

          {/* File list */}
          <div className="flex-1 min-h-0 overflow-auto">
            <FileList
              listing={listingQuery.data}
              loading={listingQuery.isLoading}
              onOpenFile={handleOpenFile}
            />
            {listingQuery.isError ? (
              <div className="p-4 text-center" aria-live="polite">
                <p className="text-red-600 text-sm">
                  {listingQuery.error instanceof Error
                    ? listingQuery.error.message
                    : 'Failed to load files'}
                </p>
                <button
                  onClick={() => void listingQuery.refetch()}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-900 underline focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none rounded-sm"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>

          {/* Dialogs */}
          <FileUploadDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            currentPath={currentPath}
          />
          <CreateFolderDialog
            open={createFolderDialogOpen}
            onOpenChange={setCreateFolderDialogOpen}
            currentPath={currentPath}
          />
        </main>
      </div>

      {/* File Editor Overlay */}
      {editingFile ? (
        <FileEditor filePath={editingFile} onClose={handleCloseEditor} />
      ) : null}
    </div>
  )
}
