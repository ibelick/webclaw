'use client'

import { useCallback, useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Download04Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ExportFormat = 'markdown' | 'json' | 'text'

type ExportMenuProps = {
  onExport: (format: ExportFormat) => void
  disabled?: boolean
}

const formats: Array<{ format: ExportFormat; label: string; ext: string }> = [
  { format: 'markdown', label: 'Markdown', ext: '.md' },
  { format: 'json', label: 'JSON', ext: '.json' },
  { format: 'text', label: 'Plain Text', ext: '.txt' },
]

export function ExportMenu({ onExport, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleToggle = useCallback(function handleToggle() {
    setOpen(function toggle(prev) {
      return !prev
    })
  }, [])

  const handleExport = useCallback(
    function handleExport(format: ExportFormat) {
      setOpen(false)
      onExport(format)
    },
    [onExport],
  )

  const handleBlur = useCallback(function handleBlur(
    event: React.FocusEvent,
  ) {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.relatedTarget as Node)
    ) {
      setOpen(false)
    }
  }, [])

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={handleToggle}
        disabled={disabled}
        className="text-primary-800 hover:bg-primary-100"
        aria-label="Export conversation"
        title="Export conversation"
      >
        <HugeiconsIcon icon={Download04Icon} size={18} strokeWidth={1.5} />
      </Button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1 z-50',
            'min-w-[160px] rounded-lg border border-primary-200',
            'bg-surface py-1 shadow-lg',
          )}
          role="menu"
        >
          {formats.map(function renderFormat({ format, label, ext }) {
            return (
              <button
                key={format}
                role="menuitem"
                className={cn(
                  'flex w-full items-center justify-between px-3 py-1.5',
                  'text-sm text-primary-800 hover:bg-primary-100',
                  'transition-colors',
                )}
                onClick={function onClick() {
                  handleExport(format)
                }}
              >
                <span>{label}</span>
                <span className="text-xs text-primary-500">{ext}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
