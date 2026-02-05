import { create } from 'zustand'
import type { ViewMode, SortBy } from '../types'

interface FileExplorerState {
  currentPath: string
  viewMode: ViewMode
  sortBy: SortBy
  sortAsc: boolean
  selectedFiles: Set<string>
  
  // Actions
  navigateTo: (path: string) => void
  setViewMode: (mode: ViewMode) => void
  setSortBy: (sortBy: SortBy) => void
  toggleSort: () => void
  selectFile: (path: string) => void
  deselectFile: (path: string) => void
  clearSelection: () => void
  toggleFileSelection: (path: string) => void
}

export const useFileExplorerState = create<FileExplorerState>((set, get) => ({
  currentPath: '/',
  viewMode: 'list',
  sortBy: 'name',
  sortAsc: true,
  selectedFiles: new Set(),

  navigateTo: (path: string) => {
    set({
      currentPath: path,
      selectedFiles: new Set(), // Clear selection when navigating
    })
  },

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode })
  },

  setSortBy: (sortBy: SortBy) => {
    const currentSortBy = get().sortBy
    set({
      sortBy,
      // If switching to the same sort, toggle direction
      sortAsc: currentSortBy === sortBy ? !get().sortAsc : true,
    })
  },

  toggleSort: () => {
    set((state) => ({ sortAsc: !state.sortAsc }))
  },

  selectFile: (path: string) => {
    set((state) => {
      const newSelection = new Set(state.selectedFiles)
      newSelection.add(path)
      return { selectedFiles: newSelection }
    })
  },

  deselectFile: (path: string) => {
    set((state) => {
      const newSelection = new Set(state.selectedFiles)
      newSelection.delete(path)
      return { selectedFiles: newSelection }
    })
  },

  clearSelection: () => {
    set({ selectedFiles: new Set() })
  },

  toggleFileSelection: (path: string) => {
    const { selectedFiles, selectFile, deselectFile } = get()
    if (selectedFiles.has(path)) {
      deselectFile(path)
    } else {
      selectFile(path)
    }
  },
}))