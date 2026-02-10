import { HugeiconsIcon } from '@hugeicons/react'
import {
  GridViewIcon,
  Menu01Icon,
  FolderAddIcon,
  Upload04Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons'
import { useCallback } from 'react'
import { useFileExplorerState } from '../hooks/use-file-explorer-state'
import { Button } from '@/components/ui/button'
import { 
  MenuRoot,
  MenuTrigger, 
  MenuContent,
  MenuItem,
} from '@/components/ui/menu'
import { cn } from '@/lib/utils'

interface FileToolbarProps {
  onUpload: () => void
  onCreateFolder: () => void
}

const sortOptions = [
  { label: 'Name', value: 'name' as const },
  { label: 'Size', value: 'size' as const },
  { label: 'Modified', value: 'modified' as const },
]

export function FileToolbar({ onUpload, onCreateFolder }: FileToolbarProps) {
  const {
    viewMode,
    sortBy,
    sortAsc,
    setViewMode,
    setSortBy,
    toggleSort,
  } = useFileExplorerState()

  const handleListView = useCallback(() => {
    setViewMode('list')
  }, [setViewMode])

  const handleGridView = useCallback(() => {
    setViewMode('grid')
  }, [setViewMode])

  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    setSortBy(newSortBy)
  }, [setSortBy])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }, [])

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div 
          className="flex items-center border border-primary-200 rounded-lg overflow-hidden"
          role="group"
          aria-label="View mode"
        >
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            onClick={handleListView}
            onKeyDown={(e) => handleKeyDown(e, handleListView)}
            aria-label="Switch to list view"
            aria-pressed={viewMode === 'list'}
            className={cn(
              'rounded-none border-0',
              'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
              'touch-manipulation'
            )}
          >
            <HugeiconsIcon
              icon={Menu01Icon}
              size={18}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            onClick={handleGridView}
            onKeyDown={(e) => handleKeyDown(e, handleGridView)}
            aria-label="Switch to grid view"
            aria-pressed={viewMode === 'grid'}
            className={cn(
              'rounded-none border-0 border-l border-primary-200',
              'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
              'touch-manipulation'
            )}
          >
            <HugeiconsIcon
              icon={GridViewIcon}
              size={18}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Button>
        </div>

        {/* Sort Controls */}
        <MenuRoot>
          <MenuTrigger
            render={
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  'gap-1',
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
                  'touch-manipulation'
                )}
                aria-label={`Sort by ${sortOptions.find(opt => opt.value === sortBy)?.label}, ${sortAsc ? 'ascending' : 'descending'}`}
              >
                <span>Sort: {sortOptions.find(opt => opt.value === sortBy)?.label}</span>
                <HugeiconsIcon
                  icon={sortAsc ? ArrowUp01Icon : ArrowDown01Icon}
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Button>
            }
          />
          <MenuContent side="bottom" align="start">
            {sortOptions.map((option) => (
              <MenuItem
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={cn(
                  sortBy === option.value && 'bg-primary-100 text-primary-900',
                  'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none'
                )}
                aria-current={sortBy === option.value ? 'true' : 'false'}
              >
                {option.label}
              </MenuItem>
            ))}
            <MenuItem 
              onClick={toggleSort}
              className="focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none"
            >
              <HugeiconsIcon
                icon={sortAsc ? ArrowDown01Icon : ArrowUp01Icon}
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {sortAsc ? 'Sort Descending' : 'Sort Ascending'}
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      </div>

      <div className="flex items-center gap-2">
        {/* Upload Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onUpload}
          onKeyDown={(e) => handleKeyDown(e, onUpload)}
          className={cn(
            'gap-2',
            'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
            'touch-manipulation'
          )}
          aria-label="Upload files"
        >
          <HugeiconsIcon
            icon={Upload04Icon}
            size={18}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span>Upload</span>
        </Button>

        {/* New Folder Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateFolder}
          onKeyDown={(e) => handleKeyDown(e, onCreateFolder)}
          className={cn(
            'gap-2',
            'focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:outline-none',
            'touch-manipulation'
          )}
          aria-label="Create new folder"
        >
          <HugeiconsIcon
            icon={FolderAddIcon}
            size={18}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span>New Folder</span>
        </Button>
      </div>
    </div>
  )
}