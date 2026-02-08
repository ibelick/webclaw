import { useEffect, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

type SearchScope = 'current' | 'global'

type ChatSearchBarProps = {
  query: string
  scope: SearchScope
  resultCount: number
  activeIndex: number
  onQueryChange: (query: string) => void
  onScopeChange: (scope: SearchScope) => void
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}

export function ChatSearchBar({
  query,
  scope,
  resultCount,
  activeIndex,
  onQueryChange,
  onScopeChange,
  onNext,
  onPrev,
  onClose,
}: ChatSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="border-b border-primary-200 bg-surface px-4 py-2 flex items-center gap-2">
      <HugeiconsIcon
        icon={Search01Icon}
        size={16}
        strokeWidth={1.6}
        className="text-primary-500 shrink-0"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={
          scope === 'current' ? 'Search in chat…' : 'Search all chats…'
        }
        className="flex-1 bg-transparent text-sm text-primary-900 placeholder:text-primary-400 outline-none min-w-0"
      />

      {query.trim().length > 0 && (
        <span className="text-xs text-primary-500 shrink-0">
          {resultCount > 0
            ? `${activeIndex + 1} of ${resultCount}`
            : 'No results'}
        </span>
      )}

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() =>
            onScopeChange(scope === 'current' ? 'global' : 'current')
          }
          className={`text-xs px-2 py-0.5 rounded transition-colors ${
            scope === 'global'
              ? 'bg-primary-200 text-primary-900'
              : 'text-primary-500 hover:text-primary-700'
          }`}
        >
          {scope === 'current' ? 'This chat' : 'All chats'}
        </button>

        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onPrev}
          disabled={resultCount === 0}
          aria-label="Previous result"
          className="text-primary-600 hover:bg-primary-100"
        >
          <HugeiconsIcon icon={ArrowUp01Icon} size={14} strokeWidth={1.6} />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onNext}
          disabled={resultCount === 0}
          aria-label="Next result"
          className="text-primary-600 hover:bg-primary-100"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={1.6} />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          aria-label="Close search"
          className="text-primary-600 hover:bg-primary-100"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.6} />
        </Button>
      </div>
    </div>
  )
}
