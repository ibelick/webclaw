'use client'

import { Link } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  MoreHorizontalIcon,
  Pen01Icon,
  Delete01Icon,
  PinIcon,
  PinOffIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu'
import { memo } from 'react'
import type { SessionMeta } from '../../types'

type SessionItemProps = {
  session: SessionMeta
  active: boolean
  pinned?: boolean
  onSelect?: () => void
  onRename: (session: SessionMeta) => void
  onDelete: (session: SessionMeta) => void
  onTogglePin?: (sessionKey: string) => void
}

function SessionItemComponent({
  session,
  active,
  pinned = false,
  onSelect,
  onRename,
  onDelete,
  onTogglePin,
}: SessionItemProps) {
  const label =
    session.label || session.title || session.derivedTitle || session.friendlyId

  return (
    <Link
      to="/chat/$sessionKey"
      params={{ sessionKey: session.friendlyId }}
      onClick={onSelect}
      className={cn(
        'group inline-flex items-center justify-between',
        'w-full text-left pl-1.5 pr-0.5 h-8 rounded-lg transition-colors duration-0',
        'select-none',
        active
          ? 'bg-primary-200 text-primary-950'
          : 'bg-transparent text-primary-950 [&:hover:not(:has(button:hover))]:bg-primary-200',
      )}
    >
      <div className="flex-1 min-w-0 flex items-center gap-1">
        {pinned && (
          <HugeiconsIcon
            icon={PinIcon}
            size={12}
            strokeWidth={1.5}
            className="shrink-0 text-primary-400"
          />
        )}
        <div className="text-sm font-[450] line-clamp-1">{label}</div>
      </div>
      <MenuRoot>
        <MenuTrigger
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          className={cn(
            'ml-2 inline-flex size-7 items-center justify-center rounded-md text-primary-700',
            'opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary-200',
            'aria-expanded:opacity-100 aria-expanded:bg-primary-200',
          )}
        >
          <HugeiconsIcon
            icon={MoreHorizontalIcon}
            size={20}
            strokeWidth={1.5}
          />
        </MenuTrigger>
        <MenuContent side="bottom" align="end">
          {onTogglePin && (
            <MenuItem
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onTogglePin(session.key)
              }}
              className="gap-2"
            >
              <HugeiconsIcon
                icon={pinned ? PinOffIcon : PinIcon}
                size={20}
                strokeWidth={1.5}
              />{' '}
              {pinned ? 'Unpin' : 'Pin'}
            </MenuItem>
          )}
          <MenuItem
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onRename(session)
            }}
            className="gap-2"
          >
            <HugeiconsIcon icon={Pen01Icon} size={20} strokeWidth={1.5} />{' '}
            Rename
          </MenuItem>
          <MenuItem
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onDelete(session)
            }}
            className="text-red-700 gap-2 hover:bg-red-50/80 data-highlighted:bg-red-50/80"
          >
            <HugeiconsIcon icon={Delete01Icon} size={20} strokeWidth={1.5} />{' '}
            Delete
          </MenuItem>
        </MenuContent>
      </MenuRoot>
    </Link>
  )
}

function areSessionItemsEqual(prev: SessionItemProps, next: SessionItemProps) {
  if (prev.active !== next.active) return false
  if (prev.pinned !== next.pinned) return false
  if (prev.onSelect !== next.onSelect) return false
  if (prev.onRename !== next.onRename) return false
  if (prev.onDelete !== next.onDelete) return false
  if (prev.onTogglePin !== next.onTogglePin) return false
  if (prev.session === next.session) return true
  return (
    prev.session.key === next.session.key &&
    prev.session.friendlyId === next.session.friendlyId &&
    prev.session.label === next.session.label &&
    prev.session.title === next.session.title &&
    prev.session.derivedTitle === next.session.derivedTitle &&
    prev.session.updatedAt === next.session.updatedAt
  )
}

const SessionItem = memo(SessionItemComponent, areSessionItemsEqual)

export { SessionItem }
