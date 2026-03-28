import { describe, expect, it } from 'vitest'

import type { WorkbenchTableBlock } from './table-block-utils'
import {
  findNextTarget,
  getEditTargets,
  readTargetValue,
  updateBlockWithValue,
} from './table-block-state-utils'

function createSampleBlock(): WorkbenchTableBlock {
  return {
    id: 'block-1',
    type: 'table',
    columns: [
      { id: 'c1', name: 'Name' },
      { id: 'c2', name: 'Age' },
    ],
    rows: [
      { id: 'r1', cells: { c1: 'Austin', c2: '30' } },
      { id: 'r2', cells: { c1: 'WebClaw', c2: '1' } },
    ],
  }
}

describe('getEditTargets', function () {
  it('orders targets as headers first then row cells', function () {
    const block = createSampleBlock()

    expect(getEditTargets(block)).toEqual([
      { rowId: null, columnId: 'c1' },
      { rowId: null, columnId: 'c2' },
      { rowId: 'r1', columnId: 'c1' },
      { rowId: 'r1', columnId: 'c2' },
      { rowId: 'r2', columnId: 'c1' },
      { rowId: 'r2', columnId: 'c2' },
    ])
  })
})

describe('findNextTarget', function () {
  it('moves forward and wraps with tab direction', function () {
    const targets = getEditTargets(createSampleBlock())

    expect(
      findNextTarget(targets, { rowId: 'r1', columnId: 'c2' }, 1),
    ).toEqual({ rowId: 'r2', columnId: 'c1' })

    expect(
      findNextTarget(targets, { rowId: 'r2', columnId: 'c2' }, 1),
    ).toEqual({ rowId: null, columnId: 'c1' })
  })

  it('moves backward and wraps with shift+tab direction', function () {
    const targets = getEditTargets(createSampleBlock())

    expect(
      findNextTarget(targets, { rowId: null, columnId: 'c1' }, -1),
    ).toEqual({ rowId: 'r2', columnId: 'c2' })
  })
})

describe('readTargetValue', function () {
  it('reads header and cell values', function () {
    const block = createSampleBlock()

    expect(readTargetValue(block, { rowId: null, columnId: 'c1' })).toBe('Name')
    expect(readTargetValue(block, { rowId: 'r1', columnId: 'c2' })).toBe('30')
  })
})

describe('updateBlockWithValue', function () {
  it('updates header value without changing unrelated cells', function () {
    const block = createSampleBlock()
    const next = updateBlockWithValue(block, { rowId: null, columnId: 'c1' }, 'Title')

    expect(next.columns[0]?.name).toBe('Title')
    expect(next.rows[0]?.cells.c1).toBe('Austin')
  })

  it('updates target cell value', function () {
    const block = createSampleBlock()
    const next = updateBlockWithValue(block, { rowId: 'r2', columnId: 'c2' }, '2')

    expect(next.rows[1]?.cells.c2).toBe('2')
    expect(next.rows[0]?.cells.c2).toBe('30')
  })
})
