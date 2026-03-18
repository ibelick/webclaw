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
  isNewChat?: boolean
  agents?: Array<{ id: string; name: string }>
  selectedAgentId?: string
  onSelectAgent?: (id: string) => void
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
  isNewChat = false,
  agents = [],
  selectedAgentId,
  onSelectAgent,
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
      <div className="flex-1 min-w-0 text-sm font-medium truncate flex items-center gap-3">
        {activeTitle}
        {isNewChat && agents.length > 0 ? (
          <label className="flex items-center gap-1.5 text-xs text-primary-600 shrink-0">
            Agent
            <select
              value={selectedAgentId}
              onChange={(e) => onSelectAgent?.(e.target.value)}
              className="text-xs bg-surface border border-primary-200 rounded px-2 py-1 text-primary-900 outline-none focus:border-primary-400"
              aria-label="Select an agent"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
        ) : !isNewChat && selectedAgentId ? (
          <span className="text-xs text-primary-500 font-normal shrink-0">
            Agent: {agents.find((a) => a.id === selectedAgentId)?.name || selectedAgentId}
          </span>
        ) : null}
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
