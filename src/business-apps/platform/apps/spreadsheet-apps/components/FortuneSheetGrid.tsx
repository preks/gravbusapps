/**
 * FortuneSheetGrid Component
 *
 * Wrapper component that integrates FortuneSheet with our spreadsheet system.
 * Handles data conversion, collaboration, and bidirectional sync.
 */

import { useEffect, useRef, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react'
import { Workbook } from '@fortune-sheet/react'
import type { WorkbookInstance } from '@fortune-sheet/react'
import '@fortune-sheet/react/dist/index.css'
import './FortuneSheetGrid.css'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types/spreadsheet'
import type { DocumentParticipant, DocumentOperation } from '../../shared/services/CollaborationClient'
import type { FortuneSheetOp } from '../types/fortuneSheet'
import { convertToFortuneSheet, createConversionContext, HEADER_ROW_OFFSET } from '../utils/fortuneSheetConverter'
import { useFortuneSheetCollaboration, useFortuneSheetCursorTracking } from '../hooks/useFortuneSheetCollaboration'

export interface FortuneSheetGridProps {
  /** Current sheet configuration */
  sheet: SpreadsheetSheet
  /** Sheet data in our format */
  data: Record<string, unknown>[]
  /** Column definitions */
  columns: SpreadsheetColumn[]
  /** Whether grid is read-only */
  isReadOnly: boolean
  /** Callback when cell value changes (options.fromRemote = true when applying received collaboration op) */
  onCellChange: (rowId: string, columnId: string, value: unknown, options?: { fromRemote?: boolean }) => void
  /** Callback when data changes (batch update) */
  onDataChange: (data: Record<string, unknown>[]) => void
  /** Callback when a new column needs to be created (auto-column creation) */
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  /** Callback when columns are inserted via context menu (insert left/right) */
  onColumnsInsert?: (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => void
  /** Callback when columns are deleted via context menu */
  onColumnsDelete?: (startIndex: number, endIndex: number) => void
  /** Callback when rows are inserted via context menu */
  onRowsInsert?: (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => void
  /** Callback when rows are deleted via context menu */
  onRowsDelete?: (startIndex: number, endIndex: number) => void
  /** Callback when columns are hidden/shown via context menu */
  onColumnVisibilityChange?: (columnIndices: number[], visible: boolean) => void
  /** Callback when a column header is renamed (user edits the header cell) */
  onColumnRename?: (columnId: string, newLabel: string) => void
  /** Callback when formula is evaluated */
  onFormulaEvaluated?: (rowId: string, columnId: string, result: unknown) => void
  /** Active participants in collaboration */
  participants?: DocumentParticipant[]
  /** Emit operation for collaboration */
  onOperationEmit?: (operation: DocumentOperation) => void
  /** Emit cursor position for collaboration */
  onCursorEmit?: (position: { path: string[] }) => void
  /** Whether collaboration is enabled */
  collaborationEnabled?: boolean
  /** Container height */
  height?: string | number
  /** Container width */
  width?: string | number
  /** Called when a remote cell update was applied so parent can force grid refresh */
  onRemoteChangeApplied?: () => void
  /** Key to force Workbook remount when remote data arrives (bump when onRemoteChangeApplied is called) */
  remoteUpdateKey?: number
  /** Remote operation to apply (from viewer's WebSocket); grid applies it when this changes */
  receivedOperation?: { operation: any; timestamp: number } | null
  /** Called when FortuneSheet filter state changes (for persistence across refreshes) */
  onFilterStateChange?: (filterState: {
    filter?: Record<string, unknown> | null
    filter_select?: Record<string, unknown>
    rowhidden?: Record<string, number>
  }) => void
}

/** Ref handle for imperative actions */
export interface FortuneSheetGridHandle {
  /** Apply a remote cell update without full re-render */
  applyRemoteCellUpdate: (rowIndex: number, colIndex: number, value: unknown) => void
}

/**
 * FortuneSheetGrid - Main wrapper component
 */
export const FortuneSheetGrid = forwardRef<FortuneSheetGridHandle, FortuneSheetGridProps>(
  function FortuneSheetGrid(props, ref) {
    const {
      sheet,
      data,
      columns,
      isReadOnly,
      onCellChange,
      onDataChange,
      onColumnAdd,
      onColumnsInsert,
      onColumnsDelete,
      onRowsInsert,
      onRowsDelete,
      onColumnVisibilityChange,
      onColumnRename,
      participants = [],
      onOperationEmit = () => {},
      onCursorEmit = () => {},
      collaborationEnabled = false,
      onRemoteChangeApplied,
      remoteUpdateKey = 0,
      receivedOperation,
      onFilterStateChange
    } = props

    // Track if we're currently processing a local edit (to prevent feedback loops)
    const isLocalEditRef = useRef(false)

    // Accumulate cell values for new rows (multi-cell paste into empty rows).
    // Uses a single flush timer for all pending rows to prevent timer-ordering races.
    const pendingNewRowCells = useRef<Map<number, Record<string, unknown>>>(new Map())
    const pendingNewRowFlushTimer = useRef<NodeJS.Timeout | null>(null)

    // Track pending column creations to prevent infinite loops
    const pendingColumnCreations = useRef<Set<number>>(new Set())

    // Track the previous colhidden state to diff when FortuneSheet replaces the full config
    const prevColHiddenRef = useRef<Record<string, number>>({})

    const workbookRef = useRef<WorkbookInstance | null>(null)
    const presenceUsersRef = useRef<Map<string, { username: string; userId?: string }>>(new Map())
    /** Track last applied remote cell to suppress duplicate apply to adjacent column (G6 value appearing in H6) */
    const lastRemoteAppliedRef = useRef<{ row: number; col: number; value: unknown; at: number } | null>(null)
    const REMOTE_APPLY_DEDUPE_MS = 150

    // Create conversion context
    const context = useMemo(() => {
      return createConversionContext(columns, data)
    }, [columns, data])

    // Convert data to FortuneSheet format ONLY for initial render or full refresh.
    // Deps intentionally exclude `data` and `columns`: FortuneSheet manages local
    // edits, column inserts/deletes, and paste internally.  Re-initialisation only
    // happens on sheet switch (`sheet.id`) or explicit remote refresh (`remoteUpdateKey`).
    const initialFortuneSheetData = useMemo(() => {
      try {
        const converted = convertToFortuneSheet(sheet, data, columns)

        // CRITICAL FIX: Ensure all required properties are present and in correct format
        // FortuneSheet's internal context initialization depends on these exact properties
        // Missing or incorrectly formatted properties cause "cannot read properties of undefined" errors

        // Ensure luckysheet_select_save is always a valid array (can be empty per FortuneSheet docs)
        if (!Array.isArray(converted.luckysheet_select_save)) {
          converted.luckysheet_select_save = []
        }

        // Ensure luckysheet_selection_range is always a valid array (can be empty per FortuneSheet docs)
        if (!Array.isArray(converted.luckysheet_selection_range)) {
          converted.luckysheet_selection_range = []
        }

        // Ensure calcChain is always an array
        if (!Array.isArray(converted.calcChain)) {
          converted.calcChain = []
        }

        // Ensure filter_select is always an object
        if (!converted.filter_select || typeof converted.filter_select !== 'object') {
          converted.filter_select = {}
        }

        // Ensure luckysheet_alternateformat_save is always an array
        if (!Array.isArray(converted.luckysheet_alternateformat_save)) {
          converted.luckysheet_alternateformat_save = []
        }

        // Ensure luckysheet_conditionformat_save is always an array
        if (!Array.isArray(converted.luckysheet_conditionformat_save)) {
          converted.luckysheet_conditionformat_save = []
        }

        // Ensure config is always an object (not null/undefined)
        if (!converted.config || typeof converted.config !== 'object') {
          converted.config = {
            merge: {},
            rowlen: {},
            columnlen: {},
            rowhidden: {},
            colhidden: {},
            borderInfo: [],
            authority: {}
          }
        }

        return converted
      } catch (error) {
        console.error('[FortuneSheetGrid] Conversion error:', error)
        return null
      }
    }, [sheet.id, remoteUpdateKey]) // Only reinit on sheet switch or remote refresh

    // Apply remote cell updates directly to FortuneSheet without full re-render
    const applyRemoteCellUpdate = useCallback(
      (rowIndex: number, colIndex: number, value: unknown) => {
        const workbook = workbookRef.current
        if (!workbook) return

        try {
          isLocalEditRef.current = true

          if (value && typeof value === 'object' && 'f' in value) {
            const cellObj = value as { f: string; v?: unknown; m?: string }
            try {
              workbook.setCellFormat(rowIndex, colIndex, 'f', cellObj.f, { id: sheet.id })
              if (cellObj.v !== undefined) {
                workbook.setCellFormat(rowIndex, colIndex, 'v', cellObj.v, { id: sheet.id })
              }
              if (cellObj.m !== undefined) {
                workbook.setCellFormat(rowIndex, colIndex, 'm', cellObj.m, { id: sheet.id })
              }
              workbook.calculateFormula(sheet.id)
            } catch (error) {
              console.error('[FortuneSheetGrid] Failed to apply formula update:', error)
              workbook.setCellValue(rowIndex, colIndex, cellObj.v, { id: sheet.id })
            }
          } else {
            workbook.setCellValue(rowIndex, colIndex, value, { id: sheet.id })
          }

          lastRemoteAppliedRef.current = { row: rowIndex, col: colIndex, value, at: Date.now() }
        } catch (error) {
          console.error('[FortuneSheetGrid] Failed to apply remote cell update:', error)
        } finally {
          setTimeout(() => {
            isLocalEditRef.current = false
          }, REMOTE_APPLY_DEDUPE_MS)
        }
      },
      [sheet.id]
    )

    /**
     * Defensive hardening:
     * FortuneSheet/Luckysheet can throw inside `getSelection(ctx)` when `ctx` is temporarily undefined
     * in remote-loaded builds. This manifests as:
     *   TypeError: Cannot read properties of undefined (reading 'luckysheet_select_save')
     *
     * We patch the instance method once per workbook instance to prevent hard crashes/freezes.
     * Returning an empty selection is safe and avoids the uncaught exception loop.
     */
    const patchWorkbookSelection = useCallback((ref: WorkbookInstance | null) => {
      if (!ref) return
      const anyRef = ref as any
      if (anyRef.__gbaSelectionPatched) return

      const original = anyRef.getSelection
      if (typeof original === 'function') {
        anyRef.getSelection = (...args: any[]) => {
          try {
            return original.apply(ref, args)
          } catch (error) {
            console.error('[FortuneSheetGrid] getSelection crashed; returning empty selection:', error)
            return []
          }
        }
      }

      anyRef.__gbaSelectionPatched = true
    }, [])

    // Expose imperative methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        applyRemoteCellUpdate
      }),
      [applyRemoteCellUpdate]
    )

    /**
     * Apply remote operation to FortuneSheet using cell-level API.
     * Deduplicates spurious duplicate: when first user edits G6, sometimes a second op
     * for H6 with the same value is emitted; we skip applying that so the other user
     * only sees the value in G6.
     * Also syncs the change into parent data via onCellChange so the grid re-renders immediately.
     */
    const applyOperationToFortuneSheet = useCallback(
      (op: FortuneSheetOp) => {
        if (op.op !== 'replace' || op.path.length < 3 || op.path[0] !== 'data') return

        const rowIndex = op.path[1] as number
        const colIndex = op.path[2] as number
        // Check if this is a formula operation (path ends with 'f')
        const property = op.path.length >= 4 ? String(op.path[3]) : 'v'
        const isFormula = property === 'f'

        let value = op.value
        // Check if value is a full cell object with a formula
        const isFullCellWithFormula =
          value && typeof value === 'object' && 'f' in value && typeof (value as any).f === 'string'

        // For regular value operations WITHOUT formulas, extract v from cell objects
        // But preserve the full cell object if it contains a formula
        if (!isFormula && !isFullCellWithFormula && value && typeof value === 'object' && 'v' in value) {
          value = (value as { v: unknown }).v
        }

        const last = lastRemoteAppliedRef.current
        const now = Date.now()
        // For deduplication, compare the display value
        const displayValue = isFullCellWithFormula ? (value as any).v : value
        if (
          last &&
          now - last.at < REMOTE_APPLY_DEDUPE_MS &&
          last.row === rowIndex &&
          last.col === colIndex - 1 &&
          last.value === displayValue
        ) {
          return
        }

        // Remote ops use data row indices; translate to FortuneSheet row by adding header offset
        // Apply the cell update
        if (isFormula && typeof value === 'string') {
          applyRemoteCellUpdate(rowIndex + HEADER_ROW_OFFSET, colIndex, { f: value })
        } else if (isFullCellWithFormula) {
          applyRemoteCellUpdate(rowIndex + HEADER_ROW_OFFSET, colIndex, value)
        } else {
          applyRemoteCellUpdate(rowIndex + HEADER_ROW_OFFSET, colIndex, value)
        }

        // Defer state updates to avoid setState-during-render warning
        const rowId = context.rowIndexToId.get(rowIndex)
        const columnId = context.columnIndexToId.get(colIndex)
        const isFormulaOnly = isFormula && typeof value === 'string'
        setTimeout(() => {
          if (onCellChange && rowId && columnId) {
            const column = columns.find(c => c.id === columnId)
            const columnName = column?.name ?? columnId
            const changeValue = isFormulaOnly ? { f: value } : value
            onCellChange(rowId, columnName, changeValue, { fromRemote: true })
          }
          // Avoid remount for formula cells to preserve formula state
          if (!isFullCellWithFormula && !isFormulaOnly) {
            onRemoteChangeApplied?.()
          }
        }, 0)
      },
      [applyRemoteCellUpdate, context, columns, onCellChange, onRemoteChangeApplied]
    )

    // Collaboration hooks
    const collaboration = useFortuneSheetCollaboration({
      sheetId: sheet.id,
      context,
      enabled: collaborationEnabled,
      onOperationEmit,
      onApplyOperation: applyOperationToFortuneSheet,
      debounceDelay: 300
    })

    // Apply received remote operations from the viewer's WebSocket
    const lastAppliedOpTimestamp = useRef<number>(0)
    useEffect(() => {
      if (!receivedOperation || !collaborationEnabled) return
      if (receivedOperation.timestamp <= lastAppliedOpTimestamp.current) return
      lastAppliedOpTimestamp.current = receivedOperation.timestamp
      collaboration.handleDocumentOp(receivedOperation.operation)
    }, [receivedOperation, collaborationEnabled, collaboration])

    const cursorTracking = useFortuneSheetCursorTracking({
      sheetId: sheet.id,
      context,
      enabled: collaborationEnabled,
      onCursorEmit
    })

    // Stable cursor tracking reference for FortuneSheet hooks
    const cursorTrackingRef = useRef(cursorTracking)
    cursorTrackingRef.current = cursorTracking

    // Use FortuneSheet native selection hook (avoids calling Workbook.getSelection() which can crash when ctx is undefined)
    const workbookHooks = useMemo(() => {
      return {
        afterSelectionChange: (activeSheetId: string, selection: any) => {
          if (!collaborationEnabled) return
          if (activeSheetId !== sheet.id) return

          const fortuneSheetRow = selection?.row?.[0]
          const col = selection?.column?.[0]

          if (typeof fortuneSheetRow !== 'number' || typeof col !== 'number') return
          // Subtract header offset to get data row index for cursor tracking
          const dataRow = fortuneSheetRow - HEADER_ROW_OFFSET
          if (dataRow < 0) return // Header row selected, skip cursor emit
          cursorTrackingRef.current.handleCellSelection(dataRow, col)
        }
      }
    }, [collaborationEnabled, sheet.id])

    // Sync remote cursor presence into FortuneSheet UI (debounced)
    const lastPresenceUpdateRef = useRef<number>(0)
    useEffect(() => {
      const workbook = workbookRef.current
      if (!workbook || !collaborationEnabled) return

      // Debounce presence updates to prevent flickering
      const now = Date.now()
      if (now - lastPresenceUpdateRef.current < 300) return
      lastPresenceUpdateRef.current = now

      const currentContext = createConversionContext(columns, data)

      const presences =
        participants
          ?.map(participant => {
            const cursorPath = participant.cursor?.path
            if (!Array.isArray(cursorPath) || cursorPath.length < 3) return null

            const [cursorSheetId, rowId, columnId] = cursorPath
            if (cursorSheetId !== sheet.id || !rowId || !columnId) return null

            const dataRowIndex = currentContext.rowIdToIndex.get(String(rowId))
            const colIndex = currentContext.columnIdToIndex.get(String(columnId))
            if (dataRowIndex === undefined || colIndex === undefined) return null

            const userName = participant.userName || participant.userId || 'User'
            return {
              sheetId: sheet.id,
              username: userName,
              userId: participant.userId,
              color: participant.userColor || '#3b82f6',
              // Add header offset when mapping to FortuneSheet row
              selection: { r: dataRowIndex + HEADER_ROW_OFFSET, c: colIndex }
            }
          })
          .filter(Boolean) || []

      const nextUsers = new Map<string, { username: string; userId?: string }>()
      presences.forEach(presence => {
        if (!presence) return
        const key = presence.userId ? String(presence.userId) : String(presence.username)
        nextUsers.set(key, { username: presence.username, userId: presence.userId })
      })

      const toRemove: { username: string; userId?: string }[] = []
      presenceUsersRef.current.forEach((user, key) => {
        if (!nextUsers.has(key)) {
          toRemove.push(user)
        }
      })

      try {
        if (toRemove.length > 0) {
          workbook.removePresences(toRemove)
        }

        if (presences.length > 0) {
          workbook.addPresences(
            presences as Array<{
              sheetId: string
              username: string
              userId?: string
              color: string
              selection: { r: number; c: number }
            }>
          )
        }
      } catch {
        // FortuneSheet not ready yet; skip this tick
        return
      }

      presenceUsersRef.current = nextUsers
    }, [participants, columns, data, sheet.id, collaborationEnabled])

    /**
     * Handle FortuneSheet onOp event
     */
    const handleOp = useCallback(
      (ops: FortuneSheetOp[]) => {
        // Ignore operations that come from programmatic updates (remote sync)
        if (isLocalEditRef.current) {
          return
        }

        if (!ops || ops.length === 0) {
          return
        }

        // Process each operation
        ops.forEach(op => {
          // Handle collaboration sync - emit to other users
          if (collaborationEnabled) {
            collaboration.handleFortuneSheetOp(op)
          }

          // Handle cell changes for callbacks
          // Path format: ['data', rowIndex, colIndex] for cell value
          // Or: ['data', rowIndex, colIndex, 'propertyName'] for cell properties (fc=fontColor, bg=background, etc.)
          // Note: FortuneSheet emits 'replace' for overwriting existing cells, 'add' for
          // populating empty/null cells (e.g. during paste), and 'remove' for clearing cells
          // (e.g. Delete key, Clear context menu, or undo of a paste). All must be persisted.
          if (
            (op.op === 'replace' || op.op === 'add' || op.op === 'remove') &&
            op.path.length >= 3 &&
            op.path[0] === 'data'
          ) {
            const fortuneSheetRowIndex = op.path[1] as number
            const colIndex = op.path[2] as number

            // Header row (row 0) edits = column rename, not data changes
            if (fortuneSheetRowIndex < HEADER_ROW_OFFSET) {
              if (onColumnRename && (op.op === 'replace' || op.op === 'add')) {
                // Extract the new column name text from the op value
                let newLabel: string | null = null
                if (typeof op.value === 'string') {
                  newLabel = op.value
                } else if (op.value && typeof op.value === 'object' && !Array.isArray(op.value)) {
                  const cellObj = op.value as Record<string, unknown>
                  if ('v' in cellObj && typeof cellObj.v === 'string') {
                    newLabel = cellObj.v
                  } else if ('m' in cellObj && typeof cellObj.m === 'string') {
                    newLabel = cellObj.m
                  }
                }

                if (newLabel && newLabel.trim()) {
                  const columnId = context.columnIndexToId.get(colIndex)
                  if (columnId) {
                    onColumnRename(columnId, newLabel.trim())
                  }
                }
              }
              return
            }

            // Convert FortuneSheet row index to data row index (subtract header offset)
            const rowIndex = fortuneSheetRowIndex - HEADER_ROW_OFFSET

            // Skip styling-only changes (fc, bg, bl, it, etc.) - they're handled by FortuneSheet UI
            // but we don't persist them to avoid complexity
            // path.length === 4 means: ['data', row, col, 'property'] → specific property change
            if (op.path.length === 4) {
              const prop = op.path[3]
              // Persist 'v' (value) and 'f' (formula) changes, skip styling properties
              if (prop !== 'v' && prop !== 'f') {
                return
              }
            }

            // Map data row index to row ID (context uses data indices, not FortuneSheet indices)
            const rowId = context.rowIndexToId.get(rowIndex)
            const columnId = context.columnIndexToId.get(colIndex)

            // Extract cell value - handle both direct values and cell objects
            // For 'remove' ops (cell clear, undo), the cell should become null
            let cellValue = op.value
            if (op.op === 'remove') {
              cellValue = null
            } else {
              const isCellObject = cellValue && typeof cellValue === 'object' && !Array.isArray(cellValue)
              if (isCellObject && 'f' in (cellValue as Record<string, unknown>)) {
                // Preserve full cell object when it includes a formula
              } else if (isCellObject && 'v' in (cellValue as Record<string, unknown>)) {
                cellValue = (cellValue as { v: unknown }).v
              } else if (isCellObject) {
                cellValue = ''
              }
            }

            // Handle new column - user edited beyond existing columns (auto-create)
            if (!columnId) {
              // Auto-create column when user edits beyond existing columns
              if (pendingColumnCreations.current.has(colIndex)) {
                return // Already creating this column
              }

              if (onColumnAdd) {
                pendingColumnCreations.current.add(colIndex)

                // Pass the cell value for new column creation
                onColumnAdd(colIndex, cellValue, rowIndex)

                // Clear pending flag after a delay
                setTimeout(() => {
                  pendingColumnCreations.current.delete(colIndex)
                }, 2000)
              }
              return
            }

            // Handle new row - auto-create it when user edits beyond existing data.
            // Accumulate all cell values first (e.g. multi-cell paste) then create
            // all rows at once, sorted by index, to prevent timer-ordering races.
            if (!rowId && columnId) {
              // For 'remove' ops targeting non-existent rows (e.g. undo of paste
              // into new rows), there's nothing to clear — just cancel any pending
              // creation for this row if all its values are being removed.
              if (op.op === 'remove') {
                const pending = pendingNewRowCells.current.get(rowIndex)
                if (pending) {
                  const column = columns.find(c => c.id === columnId)
                  const columnName = column?.name || columnId
                  delete pending[columnName]
                  // If all cells for this pending row were removed, cancel it entirely
                  if (Object.keys(pending).length === 0) {
                    pendingNewRowCells.current.delete(rowIndex)
                  }
                }
                return
              }

              const column = columns.find(c => c.id === columnId)
              const columnName = column?.name || columnId

              // Accumulate cell values for this new row
              const existingCells = pendingNewRowCells.current.get(rowIndex) || {}
              existingCells[columnName] = cellValue
              pendingNewRowCells.current.set(rowIndex, existingCells)

              // Single debounce timer for ALL pending new rows (prevents timer-ordering
              // races when pasting across multiple new rows simultaneously)
              if (pendingNewRowFlushTimer.current) {
                clearTimeout(pendingNewRowFlushTimer.current)
              }

              pendingNewRowFlushTimer.current = setTimeout(() => {
                const allPendingRows = new Map(pendingNewRowCells.current)
                pendingNewRowCells.current.clear()
                pendingNewRowFlushTimer.current = null

                if (!onDataChange || allPendingRows.size === 0) return

                // Sort by row index to ensure correct insertion order
                const sortedEntries = Array.from(allPendingRows.entries()).sort(([a], [b]) => a - b)

                const newData = [...data]
                for (const [rowIdx, collectedCells] of sortedEntries) {
                  const newRow: Record<string, unknown> = { ...collectedCells }
                  columns.forEach(col => {
                    if (!(col.name in newRow)) {
                      newRow[col.name] = col.defaultValue ?? ''
                    }
                  })

                  // Fill gaps with empty rows if needed
                  while (newData.length < rowIdx) {
                    const emptyRow: Record<string, unknown> = {}
                    columns.forEach(col => {
                      emptyRow[col.name] = col.defaultValue ?? ''
                    })
                    newData.push(emptyRow)
                  }
                  newData.push(newRow)
                }

                onDataChange(newData)
              }, 50)

              return
            }

            if (rowId && columnId) {
              const column = columns.find(c => c.id === columnId)
              const columnName = column?.name || columnId
              onCellChange(rowId, columnName, cellValue)
            }
          }

          // Handle column/row insertion via context menu
          if (op.op === 'insertRowCol' && op.value) {
            const { type, index, count, direction } = op.value as {
              type: 'row' | 'column'
              index: number
              count: number
              direction: 'lefttop' | 'rightbottom'
            }
            if (type === 'column' && onColumnsInsert) {
              onColumnsInsert(index, count, direction)
            }
            if (type === 'row' && onRowsInsert) {
              // Convert FortuneSheet row index to data row index
              const dataIndex = Math.max(0, index - HEADER_ROW_OFFSET)
              onRowsInsert(dataIndex, count, direction)
            }
          }

          // Handle column/row deletion via context menu
          if (op.op === 'deleteRowCol' && op.value) {
            const { type, start, end } = op.value as {
              type: 'row' | 'column'
              start: number
              end: number
            }
            if (type === 'column' && onColumnsDelete) {
              onColumnsDelete(start, end)
            }
            if (type === 'row' && onRowsDelete) {
              // Convert FortuneSheet row indices to data row indices
              const dataStart = Math.max(0, start - HEADER_ROW_OFFSET)
              const dataEnd = Math.max(0, end - HEADER_ROW_OFFSET)
              // Skip if trying to delete the header row
              if (dataStart <= dataEnd) {
                onRowsDelete(dataStart, dataEnd)
              }
            }
          }

          // Handle column hide/show via context menu
          // FortuneSheet emits a single replace op on path=["config"] with the
          // entire config object. We diff config.colhidden against the previous
          // snapshot to detect which columns were hidden or unhidden.
          if (
            onColumnVisibilityChange &&
            op.op === 'replace' &&
            op.path.length === 1 &&
            op.path[0] === 'config' &&
            op.value &&
            typeof op.value === 'object'
          ) {
            const newColHidden: Record<string, number> = (op.value as any).colhidden || {}
            const prevColHidden = prevColHiddenRef.current

            // Detect newly hidden columns (in new but not in prev)
            const newlyHidden = Object.keys(newColHidden)
              .filter(k => !(k in prevColHidden))
              .map(Number)
            // Detect newly shown columns (in prev but not in new)
            const newlyShown = Object.keys(prevColHidden)
              .filter(k => !(k in newColHidden))
              .map(Number)

            // Update ref for next diff
            prevColHiddenRef.current = { ...newColHidden }

            if (newlyHidden.length > 0) {
              onColumnVisibilityChange(newlyHidden, false)
            }
            if (newlyShown.length > 0) {
              onColumnVisibilityChange(newlyShown, true)
            }
          }
        })

        // Capture filter state changes for persistence across refreshes.
        // FortuneSheet manages filter/sort internally — we read the current
        // state from the workbook after processing ops that may have changed it.
        if (onFilterStateChange) {
          const hasFilterOp = ops.some(
            op =>
              op.path[0] === 'filter' ||
              op.path[0] === 'filter_select' ||
              (op.op === 'replace' && op.path[0] === 'config' && op.value && typeof op.value === 'object')
          )
          if (hasFilterOp) {
            try {
              const currentSheet = workbookRef.current?.getSheet()
              if (currentSheet) {
                onFilterStateChange({
                  filter: (currentSheet as any).filter ?? null,
                  filter_select: (currentSheet as any).filter_select ?? {},
                  rowhidden: currentSheet.config?.rowhidden ?? {}
                })
              }
            } catch {
              // Workbook not ready yet
            }
          }
        }
      },
      [
        collaborationEnabled,
        collaboration,
        context,
        onCellChange,
        onDataChange,
        onColumnAdd,
        onColumnRename,
        onColumnsInsert,
        onColumnsDelete,
        onRowsInsert,
        onRowsDelete,
        onColumnVisibilityChange,
        onFilterStateChange,
        columns,
        data
      ]
    )

    // Render loading state
    if (!initialFortuneSheetData) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
          <div className="gba:text-muted-foreground">Loading spreadsheet...</div>
        </div>
      )
    }

    return (
      <div className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:overflow-hidden">
        <div className="fortunesheet-container">
          <Workbook
            ref={ref => {
              workbookRef.current = ref
              patchWorkbookSelection(ref)
            }}
            key={`workbook-${sheet.id}-${remoteUpdateKey}`}
            data={
              initialFortuneSheetData
                ? [
                    // Pass data directly - FortuneSheet should initialize from this
                    initialFortuneSheetData as any
                  ]
                : []
            }
            hooks={workbookHooks as any}
            onOp={handleOp}
            // FortuneSheet Settings props
            allowEdit={!isReadOnly}
            // Show Excel-like UI components
            showFormulaBar={true}
            showToolbar={true}
            showSheetTabs={false}
            // Customize toolbar to show useful Excel-like features
            toolbarItems={[
              'undo',
              'redo',
              '|',
              'font-size',
              '|',
              'bold',
              'italic',
              'strike-through',
              'underline',
              '|',
              'font-color',
              'background',
              'border',
              'merge-cell',
              '|',
              'horizontal-align',
              'vertical-align',
              'text-wrap',
              '|',
              'currency-format',
              'percentage-format',
              'number-decrease',
              'number-increase',
              '|',
              'freeze',
              'sort',
              'filter',
              '|',
              'quick-formula'
            ]}
            cellContextMenu={[
              'copy',
              'paste',
              '|',
              'insert-row',
              'insert-column',
              'delete-row',
              'delete-column',
              '|',
              'hide-row',
              'hide-column',
              '|',
              'clear',
              'sort',
              'filter',
              '|',
              'cell-format'
            ]}
            lang="en"
          />
        </div>
      </div>
    )
  }
)

export default FortuneSheetGrid
