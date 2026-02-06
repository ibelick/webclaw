'use client'

import type { KeyboardEvent } from 'react'
import type { SearchMatch } from '@/hooks/use-search'
import type { SessionMeta } from '@/screens/chat/types'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  Loading03Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import {
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSearch } from '@/hooks/use-search'

type SearchMode = 'current' | 'global'

type SearchDialogProps = {
  open: boolean
  mode: SearchMode
  onOpenChange: (open: boolean) => void
  sessions: Array<SessionMeta>
  currentFriendlyId: string
  currentSessionKey: string
}

export function SearchDialog({
  open,
  mode,
  onOpenChange,
  sessions,
  currentFriendlyId,
  currentSessionKey,
}: SearchDialogProps) {
  const navigate = useNavigate()
  const { searchCurrentConversation, searchAllSessions, highlightMatch } =
    useSearch({
      sessions,
      currentFriendlyId,
      currentSessionKey,
    })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const requestIdRef = useRef(0)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<SearchMatch>>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const trimmedQuery = query.trim()

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      if (!inputRef.current) return
      inputRef.current.focus()
      inputRef.current.select()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) {
      requestIdRef.current += 1
      setQuery('')
      setResults([])
      setLoading(false)
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!trimmedQuery) {
      requestIdRef.current += 1
      setResults([])
      setLoading(false)
      setActiveIndex(0)
      return
    }

    if (mode === 'current') {
      requestIdRef.current += 1
      const nextResults = searchCurrentConversation(trimmedQuery)
      setResults(nextResults)
      setLoading(false)
      setActiveIndex(0)
      return
    }

    setLoading(true)
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const timer = window.setTimeout(() => {
      searchAllSessions(trimmedQuery)
        .then((nextResults) => {
          if (requestIdRef.current !== requestId) return
          setResults(nextResults)
          setLoading(false)
          setActiveIndex(0)
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return
          setResults([])
          setLoading(false)
        })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [
    mode,
    open,
    searchAllSessions,
    searchCurrentConversation,
    trimmedQuery,
  ])

  const resultCountLabel = useMemo(() => {
    if (!trimmedQuery) return '0 results'
    if (loading) return 'Searching...'
    if (results.length === 1) return '1 result'
    return `${results.length} results`
  }, [loading, results.length, trimmedQuery])

  function handleSelectResult(result: SearchMatch) {
    if (mode === 'global') {
      navigate({
        to: '/chat/$sessionKey',
        params: { sessionKey: result.friendlyId },
      })
    }
    onOpenChange(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onOpenChange(false)
      return
    }
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % results.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length)
      return
    }
    if (event.key === 'Enter') {
      const selectedResult =
        results[Math.min(activeIndex, results.length - 1)]
      event.preventDefault()
      handleSelectResult(selectedResult)
    }
  }

  function renderSnippet(result: SearchMatch) {
    const highlight = highlightMatch(result.messageText, trimmedQuery)
    const normalizedQuery = trimmedQuery.toLowerCase()
    const matchIndex = result.messageText
      .toLowerCase()
      .indexOf(normalizedQuery)
    const matchEnd = matchIndex + normalizedQuery.length
    const showLeading = matchIndex > 0
    const showTrailing = matchEnd < result.messageText.length

    return (
      <span className="text-sm text-primary-800 text-pretty line-clamp-2">
        {showLeading ? '…' : null}
        {highlight.before}
        {highlight.match ? (
          <mark className="rounded-sm bg-primary-200 px-0.5 text-primary-900">
            {highlight.match}
          </mark>
        ) : null}
        {highlight.after}
        {showTrailing ? '…' : null}
      </span>
    )
  }

  function renderResult(result: SearchMatch, index: number) {
    const isActive = index === activeIndex
    const roleLabel =
      result.message.role === 'user' ? 'You' : 'Assistant'

    return (
      <li key={`${result.sessionKey}-${result.messageIndex}-${index}`}>
        <button
          type="button"
          role="option"
          aria-selected={isActive}
          onClick={() => handleSelectResult(result)}
          onMouseEnter={() => setActiveIndex(index)}
          className={cn(
            'w-full text-left rounded-lg border px-3 py-2 transition-colors',
            isActive
              ? 'border-primary-300 bg-primary-100'
              : 'border-primary-200 bg-primary-50 hover:bg-primary-100',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            {mode === 'global' ? (
              <span className="text-xs text-primary-600 truncate">
                {result.sessionTitle}
              </span>
            ) : null}
            <span className="rounded-full bg-primary-200 px-2 py-0.5 text-xs font-medium text-primary-700">
              {roleLabel}
            </span>
          </div>
          <div className="mt-1">{renderSnippet(result)}</div>
        </button>
      </li>
    )
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(640px,94vw)] max-h-[80vh]">
        <div className="p-4 flex h-full flex-col">
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-balance">
                {mode === 'global'
                  ? 'Search all sessions'
                  : 'Search this conversation'}
              </DialogTitle>
              <DialogDescription className="text-pretty">
                {mode === 'global'
                  ? 'Find messages across every session.'
                  : 'Find messages inside the current conversation.'}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4">
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                size={20}
                strokeWidth={1.5}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'global'
                    ? 'Search all sessions'
                    : 'Search this conversation'
                }
                className={cn(
                  'w-full rounded-lg border border-primary-200 bg-primary-50 pl-10 pr-16 py-2 text-sm text-primary-900 outline-none',
                  'focus:border-primary-400',
                )}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {loading ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={20}
                    strokeWidth={1.5}
                    className="animate-spin text-primary-500"
                  />
                ) : null}
                {query ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setQuery('')}
                    className="text-primary-500 hover:text-primary-700"
                    aria-label="Clear search"
                  >
                    <HugeiconsIcon
                      icon={Cancel01Icon}
                      size={20}
                      strokeWidth={1.5}
                    />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 flex-1 min-h-0">
            <div className="h-full rounded-xl border border-primary-200 bg-primary-50 p-2 overflow-auto">
              {trimmedQuery && results.length > 0 ? (
                <ul role="listbox" className="space-y-2">
                  {results.map(renderResult)}
                </ul>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-primary-600 text-pretty">
                  {trimmedQuery
                    ? 'No matches yet.'
                    : 'Start typing to search messages.'}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-primary-200 pt-3 text-xs text-primary-500">
            <div className="flex items-center gap-2">
              <KeyHint label="↑" />
              <KeyHint label="↓" />
              <span className="text-pretty">Navigate</span>
              <KeyHint label="Enter" />
              <span className="text-pretty">Open</span>
              <KeyHint label="Esc" />
              <span className="text-pretty">Close</span>
            </div>
            <span className="tabular-nums">{resultCountLabel}</span>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}

type KeyHintProps = {
  label: string
}

function KeyHint({ label }: KeyHintProps) {
  return (
    <span className="rounded-md border border-primary-200 bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-700">
      {label}
    </span>
  )
}
