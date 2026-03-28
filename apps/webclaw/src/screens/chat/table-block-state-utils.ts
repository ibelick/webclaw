import type { WorkbenchTableBlock } from './table-block-utils'

export type EditTarget = {
  rowId: string | null
  columnId: string
}

export function getEditTargets(block: WorkbenchTableBlock): Array<EditTarget> {
  const headerTargets = block.columns.map((column) => ({
    rowId: null,
    columnId: column.id,
  }))

  const cellTargets = block.rows.flatMap((row) =>
    block.columns.map((column) => ({
      rowId: row.id,
      columnId: column.id,
    })),
  )

  return [...headerTargets, ...cellTargets]
}

export function findNextTarget(
  targets: Array<EditTarget>,
  current: EditTarget,
  direction: 1 | -1,
): EditTarget | null {
  const currentIndex = targets.findIndex((target) => {
    return target.rowId === current.rowId && target.columnId === current.columnId
  })

  if (currentIndex === -1 || targets.length === 0) return null

  const nextIndex = currentIndex + direction
  if (nextIndex < 0) return targets[targets.length - 1]
  if (nextIndex >= targets.length) return targets[0]
  return targets[nextIndex]
}

export function readTargetValue(
  block: WorkbenchTableBlock,
  target: EditTarget,
): string {
  if (target.rowId === null) {
    const column = block.columns.find((item) => item.id === target.columnId)
    return column?.name ?? ''
  }

  const row = block.rows.find((item) => item.id === target.rowId)
  return row?.cells[target.columnId] ?? ''
}

export function updateBlockWithValue(
  block: WorkbenchTableBlock,
  target: EditTarget,
  value: string,
): WorkbenchTableBlock {
  if (target.rowId === null) {
    return {
      ...block,
      columns: block.columns.map((column) => {
        if (column.id !== target.columnId) return column
        return {
          ...column,
          name: value,
        }
      }),
    }
  }

  return {
    ...block,
    rows: block.rows.map((row) => {
      if (row.id !== target.rowId) return row
      return {
        ...row,
        cells: {
          ...row.cells,
          [target.columnId]: value,
        },
      }
    }),
  }
}
