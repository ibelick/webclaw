import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, FloppyDiskIcon } from '@hugeicons/core-free-icons'
import { useFileContent, useFileSave } from '../hooks/use-files'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileEditorProps {
  filePath: string
  onClose: () => void
}

const LANGUAGE_MAP: Record<string, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  py: 'Python',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sh: 'Shell',
  bash: 'Bash',
  sql: 'SQL',
  xml: 'XML',
  toml: 'TOML',
  ini: 'INI',
  conf: 'Config',
  cfg: 'Config',
  env: 'Env',
  txt: 'Text',
  log: 'Log',
  csv: 'CSV',
  go: 'Go',
  rs: 'Rust',
  rb: 'Ruby',
  php: 'PHP',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  h: 'Header',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  graphql: 'GraphQL',
  svelte: 'Svelte',
  vue: 'Vue',
}

export function FileEditor({ filePath, onClose }: FileEditorProps) {
  const contentQuery = useFileContent(filePath)
  const saveMutation = useFileSave()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [editedContent, setEditedContent] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Sync fetched content
  useEffect(() => {
    if (contentQuery.data && editedContent === null) {
      setEditedContent(contentQuery.data.content)
    }
  }, [contentQuery.data, editedContent])

  const language = useMemo(() => {
    if (!contentQuery.data) return ''
    return LANGUAGE_MAP[contentQuery.data.extension.toLowerCase()] || contentQuery.data.extension.toUpperCase()
  }, [contentQuery.data])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value)
    setHasUnsavedChanges(e.target.value !== contentQuery.data?.content)
  }, [contentQuery.data])

  const handleSave = useCallback(async () => {
    if (editedContent === null) return
    try {
      await saveMutation.mutateAsync({ path: filePath, content: editedContent })
      setHasUnsavedChanges(false)
    } catch {
      // Error shown via mutation state
    }
  }, [filePath, editedContent, saveMutation])

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return
    }
    onClose()
  }, [hasUnsavedChanges, onClose])

  // Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (hasUnsavedChanges) handleSave()
      }
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleClose, hasUnsavedChanges])

  // Handle Tab key for indentation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value

      const newValue = value.substring(0, start) + '  ' + value.substring(end)
      setEditedContent(newValue)
      setHasUnsavedChanges(newValue !== contentQuery.data?.content)

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
    }
  }, [contentQuery.data])

  const fileName = filePath.split('/').pop() || filePath

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col">
      {/* Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-primary-200 bg-primary-50">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-primary-900 truncate">{fileName}</h2>
          {language ? (
            <span className="text-xs text-primary-500 bg-primary-100 px-2 py-0.5 rounded-full shrink-0">
              {language}
            </span>
          ) : null}
          {hasUnsavedChanges ? (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">
              Unsaved
            </span>
          ) : null}
          {saveMutation.isError ? (
            <span className="text-xs text-red-600">{saveMutation.error.message}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="default"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveMutation.isPending}
            className={cn(
              (!hasUnsavedChanges || saveMutation.isPending) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <HugeiconsIcon icon={FloppyDiskIcon} size={16} strokeWidth={1.5} aria-hidden="true" />
            {saveMutation.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={handleClose} aria-label="Close editor">
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* Editor area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {contentQuery.isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-primary-500 text-sm">Loading file…</p>
          </div>
        ) : contentQuery.isError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-600 text-sm mb-2">
                {contentQuery.error instanceof Error ? contentQuery.error.message : 'Failed to load file'}
              </p>
              <Button size="sm" variant="secondary" onClick={() => void contentQuery.refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={editedContent ?? ''}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoFocus
            className={cn(
              'w-full h-full p-4 resize-none',
              'bg-primary-950 text-primary-100',
              'font-mono text-sm leading-relaxed',
              'focus:outline-none',
              'selection:bg-blue-800/50',
            )}
          />
        )}
      </div>

      {/* Status bar */}
      {contentQuery.data ? (
        <footer className="flex items-center justify-between px-4 py-1 border-t border-primary-200 bg-primary-50 text-xs text-primary-500">
          <span>{filePath}</span>
          <span>{formatSize(contentQuery.data.size)}</span>
        </footer>
      ) : null}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
