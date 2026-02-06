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
  handleColumnsInsert: (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => void
  handleColumnsDelete: (startIndex: number, endIndex: number) => void

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

  // Stable refs for callbacks to avoid stale closures in async operations
  const onSheetUpdateRef = useRef(onSheetUpdate)
  useEffect(() => {
    onSheetUpdateRef.current = onSheetUpdate
  }, [onSheetUpdate])
  const onAppUpdateRef = useRef(onAppUpdate)
  useEffect(() => {
    onAppUpdateRef.current = onAppUpdate
  }, [onAppUpdate])
  const appRef = useRef(app)
  useEffect(() => {
    appRef.current = app
  }, [app])
  const activeSheetRef = useRef(activeSheet)
  useEffect(() => {
    activeSheetRef.current = activeSheet
  }, [activeSheet])

  // Track the latest columns including pending additions that haven't
  // propagated back through props yet (prevents stale-state race when
  // adding multiple columns quickly).
  const latestColumnsRef = useRef<SpreadsheetColumn[]>(activeSheet.columns)
  const hasPendingColumnChanges = useRef(false)
  useEffect(() => {
    // Only sync from props when there are no pending local changes
    if (!hasPendingColumnChanges.current) {
      latestColumnsRef.current = activeSheet.columns
    }
  }, [activeSheet.columns])

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

  // Add column handler — uses latestColumnsRef to prevent stale-state race
  // when adding multiple columns quickly, and uses callback refs to avoid
  // stale closures in the persist call.
  const handleAddColumn = useCallback(() => {
    if (!activeSheet) return

    const currentColumns = latestColumnsRef.current
    const existingColumnNames = currentColumns.map(col => col.name.toLowerCase())
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
      order: currentColumns.length
    }

    const updatedColumns = [...currentColumns, newColumn]
    // Update ref immediately so the next rapid call sees this column
    latestColumnsRef.current = updatedColumns
    hasPendingColumnChanges.current = true

    // Persist immediately using refs (avoids stale closure issues)
    const currentApp = appRef.current
    const currentSheet = activeSheetRef.current
    const sheetUpdate = onSheetUpdateRef.current
    const appUpdate = onAppUpdateRef.current

    if (sheetUpdate) {
      void sheetUpdate(currentApp.id, currentSheet.id, { columns: updatedColumns })
        .then(() => {
          hasPendingColumnChanges.current = false
        })
        .catch((err: unknown) => {
          console.error('[handleAddColumn] onSheetUpdate failed:', err)
        })
    } else if (appUpdate) {
      const updatedSheets = currentApp.sheets.map(sheet => {
        if (sheet.id === currentSheet.id) {
          return { ...sheet, data: localSheetDataRef.current, columns: updatedColumns }
        }
        return sheet
      })
      appUpdate({ ...currentApp, sheets: updatedSheets })
      hasPendingColumnChanges.current = false
    } else {
      console.warn('[handleAddColumn] No persistence callback available')
    }

    if (isCollaborationConnected) {
      emitOperation({
        type: 'column_add',
        data: { sheetId: activeSheet.id, column: newColumn }
      })
    }
  }, [activeSheet, isCollaborationConnected, emitOperation, localSheetDataRef])

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

      const currentColumns = latestColumnsRef.current
      const existingColumn = currentColumns.find(c => c.name === columnName || c.order === columnIndex)
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
      for (let i = currentColumns.length; i < columnIndex; i++) {
        const gapLetter = getColumnLetter(i)
        const gapColName = `column_${gapLetter.toLowerCase()}`
        if (!currentColumns.find(c => c.name === gapColName)) {
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

      const updatedColumns = [...currentColumns, ...columnsToAdd]
      // Update ref immediately so concurrent calls see these columns
      latestColumnsRef.current = updatedColumns
      hasPendingColumnChanges.current = true

      // Persist immediately using refs (avoids stale closure issues)
      const currentApp = appRef.current
      const currentSheet = activeSheetRef.current
      const sheetUpdate = onSheetUpdateRef.current
      const appUpdate = onAppUpdateRef.current

      if (sheetUpdate) {
        await sheetUpdate(currentApp.id, currentSheet.id, { columns: updatedColumns })
        hasPendingColumnChanges.current = false
      } else if (appUpdate) {
        const updatedSheets = currentApp.sheets.map(sheet => {
          if (sheet.id === currentSheet.id) {
            return { ...sheet, data: localSheetDataRef.current, columns: updatedColumns }
          }
          return sheet
        })
        appUpdate({ ...currentApp, sheets: updatedSheets })
        hasPendingColumnChanges.current = false
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
        }, 400)
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

  // Insert columns handler (from FortuneSheet context menu: insert column left/right)
  const handleColumnsInsert = useCallback(
    (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => {
      if (!activeSheet) return

      const currentColumns = latestColumnsRef.current
      // Determine the actual insert position:
      // 'lefttop' = insert before the index, 'rightbottom' = insert after the index
      const insertAt = direction === 'rightbottom' ? insertIndex + 1 : insertIndex

      // Generate new columns for each inserted position
      const newColumns: SpreadsheetColumn[] = []
      for (let i = 0; i < count; i++) {
        const position = insertAt + i
        // Find a unique name
        const existingNames = [
          ...currentColumns.map(c => c.name.toLowerCase()),
          ...newColumns.map(c => c.name.toLowerCase())
        ]
        let num = 1
        let colName = `column_${num}`
        while (existingNames.includes(colName)) {
          num++
          colName = `column_${num}`
        }

        newColumns.push({
          id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`,
          name: colName,
          label: `Column ${num}`,
          type: 'text',
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          width: 150,
          order: position
        })
      }

      // Rebuild the columns array: shift orders of existing columns at/after insertAt
      const updatedColumns = currentColumns.map(col => {
        if (col.order >= insertAt) {
          return { ...col, order: col.order + count }
        }
        return col
      })

      // Insert new columns and sort by order
      const allColumns = [...updatedColumns, ...newColumns].sort((a, b) => a.order - b.order)

      // Update ref immediately
      latestColumnsRef.current = allColumns
      hasPendingColumnChanges.current = true

      // Persist
      const currentApp = appRef.current
      const currentSheet = activeSheetRef.current
      const sheetUpdate = onSheetUpdateRef.current
      const appUpdate = onAppUpdateRef.current

      if (sheetUpdate) {
        void sheetUpdate(currentApp.id, currentSheet.id, { columns: allColumns })
          .then(() => {
            hasPendingColumnChanges.current = false
          })
          .catch((err: unknown) => {
            console.error('[handleColumnsInsert] onSheetUpdate failed:', err)
          })
      } else if (appUpdate) {
        const updatedSheets = currentApp.sheets.map(sheet => {
          if (sheet.id === currentSheet.id) {
            return { ...sheet, data: localSheetDataRef.current, columns: allColumns }
          }
          return sheet
        })
        appUpdate({ ...currentApp, sheets: updatedSheets })
        hasPendingColumnChanges.current = false
      }

      if (isCollaborationConnected) {
        newColumns.forEach(col => {
          emitOperation({
            type: 'column_add',
            data: { sheetId: activeSheet.id, column: col }
          })
        })
      }
    },
    [activeSheet, isCollaborationConnected, emitOperation, localSheetDataRef]
  )

  // Delete columns handler (from FortuneSheet context menu: delete column)
  const handleColumnsDelete = useCallback(
    (startIndex: number, endIndex: number) => {
      if (!activeSheet) return

      const currentColumns = latestColumnsRef.current
      const deleteCount = endIndex - startIndex + 1

      // Identify which columns are being deleted (by their order/position)
      const deletedColumns = currentColumns.filter(col => col.order >= startIndex && col.order <= endIndex)
      const deletedColumnNames = deletedColumns.map(c => c.name)

      // Don't allow deleting all columns
      if (deletedColumns.length >= currentColumns.length) return

      // Remove deleted columns and re-order remaining ones
      const remainingColumns = currentColumns
        .filter(col => col.order < startIndex || col.order > endIndex)
        .map(col => {
          if (col.order > endIndex) {
            return { ...col, order: col.order - deleteCount }
          }
          return col
        })
        .sort((a, b) => a.order - b.order)

      // Remove deleted column data from rows
      const updatedData = localSheetDataRef.current.map(row => {
        const newRow = { ...row }
        deletedColumnNames.forEach(name => {
          delete newRow[name]
        })
        return newRow
      })

      // Update ref immediately
      latestColumnsRef.current = remainingColumns
      hasPendingColumnChanges.current = true

      // Persist
      const currentApp = appRef.current
      const currentSheet = activeSheetRef.current
      const sheetUpdate = onSheetUpdateRef.current
      const appUpdate = onAppUpdateRef.current

      if (sheetUpdate) {
        void sheetUpdate(currentApp.id, currentSheet.id, { columns: remainingColumns })
          .then(() => {
            hasPendingColumnChanges.current = false
          })
          .catch((err: unknown) => {
            console.error('[handleColumnsDelete] onSheetUpdate failed:', err)
          })
      } else if (appUpdate) {
        const updatedSheets = currentApp.sheets.map(sheet => {
          if (sheet.id === currentSheet.id) {
            return { ...sheet, data: updatedData, columns: remainingColumns }
          }
          return sheet
        })
        appUpdate({ ...currentApp, sheets: updatedSheets })
        hasPendingColumnChanges.current = false
      }

      if (isCollaborationConnected) {
        deletedColumns.forEach(col => {
          emitOperation({
            type: 'column_delete',
            data: { sheetId: activeSheet.id, columnId: col.id }
          })
        })
      }
    },
    [activeSheet, isCollaborationConnected, emitOperation, localSheetDataRef]
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
    handleColumnsInsert,
    handleColumnsDelete,
    handleAddColumnRef,
    handleRenameColumnRef,
    handleReorderColumnsRef,
    columnIndexToLetter
  }
}
