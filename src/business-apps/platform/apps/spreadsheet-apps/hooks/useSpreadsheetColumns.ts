/**
 * useSpreadsheetColumns
 *
 * Manages column editing state and column manipulation handlers.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn } from '../types'

export interface UseSpreadsheetColumnsProps {
  app: SpreadsheetApp
  activeSheet: SpreadsheetSheet
  localSheetDataRef: React.MutableRefObject<Record<string, unknown>[]>
  handleCellChangeRef: React.MutableRefObject<(rowId: string, columnName: string, value: unknown) => void>
  onAppUpdate?: (app: SpreadsheetApp) => void
  onSheetUpdate?: (appId: string, sheetId: string, updates: Partial<SpreadsheetSheet>) => void
  isCollaborationConnected: boolean
  emitOperation: (operation: { type: string; data: unknown }) => void
}

export interface SpreadsheetColumnsState {
  // Column editing dialog state
  isManageColumnsDialogOpen: boolean
  setIsManageColumnsDialogOpen: (open: boolean) => void
  editingColumns: SpreadsheetColumn[]
  setEditingColumns: React.Dispatch<React.SetStateAction<SpreadsheetColumn[]>>

  // Inline column label editing state
  editingColumnId: string | null
  setEditingColumnId: (id: string | null) => void
  editingColumnLabel: string
  setEditingColumnLabel: (label: string) => void
  editingColumnIdRef: React.MutableRefObject<string | null>
  editingColumnLabelRef: React.MutableRefObject<string>

  // Column handlers
  handleAddColumn: () => void
  handleAutoColumnAdd: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => Promise<void>
  handleDeleteColumn: (columnId: string) => void
  handleRenameColumn: (columnId: string, newLabel: string) => void
  handleReorderColumns: (draggedColumnId: string, targetColumnId: string) => void

  // Handler refs for stable callbacks
  handleAddColumnRef: React.MutableRefObject<() => void>
  handleRenameColumnRef: React.MutableRefObject<(columnId: string, newLabel: string) => void>
  handleReorderColumnsRef: React.MutableRefObject<(draggedColumnId: string, targetColumnId: string) => void>

  // Utility
  columnIndexToLetter: (index: number) => string
}

export function useSpreadsheetColumns({
  app,
  activeSheet,
  localSheetDataRef,
  handleCellChangeRef,
  onAppUpdate,
  onSheetUpdate,
  isCollaborationConnected,
  emitOperation
}: UseSpreadsheetColumnsProps): SpreadsheetColumnsState {
  // Dialog state
  const [isManageColumnsDialogOpen, setIsManageColumnsDialogOpen] = useState(false)
  const [editingColumns, setEditingColumns] = useState<SpreadsheetColumn[]>([])

  // Inline editing state
  const [editingColumnId, setEditingColumnIdState] = useState<string | null>(null)
  const [editingColumnLabel, setEditingColumnLabelState] = useState('')

  // Refs for stable closures
  const editingColumnIdRef = useRef<string | null>(null)
  const editingColumnLabelRef = useRef('')

  // Stable setters
  const setEditingColumnId = useCallback((id: string | null) => {
    editingColumnIdRef.current = id
    setEditingColumnIdState(id)
  }, [])

  const setEditingColumnLabel = useCallback((label: string) => {
    editingColumnLabelRef.current = label
    setEditingColumnLabelState(label)
  }, [])

  // Add column handler
  const handleAddColumn = useCallback(() => {
    if (!activeSheet) return

    const existingColumnNames = activeSheet.columns.map(col => col.name.toLowerCase())
    let columnNumber = 1
    let columnName = `column_${columnNumber}`
    while (existingColumnNames.includes(columnName)) {
      columnNumber++
      columnName = `column_${columnNumber}`
    }

    const newColumn: SpreadsheetColumn = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: columnName,
      label: `Column ${columnNumber}`,
      type: 'text',
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      width: 150,
      order: activeSheet.columns.length
    }

    const updatedColumns = [...activeSheet.columns, newColumn]

    if (onSheetUpdate) {
      onSheetUpdate(app.id, activeSheet.id, { columns: updatedColumns })
    } else if (onAppUpdate) {
      const updatedSheets = app.sheets.map(sheet => {
        if (sheet.id === activeSheet.id) {
          return { ...sheet, data: localSheetDataRef.current, columns: updatedColumns }
        }
        return sheet
      })
      onAppUpdate({ ...app, sheets: updatedSheets })
    }

    if (isCollaborationConnected) {
      emitOperation({
        type: 'column_add',
        data: { sheetId: activeSheet.id, column: newColumn }
      })
    }
  }, [activeSheet, app, onAppUpdate, onSheetUpdate, isCollaborationConnected, emitOperation, localSheetDataRef])

  // Auto column add handler
  const handleAutoColumnAdd = useCallback(
    async (columnIndex: number, initialValue?: unknown, rowIndex?: number) => {
      if (!activeSheet) return

      const getColumnLetter = (idx: number): string => {
        let col = ''
        let num = idx + 1
        while (num > 0) {
          const remainder = (num - 1) % 26
          col = String.fromCharCode(65 + remainder) + col
          num = Math.floor((num - 1) / 26)
        }
        return col
      }

      const columnLetter = getColumnLetter(columnIndex)
      const columnName = `column_${columnLetter.toLowerCase()}`
      const columnLabel = `Column ${columnLetter}`

      const existingColumn = activeSheet.columns.find(c => c.name === columnName || c.order === columnIndex)
      if (existingColumn) {
        if (initialValue !== undefined && rowIndex !== undefined) {
          const rowId = localSheetDataRef.current[rowIndex]?._id as string
          if (rowId) {
            handleCellChangeRef.current(rowId, existingColumn.name, initialValue)
          }
        }
        return
      }

      const newColumn: SpreadsheetColumn = {
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: columnName,
        label: columnLabel,
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 100,
        order: columnIndex
      }

      const columnsToAdd: SpreadsheetColumn[] = []
      for (let i = activeSheet.columns.length; i < columnIndex; i++) {
        const gapLetter = getColumnLetter(i)
        const gapColName = `column_${gapLetter.toLowerCase()}`
        if (!activeSheet.columns.find(c => c.name === gapColName)) {
          columnsToAdd.push({
            id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`,
            name: gapColName,
            label: `Column ${gapLetter}`,
            type: 'text',
            isVisible: true,
            isEditable: true,
            isRequired: false,
            isUnique: false,
            width: 100,
            order: i
          })
        }
      }
      columnsToAdd.push(newColumn)

      const updatedColumns = [...activeSheet.columns, ...columnsToAdd]

      if (onSheetUpdate) {
        await onSheetUpdate(app.id, activeSheet.id, { columns: updatedColumns })
      } else if (onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet => {
          if (sheet.id === activeSheet.id) {
            return { ...sheet, data: localSheetDataRef.current, columns: updatedColumns }
          }
          return sheet
        })
        onAppUpdate({ ...app, sheets: updatedSheets })
      }

      if (isCollaborationConnected) {
        columnsToAdd.forEach(col => {
          emitOperation({
            type: 'column_add',
            data: { sheetId: activeSheet.id, column: col }
          })
        })
      }

      if (initialValue !== undefined && rowIndex !== undefined) {
        setTimeout(() => {
          const rowId = localSheetDataRef.current[rowIndex]?._id as string
          if (rowId) {
            handleCellChangeRef.current(rowId, columnName, initialValue)
          }
        }, 100)
      }
    },
    [
      activeSheet,
      app,
      onAppUpdate,
      onSheetUpdate,
      isCollaborationConnected,
      emitOperation,
      localSheetDataRef,
      handleCellChangeRef
    ]
  )

  // Delete column handler
  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      if (!activeSheet || activeSheet.columns.length <= 1) return

      const updatedColumns = activeSheet.columns.filter(col => col.id !== columnId)
      const columnToDelete = activeSheet.columns.find(col => col.id === columnId)
      const updatedData = localSheetDataRef.current.map(row => {
        const newRow = { ...row }
        if (columnToDelete) {
          delete newRow[columnToDelete.name]
        }
        return newRow
      })

      const updatedSheets = app.sheets.map(sheet => {
        if (sheet.id === activeSheet.id) {
          return { ...sheet, columns: updatedColumns, data: updatedData }
        }
        return sheet
      })

      onAppUpdate?.({ ...app, sheets: updatedSheets })

      if (isCollaborationConnected) {
        emitOperation({
          type: 'column_delete',
          data: { sheetId: activeSheet.id, columnId }
        })
      }
    },
    [activeSheet, app, onAppUpdate, isCollaborationConnected, emitOperation, localSheetDataRef]
  )

  // Rename column handler
  const handleRenameColumn = useCallback(
    (columnId: string, newLabel: string) => {
      if (!activeSheet || !newLabel.trim()) return

      const updatedColumns = activeSheet.columns.map(col => {
        if (col.id === columnId) {
          return { ...col, label: newLabel.trim() }
        }
        return col
      })

      if (onSheetUpdate) {
        onSheetUpdate(app.id, activeSheet.id, { columns: updatedColumns })
      } else if (onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet => {
          if (sheet.id === activeSheet.id) {
            return { ...sheet, columns: updatedColumns }
          }
          return sheet
        })
        onAppUpdate({ ...app, sheets: updatedSheets })
      }

      if (isCollaborationConnected) {
        emitOperation({
          type: 'column_update',
          data: { sheetId: activeSheet.id, columnId, label: newLabel.trim() }
        })
      }

      setEditingColumnId(null)
      setEditingColumnLabel('')
    },
    [
      activeSheet,
      app,
      onAppUpdate,
      onSheetUpdate,
      isCollaborationConnected,
      emitOperation,
      setEditingColumnId,
      setEditingColumnLabel
    ]
  )

  // Reorder columns handler
  const handleReorderColumns = useCallback(
    (draggedColumnId: string, targetColumnId: string) => {
      if (!activeSheet || draggedColumnId === targetColumnId) return

      const columns = [...activeSheet.columns]
      const draggedIndex = columns.findIndex(c => c.id === draggedColumnId)
      const targetIndex = columns.findIndex(c => c.id === targetColumnId)

      if (draggedIndex === -1 || targetIndex === -1) return

      const [draggedColumn] = columns.splice(draggedIndex, 1)
      columns.splice(targetIndex, 0, draggedColumn)

      const reorderedColumns = columns.map((col, idx) => ({ ...col, order: idx }))

      if (onSheetUpdate) {
        onSheetUpdate(app.id, activeSheet.id, { columns: reorderedColumns })
      } else if (onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet => {
          if (sheet.id === activeSheet.id) {
            return { ...sheet, columns: reorderedColumns }
          }
          return sheet
        })
        onAppUpdate({ ...app, sheets: updatedSheets })
      }

      if (isCollaborationConnected) {
        emitOperation({
          type: 'columns_reorder',
          data: { sheetId: activeSheet.id, columns: reorderedColumns }
        })
      }
    },
    [activeSheet, app, onAppUpdate, onSheetUpdate, isCollaborationConnected, emitOperation]
  )

  // Handler refs
  const handleAddColumnRef = useRef(handleAddColumn)
  const handleRenameColumnRef = useRef(handleRenameColumn)
  const handleReorderColumnsRef = useRef(handleReorderColumns)

  useEffect(() => {
    handleAddColumnRef.current = handleAddColumn
  }, [handleAddColumn])

  useEffect(() => {
    handleRenameColumnRef.current = handleRenameColumn
  }, [handleRenameColumn])

  useEffect(() => {
    handleReorderColumnsRef.current = handleReorderColumns
  }, [handleReorderColumns])

  // Column index to letter utility
  const columnIndexToLetter = useCallback((index: number): string => {
    let result = ''
    index += 1
    while (index > 0) {
      index -= 1
      result = String.fromCharCode(65 + (index % 26)) + result
      index = Math.floor(index / 26)
    }
    return result
  }, [])

  return {
    isManageColumnsDialogOpen,
    setIsManageColumnsDialogOpen,
    editingColumns,
    setEditingColumns,
    editingColumnId,
    setEditingColumnId,
    editingColumnLabel,
    setEditingColumnLabel,
    editingColumnIdRef,
    editingColumnLabelRef,
    handleAddColumn,
    handleAutoColumnAdd,
    handleDeleteColumn,
    handleRenameColumn,
    handleReorderColumns,
    handleAddColumnRef,
    handleRenameColumnRef,
    handleReorderColumnsRef,
    columnIndexToLetter
  }
}
