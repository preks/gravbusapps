/**
 * Editable Cell Component - Excel-like behavior
 * Single click = select, Double click = edit, Type when selected = replace
 */

import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from 'react'
import { Input } from '@newwork/nw-design-system'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import type { DocumentParticipant } from '../../../../../platform/apps/shared/services/CollaborationClient'
import { CellCollaboratorIndicator } from '../../../../../platform/apps/shared/components/CellCollaboratorIndicator'
import { LinkEditor } from '../components/LinkEditor'
import { isFormula } from '../utils/formulaEvaluator'
import { isValidUrl, urlToMarkdown, isMarkdownLink } from '../utils/linkUtils'
import { formatCellValue } from './utils'

export type FormulaSelectionMode = {
  editingCell: { rowId: string; colId: string }
  startCell: { rowIndex: number; colIndex: number } | null
  endCell: { rowIndex: number; colIndex: number } | null
  isRangeSelection: boolean
} | null

export interface EditableCellProps {
  value: unknown
  column: SpreadsheetColumn
  rowId: string
  rowIndex: number
  colIndex: number
  onSave: (rowId: string, columnName: string, value: unknown) => void
  isEditable: boolean
  allRows: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
  onFormulaCellSelect?: (rowIndex: number, colIndex: number, isRangeEnd?: boolean) => void
  formulaSelectionMode: FormulaSelectionMode
  setFormulaSelectionMode: (mode: FormulaSelectionMode) => void
  selectedCell: { rowId: string; colId: string; rowIndex: number; colIndex: number } | null
  setSelectedCell: (cell: { rowId: string; colId: string; rowIndex: number; colIndex: number } | null) => void
  onFormulaValueChange?: (value: string) => void
  formulaSelectedCells: Array<{ rowIndex: number; colIndex: number }>
  onEditingStateChange?: (isEditing: boolean) => void
  participants?: DocumentParticipant[]
  /** Emit cursor position immediately on cell selection (for faster collaboration) */
  onCursorEmit?: (rowId: string, colId: string, rowIndex: number, colIndex: number) => void
  /** Access token for API calls */
  accessToken?: string
}

export const EditableCell: React.FC<EditableCellProps> = React.memo(
  ({
    value,
    column,
    rowId,
    rowIndex,
    colIndex,
    onSave,
    isEditable,
    allRows,
    onFormulaCellSelect,
    formulaSelectionMode,
    setFormulaSelectionMode,
    selectedCell,
    setSelectedCell,
    onFormulaValueChange,
    formulaSelectedCells,
    onEditingStateChange,
    participants = [],
    onCursorEmit,
    accessToken = ''
  }) => {
    const [isEditing, setIsEditing] = useState(false)
    const [originalValue, setOriginalValue] = useState<string>('')
    const [editValue, setEditValue] = useState('')
    const [showLinkEditor, setShowLinkEditor] = useState(false)

    // Notify parent when editing state changes
    useEffect(() => {
      onEditingStateChange?.(isEditing)
    }, [isEditing, onEditingStateChange])

    // Get the row to check for stored formulas
    const currentRow = allRows.find(r => r._id === rowId || r.id === rowId)
    const formulas = currentRow?._formulas as Record<string, string> | undefined
    const storedFormula = formulas?.[column.name]
    const hasFormula = Boolean(storedFormula)

    const inputRef = useRef<HTMLInputElement>(null)
    const cellRef = useRef<HTMLDivElement>(null)
    const isCommittingRef = useRef(false)
    // Track if editing started from typing (vs double-click)
    const startedFromTypingRef = useRef(false)

    // Check if this cell is selected (but not editing)
    const isSelected = selectedCell?.rowId === rowId && selectedCell?.colId === column.id

    // Focus the cell when it becomes selected (for keyboard events)
    useEffect(() => {
      if (isSelected && !isEditing && cellRef.current) {
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
          cellRef.current?.focus()
        }, 0)
      }
    }, [isSelected, isEditing])

    // Check if we're in formula selection mode (this is the cell being edited)
    const isInFormulaMode =
      formulaSelectionMode !== null &&
      formulaSelectionMode.editingCell.rowId === rowId &&
      formulaSelectionMode.editingCell.colId === column.id

    const canEdit = isEditable && column.isEditable

    // Focus input when editing starts
    useLayoutEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus()
        // Only select all if started from double-click, not from typing
        if (startedFromTypingRef.current) {
          // Position cursor at end - use setTimeout to ensure it happens after browser's default focus behavior
          setTimeout(() => {
            if (inputRef.current) {
              const len = inputRef.current.value.length
              inputRef.current.setSelectionRange(len, len)
            }
          }, 0)
          startedFromTypingRef.current = false
        } else {
          inputRef.current.select()
        }
      }
    }, [isEditing])

    // Start editing - optionally clear content (when typing while selected)
    const startEditing = useCallback(
      (clearContent: boolean = false) => {
        if (!canEdit) return

        const initialValue = clearContent ? '' : storedFormula || String(value ?? '')
        setOriginalValue(storedFormula || String(value ?? ''))
        setEditValue(initialValue)
        setIsEditing(true)

        // Check if the value is a markdown link - if so, show link editor
        if (!clearContent && (isMarkdownLink(initialValue) || isValidUrl(initialValue))) {
          setShowLinkEditor(true)
        } else {
          setShowLinkEditor(false)
        }
      },
      [canEdit, storedFormula, value]
    )

    // Handle selection click (single click)
    const handleSelect = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        // If in formula selection mode, handle that instead
        if (formulaSelectionMode && !isInFormulaMode) {
          if (onFormulaCellSelect) {
            onFormulaCellSelect(rowIndex, colIndex, e.shiftKey)
          }
          return
        }

        // Emit cursor immediately for faster collaboration feedback
        onCursorEmit?.(rowId, column.id, rowIndex, colIndex)

        // Select this cell
        setSelectedCell({ rowId, colId: column.id, rowIndex, colIndex })

        // Focus the cell div so it can receive keyboard events
        cellRef.current?.focus()
      },
      [
        formulaSelectionMode,
        isInFormulaMode,
        onFormulaCellSelect,
        rowIndex,
        colIndex,
        onCursorEmit,
        rowId,
        column.id,
        setSelectedCell
      ]
    )

    // Handle double click to enter edit mode
    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!canEdit) return

        // Check if there's a startChar from keyboard typing or formula button
        const startChar = cellRef.current?.dataset.startChar
        if (startChar) {
          // Clear the attribute
          delete cellRef.current.dataset.startChar
          // Mark that we started from typing (not double-click)
          startedFromTypingRef.current = true
          // Start editing with the typed character/formula
          setOriginalValue(storedFormula || String(value ?? ''))
          setEditValue(startChar)
          setIsEditing(true)
          setShowLinkEditor(false) // Don't show link editor when typing

          // If it's a formula, enter formula selection mode and store the value
          if (startChar.trim().startsWith('=')) {
            if (onFormulaValueChange) {
              onFormulaValueChange(startChar)
            }
            setFormulaSelectionMode({
              editingCell: { rowId, colId: column.id },
              startCell: null,
              endCell: null,
              isRangeSelection: false
            })
          }
        } else {
          startEditing(false) // false = don't clear content
        }
      },
      [canEdit, storedFormula, value, onFormulaValueChange, setFormulaSelectionMode, rowId, column.id, startEditing]
    )

    // Save the cell value
    const handleSave = useCallback(() => {
      if (isCommittingRef.current) return
      isCommittingRef.current = true

      let convertedValue: unknown = editValue

      if (isFormula(editValue)) {
        convertedValue = editValue
      } else if (column.type === 'number' || column.type === 'currency' || column.type === 'percentage') {
        convertedValue = editValue === '' ? null : Number(editValue)
      } else if (column.type === 'boolean') {
        convertedValue = editValue.toLowerCase() === 'true' || editValue === '1'
      }

      onSave(rowId, column.name, convertedValue)
      setIsEditing(false)

      setTimeout(() => {
        isCommittingRef.current = false
      }, 0)
    }, [editValue, column.type, column.name, onSave, rowId])

    // Navigate to adjacent cell
    const navigateToCell = useCallback(
      (direction: 'up' | 'down' | 'left' | 'right') => {
        let targetRow = rowIndex
        let targetCol = colIndex

        switch (direction) {
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

        // Skip if we're already at the boundary and not moving
        if (targetRow === rowIndex && targetCol === colIndex) {
          return
        }

        const targetCell = document.querySelector(
          `[data-cell-row="${targetRow}"][data-cell-col="${targetCol}"]`
        ) as HTMLElement

        if (targetCell) {
          const targetRowId = targetCell.dataset.cellRowid
          const targetColId = targetCell.dataset.cellColid
          if (targetRowId && targetColId) {
            // Emit cursor immediately for collaboration
            onCursorEmit?.(targetRowId, targetColId, targetRow, targetCol)
            // Update selection
            setSelectedCell({ rowId: targetRowId, colId: targetColId, rowIndex: targetRow, colIndex: targetCol })
            targetCell.focus()
          }
        }
      },
      [rowIndex, colIndex, onCursorEmit, setSelectedCell]
    )

    // Handle keyboard events when cell is selected (not editing)
    const handleNavigationAndActionKeys = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>): boolean => {
        const directionByKey: Partial<Record<string, 'up' | 'down' | 'left' | 'right'>> = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right'
        }

        const direction = directionByKey[e.key]
        if (direction) {
          e.preventDefault()
          navigateToCell(direction)
          return true
        }

        if (e.key === 'Tab') {
          e.preventDefault()
          navigateToCell(e.shiftKey ? 'left' : 'right')
          return true
        }

        if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault()
          if (canEdit) startEditing(false)
          return true
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          if (canEdit) onSave(rowId, column.name, '')
          return true
        }

        if (e.key === 'Escape') {
          e.preventDefault()
          setSelectedCell(null)
          return true
        }

        return false
      },
      [navigateToCell, canEdit, startEditing, onSave, rowId, column.name, setSelectedCell]
    )

    const handleClipboardKeys = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>): boolean => {
        const isCtrlOrMeta = e.ctrlKey || e.metaKey

        if (isCtrlOrMeta && e.key === 'c') {
          e.preventDefault()
          navigator.clipboard.writeText(String(value ?? ''))
          return true
        }

        if (isCtrlOrMeta && e.key === 'v') {
          e.preventDefault()
          if (!canEdit) return true
          navigator.clipboard.readText().then(text => {
            const processedText = isValidUrl(text) ? urlToMarkdown(text) : text
            onSave(rowId, column.name, processedText)
          })
          return true
        }

        return false
      },
      [value, canEdit, onSave, rowId, column.name]
    )

    const handlePrintableKeyStartEdit = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>): boolean => {
        const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
        if (!isPrintable || !canEdit) return false

        e.preventDefault()
        startedFromTypingRef.current = true
        setOriginalValue(storedFormula || String(value ?? ''))
        setEditValue(e.key)
        setIsEditing(true)
        return true
      },
      [canEdit, storedFormula, value]
    )

    const handleCellKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isEditing) return

        // Don't handle if link editor is open
        if (showLinkEditor) return

        if (handleNavigationAndActionKeys(e)) return
        if (handleClipboardKeys(e)) return
        handlePrintableKeyStartEdit(e)
      },
      [isEditing, showLinkEditor, handleNavigationAndActionKeys, handleClipboardKeys, handlePrintableKeyStartEdit]
    )

    // Handle keyboard events when editing
    const handleInputKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const isFormulaInput = editValue.trim().startsWith('=')

        if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          if (isFormulaInput && formulaSelectionMode) {
            setFormulaSelectionMode(null)
          }
          handleSave()
          // Move to next row after save
          setTimeout(() => navigateToCell('down'), 0)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          setFormulaSelectionMode(null)
          setEditValue(originalValue)
          setIsEditing(false)
          // Keep cell selected
          cellRef.current?.focus()
        } else if (e.key === 'Tab') {
          e.preventDefault()
          e.stopPropagation()
          handleSave()
          setTimeout(() => navigateToCell(e.shiftKey ? 'left' : 'right'), 0)
        } else if (e.key === 'ArrowUp') {
          // Arrow up - save and navigate up
          e.preventDefault()
          e.stopPropagation()
          handleSave()
          setTimeout(() => navigateToCell('up'), 0)
        } else if (e.key === 'ArrowDown') {
          // Arrow down - save and navigate down
          e.preventDefault()
          e.stopPropagation()
          handleSave()
          setTimeout(() => navigateToCell('down'), 0)
        } else if (e.key === 'ArrowLeft') {
          // Only navigate if cursor is at the beginning
          const input = e.target as HTMLInputElement
          if (input.selectionStart === 0 && input.selectionEnd === 0) {
            e.preventDefault()
            e.stopPropagation()
            handleSave()
            setTimeout(() => navigateToCell('left'), 0)
          }
        } else if (e.key === 'ArrowRight') {
          // Only navigate if cursor is at the end
          const input = e.target as HTMLInputElement
          if (input.selectionStart === input.value.length) {
            e.preventDefault()
            e.stopPropagation()
            handleSave()
            setTimeout(() => navigateToCell('right'), 0)
          }
        }
      },
      [editValue, formulaSelectionMode, setFormulaSelectionMode, handleSave, navigateToCell, originalValue]
    )

    const handleBlur = useCallback(() => {
      if (isCommittingRef.current) return

      // Don't save if link editor is open (user is editing link)
      if (showLinkEditor) {
        return
      }

      // Don't save if in formula mode (clicking other cells)
      if (formulaSelectionMode && isInFormulaMode) {
        // Keep edit session open, but NEVER steal focus back.
        // Formula mode should be driven from the formula bar input.
        return
      }

      handleSave()
    }, [showLinkEditor, formulaSelectionMode, isInFormulaMode, handleSave])

    // Handle input change
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setEditValue(newValue)

        // Hide link editor if user is typing (they want to edit raw markdown)
        if (showLinkEditor) {
          setShowLinkEditor(false)
        }

        // Update the formula value at viewer level for formula mode
        if (newValue.trim().startsWith('=') && onFormulaValueChange) {
          onFormulaValueChange(newValue)
        }

        if (newValue.trim().startsWith('=') && !formulaSelectionMode) {
          setFormulaSelectionMode({
            editingCell: { rowId, colId: column.id },
            startCell: null,
            endCell: null,
            isRangeSelection: false
          })
        } else if (!newValue.trim().startsWith('=') && formulaSelectionMode && isInFormulaMode) {
          setFormulaSelectionMode(null)
        }
      },
      [
        showLinkEditor,
        onFormulaValueChange,
        formulaSelectionMode,
        setFormulaSelectionMode,
        rowId,
        column.id,
        isInFormulaMode
      ]
    )

    // Handle link editor save
    const handleLinkEditorSave = useCallback(
      (markdownLink: string) => {
        setEditValue(markdownLink)
        // Save immediately with the new markdown link value
        if (isCommittingRef.current) return
        isCommittingRef.current = true

        onSave(rowId, column.name, markdownLink)
        setIsEditing(false)
        setShowLinkEditor(false)

        setTimeout(() => {
          isCommittingRef.current = false
        }, 0)
      },
      [onSave, rowId, column.name]
    )

    // Handle link editor cancel
    const handleLinkEditorCancel = useCallback(() => {
      setShowLinkEditor(false)
      setIsEditing(false)
    }, [])

    // Check if this cell is selected in formula mode (for highlighting)
    // Use the formulaSelectedCells array to highlight ALL selected cells
    const isSelectedInFormula =
      formulaSelectionMode !== null &&
      !isInFormulaMode &&
      formulaSelectedCells.some(cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex)

    // Check if another user is editing this cell
    const collaboratorEditingCell = useMemo(() => {
      const found = participants.find(p => {
        const path = p.cursor?.path
        if (!path || path.length < 3) return false
        const [, cursorRowId, cursorColId] = path
        const matches = cursorRowId === rowId && cursorColId === column.id
        return matches
      })

      return found
    }, [participants, rowId, column.id])

    return (
      <div
        ref={cellRef}
        tabIndex={0}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleCellKeyDown}
        className={`gba:relative gba:py-1 gba:px-2 gba:min-h-[28px] gba:outline-none ${
          isSelected && !isEditing ? 'gba:ring-2 gba:ring-primary gba:ring-inset' : ''
        } ${canEdit && !isEditing && !isSelected ? 'gba:cursor-cell hover:gba:bg-muted/20' : ''} ${
          isInFormulaMode && isEditing ? 'gba:ring-2 gba:ring-primary gba:ring-inset gba:bg-primary/5' : ''
        } ${isSelectedInFormula ? 'gba:ring-2 gba:ring-info gba:ring-inset gba:bg-info/5' : ''}`}
        data-testid={`cell-${rowId}-${column.id}`}
        data-cell-row={rowIndex}
        data-cell-col={colIndex}
        data-cell-rowid={rowId}
        data-cell-colid={column.id}
      >
        {/* Show collaborator indicator if someone else is editing this cell */}
        {collaboratorEditingCell && !isEditing && (
          <CellCollaboratorIndicator
            userName={collaboratorEditingCell.userName}
            userColor={collaboratorEditingCell.userColor}
            avatarUrl={collaboratorEditingCell.avatarUrl}
            isActive={true}
            showLabel={false}
          />
        )}
        {isEditing ? (
          <div className="gba:relative" onKeyDown={e => showLinkEditor && e.stopPropagation()}>
            {showLinkEditor ? (
              <LinkEditor
                value={editValue}
                onSave={handleLinkEditorSave}
                onCancel={handleLinkEditorCancel}
                accessToken={accessToken}
                data-testid={`link-editor-${rowId}-${column.id}`}
              />
            ) : (
              <>
                <Input
                  ref={inputRef}
                  autoFocus
                  value={editValue}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  onBlur={handleBlur}
                  className="gba:h-[26px] gba:py-0 gba:px-1 gba:text-sm gba:min-w-[40px] gba:border-primary gba:rounded-none"
                  data-testid={`cell-input-${rowId}-${column.id}`}
                />
                {editValue.trim().startsWith('=') && (
                  <span className="gba:absolute gba:right-1 gba:top-1/2 gba:-translate-y-1/2 gba:text-[10px] gba:text-muted-foreground">
                    fx
                  </span>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="gba:flex gba:items-center gba:gap-1 gba:select-none gba:text-sm">
            {hasFormula && (
              <span className="gba:text-[10px] gba:text-muted-foreground" title={storedFormula}>
                =
              </span>
            )}
            {formatCellValue(value, column)}
          </div>
        )}
      </div>
    )
  }
)

EditableCell.displayName = 'EditableCell'

export default EditableCell
