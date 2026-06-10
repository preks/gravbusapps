/**
 * useSpreadsheetColumns
 *
 * Manages column editing state and column manipulation handlers.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { columnIndexToLetter as spreadsheetColumnIndexToLetter } from '../core'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn } from '../types'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationType } from '../services/SpreadsheetApiService'
import type { SpreadsheetCommitOptimisticActiveSheetRows } from './useSpreadsheetBulkRows'
import {
  classifyNativeColumnReorderWithMerges,
  type ColumnReorderMove,
  type NativeColumnReorderBlockReason
} from '../utils/spreadsheetColumnReorderMoves'
import { resolveAuthoritativeWorksheetMergeRanges } from '../utils/spreadsheetMergeRanges'

/**
 * Column-structure operation payload emitted through the v2 batch endpoint.
 *
 * The server persists the column change (sheet.columns JSONB), bumps the sheet
 * version, writes an operation log entry, and broadcasts the same op to every
 * connected client including the originator. The originator's echo is skipped
 * by SpreadsheetCollaborationManager via the op-id dedupe cache, so the only
 * UX path that makes the local grid reflect the change immediately is the
 * optimistic onAppUpdate call below.
 */
export interface UseSpreadsheetColumnsProps {
  app: SpreadsheetApp
  activeSheet: SpreadsheetSheet
  effectiveActiveSheetColumns?: SpreadsheetColumn[]
  columnStructureStateRef?: React.MutableRefObject<{
    healthy: boolean
    pendingInsertedRange: { startIndex: number; endIndex: number; columnNames: string[] } | null
    expectedColumnsSignature: string | null
  }>
  localSheetDataRef: React.MutableRefObject<Record<string, unknown>[]>
  /**
   * When set (SpreadsheetAppViewer), row reads prefer live SpreadsheetSession rows for the active sheet,
   * falling back to `localSheetDataRef` — avoids treating the ref as the sole canonical row source.
   */
  canonicalActiveSheetRowsSourceRef?: React.MutableRefObject<() => Record<string, unknown>[]>
  /** Updates spreadsheet session rows for the active sheet (viewer commit pipeline). */
  commitOptimisticActiveSheetRows: SpreadsheetCommitOptimisticActiveSheetRows
  handleCellChangeRef: React.MutableRefObject<(rowId: string, columnName: string, value: unknown) => void>
  onAppUpdate?: (app: SpreadsheetApp) => void
  onDiagnosticsTraceEvent?: (event: SpreadsheetTraceEventInput) => void
  onBlockedColumnReorder?: (reason: NativeColumnReorderBlockReason | 'unplannable_reorder') => void
  /**
   * Emit a column-structure batch operation to the v2 HTTP batch endpoint.
   * This is the single authoritative persistence+broadcast path for
   * column_add / column_update / column_delete / columns_reorder. There is
   * no longer a WS P2P fallback — the server is the single broadcaster.
   */
  emitColumnBatchOperation?: (op: SpreadsheetBatchOperation) => void
  emitColumnBatchOperations?: (ops: SpreadsheetBatchOperation[]) => void
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
  handleColumnsMove: (
    sourceStartIndex: number,
    count: number,
    destinationIndex: number
  ) => SpreadsheetColumn[] | undefined
  handleColumnsInsert: (
    insertIndex: number,
    count: number,
    direction: 'lefttop' | 'rightbottom'
  ) => SpreadsheetColumn[] | undefined
  handleColumnsDelete: (
    startIndex: number,
    endIndex: number
  ) => { columns: SpreadsheetColumn[]; data: Record<string, unknown>[] } | undefined

  // Handler refs for stable callbacks
  handleAddColumnRef: React.MutableRefObject<() => void>
  handleRenameColumnRef: React.MutableRefObject<(columnId: string, newLabel: string) => void>
  handleReorderColumnsRef: React.MutableRefObject<(draggedColumnId: string, targetColumnId: string) => void>
  columnStructureStateRef: React.MutableRefObject<{
    healthy: boolean
    pendingInsertedRange: { startIndex: number; endIndex: number; columnNames: string[] } | null
    expectedColumnsSignature: string | null
  }>

  // Utility
  columnIndexToLetter: (index: number) => string
}

/** Creates a new SpreadsheetColumn with default properties. */
const createColumnId = (): string => {
  try {
    return crypto.randomUUID()
  } catch {
    return `column_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

const createColumn = (name: string, label: string, order: number, width: number = 150): SpreadsheetColumn => ({
  id: createColumnId(),
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

const sortColumnsByOrder = (columns: SpreadsheetColumn[]): SpreadsheetColumn[] =>
  [...columns].sort((a, b) => a.order - b.order)

const normalizeColumnMoveDestinationIndex = (
  sourceStartIndex: number,
  count: number,
  destinationIndex: number
): number | null => {
  const safeSourceStart = Math.max(0, Math.trunc(sourceStartIndex))
  const safeCount = Math.max(0, Math.trunc(count))
  const safeDestination = Math.max(0, Math.trunc(destinationIndex))
  if (safeCount <= 0) return safeDestination

  const sourceEndExclusive = safeSourceStart + safeCount
  if (safeDestination >= safeSourceStart && safeDestination <= sourceEndExclusive) {
    return null
  }

  return safeDestination > safeSourceStart ? Math.max(0, safeDestination - safeCount) : safeDestination
}

const buildColumnsSignature = (columns: SpreadsheetColumn[]): string =>
  sortColumnsByOrder(columns)
    .map(column => `${column.order}:${column.id}:${column.name}:${column.isVisible !== false ? 'visible' : 'hidden'}`)
    .join('|')

/** Generate a stable operationId for a column batch op, falling back for older browsers. */
const createColumnOperationId = (prefix: SpreadsheetBatchOperationType): string => {
  try {
    return `${prefix}_${crypto.randomUUID()}`
  } catch {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

export function useSpreadsheetColumns({
  app,
  activeSheet,
  effectiveActiveSheetColumns,
  columnStructureStateRef: externalColumnStructureStateRef,
  localSheetDataRef,
  canonicalActiveSheetRowsSourceRef,
  commitOptimisticActiveSheetRows,
  handleCellChangeRef,
  onAppUpdate,
  onDiagnosticsTraceEvent,
  onBlockedColumnReorder,
  emitColumnBatchOperation,
  emitColumnBatchOperations
}: UseSpreadsheetColumnsProps): SpreadsheetColumnsState {
  const readCanonicalActiveRows = (): Record<string, unknown>[] =>
    canonicalActiveSheetRowsSourceRef?.current() ?? localSheetDataRef.current
  // Dialog state
  const [isManageColumnsDialogOpen, setIsManageColumnsDialogOpen] = useState(false)
  const [editingColumns, setEditingColumns] = useState<SpreadsheetColumn[]>([])

  // Stable refs for callbacks to avoid stale closures in async operations
  const onAppUpdateRef = useRef(onAppUpdate)
  useEffect(() => {
    onAppUpdateRef.current = onAppUpdate
  }, [onAppUpdate])
  const onDiagnosticsTraceEventRef = useRef(onDiagnosticsTraceEvent)
  useEffect(() => {
    onDiagnosticsTraceEventRef.current = onDiagnosticsTraceEvent
  }, [onDiagnosticsTraceEvent])
  const emitColumnBatchOperationRef = useRef(emitColumnBatchOperation)
  useEffect(() => {
    emitColumnBatchOperationRef.current = emitColumnBatchOperation
  }, [emitColumnBatchOperation])
  const emitColumnBatchOperationsRef = useRef(emitColumnBatchOperations)
  useEffect(() => {
    emitColumnBatchOperationsRef.current = emitColumnBatchOperations
  }, [emitColumnBatchOperations])
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
  const latestColumnsRef = useRef<SpreadsheetColumn[]>(effectiveActiveSheetColumns ?? activeSheet.columns)
  const hasPendingColumnChanges = useRef(false)
  const internalColumnStructureStateRef = useRef<{
    healthy: boolean
    pendingInsertedRange: { startIndex: number; endIndex: number; columnNames: string[] } | null
    expectedColumnsSignature: string | null
  }>({
    healthy: true,
    pendingInsertedRange: null,
    expectedColumnsSignature: null
  })
  const columnStructureStateRef = externalColumnStructureStateRef ?? internalColumnStructureStateRef
  useEffect(() => {
    const incomingColumns = effectiveActiveSheetColumns ?? activeSheet.columns
    const normalized = sortColumnsByOrder(incomingColumns).map((col, idx) =>
      col.order === idx ? col : { ...col, order: idx }
    )
    const expectedSignature = columnStructureStateRef.current.expectedColumnsSignature
    if (expectedSignature && buildColumnsSignature(normalized) === expectedSignature) {
      columnStructureStateRef.current = {
        healthy: true,
        pendingInsertedRange: null,
        expectedColumnsSignature: null
      }
    }
    // Only sync from props when there are no pending local changes
    if (!hasPendingColumnChanges.current) {
      latestColumnsRef.current = normalized
    }
  }, [activeSheet.columns, effectiveActiveSheetColumns])

  const resolvePreferredColumnWidth = useCallback((columns: SpreadsheetColumn[], order: number): number => {
    const sortedColumns = sortColumnsByOrder(columns)
    const candidateWidths = [
      sortedColumns[order]?.width,
      sortedColumns[order - 1]?.width,
      sortedColumns[order + 1]?.width
    ]
    for (const candidate of candidateWidths) {
      if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
        return Math.round(candidate)
      }
    }
    return 150
  }, [])

  /**
   * Apply column changes to the local in-memory app state optimistically so
   * the grid re-renders immediately. The authoritative server write happens
   * via emitColumnBatchOperation (v2 batch endpoint), which persists the
   * columns JSONB and broadcasts to peers. We intentionally do NOT call the
   * legacy onSheetUpdate PATCH here: a PATCH would blind-overwrite sheet
   * columns and bump sheet.version independently of the batch pipeline,
   * racing future batch ops that rely on baseVersion.
   */
  const applyColumnsLocal = useCallback(
    (columns: SpreadsheetColumn[], handlerName: string, options?: { data?: Record<string, unknown>[] }): void => {
      const currentApp = appRef.current
      const currentSheet = activeSheetRef.current
      const appUpdate = onAppUpdateRef.current

      if (!appUpdate) {
        console.warn(`[${handlerName}] No onAppUpdate available — skipping local column state update`)
        return
      }

      const updatedSheets = currentApp.sheets.map(sheet => {
        if (sheet.id === currentSheet.id) {
          return {
            ...sheet,
            columns,
            data: options?.data ?? readCanonicalActiveRows()
          }
        }
        return sheet
      })
      appUpdate({ ...currentApp, sheets: updatedSheets })
      hasPendingColumnChanges.current = false
    },
    [canonicalActiveSheetRowsSourceRef, localSheetDataRef]
  )

  /** Dispatch a column batch op through the v2 HTTP batch endpoint. No-op when no emitter is wired. */
  const dispatchColumnBatchOp = useCallback(
    (type: SpreadsheetBatchOperationType, data: Record<string, unknown>): void => {
      const emit = emitColumnBatchOperationRef.current
      if (!emit) {
        return
      }
      const operationId = createColumnOperationId(type)
      onDiagnosticsTraceEventRef.current?.({
        source: 'client',
        stage: 'viewer_column_batch_operation_dispatch',
        severity: 'info',
        sheetId: typeof data.sheetId === 'string' ? data.sheetId : activeSheetRef.current.id,
        payload: {
          type,
          operationId,
          moveSignature:
            type === 'columns_reorder' &&
            typeof data.sheetId === 'string' &&
            typeof data.sourceStartIndex === 'number' &&
            typeof data.count === 'number' &&
            typeof data.destinationIndex === 'number'
              ? `${data.sheetId}:${data.sourceStartIndex}:${data.count}:${data.destinationIndex}`
              : null,
          sourceStartIndex: typeof data.sourceStartIndex === 'number' ? data.sourceStartIndex : null,
          count: typeof data.count === 'number' ? data.count : null,
          destinationIndex: typeof data.destinationIndex === 'number' ? data.destinationIndex : null,
          columnCount: Array.isArray(data.columns) ? data.columns.length : null
        }
      })
      emit({
        operationId,
        type,
        data
      })
    },
    []
  )

  const dispatchColumnBatchOps = useCallback((operations: SpreadsheetBatchOperation[]): void => {
    if (operations.length === 0) return
    const emitMany = emitColumnBatchOperationsRef.current
    if (emitMany) {
      emitMany(operations)
      return
    }
    const emit = emitColumnBatchOperationRef.current
    if (!emit) return
    operations.forEach(operation => emit(operation))
  }, [])

  const rejectUnsupportedColumnReorder = useCallback(
    (
      previousColumns: SpreadsheetColumn[],
      nextColumns: SpreadsheetColumn[],
      options?: {
        explicitMoves?: ColumnReorderMove[]
        diagnosticStage: string
        diagnosticPayload?: Record<string, unknown>
      }
    ): boolean => {
      const mergeRanges = resolveAuthoritativeWorksheetMergeRanges(activeSheetRef.current)
      const classification = classifyNativeColumnReorderWithMerges({
        previousColumns,
        nextColumns,
        mergeRanges,
        explicitMoves: options?.explicitMoves
      })
      const shouldBlock =
        !classification.ok && (classification.reason !== 'unplannable_reorder' || mergeRanges.length > 0)
      if (!shouldBlock) {
        return false
      }
      onDiagnosticsTraceEventRef.current?.({
        source: 'client',
        stage: options?.diagnosticStage ?? 'viewer_column_reorder_blocked_by_merge',
        severity: 'warning',
        sheetId: activeSheetRef.current.id,
        payload: {
          reason: classification.reason,
          mergeRangeCount: mergeRanges.length,
          ...(options?.diagnosticPayload ?? {})
        }
      })
      onBlockedColumnReorder?.(classification.reason)
      return true
    },
    [onBlockedColumnReorder]
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

    const newColumn = createColumn(
      columnName,
      `Column ${columnNumber}`,
      currentColumns.length,
      resolvePreferredColumnWidth(currentColumns, currentColumns.length)
    )

    const updatedColumns = [...currentColumns, newColumn]
    latestColumnsRef.current = updatedColumns
    hasPendingColumnChanges.current = true

    applyColumnsLocal(updatedColumns, 'handleAddColumn')
    dispatchColumnBatchOp('column_add', { sheetId: activeSheet.id, column: newColumn })
  }, [activeSheet, applyColumnsLocal, dispatchColumnBatchOp, resolvePreferredColumnWidth])

  // Auto column add handler
  const handleAutoColumnAdd = useCallback(
    async (columnIndex: number, initialValue?: unknown, rowIndex?: number) => {
      if (!activeSheet) return

      const columnLetter = spreadsheetColumnIndexToLetter(columnIndex)
      const columnName = `column_${columnLetter.toLowerCase()}`
      const columnLabel = `Column ${columnLetter}`

      const currentColumns = latestColumnsRef.current
      const existingColumn = currentColumns.find(c => c.name === columnName || c.order === columnIndex)
      const structuralColumn = sortColumnsByOrder(currentColumns)[columnIndex]
      if (existingColumn) {
        if (initialValue !== undefined && rowIndex !== undefined) {
          const rowId = readCanonicalActiveRows()[rowIndex]?._id as string
          if (rowId) {
            handleCellChangeRef.current(rowId, existingColumn.name, initialValue)
          }
        }
        return
      }
      if (!columnStructureStateRef.current.healthy) {
        if (structuralColumn && initialValue !== undefined && rowIndex !== undefined) {
          const rowId = readCanonicalActiveRows()[rowIndex]?._id as string
          if (rowId) {
            handleCellChangeRef.current(rowId, structuralColumn.name, initialValue)
          }
        }
        return
      }

      const newColumn = createColumn(
        columnName,
        columnLabel,
        columnIndex,
        resolvePreferredColumnWidth(currentColumns, columnIndex)
      )

      // Fill gap columns between current count and target index
      const columnsToAdd: SpreadsheetColumn[] = []
      for (let i = currentColumns.length; i < columnIndex; i++) {
        const gapLetter = spreadsheetColumnIndexToLetter(i)
        const gapColName = `column_${gapLetter.toLowerCase()}`
        if (!currentColumns.find(c => c.name === gapColName)) {
          columnsToAdd.push(
            createColumn(gapColName, `Column ${gapLetter}`, i, resolvePreferredColumnWidth(currentColumns, i))
          )
        }
      }
      columnsToAdd.push(newColumn)

      const updatedColumns = [...currentColumns, ...columnsToAdd]
      latestColumnsRef.current = updatedColumns
      hasPendingColumnChanges.current = true

      applyColumnsLocal(updatedColumns, 'handleAutoColumnAdd')
      columnsToAdd.forEach(col => {
        dispatchColumnBatchOp('column_add', { sheetId: activeSheet.id, column: col })
      })

      if (initialValue !== undefined && rowIndex !== undefined) {
        // Columns are persisted via the batch pipeline above; this delay lets
        // the op round-trip so the cell write isn't rejected with a stale
        // column error on the server.
        setTimeout(() => {
          const rowId = readCanonicalActiveRows()[rowIndex]?._id as string
          if (rowId) {
            handleCellChangeRef.current(rowId, columnName, initialValue)
          }
        }, 400)
      }
    },
    [
      activeSheet,
      applyColumnsLocal,
      dispatchColumnBatchOp,
      resolvePreferredColumnWidth,
      canonicalActiveSheetRowsSourceRef,
      localSheetDataRef,
      handleCellChangeRef
    ]
  )

  // Delete column handler
  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      const currentColumns = latestColumnsRef.current
      if (!activeSheet || currentColumns.length <= 1) return

      const sortedColumns = [...currentColumns].sort((a, b) => a.order - b.order)
      const columnToDelete = sortedColumns.find(col => col.id === columnId)
      const visibleDeleteIndex = sortedColumns
        .filter(col => col.isVisible !== false)
        .findIndex(col => col.id === columnId)

      // Remove the deleted column and assign clean sequential orders
      const updatedColumns = currentColumns
        .filter(col => col.id !== columnId)
        .sort((a, b) => a.order - b.order)
        .map((col, idx) => ({ ...col, order: idx }))

      const updatedData = readCanonicalActiveRows().map(row => {
        const newRow = { ...row }
        if (columnToDelete) {
          delete newRow[columnToDelete.name]
        }
        return newRow
      })

      commitOptimisticActiveSheetRows(updatedData)

      latestColumnsRef.current = updatedColumns
      hasPendingColumnChanges.current = true

      applyColumnsLocal(updatedColumns, 'handleDeleteColumn', { data: updatedData })
      dispatchColumnBatchOp('column_delete', {
        sheetId: activeSheet.id,
        columnId,
        ...(visibleDeleteIndex >= 0 ? { visibleDeleteIndex, deleteCount: 1 } : {})
      })
    },
    [
      activeSheet,
      applyColumnsLocal,
      commitOptimisticActiveSheetRows,
      dispatchColumnBatchOp,
      canonicalActiveSheetRowsSourceRef,
      localSheetDataRef
    ]
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

      applyColumnsLocal(updatedColumns, 'handleRenameColumn')
      dispatchColumnBatchOp('column_update', {
        sheetId: activeSheet.id,
        columnId,
        label: newLabel.trim()
      })

      setEditingColumnId(null)
      setEditingColumnLabel('')
    },
    [activeSheet, applyColumnsLocal, dispatchColumnBatchOp, setEditingColumnId, setEditingColumnLabel]
  )

  // Reorder columns handler
  const handleReorderColumns = useCallback(
    (draggedColumnId: string, targetColumnId: string) => {
      if (!activeSheet || draggedColumnId === targetColumnId) return

      const columns = [...latestColumnsRef.current]
      const draggedIndex = columns.findIndex(c => c.id === draggedColumnId)
      const targetIndex = columns.findIndex(c => c.id === targetColumnId)

      if (draggedIndex === -1 || targetIndex === -1) return

      const [draggedColumn] = columns.splice(draggedIndex, 1)
      columns.splice(targetIndex, 0, draggedColumn)

      const reorderedColumns = columns.map((col, idx) => ({ ...col, order: idx }))
      if (
        rejectUnsupportedColumnReorder(latestColumnsRef.current, reorderedColumns, {
          diagnosticStage: 'viewer_column_reorder_handler_blocked',
          diagnosticPayload: { draggedColumnId, targetColumnId }
        })
      ) {
        return
      }

      const visibleColumns = latestColumnsRef.current
        .slice()
        .sort((left, right) => left.order - right.order)
        .filter(column => column.isVisible !== false)
      const sourceStartIndex = visibleColumns.findIndex(column => column.id === draggedColumnId)
      const targetVisibleIndex = visibleColumns.findIndex(column => column.id === targetColumnId)
      const destinationIndex =
        sourceStartIndex >= 0 && targetVisibleIndex >= 0
          ? sourceStartIndex < targetVisibleIndex
            ? targetVisibleIndex + 1
            : targetVisibleIndex
          : null
      const normalizedDestinationIndex =
        sourceStartIndex >= 0 && destinationIndex != null
          ? normalizeColumnMoveDestinationIndex(sourceStartIndex, 1, destinationIndex)
          : null
      const explicitMove =
        sourceStartIndex >= 0 && destinationIndex != null && normalizedDestinationIndex != null
          ? {
              sourceStartIndex,
              count: 1,
              destinationIndex,
              normalizedDestinationIndex
            }
          : null

      applyColumnsLocal(reorderedColumns, 'handleReorderColumns')
      dispatchColumnBatchOp('columns_reorder', {
        sheetId: activeSheet.id,
        columns: reorderedColumns,
        ...(explicitMove ?? {})
      })
    },
    [activeSheet, applyColumnsLocal, dispatchColumnBatchOp, rejectUnsupportedColumnReorder]
  )

  const handleColumnsMove = useCallback(
    (sourceStartIndex: number, count: number, destinationIndex: number): SpreadsheetColumn[] | undefined => {
      if (!activeSheet || count <= 0) return undefined

      const currentColumns = latestColumnsRef.current
      const sortedColumns = [...currentColumns].sort((a, b) => a.order - b.order)
      const visibleSortedColumns = sortedColumns.filter(c => c.isVisible !== false)

      const safeSourceStart = Math.max(0, Math.trunc(sourceStartIndex))
      const safeCount = Math.max(0, Math.trunc(count))
      const movedVisibleColumns = visibleSortedColumns.slice(safeSourceStart, safeSourceStart + safeCount)
      if (movedVisibleColumns.length === 0) return undefined

      const movedColumnIds = new Set(movedVisibleColumns.map(column => column.id))
      const remainingVisibleColumns = visibleSortedColumns.filter(column => !movedColumnIds.has(column.id))
      const normalizedDestinationIndex = normalizeColumnMoveDestinationIndex(
        safeSourceStart,
        movedVisibleColumns.length,
        destinationIndex
      )
      if (normalizedDestinationIndex == null) return undefined
      const safeDestinationIndex = Math.max(0, Math.min(normalizedDestinationIndex, remainingVisibleColumns.length))
      const moveSignature = `${activeSheet.id}:${safeSourceStart}:${movedVisibleColumns.length}:${destinationIndex}`

      const remainingAllColumns = sortedColumns.filter(column => !movedColumnIds.has(column.id))
      const fullInsertAt =
        safeDestinationIndex >= remainingVisibleColumns.length
          ? remainingAllColumns.length
          : Math.max(
              0,
              remainingAllColumns.findIndex(column => column.id === remainingVisibleColumns[safeDestinationIndex]?.id)
            )

      const reorderedColumns = [
        ...remainingAllColumns.slice(0, fullInsertAt),
        ...movedVisibleColumns,
        ...remainingAllColumns.slice(fullInsertAt)
      ].map((column, index) => ({ ...column, order: index }))
      const explicitMove = {
        sourceStartColumn: safeSourceStart,
        count: movedVisibleColumns.length,
        destinationStartColumn: safeDestinationIndex,
        rawDestinationStartColumn: Math.max(0, Math.trunc(destinationIndex))
      }
      if (
        rejectUnsupportedColumnReorder(currentColumns, reorderedColumns, {
          explicitMoves: [explicitMove],
          diagnosticStage: 'viewer_column_move_handler_blocked',
          diagnosticPayload: {
            sourceStartIndex: safeSourceStart,
            count: movedVisibleColumns.length,
            destinationIndex,
            normalizedDestinationIndex: safeDestinationIndex,
            moveSignature
          }
        })
      ) {
        return undefined
      }

      latestColumnsRef.current = reorderedColumns
      hasPendingColumnChanges.current = true

      onDiagnosticsTraceEventRef.current?.({
        source: 'client',
        stage: 'viewer_column_move_handler_executed',
        severity: 'info',
        sheetId: activeSheet.id,
        payload: {
          sourceStartIndex: safeSourceStart,
          count: movedVisibleColumns.length,
          destinationIndex,
          normalizedDestinationIndex,
          safeDestinationIndex,
          moveSignature,
          movedColumnIds: movedVisibleColumns.map(column => column.id),
          visibleColumnCountBefore: visibleSortedColumns.length,
          totalColumnCountBefore: sortedColumns.length
        }
      })

      applyColumnsLocal(reorderedColumns, 'handleColumnsMove')
      dispatchColumnBatchOp('columns_reorder', {
        sheetId: activeSheet.id,
        columns: reorderedColumns,
        sourceStartIndex: safeSourceStart,
        count: movedVisibleColumns.length,
        destinationIndex,
        normalizedDestinationIndex: safeDestinationIndex
      })

      return reorderedColumns
    },
    [activeSheet, applyColumnsLocal, dispatchColumnBatchOp, rejectUnsupportedColumnReorder]
  )

  // Insert columns handler (from FortuneSheet context menu: insert column left/right)
  const handleColumnsInsert = useCallback(
    (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom'): SpreadsheetColumn[] | undefined => {
      if (!activeSheet) return undefined

      const currentColumns = latestColumnsRef.current
      const sortedColumns = [...currentColumns].sort((a, b) => a.order - b.order)

      // FortuneSheet only sees visible columns, so its insertIndex is a position
      // within the visible-only subset. Map it back to the full sorted array.
      const visibleSortedColumns = sortedColumns.filter(c => c.isVisible !== false)

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
        newColumns.push(
          createColumn(
            colName,
            `Column ${num}`,
            fullInsertAt + i,
            resolvePreferredColumnWidth(currentColumns, fullInsertAt + i)
          )
        )
      }

      // Splice new columns into the sorted array at the mapped position
      // then assign clean sequential orders
      const allColumns = [
        ...sortedColumns.slice(0, fullInsertAt),
        ...newColumns,
        ...sortedColumns.slice(fullInsertAt)
      ].map((col, idx) => ({ ...col, order: idx }))

      columnStructureStateRef.current = {
        healthy: false,
        pendingInsertedRange: {
          startIndex: fullInsertAt,
          endIndex: fullInsertAt + count - 1,
          columnNames: allColumns.slice(fullInsertAt, fullInsertAt + count).map(column => column.name)
        },
        expectedColumnsSignature: buildColumnsSignature(allColumns)
      }

      latestColumnsRef.current = allColumns
      hasPendingColumnChanges.current = true

      applyColumnsLocal(allColumns, 'handleColumnsInsert')
      const visibleInsertIndex = sortedColumns
        .slice(0, fullInsertAt)
        .filter(column => column.isVisible !== false).length
      dispatchColumnBatchOps(
        newColumns.map((col, index) => ({
          operationId: createColumnOperationId('column_add'),
          type: 'column_add',
          data: {
            sheetId: activeSheet.id,
            column: col,
            ...(index === 0 ? { visibleInsertIndex, insertCount: count } : {})
          }
        }))
      )
      return allColumns
    },
    [activeSheet, applyColumnsLocal, dispatchColumnBatchOps, resolvePreferredColumnWidth]
  )

  // Delete columns handler (from FortuneSheet context menu: delete column)
  const handleColumnsDelete = useCallback(
    (
      startIndex: number,
      endIndex: number
    ): { columns: SpreadsheetColumn[]; data: Record<string, unknown>[] } | undefined => {
      if (!activeSheet) return undefined

      const currentColumns = latestColumnsRef.current
      const sortedColumns = [...currentColumns].sort((a, b) => a.order - b.order)

      // FortuneSheet only sees visible columns, so its startIndex/endIndex are
      // positions within the visible-only subset. Map through visible columns
      // to identify which actual columns are being deleted.
      const visibleSortedColumns = sortedColumns.filter(c => c.isVisible !== false)
      const deletedColumns = visibleSortedColumns.slice(startIndex, endIndex + 1)
      const deletedColumnIds = new Set(deletedColumns.map(c => c.id))
      const deletedColumnNames = deletedColumns.map(c => c.name)

      // Don't allow deleting all columns
      if (deletedColumns.length >= currentColumns.length) return undefined

      // Remove deleted columns and assign clean sequential orders
      const remainingColumns = sortedColumns
        .filter(col => !deletedColumnIds.has(col.id))
        .map((col, idx) => ({ ...col, order: idx }))

      // Remove deleted column data from rows
      const updatedData = readCanonicalActiveRows().map(row => {
        const newRow = { ...row }
        deletedColumnNames.forEach(name => {
          delete newRow[name]
        })
        return newRow
      })

      commitOptimisticActiveSheetRows(updatedData)

      latestColumnsRef.current = remainingColumns
      hasPendingColumnChanges.current = true

      applyColumnsLocal(remainingColumns, 'handleColumnsDelete', { data: updatedData })
      const visibleDeleteIndex = startIndex
      const deleteCount = deletedColumns.length
      dispatchColumnBatchOps(
        deletedColumns.map((col, index) => ({
          operationId: createColumnOperationId('column_delete'),
          type: 'column_delete',
          data: {
            sheetId: activeSheet.id,
            columnId: col.id,
            ...(index === 0 ? { visibleDeleteIndex, deleteCount } : {})
          }
        }))
      )
      return { columns: remainingColumns, data: updatedData }
    },
    [
      activeSheet,
      applyColumnsLocal,
      commitOptimisticActiveSheetRows,
      dispatchColumnBatchOps,
      canonicalActiveSheetRowsSourceRef,
      localSheetDataRef
    ]
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
  const columnIndexToLetter = useCallback((index: number): string => spreadsheetColumnIndexToLetter(index), [])

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
    handleColumnsMove,
    handleColumnsInsert,
    handleColumnsDelete,
    handleAddColumnRef,
    handleRenameColumnRef,
    handleReorderColumnsRef,
    columnStructureStateRef,
    columnIndexToLetter
  }
}
