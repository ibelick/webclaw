import { memo } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Menu01Icon } from '@hugeicons/core-free-icons'
import { ContextMeter } from './context-meter'
import { Button } from '@/components/ui/button'
import { ExportMenu } from '@/components/export-menu'

type ExportFormat = 'markdown' | 'json' | 'text'

type ChatHeaderProps = {
  activeTitle: string
  wrapperRef?: React.Ref<HTMLDivElement>
  showSidebarButton?: boolean
  onOpenSidebar?: () => void
  usedTokens?: number
  maxTokens?: number
  onExport: (format: ExportFormat) => void
  exportDisabled?: boolean
  showExport?: boolean
}

function ChatHeaderComponent({
  activeTitle,
  wrapperRef,
  showSidebarButton = false,
  onOpenSidebar,
  usedTokens,
  maxTokens,
  onExport,
  exportDisabled = false,
  showExport = true,
}: ChatHeaderProps) {
  return (
    <div
      ref={wrapperRef}
      className="border-b border-primary-200 px-4 h-12 flex items-center bg-surface gap-2"
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
      <div className="flex-1 min-w-0 text-sm font-medium truncate">
        {activeTitle}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {showExport ? (
          <ExportMenu onExport={onExport} disabled={exportDisabled} />
        ) : null}
        <ContextMeter usedTokens={usedTokens} maxTokens={maxTokens} />
      </div>
    </div>
  )
}

const MemoizedChatHeader = memo(ChatHeaderComponent)

export { MemoizedChatHeader as ChatHeader }
