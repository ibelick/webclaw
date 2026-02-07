import { memo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { ContextMeter } from './context-meter'

type ChatHeaderProps = {
  activeTitle: string
  wrapperRef?: React.Ref<HTMLDivElement>
  showSidebarButton?: boolean
  onOpenSidebar?: () => void
  usedTokens?: number
  maxTokens?: number
}

function ChatHeaderComponent({
  activeTitle,
  wrapperRef,
  showSidebarButton = false,
  onOpenSidebar,
  usedTokens,
  maxTokens,
}: ChatHeaderProps) {
  return (
    <div
      ref={wrapperRef}
      className="border-b border-primary-200 px-4 h-12 flex items-center bg-surface"
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
      <ContextMeter
        usedTokens={usedTokens}
        maxTokens={maxTokens}
        className="ml-3 hidden sm:flex"
      />
    </div>
  )
}

const MemoizedChatHeader = memo(ChatHeaderComponent)

export { MemoizedChatHeader as ChatHeader }
