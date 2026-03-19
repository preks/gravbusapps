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
  setLocalSheetData: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>
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

/** Creates a new SpreadsheetColumn with default properties. */
const createColumn = (name: string, label: string, order: number, width: number = 150): SpreadsheetColumn => ({
  id: crypto.randomUUID(),
  name,
  label,
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  width,
  order
})

/** Converts a zero-based column index to an Excel-style letter (0 → A, 25 → Z, 26 → AA). */
const indexToColumnLetter = (idx: number): string => {
  let col = ''
  let num = idx + 1
  while (num > 0) {
    const remainder = (num - 1) % 26
    col = String.fromCharCode(65 + remainder) + col
    num = Math.floor((num - 1) / 26)
  }
  return col
}

export function useSpreadsheetColumns({
  app,
  activeSheet,
  localSheetDataRef,
  setLocalSheetData,
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
      // Normalize orders to sequential values when syncing from props.
      // Columns may arrive with duplicate order values (e.g. multiple cols
      // at order=1) which breaks position-based operations like delete/insert.
      const sorted = [...activeSheet.columns].sort((a, b) => a.order - b.order)
      const normalized = sorted.map((col, idx) => (col.order === idx ? col : { ...col, order: idx }))
      latestColumnsRef.current = normalized
    }
  }, [activeSheet.columns])

  /**
   * Persist column changes to the backend via onSheetUpdate or onAppUpdate.
   * Centralises the duplicated persist pattern used by every column handler.
   */
  const persistColumns = useCallback(
    (
      columns: SpreadsheetColumn[],
      handlerName: string,
      options?: { data?: Record<string, unknown>[]; async?: boolean }
    ): void | Promise<void> => {
      const currentApp = appRef.current
      const currentSheet = activeSheetRef.current
      const sheetUpdate = onSheetUpdateRef.current
      const appUpdate = onAppUpdateRef.current

      if (sheetUpdate) {
        const promise = sheetUpdate(currentApp.id, currentSheet.id, { columns })
          .then(() => {
            hasPendingColumnChanges.current = false
          })
          .catch((err: unknown) => {
            console.error(`[${handlerName}] onSheetUpdate failed:`, err)
          })
        if (options?.async) return promise
      } else if (appUpdate) {
        const updatedSheets = currentApp.sheets.map(sheet => {
          if (sheet.id === currentSheet.id) {
            return {
              ...sheet,
              columns,
              data: options?.data ?? localSheetDataRef.current
            }
          }
          return sheet
        })
        appUpdate({ ...currentApp, sheets: updatedSheets })
        hasPendingColumnChanges.current = false
      } else {
        console.warn(`[${handlerName}] No persistence callback available`)
      }
    },
    [localSheetDataRef]
  )

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

    const newColumn = createColumn(columnName, `Column ${columnNumber}`, currentColumns.length)

    const updatedColumns = [...currentColumns, newColumn]
    latestColumnsRef.current = updatedColumns
    hasPendingColumnChanges.current = true

    persistColumns(updatedColumns, 'handleAddColumn')

    if (isCollaborationConnected) {
      emitOperation({
        type: 'column_add',
        data: { sheetId: activeSheet.id, column: newColumn }
      })
    }
  }, [activeSheet, isCollaborationConnected, emitOperation, persistColumns])

  // Auto column add handler
  const handleAutoColumnAdd = useCallback(
    async (columnIndex: number, initialValue?: unknown, rowIndex?: number) => {
      if (!activeSheet) return

      const columnLetter = indexToColumnLetter(columnIndex)
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

      const newColumn = createColumn(columnName, columnLabel, columnIndex, 100)

      // Fill gap columns between current count and target index
      const columnsToAdd: SpreadsheetColumn[] = []
      for (let i = currentColumns.length; i < columnIndex; i++) {
        const gapLetter = indexToColumnLetter(i)
        const gapColName = `column_${gapLetter.toLowerCase()}`
        if (!currentColumns.find(c => c.name === gapColName)) {
          columnsToAdd.push(createColumn(gapColName, `Column ${gapLetter}`, i, 100))
        }
      }
      columnsToAdd.push(newColumn)

      const updatedColumns = [...currentColumns, ...columnsToAdd]
      latestColumnsRef.current = updatedColumns
      hasPendingColumnChanges.current = true

      await persistColumns(updatedColumns, 'handleAutoColumnAdd', { async: true })

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
    [activeSheet, isCollaborationConnected, emitOperation, localSheetDataRef, handleCellChangeRef, persistColumns]
  )

  // Delete column handler
  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      const currentColumns = latestColumnsRef.current
      if (!activeSheet || currentColumns.length <= 1) return

      const columnToDelete = currentColumns.find(col => col.id === columnId)

      // Remove the deleted column and assign clean sequential orders
      const updatedColumns = currentColumns
        .filter(col => col.id !== columnId)
        .sort((a, b) => a.order - b.order)
        .map((col, idx) => ({ ...col, order: idx }))

      const updatedData = localSheetDataRef.current.map(row => {
        const newRow = { ...row }
        if (columnToDelete) {
          delete newRow[columnToDelete.name]
        }
        return newRow
      })

      // Sync cleaned data to local state so the grid re-renders with correct alignment
      localSheetDataRef.current = updatedData
      setLocalSheetData(updatedData)

      latestColumnsRef.current = updatedColumns
      hasPendingColumnChanges.current = true

      persistColumns(updatedColumns, 'handleDeleteColumn', { data: updatedData })

      if (isCollaborationConnected) {
        emitOperation({
          type: 'column_delete',
          data: { sheetId: activeSheet.id, columnId }
        })
      }
    },
    [activeSheet, isCollaborationConnected, emitOperation, localSheetDataRef, setLocalSheetData, persistColumns]
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

      persistColumns(updatedColumns, 'handleRenameColumn')

      if (isCollaborationConnected) {
        emitOperation({
          type: 'column_update',
          data: { sheetId: activeSheet.id, columnId, label: newLabel.trim() }
        })
      }

      setEditingColumnId(null)
      setEditingColumnLabel('')
    },
    [activeSheet, isCollaborationConnected, emitOperation, setEditingColumnId, setEditingColumnLabel, persistColumns]
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

      persistColumns(reorderedColumns, 'handleReorderColumns')

      if (isCollaborationConnected) {
        emitOperation({
          type: 'columns_reorder',
          data: { sheetId: activeSheet.id, columns: reorderedColumns }
        })
      }
    },
    [activeSheet, isCollaborationConnected, emitOperation, persistColumns]
  )

  // Insert columns handler (from FortuneSheet context menu: insert column left/right)
  const handleColumnsInsert = useCallback(
    (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => {
      if (!activeSheet) return

      const currentColumns = latestColumnsRef.current
      const sortedColumns = [...currentColumns].sort((a, b) => a.order - b.order)

      // FortuneSheet only sees visible columns, so its insertIndex is a position
      // within the visible-only subset. Map it back to the full sorted array.
      const visibleSortedColumns = sortedColumns.filter(c => c.isVisible)

      // Determine visible insert position
      const visibleInsertAt = direction === 'rightbottom' ? insertIndex + 1 : insertIndex

      // Map the visible position to the full sorted array position
      let fullInsertAt: number
      if (visibleInsertAt >= visibleSortedColumns.length) {
        fullInsertAt = sortedColumns.length
      } else {
        const targetCol = visibleSortedColumns[visibleInsertAt]
        fullInsertAt = sortedColumns.findIndex(c => c.id === targetCol.id)
        if (fullInsertAt === -1) fullInsertAt = sortedColumns.length
      }

      // Generate new columns for each inserted position
      const newColumns: SpreadsheetColumn[] = []
      for (let i = 0; i < count; i++) {
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
        newColumns.push(createColumn(colName, `Column ${num}`, fullInsertAt + i))
      }

      // Splice new columns into the sorted array at the mapped position
      // then assign clean sequential orders
      const allColumns = [
        ...sortedColumns.slice(0, fullInsertAt),
        ...newColumns,
        ...sortedColumns.slice(fullInsertAt)
      ].map((col, idx) => ({ ...col, order: idx }))

      latestColumnsRef.current = allColumns
      hasPendingColumnChanges.current = true

      persistColumns(allColumns, 'handleColumnsInsert')

      if (isCollaborationConnected) {
        newColumns.forEach(col => {
          emitOperation({
            type: 'column_add',
            data: { sheetId: activeSheet.id, column: col }
          })
        })
      }
    },
    [activeSheet, isCollaborationConnected, emitOperation, persistColumns]
  )

  // Delete columns handler (from FortuneSheet context menu: delete column)
  const handleColumnsDelete = useCallback(
    (startIndex: number, endIndex: number) => {
      if (!activeSheet) return

      const currentColumns = latestColumnsRef.current
      const sortedColumns = [...currentColumns].sort((a, b) => a.order - b.order)

      // FortuneSheet only sees visible columns, so its startIndex/endIndex are
      // positions within the visible-only subset. Map through visible columns
      // to identify which actual columns are being deleted.
      const visibleSortedColumns = sortedColumns.filter(c => c.isVisible)
      const deletedColumns = visibleSortedColumns.slice(startIndex, endIndex + 1)
      const deletedColumnIds = new Set(deletedColumns.map(c => c.id))
      const deletedColumnNames = deletedColumns.map(c => c.name)

      // Don't allow deleting all columns
      if (deletedColumns.length >= currentColumns.length) return

      // Remove deleted columns and assign clean sequential orders
      const remainingColumns = sortedColumns
        .filter(col => !deletedColumnIds.has(col.id))
        .map((col, idx) => ({ ...col, order: idx }))

      // Remove deleted column data from rows
      const updatedData = localSheetDataRef.current.map(row => {
        const newRow = { ...row }
        deletedColumnNames.forEach(name => {
          delete newRow[name]
        })
        return newRow
      })

      // Sync cleaned data to local state so the grid re-renders with correct alignment
      localSheetDataRef.current = updatedData
      setLocalSheetData(updatedData)

      latestColumnsRef.current = remainingColumns
      hasPendingColumnChanges.current = true

      persistColumns(remainingColumns, 'handleColumnsDelete', { data: updatedData })

      if (isCollaborationConnected) {
        deletedColumns.forEach(col => {
          emitOperation({
            type: 'column_delete',
            data: { sheetId: activeSheet.id, columnId: col.id }
          })
        })
      }
    },
    [activeSheet, isCollaborationConnected, emitOperation, localSheetDataRef, setLocalSheetData, persistColumns]
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

  // Column index to letter utility — delegates to the shared helper
  const columnIndexToLetter = useCallback((index: number): string => indexToColumnLetter(index), [])

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
