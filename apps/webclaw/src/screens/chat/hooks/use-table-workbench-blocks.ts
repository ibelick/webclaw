import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { WorkbenchTableBlock } from '../table-block-utils'
import { createTableBlock } from '../table-block-utils'

type TableWorkbenchDoc = {
  blocks: Array<WorkbenchTableBlock>
}

type TableWorkbenchState = {
  docsBySessionKey: Record<string, TableWorkbenchDoc>
  addTableBlock: (sessionKey: string) => string
  updateTableBlock: (
    sessionKey: string,
    blockId: string,
    block: WorkbenchTableBlock,
  ) => void
  removeTableBlock: (sessionKey: string, blockId: string) => void
}

const EMPTY_TABLE_BLOCKS: Array<WorkbenchTableBlock> = []

function normalizeSessionKey(sessionKey: string) {
  const trimmed = sessionKey.trim()
  return trimmed.length > 0 ? trimmed : 'new'
}

function getDoc(
  docsBySessionKey: Record<string, TableWorkbenchDoc>,
  sessionKey: string,
): TableWorkbenchDoc {
  return docsBySessionKey[sessionKey] ?? { blocks: [] }
}

const useTableWorkbenchStore = create<TableWorkbenchState>()(
  persist(
    (set) => ({
      docsBySessionKey: {},
      addTableBlock: (sessionKey) => {
        const normalizedSessionKey = normalizeSessionKey(sessionKey)
        const nextBlock = createTableBlock()

        set((state) => {
          const currentDoc = getDoc(state.docsBySessionKey, normalizedSessionKey)
          return {
            docsBySessionKey: {
              ...state.docsBySessionKey,
              [normalizedSessionKey]: {
                blocks: [...currentDoc.blocks, nextBlock],
              },
            },
          }
        })

        return nextBlock.id
      },
      updateTableBlock: (sessionKey, blockId, block) => {
        const normalizedSessionKey = normalizeSessionKey(sessionKey)
        set((state) => {
          const currentDoc = getDoc(state.docsBySessionKey, normalizedSessionKey)
          return {
            docsBySessionKey: {
              ...state.docsBySessionKey,
              [normalizedSessionKey]: {
                blocks: currentDoc.blocks.map((currentBlock) => {
                  if (currentBlock.id !== blockId) return currentBlock
                  return block
                }),
              },
            },
          }
        })
      },
      removeTableBlock: (sessionKey, blockId) => {
        const normalizedSessionKey = normalizeSessionKey(sessionKey)
        set((state) => {
          const currentDoc = getDoc(state.docsBySessionKey, normalizedSessionKey)
          return {
            docsBySessionKey: {
              ...state.docsBySessionKey,
              [normalizedSessionKey]: {
                blocks: currentDoc.blocks.filter((block) => block.id !== blockId),
              },
            },
          }
        })
      },
    }),
    {
      name: 'chat-table-workbench-blocks-v1',
    },
  ),
)

export function useSessionTableWorkbench(sessionKey: string) {
  const normalizedSessionKey = normalizeSessionKey(sessionKey)

  const blocks = useTableWorkbenchStore(
    (state) =>
      state.docsBySessionKey[normalizedSessionKey]?.blocks ?? EMPTY_TABLE_BLOCKS,
  )

  const addTableBlock = useTableWorkbenchStore((state) => state.addTableBlock)
  const updateTableBlock = useTableWorkbenchStore(
    (state) => state.updateTableBlock,
  )
  const removeTableBlock = useTableWorkbenchStore(
    (state) => state.removeTableBlock,
  )

  return {
    blocks,
    addTableBlock: function addBlock() {
      return addTableBlock(normalizedSessionKey)
    },
    updateTableBlock: function updateBlock(
      blockId: string,
      block: WorkbenchTableBlock,
    ) {
      updateTableBlock(normalizedSessionKey, blockId, block)
    },
    removeTableBlock: function removeBlock(blockId: string) {
      removeTableBlock(normalizedSessionKey, blockId)
    },
  }
}
