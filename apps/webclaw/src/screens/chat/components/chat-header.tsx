import { memo, useCallback } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon, Download04Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import {
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
} from '@/components/ui/menu'
import { ContextMeter } from './context-meter'
import {
  exportConversation,
  type ExportFormat,
} from '@/lib/export-conversation'
import type { GatewayMessage } from '../types'

type ChatHeaderProps = {
  activeTitle: string
  wrapperRef?: React.Ref<HTMLDivElement>
  showSidebarButton?: boolean
  onOpenSidebar?: () => void
  usedTokens?: number
  maxTokens?: number
  messages?: GatewayMessage[]
}

function ChatHeaderComponent({
  activeTitle,
  wrapperRef,
  showSidebarButton = false,
  onOpenSidebar,
  usedTokens,
  maxTokens,
  messages,
}: ChatHeaderProps) {
  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (!messages || messages.length === 0) return
      exportConversation(messages, activeTitle, format)
    },
    [messages, activeTitle],
  )

  const hasMessages = messages && messages.length > 0

  return (
    <div
      ref={wrapperRef}
      className="border-b border-primary-200 px-4 h-12 flex items-center bg-surface justify-between"
    >
      {showSidebarButton ? (
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onOpenSidebar}
          className="mr-2 text-primary-800 hover:bg-primary-100"
          aria-label="Open sidebar"
        >
          <HugeiconsIcon icon={Menu01Icon} size={18} strokeWidth={1.6} />
        </Button>
      ) : null}
      <div className="text-sm font-medium truncate">{activeTitle}</div>
      <div className="flex items-center gap-1">
        {hasMessages ? (
          <MenuRoot>
            <MenuTrigger
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-primary-800 hover:bg-primary-100"
                  aria-label="Export conversation"
                />
              }
            >
              <HugeiconsIcon
                icon={Download04Icon}
                size={16}
                strokeWidth={1.6}
              />
            </MenuTrigger>
            <MenuContent side="bottom" align="end">
              <MenuItem onClick={() => handleExport('markdown')}>
                Markdown (.md)
              </MenuItem>
              <MenuItem onClick={() => handleExport('json')}>
                JSON (.json)
              </MenuItem>
              <MenuItem onClick={() => handleExport('text')}>
                Plain Text (.txt)
              </MenuItem>
            </MenuContent>
          </MenuRoot>
        ) : null}
        <ContextMeter usedTokens={usedTokens} maxTokens={maxTokens} />
      </div>
    </div>
  )
}

const MemoizedChatHeader = memo(ChatHeaderComponent)

export { MemoizedChatHeader as ChatHeader }
