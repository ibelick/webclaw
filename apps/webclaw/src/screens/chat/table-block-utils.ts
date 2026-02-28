import { randomUUID } from '@/lib/utils'

export type TableColumn = {
  id: string
  name: string
}

export type TableRow = {
  id: string
  cells: Record<string, string>
}

export type WorkbenchTableBlock = {
  id: string
  type: 'table'
  columns: Array<TableColumn>
  rows: Array<TableRow>
}

type CreateTableBlockOptions = {
  columnCount?: number
  rowCount?: number
}

export function createTableColumn(index: number): TableColumn {
  return {
    id: randomUUID(),
    name: `Column ${index + 1}`,
  }
}

export function createTableRow(columns: Array<TableColumn>): TableRow {
  const cells: Record<string, string> = {}
  for (const column of columns) {
    cells[column.id] = ''
  }
  return {
    id: randomUUID(),
    cells,
  }
}

export function createTableBlock(
  options: CreateTableBlockOptions = {},
): WorkbenchTableBlock {
  const columnCount = Math.max(1, options.columnCount ?? 3)
  const rowCount = Math.max(1, options.rowCount ?? 3)
  const columns = Array.from({ length: columnCount }, (_, index) =>
    createTableColumn(index),
  )
  const rows = Array.from({ length: rowCount }, () => createTableRow(columns))

  return {
    id: randomUUID(),
    type: 'table',
    columns,
    rows,
  }
}

export function tableBlockToMarkdown(block: WorkbenchTableBlock): string {
  if (block.columns.length === 0) return ''

  const headerLine = `| ${block.columns
    .map((column) => escapeMarkdownCell(column.name))
    .join(' | ')} |`
  const separatorLine = `| ${block.columns.map(() => '---').join(' | ')} |`

  const rowLines = block.rows.map((row) => {
    const values = block.columns.map((column) => {
      return escapeMarkdownCell(row.cells[column.id] ?? '')
    })
    return `| ${values.join(' | ')} |`
  })

  return [headerLine, separatorLine, ...rowLines].join('\n')
}

export function tableBlockToCsv(block: WorkbenchTableBlock): string {
  const header = block.columns.map((column) => escapeCsvCell(column.name))
  const rows = block.rows.map((row) =>
    block.columns.map((column) => escapeCsvCell(row.cells[column.id] ?? '')),
  )

  return [header, ...rows].map((line) => line.join(',')).join('\n')
}

export function tableBlockFromCsv(
  csvText: string,
  existingBlockId?: string,
): WorkbenchTableBlock {
  const parsedRows = parseCsvRows(csvText)

  if (parsedRows.length === 0) {
    throw new Error('CSV is empty')
  }

  const maxColumnCount = Math.max(
    1,
    ...parsedRows.map((row) => Math.max(1, row.length)),
  )

  const headerValues = parsedRows[0] ?? []
  const columns = Array.from({ length: maxColumnCount }, (_, index) => ({
    id: randomUUID(),
    name: (headerValues[index] ?? '').trim() || `Column ${index + 1}`,
  }))

  const dataRows = parsedRows.slice(1)
  const rows =
    dataRows.length > 0
      ? dataRows.map((values) => {
          const cells: Record<string, string> = {}
          for (let index = 0; index < columns.length; index += 1) {
            cells[columns[index].id] = values[index] ?? ''
          }
          return {
            id: randomUUID(),
            cells,
          }
        })
      : [createTableRow(columns)]

  return {
    id: existingBlockId ?? randomUUID(),
    type: 'table',
    columns,
    rows,
  }
}

function escapeMarkdownCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\n/g, '<br />')
  const escaped = normalized.replace(/\|/g, '\\|')
  return escaped.length > 0 ? escaped : ' '
}

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n')
  if (
    normalized.includes(',') ||
    normalized.includes('"') ||
    normalized.includes('\n')
  ) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function parseCsvRows(input: string): Array<Array<string>> {
  const trimmed = input.trim()
  if (trimmed.length === 0) return []

  const rows: Array<Array<string>> = []
  let row: Array<string> = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (inQuotes) {
      if (char === '"') {
        const next = input[index + 1]
        if (next === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    if (char === '\r') {
      continue
    }

    cell += char
  }

  if (inQuotes) {
    throw new Error('CSV has an unclosed quote')
  }

  row.push(cell)
  rows.push(row)

  const lastRow = rows[rows.length - 1]
  if (rows.length > 1 && lastRow.every((value) => value.length === 0)) {
    rows.pop()
  }

  return rows
}
