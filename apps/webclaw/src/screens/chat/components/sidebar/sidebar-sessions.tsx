'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
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
import { usePinnedSessions } from '@/hooks/use-pinned-sessions'
import type { SessionMeta } from '../../types'
import { memo, useCallback, useMemo } from 'react'

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
  const { pinnedSessionKeys, togglePinnedSession } = usePinnedSessions()

  const pinnedSessionSet = useMemo(
    () => new Set(pinnedSessionKeys),
    [pinnedSessionKeys],
  )

  const pinnedSessions = useMemo(
    () => sessions.filter((session) => pinnedSessionSet.has(session.key)),
    [sessions, pinnedSessionSet],
  )

  const unpinnedSessions = useMemo(
    () => sessions.filter((session) => !pinnedSessionSet.has(session.key)),
    [sessions, pinnedSessionSet],
  )

  const handleTogglePin = useCallback(
    (session: SessionMeta) => {
      togglePinnedSession(session.key)
    },
    [togglePinnedSession],
  )

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
              {pinnedSessions.map((session) => (
                <SessionItem
                  key={session.key}
                  session={session}
                  active={session.friendlyId === activeFriendlyId}
                  isPinned
                  onSelect={onSelect}
                  onTogglePin={handleTogglePin}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              ))}

              {pinnedSessions.length > 0 && unpinnedSessions.length > 0 ? (
                <div className="my-1 border-t border-primary-200/80" />
              ) : null}

              {unpinnedSessions.map((session) => (
                <SessionItem
                  key={session.key}
                  session={session}
                  active={session.friendlyId === activeFriendlyId}
                  isPinned={false}
                  onSelect={onSelect}
                  onTogglePin={handleTogglePin}
                  onRename={onRename}
                  onDelete={onDelete}
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
}, areSidebarSessionsEqual)

function areSidebarSessionsEqual(
  prev: SidebarSessionsProps,
  next: SidebarSessionsProps,
) {
  if (prev.activeFriendlyId !== next.activeFriendlyId) return false
  if (prev.defaultOpen !== next.defaultOpen) return false
  if (prev.onSelect !== next.onSelect) return false
  if (prev.onRename !== next.onRename) return false
  if (prev.onDelete !== next.onDelete) return false
  if (prev.sessions === next.sessions) return true
  if (prev.sessions.length !== next.sessions.length) return false
  for (let i = 0; i < prev.sessions.length; i += 1) {
    const prevSession = prev.sessions[i]
    const nextSession = next.sessions[i]
    if (prevSession.key !== nextSession.key) return false
    if (prevSession.friendlyId !== nextSession.friendlyId) return false
    if (prevSession.label !== nextSession.label) return false
    if (prevSession.title !== nextSession.title) return false
    if (prevSession.derivedTitle !== nextSession.derivedTitle) return false
    if (prevSession.updatedAt !== nextSession.updatedAt) return false
  }
  return true
}
