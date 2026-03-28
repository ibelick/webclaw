import { Button } from '@/components/ui/button'
import type { Ref } from 'react'

import { useSessionTableWorkbench } from '../hooks/use-table-workbench-blocks'
import { TableBlock } from './table-block'

type ChatWorkbenchProps = {
  sessionKey: string
  onInsertToPrompt: (markdown: string) => void
  wrapperRef?: Ref<HTMLDivElement>
}

export function ChatWorkbench({
  sessionKey,
  onInsertToPrompt,
  wrapperRef,
}: ChatWorkbenchProps) {
  const { blocks, addTableBlock, updateTableBlock, removeTableBlock } =
    useSessionTableWorkbench(sessionKey)

  return (
    <div className="border-t border-primary-200 bg-primary-50/35" ref={wrapperRef}>
      <div className="mx-auto w-full max-w-full px-5 py-3 sm:max-w-[768px] sm:min-w-[400px]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-primary-900">Workbench</p>
          <Button size="sm" variant="outline" onClick={() => addTableBlock()}>
            Add Table Block
          </Button>
        </div>

        {blocks.length === 0 ? (
          <p className="mt-2 text-sm text-primary-700">
            No table block yet. Click "Add Table Block" to create one.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {blocks.map((block) => (
              <TableBlock
                key={block.id}
                block={block}
                onChange={(nextBlock) => updateTableBlock(block.id, nextBlock)}
                onRemove={() => removeTableBlock(block.id)}
                onInsertToPrompt={onInsertToPrompt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
