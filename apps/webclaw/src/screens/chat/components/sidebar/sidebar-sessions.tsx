'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, PinIcon } from '@hugeicons/core-free-icons'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsiblePanel,
} from '@/components/ui/collapsible'
import {
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
} from '@/components/ui/scroll-area'
import { SessionItem } from './session-item'
import type { SessionMeta } from '../../types'
import { memo, useMemo } from 'react'
import { usePinnedSessions } from '../../hooks/use-pinned-sessions'

type SidebarSessionsProps = {
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  defaultOpen?: boolean
  onSelect?: () => void
  onRename: (session: SessionMeta) => void
  onDelete: (session: SessionMeta) => void
}

export const SidebarSessions = memo(function SidebarSessions({
  sessions,
  activeFriendlyId,
  defaultOpen = true,
  onSelect,
  onRename,
  onDelete,
}: SidebarSessionsProps) {
  const { pinnedSessionKeys, toggle, isPinned } = usePinnedSessions()

  const { pinned, unpinned } = useMemo(() => {
    const pinnedSet = new Set(pinnedSessionKeys)
    const pinnedSessions: SessionMeta[] = []
    const unpinnedSessions: SessionMeta[] = []
    for (const session of sessions) {
      if (pinnedSet.has(session.key)) {
        pinnedSessions.push(session)
      } else {
        unpinnedSessions.push(session)
      }
    }
    return { pinned: pinnedSessions, unpinned: unpinnedSessions }
  }, [sessions, pinnedSessionKeys])

  return (
    <Collapsible
      className="flex h-full flex-col flex-1 min-h-0 w-full"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger className="w-fit pl-1.5 shrink-0">
        Sessions
        <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-3 transition-transform duration-150 group-data-panel-open:rotate-90"
          />
        </span>
      </CollapsibleTrigger>
      <CollapsiblePanel
        className="w-full flex-1 min-h-0 h-auto data-starting-style:h-0 data-ending-style:h-0"
        contentClassName="flex flex-1 min-h-0 flex-col overflow-y-auto"
      >
        <ScrollAreaRoot className="flex-1 min-h-0">
          <ScrollAreaViewport className="min-h-0">
            <div className="flex flex-col gap-px pl-2 pr-2">
              {pinned.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 px-1.5 pt-1 pb-0.5">
                    <HugeiconsIcon
                      icon={PinIcon}
                      size={12}
                      strokeWidth={1.5}
                      className="text-primary-500"
                    />
                    <span className="text-xs font-medium text-primary-500">
                      Pinned
                    </span>
                  </div>
                  {pinned.map((session) => (
                    <SessionItem
                      key={session.key}
                      session={session}
                      active={session.friendlyId === activeFriendlyId}
                      pinned
                      onSelect={onSelect}
                      onRename={onRename}
                      onDelete={onDelete}
                      onTogglePin={toggle}
                    />
                  ))}
                  <div className="h-px bg-primary-200 my-1" />
                </>
              )}
              {unpinned.map((session) => (
                <SessionItem
                  key={session.key}
                  session={session}
                  active={session.friendlyId === activeFriendlyId}
                  pinned={false}
                  onSelect={onSelect}
                  onRename={onRename}
                  onDelete={onDelete}
                  onTogglePin={toggle}
                />
              ))}
            </div>
          </ScrollAreaViewport>
          <ScrollAreaScrollbar orientation="vertical">
            <ScrollAreaThumb />
          </ScrollAreaScrollbar>
        </ScrollAreaRoot>
      </CollapsiblePanel>
    </Collapsible>
  )
})
