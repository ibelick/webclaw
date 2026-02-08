import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { textFromMessage } from '../utils'
import type { GatewayMessage } from '../types'

type SearchScope = 'current' | 'global'

type SearchResult = {
  messageIndex: number
  sessionKey?: string
  sessionTitle?: string
}

type GlobalSearchResult = {
  sessionKey: string
  sessionTitle: string
  friendlyId: string
  messages: Array<{ text: string; role: string; index: number }>
}

type UseChatSearchReturn = {
  isOpen: boolean
  query: string
  scope: SearchScope
  results: Array<SearchResult>
  activeIndex: number
  globalResults: Array<GlobalSearchResult>
  open: (scope?: SearchScope) => void
  close: () => void
  setQuery: (query: string) => void
  setScope: (scope: SearchScope) => void
  goNext: () => void
  goPrev: () => void
}

export function useChatSearch(
  displayMessages: Array<GatewayMessage>,
): UseChatSearchReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<SearchScope>('current')
  const [activeIndex, setActiveIndex] = useState(0)
  const [globalResults, setGlobalResults] = useState<Array<GlobalSearchResult>>(
    [],
  )
  const debounceRef = useRef<number | null>(null)

  // Current-chat search: filter messages matching query
  const results = useMemo<Array<SearchResult>>(() => {
    if (!isOpen || !query.trim() || scope !== 'current') return []
    const lowerQuery = query.toLowerCase()
    const matches: Array<SearchResult> = []
    for (let i = 0; i < displayMessages.length; i++) {
      const msg = displayMessages[i]
      if (msg.role === 'toolResult') continue
      const text = textFromMessage(msg).toLowerCase()
      if (text.includes(lowerQuery)) {
        matches.push({ messageIndex: i })
      }
    }
    return matches
  }, [isOpen, query, scope, displayMessages])

  // Global search with debounce and abort guard
  useEffect(() => {
    if (!isOpen || !query.trim() || scope !== 'global') {
      setGlobalResults([])
      return
    }
    const controller = new AbortController()
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) return
          const data = (await res.json()) as {
            results?: Array<GlobalSearchResult>
          }
          setGlobalResults(data.results ?? [])
        })
        .catch(() => {
          setGlobalResults([])
        })
    }, 300)
    return () => {
      controller.abort()
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [isOpen, query, scope])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results.length, globalResults.length])

  const open = useCallback((newScope: SearchScope = 'current') => {
    setIsOpen(true)
    setScope(newScope)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(0)
    setGlobalResults([])
  }, [])

  const goNext = useCallback(() => {
    const total = scope === 'current' ? results.length : globalResults.length
    if (total === 0) return
    setActiveIndex((prev) => (prev + 1) % total)
  }, [scope, results.length, globalResults.length])

  const goPrev = useCallback(() => {
    const total = scope === 'current' ? results.length : globalResults.length
    if (total === 0) return
    setActiveIndex((prev) => (prev - 1 + total) % total)
  }, [scope, results.length, globalResults.length])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.key === 'f' && !e.shiftKey) {
        e.preventDefault()
        open('current')
      } else if (isMod && e.key === 'f' && e.shiftKey) {
        e.preventDefault()
        open('global')
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        close()
      } else if (e.key === 'Enter' && isOpen) {
        e.preventDefault()
        if (e.shiftKey) {
          goPrev()
        } else {
          goNext()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, open, close, goNext, goPrev])

  return {
    isOpen,
    query,
    scope,
    results,
    activeIndex,
    globalResults,
    open,
    close,
    setQuery,
    setScope,
    goNext,
    goPrev,
  }
}
