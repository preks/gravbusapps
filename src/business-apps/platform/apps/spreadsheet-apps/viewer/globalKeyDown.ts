import type { SpreadsheetColumn } from '../types/spreadsheet'
import { isValidUrl, urlToMarkdown } from '../utils/linkUtils'

export type SelectedCell = {
  rowIndex: number
  colIndex: number
  rowId: string
  colId: string
}

export interface CreateGlobalKeyDownHandlerParams {
  selectedCell: SelectedCell
  activeSheetColumns: SpreadsheetColumn[]
  activeSheetAllowEdit: boolean
  isEditingEnabled: boolean
  isEditingCell: boolean
  isFormulaSelectionMode: boolean
  filteredData: Array<Record<string, unknown>>
  handleCellChange: (rowId: string, columnName: string, value: unknown) => void
  emitCursorImmediate: (rowId: string, colId: string, rowIndex: number, colIndex: number) => void
  setSelectedCell: (cell: SelectedCell | null) => void
}

function isLinkEditorTarget(target: HTMLElement): boolean {
  return Boolean(target.closest('[data-link-editor="true"]') || target.hasAttribute('data-link-editor-input'))
}

function isInNonCellInput(target: HTMLElement): boolean {
  const isCellInput = target.closest('[data-cell-rowid]')
  if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !isCellInput) return true
  return false
}

function navigateToAdjacentCell(params: {
  selectedCell: SelectedCell
  direction: 'up' | 'down' | 'left' | 'right'
  emitCursorImmediate: CreateGlobalKeyDownHandlerParams['emitCursorImmediate']
  setSelectedCell: CreateGlobalKeyDownHandlerParams['setSelectedCell']
}): void {
  const { rowIndex, colIndex } = params.selectedCell
  let targetRow = rowIndex
  let targetCol = colIndex

  switch (params.direction) {
    case 'up':
      targetRow = Math.max(0, rowIndex - 1)
      break
    case 'down':
      targetRow = rowIndex + 1
      break
    case 'left':
      targetCol = Math.max(0, colIndex - 1)
      break
    case 'right':
      targetCol = colIndex + 1
      break
  }

  if (targetRow === rowIndex && targetCol === colIndex) return

  const targetCell = document.querySelector(
    `[data-cell-row="${targetRow}"][data-cell-col="${targetCol}"]`
  ) as HTMLElement | null
  if (!targetCell) return

  const targetRowId = targetCell.dataset.cellRowid
  const targetColId = targetCell.dataset.cellColid
  if (!targetRowId || !targetColId) return

  params.emitCursorImmediate(targetRowId, targetColId, targetRow, targetCol)
  params.setSelectedCell({ rowId: targetRowId, colId: targetColId, rowIndex: targetRow, colIndex: targetCol })
}

function startEditingAtCell(params: { rowIndex: number; colIndex: number; startChar?: string }): void {
  const cellElement = document.querySelector(
    `[data-cell-row="${params.rowIndex}"][data-cell-col="${params.colIndex}"]`
  ) as HTMLElement | null
  if (!cellElement) return
  if (params.startChar) {
    cellElement.dataset.startChar = params.startChar
  }
  cellElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
}

function getEditableColumn(params: CreateGlobalKeyDownHandlerParams): SpreadsheetColumn | undefined {
  return params.activeSheetColumns.find(c => c.id === params.selectedCell.colId)
}

function canEditCell(params: CreateGlobalKeyDownHandlerParams, column: SpreadsheetColumn | undefined): boolean {
  if (!params.isEditingEnabled) return false
  if (!params.activeSheetAllowEdit) return false
  if (!column?.isEditable) return false
  if (column.type === 'calculated') return false
  return true
}

export function createSpreadsheetGlobalKeyDownHandler(
  params: CreateGlobalKeyDownHandlerParams
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (isLinkEditorTarget(target)) return
    if (isInNonCellInput(target)) return
    if (params.isEditingCell) return
    if (params.isFormulaSelectionMode) return
    if (target.hasAttribute('data-cell-rowid')) return

    const column = getEditableColumn(params)
    const canEdit = canEditCell(params, column)

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        navigateToAdjacentCell({
          selectedCell: params.selectedCell,
          direction: 'up',
          emitCursorImmediate: params.emitCursorImmediate,
          setSelectedCell: params.setSelectedCell
        })
        return
      case 'ArrowDown':
        e.preventDefault()
        navigateToAdjacentCell({
          selectedCell: params.selectedCell,
          direction: 'down',
          emitCursorImmediate: params.emitCursorImmediate,
          setSelectedCell: params.setSelectedCell
        })
        return
      case 'ArrowLeft':
        e.preventDefault()
        navigateToAdjacentCell({
          selectedCell: params.selectedCell,
          direction: 'left',
          emitCursorImmediate: params.emitCursorImmediate,
          setSelectedCell: params.setSelectedCell
        })
        return
      case 'ArrowRight':
        e.preventDefault()
        navigateToAdjacentCell({
          selectedCell: params.selectedCell,
          direction: 'right',
          emitCursorImmediate: params.emitCursorImmediate,
          setSelectedCell: params.setSelectedCell
        })
        return
      case 'Tab':
        e.preventDefault()
        navigateToAdjacentCell({
          selectedCell: params.selectedCell,
          direction: e.shiftKey ? 'left' : 'right',
          emitCursorImmediate: params.emitCursorImmediate,
          setSelectedCell: params.setSelectedCell
        })
        return
      case 'Enter':
        e.preventDefault()
        navigateToAdjacentCell({
          selectedCell: params.selectedCell,
          direction: 'down',
          emitCursorImmediate: params.emitCursorImmediate,
          setSelectedCell: params.setSelectedCell
        })
        return
      case 'Escape':
        e.preventDefault()
        params.setSelectedCell(null)
        return
      case 'F2':
        e.preventDefault()
        startEditingAtCell({ rowIndex: params.selectedCell.rowIndex, colIndex: params.selectedCell.colIndex })
        return
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        if (canEdit && column) params.handleCellChange(params.selectedCell.rowId, column.name, '')
        return
      default:
        break
    }

    // Copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault()
      const row = params.filteredData.find(r => (r._id ?? r.id) === params.selectedCell.rowId)
      if (row && column) {
        const valueToCopy = String(row[column.name] ?? '')
        navigator.clipboard.writeText(valueToCopy)
      }
      return
    }

    // Paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault()
      if (!canEdit || !column) return
      navigator.clipboard.readText().then(text => {
        const processedText = isValidUrl(text) ? urlToMarkdown(text) : text
        params.handleCellChange(params.selectedCell.rowId, column.name, processedText)
      })
      return
    }

    // Printable character
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && canEdit) {
      e.preventDefault()
      startEditingAtCell({
        rowIndex: params.selectedCell.rowIndex,
        colIndex: params.selectedCell.colIndex,
        startChar: e.key
      })
    }
  }
}
