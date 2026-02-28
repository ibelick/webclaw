import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { WorkbenchTableBlock } from '../table-block-utils'
import {
  createTableColumn,
  createTableRow,
  tableBlockFromCsv,
  tableBlockToCsv,
  tableBlockToMarkdown,
} from '../table-block-utils'
import {
  findNextTarget,
  getEditTargets,
  readTargetValue,
  updateBlockWithValue,
  type EditTarget,
} from '../table-block-state-utils'

type TableBlockProps = {
  block: WorkbenchTableBlock
  onChange: (nextBlock: WorkbenchTableBlock) => void
  onRemove: () => void
  onInsertToPrompt: (markdown: string) => void
}

export function TableBlock({
  block,
  onChange,
  onRemove,
  onInsertToPrompt,
}: TableBlockProps) {
  const [editingTarget, setEditingTarget] = useState<EditTarget | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [copiedMarkdown, setCopiedMarkdown] = useState(false)
  const [copiedCsv, setCopiedCsv] = useState(false)
  const [inserted, setInserted] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [csvDraft, setCsvDraft] = useState('')
  const [csvError, setCsvError] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement | null>(null)
  const skipBlurCommitRef = useRef(false)

  const markdown = useMemo(() => tableBlockToMarkdown(block), [block])
  const csv = useMemo(() => tableBlockToCsv(block), [block])
  const orderedTargets = useMemo(() => getEditTargets(block), [block])

  useLayoutEffect(() => {
    if (!editingTarget) return
    editInputRef.current?.focus()
    editInputRef.current?.select()
  }, [editingTarget])

  function beginEdit(target: EditTarget) {
    const value = readTargetValue(block, target)
    setEditingTarget(target)
    setEditingValue(value)
  }

  function commitCurrentEdit() {
    if (!editingTarget) return
    const nextBlock = updateBlockWithValue(block, editingTarget, editingValue)
    onChange(nextBlock)
    setEditingTarget(null)
  }

  function handleCopyMarkdown() {
    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        setCopiedMarkdown(true)
        window.setTimeout(() => setCopiedMarkdown(false), 1200)
      })
      .catch(() => {
        setCopiedMarkdown(false)
      })
  }

  function handleInsertToPrompt() {
    onInsertToPrompt(markdown)
    setInserted(true)
    window.setTimeout(() => setInserted(false), 1200)
  }

  function handleCopyCsv() {
    navigator.clipboard
      .writeText(csv)
      .then(() => {
        setCopiedCsv(true)
        window.setTimeout(() => setCopiedCsv(false), 1200)
      })
      .catch(() => {
        setCopiedCsv(false)
      })
  }

  function handleDownloadCsv() {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'table-block.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handleApplyCsvImport() {
    try {
      const importedBlock = tableBlockFromCsv(csvDraft, block.id)
      onChange(importedBlock)
      setCsvError(null)
      setShowCsvImport(false)
      setCsvDraft('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid CSV data'
      setCsvError(message)
    }
  }

  function handleAddRow() {
    onChange({
      ...block,
      rows: [...block.rows, createTableRow(block.columns)],
    })
  }

  function handleRemoveRow(rowId: string) {
    onChange({
      ...block,
      rows: block.rows.filter((row) => row.id !== rowId),
    })
  }

  function handleAddColumn() {
    const nextColumn = createTableColumn(block.columns.length)
    onChange({
      ...block,
      columns: [...block.columns, nextColumn],
      rows: block.rows.map((row) => ({
        ...row,
        cells: {
          ...row.cells,
          [nextColumn.id]: '',
        },
      })),
    })
  }

  function handleRemoveColumn(columnId: string) {
    if (block.columns.length <= 1) return

    const nextColumns = block.columns.filter((column) => column.id !== columnId)
    const nextRows = block.rows.map((row) => {
      const nextCells = { ...row.cells }
      delete nextCells[columnId]
      return {
        ...row,
        cells: nextCells,
      }
    })

    onChange({
      ...block,
      columns: nextColumns,
      rows: nextRows,
    })

    if (editingTarget?.columnId === columnId) {
      setEditingTarget(null)
      setEditingValue('')
    }
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!editingTarget) return

    if (event.key === 'Enter') {
      event.preventDefault()
      commitCurrentEdit()
      return
    }

    if (event.key !== 'Tab') return

    event.preventDefault()
    skipBlurCommitRef.current = true

    const nextBlock = updateBlockWithValue(block, editingTarget, editingValue)
    onChange(nextBlock)

    const nextTarget = findNextTarget(
      orderedTargets,
      editingTarget,
      event.shiftKey ? -1 : 1,
    )

    if (!nextTarget) {
      setEditingTarget(null)
      setEditingValue('')
      return
    }

    setEditingTarget(nextTarget)
    setEditingValue(readTargetValue(nextBlock, nextTarget))
  }

  return (
    <section className="rounded-xl border border-primary-200 bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleAddRow}>
          Add row
        </Button>
        <Button size="sm" variant="outline" onClick={handleAddColumn}>
          Add column
        </Button>
        <Button size="sm" variant="secondary" onClick={handleCopyMarkdown}>
          {copiedMarkdown ? 'Copied Markdown' : 'Copy Markdown'}
        </Button>
        <Button size="sm" variant="secondary" onClick={handleInsertToPrompt}>
          {inserted ? 'Inserted' : 'Insert to Prompt'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setShowCsvImport((prev) => !prev)
            setCsvError(null)
          }}
        >
          {showCsvImport ? 'Hide CSV Import' : 'Import CSV'}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCopyCsv}>
          {copiedCsv ? 'Copied CSV' : 'Copy CSV'}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDownloadCsv}>
          Download CSV
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          Remove block
        </Button>
      </div>

      {showCsvImport ? (
        <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50 p-3">
          <label className="block text-xs text-primary-700">Paste CSV</label>
          <textarea
            className="mt-2 h-28 w-full rounded-lg border border-primary-200 bg-surface px-3 py-2 text-sm text-primary-900 outline-none focus:ring-2 focus:ring-primary-400"
            value={csvDraft}
            onChange={(event) => {
              setCsvDraft(event.target.value)
              setCsvError(null)
            }}
            placeholder="name,age\nAustin,30"
          />
          {csvError ? (
            <p className="mt-2 text-xs text-red-700" role="alert">
              {csvError}
            </p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" variant="default" onClick={handleApplyCsvImport}>
              Apply import
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowCsvImport(false)
                setCsvError(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 overflow-auto rounded-lg border border-primary-200">
        <table className="min-w-full border-collapse text-sm text-primary-900">
          <thead>
            <tr className="bg-primary-50">
              <th className="w-14 border-b border-r border-primary-200 px-2 py-2 text-left font-medium">
                #
              </th>
              {block.columns.map((column) => {
                const isEditing =
                  editingTarget?.rowId === null &&
                  editingTarget.columnId === column.id

                return (
                  <th
                    key={column.id}
                    className="min-w-32 border-b border-r border-primary-200 px-2 py-2"
                  >
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          value={editingValue}
                          onChange={(event) => setEditingValue(event.target.value)}
                          onBlur={() => {
                            if (skipBlurCommitRef.current) {
                              skipBlurCommitRef.current = false
                              return
                            }
                            commitCurrentEdit()
                          }}
                          onKeyDown={handleEditorKeyDown}
                          className="h-7 w-full rounded border border-primary-300 bg-surface px-2 text-sm outline-none focus:ring-2 focus:ring-primary-400"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => beginEdit({ rowId: null, columnId: column.id })}
                          className="flex-1 truncate text-left"
                        >
                          {column.name || 'Untitled'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(column.id)}
                        disabled={block.columns.length <= 1}
                        className={cn(
                          'rounded px-1 text-xs text-primary-600 hover:bg-primary-100 hover:text-primary-900',
                          block.columns.length <= 1 &&
                            'cursor-not-allowed opacity-40 hover:bg-transparent',
                        )}
                        aria-label={`Remove ${column.name}`}
                      >
                        x
                      </button>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={row.id}>
                <td className="border-b border-r border-primary-200 px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular-nums text-xs text-primary-700">
                      {rowIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="rounded px-1 text-xs text-primary-600 hover:bg-primary-100 hover:text-primary-900"
                      aria-label={`Remove row ${rowIndex + 1}`}
                    >
                      x
                    </button>
                  </div>
                </td>
                {block.columns.map((column) => {
                  const isEditing =
                    editingTarget?.rowId === row.id &&
                    editingTarget.columnId === column.id
                  const value = row.cells[column.id] ?? ''

                  return (
                    <td
                      key={`${row.id}-${column.id}`}
                      className="min-w-32 border-b border-r border-primary-200 px-2 py-2 align-top"
                    >
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          value={editingValue}
                          onChange={(event) => setEditingValue(event.target.value)}
                          onBlur={() => {
                            if (skipBlurCommitRef.current) {
                              skipBlurCommitRef.current = false
                              return
                            }
                            commitCurrentEdit()
                          }}
                          onKeyDown={handleEditorKeyDown}
                          className="h-7 w-full rounded border border-primary-300 bg-surface px-2 text-sm outline-none focus:ring-2 focus:ring-primary-400"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => beginEdit({ rowId: row.id, columnId: column.id })}
                          className={cn(
                            'w-full text-left whitespace-pre-wrap',
                            value.length === 0 && 'text-primary-500',
                          )}
                        >
                          {value || 'Empty'}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {block.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={block.columns.length + 1}
                  className="px-3 py-4 text-sm text-primary-600"
                >
                  {'No rows yet. Click "Add row".'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
