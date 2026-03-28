import { describe, expect, it } from 'vitest'

import {
  tableBlockFromCsv,
  tableBlockToCsv,
  tableBlockToMarkdown,
  type WorkbenchTableBlock,
} from './table-block-utils'

describe('tableBlockToMarkdown', function () {
  it('serializes headers and rows into markdown table format', function () {
    const block: WorkbenchTableBlock = {
      id: 'block-1',
      type: 'table',
      columns: [
        { id: 'c1', name: 'Name' },
        { id: 'c2', name: 'Notes|Meta' },
      ],
      rows: [
        { id: 'r1', cells: { c1: 'Austin', c2: 'line1\nline2' } },
        { id: 'r2', cells: { c1: 'WebClaw', c2: '' } },
      ],
    }

    expect(tableBlockToMarkdown(block)).toBe(
      [
        '| Name | Notes\\|Meta |',
        '| --- | --- |',
        '| Austin | line1<br />line2 |',
        '| WebClaw |   |',
      ].join('\n'),
    )
  })
})

describe('tableBlockFromCsv', function () {
  it('parses quoted csv values and hydrates rows/columns', function () {
    const block = tableBlockFromCsv(
      'name,notes\n"Austin, Law","hello ""team"""\nBob,"line1\nline2"',
      'block-id',
    )

    expect(block.id).toBe('block-id')
    expect(block.type).toBe('table')
    expect(block.columns).toHaveLength(2)
    expect(block.columns[0]?.name).toBe('name')
    expect(block.columns[1]?.name).toBe('notes')
    expect(block.rows).toHaveLength(2)
    expect(block.rows[0]?.cells[block.columns[0].id]).toBe('Austin, Law')
    expect(block.rows[0]?.cells[block.columns[1].id]).toBe('hello "team"')
    expect(block.rows[1]?.cells[block.columns[1].id]).toBe('line1\nline2')
  })

  it('throws on empty csv input', function () {
    expect(() => tableBlockFromCsv('   ')).toThrow('CSV is empty')
  })
})

describe('tableBlockToCsv', function () {
  it('escapes commas, quotes and newlines', function () {
    const block: WorkbenchTableBlock = {
      id: 'block-2',
      type: 'table',
      columns: [
        { id: 'c1', name: 'name' },
        { id: 'c2', name: 'notes' },
      ],
      rows: [{ id: 'r1', cells: { c1: 'Austin, Law', c2: 'line1\n"line2"' } }],
    }

    expect(tableBlockToCsv(block)).toBe(
      'name,notes\n"Austin, Law","line1\n""line2"""',
    )
  })
})
