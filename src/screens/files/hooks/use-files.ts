import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { FileListing } from '../types'

export const fileQueryKeys = {
  all: ['files'] as const,
  listing: (path: string) => ['files', 'listing', path] as const,
  content: (path: string) => ['files', 'content', path] as const,
}

// Read text file content
export type FileContent = {
  content: string
  name: string
  extension: string
  size: number
}

export function useFileContent(path: string | null) {
  return useQuery({
    queryKey: fileQueryKeys.content(path || ''),
    queryFn: async (): Promise<FileContent> => {
      const response = await fetch(`/api/files/read?path=${encodeURIComponent(path!)}`)
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to read file' }))
        throw new Error(error.error || 'Failed to read file')
      }
      return response.json()
    },
    enabled: !!path,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
  })
}

// Save text file content
export function useFileSave() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      const response = await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save file' }))
        throw new Error(error.error || 'Failed to save file')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate the content cache for this file
      void queryClient.invalidateQueries({
        queryKey: fileQueryKeys.content(variables.path),
      })
      // Invalidate parent listing (size/modified may have changed)
      const parentPath = variables.path.split('/').slice(0, -1).join('/') || '/'
      void queryClient.invalidateQueries({
        queryKey: fileQueryKeys.listing(parentPath),
      })
    },
  })
}

// Fetch file listing for a given path
export function useFileListing(path: string) {
  return useQuery({
    queryKey: fileQueryKeys.listing(path),
    queryFn: async (): Promise<FileListing> => {
      const response = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`)
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Failed to load files: ${error}`)
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    onError: (error) => {
      console.error('Failed to load file listing:', error)
    },
  })
}

// Download a file
export function useFileDownload() {
  const urls = new Set<string>()
  
  useEffect(() => {
    // Cleanup URLs on unmount
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])
  
  return useMutation({
    mutationFn: async (filePath: string) => {
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(filePath)}`)
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Download failed: ${error}`)
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      urls.add(url)
      
      const filename = filePath.split('/').pop() || 'download'
      
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      // Clean up after a delay
      setTimeout(() => {
        if (urls.has(url)) {
          URL.revokeObjectURL(url)
          urls.delete(url)
        }
      }, 100)
    },
    onError: (error) => {
      console.error('Download failed:', error)
    },
  })
}

// Upload files
export function useFileUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ files, path }: { files: FileList; path: string }) => {
      const results = []
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append('path', path)
        formData.append('file', files[i])

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`Upload failed for ${files[i].name}: ${error}`)
        }

        results.push(await response.json())
      }
      return results
    },
    onSuccess: (_, variables) => {
      // Invalidate the listing for the upload path
      void queryClient.invalidateQueries({
        queryKey: fileQueryKeys.listing(variables.path),
      })
    },
    onError: (error) => {
      console.error('Upload failed:', error)
    },
  })
}

// Delete file or folder
export function useFileDelete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (filePath: string) => {
      const response = await fetch(`/api/files/delete?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Delete failed: ${error}`)
      }

      return response.json()
    },
    onSuccess: (_, filePath) => {
      // Invalidate the listing for the parent directory
      const parentPath = filePath.split('/').slice(0, -1).join('/') || '/'
      void queryClient.invalidateQueries({
        queryKey: fileQueryKeys.listing(parentPath),
      })
    },
    onError: (error) => {
      console.error('Delete failed:', error)
    },
  })
}

// Create folder
export function useCreateFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ path, name }: { path: string; name: string }) => {
      const response = await fetch('/api/files/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: `${path}/${name}` }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Create folder failed: ${error}`)
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate the listing for the parent directory
      void queryClient.invalidateQueries({
        queryKey: fileQueryKeys.listing(variables.path),
      })
    },
    onError: (error) => {
      console.error('Create folder failed:', error)
    },
  })
}

// Rename file or folder
export function useFileRename() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ oldPath, newName }: { oldPath: string; newName: string }) => {
      const parentPath = oldPath.split('/').slice(0, -1).join('/')
      const newPath = `${parentPath}/${newName}`

      const response = await fetch('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: oldPath, dst: newPath }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Rename failed: ${error}`)
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate the listing for the parent directory
      const parentPath = variables.oldPath.split('/').slice(0, -1).join('/') || '/'
      void queryClient.invalidateQueries({
        queryKey: fileQueryKeys.listing(parentPath),
      })
    },
    onError: (error) => {
      console.error('Rename failed:', error)
    },
  })
}