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
import { convertToFortuneSheet, createConversionContext } from '../utils/fortuneSheetConverter'
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
  /** Callback when cell value changes */
  onCellChange: (rowId: string, columnId: string, value: unknown) => void
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
      participants = [],
      onOperationEmit = () => {},
      onCursorEmit = () => {},
      collaborationEnabled = false
    } = props

    // Track if we're currently processing a local edit (to prevent feedback loops)
    const isLocalEditRef = useRef(false)

    // Accumulate cell values for new rows (multi-cell paste into empty rows)
    const pendingNewRowCells = useRef<Map<number, Record<string, unknown>>>(new Map())
    const pendingNewRowTimers = useRef<Map<number, NodeJS.Timeout>>(new Map())

    // Track pending column creations to prevent infinite loops
    const pendingColumnCreations = useRef<Set<number>>(new Set())

    const workbookRef = useRef<WorkbookInstance | null>(null)
    const presenceUsersRef = useRef<Map<string, { username: string; userId?: string }>>(new Map())

    // Create conversion context
    const context = useMemo(() => createConversionContext(columns, data), [columns, data])

    // Convert data to FortuneSheet format ONLY for initial render
    // We use a stable reference to avoid re-renders
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
    }, [sheet.id, data, columns]) // Recompute when sheet, data, or columns change

    // Apply remote cell updates directly to FortuneSheet without full re-render
    const applyRemoteCellUpdate = useCallback((rowIndex: number, colIndex: number, value: unknown) => {
      const workbook = workbookRef.current
      if (!workbook) return

      try {
        isLocalEditRef.current = true
        workbook.setCellValue(rowIndex, colIndex, value)
      } catch (error) {
        console.error('[FortuneSheetGrid] Failed to apply remote cell update:', error)
      } finally {
        setTimeout(() => {
          isLocalEditRef.current = false
        }, 50)
      }
    }, [])

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
     * Apply remote operation to FortuneSheet using cell-level API
     */
    const applyOperationToFortuneSheet = useCallback(
      (op: FortuneSheetOp) => {
        if (op.op === 'replace' && op.path.length >= 3 && op.path[0] === 'data') {
          const rowIndex = op.path[1] as number
          const colIndex = op.path[2] as number
          let value = op.value
          if (value && typeof value === 'object' && 'v' in value) {
            value = (value as { v: unknown }).v
          }
          applyRemoteCellUpdate(rowIndex, colIndex, value)
        }
      },
      [applyRemoteCellUpdate]
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

          const row = selection?.row?.[0]
          const col = selection?.column?.[0]

          if (typeof row !== 'number' || typeof col !== 'number') return
          cursorTrackingRef.current.handleCellSelection(row, col)
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

            const rowIndex = currentContext.rowIdToIndex.get(String(rowId))
            const colIndex = currentContext.columnIdToIndex.get(String(columnId))
            if (rowIndex === undefined || colIndex === undefined) return null

            const userName = participant.userName || participant.userId || 'User'
            return {
              sheetId: sheet.id,
              username: userName,
              userId: participant.userId,
              color: participant.userColor || '#3b82f6',
              selection: { r: rowIndex, c: colIndex }
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
            const rowIndex = op.path[1] as number
            const colIndex = op.path[2] as number

            // Skip styling-only changes (fc, bg, bl, it, etc.) - they're handled by FortuneSheet UI
            // but we don't persist them to avoid complexity
            // path.length === 4 means: ['data', row, col, 'property'] → specific property change
            if (op.path.length === 4) {
              const prop = op.path[3]
              // Only persist 'v' (value) changes, skip styling properties
              if (prop !== 'v') {
                return
              }
            }

            // No header row - direct mapping
            const rowId = context.rowIndexToId.get(rowIndex)
            const columnId = context.columnIndexToId.get(colIndex)

            // Extract cell value - handle both direct values and cell objects
            // For 'remove' ops (cell clear, undo), the cell should become null
            let cellValue = op.value
            if (op.op === 'remove') {
              cellValue = null
            } else if (cellValue && typeof cellValue === 'object' && 'v' in cellValue) {
              cellValue = (cellValue as { v: unknown }).v
            }

            // Handle new column - user edited beyond existing columns (auto-create)
            if (!columnId) {
              // Auto-create column when user edits beyond existing columns
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
            // the row once with all values, instead of creating with only the first cell.
            if (!rowId && columnId) {
              const column = columns.find(c => c.id === columnId)
              const columnName = column?.name || columnId

              // Accumulate cell values for this new row
              const existingCells = pendingNewRowCells.current.get(rowIndex) || {}
              existingCells[columnName] = cellValue
              pendingNewRowCells.current.set(rowIndex, existingCells)

              // Debounce row creation to collect all cells from a paste operation
              const existingTimer = pendingNewRowTimers.current.get(rowIndex)
              if (existingTimer) {
                clearTimeout(existingTimer)
              }

              pendingNewRowTimers.current.set(
                rowIndex,
                setTimeout(() => {
                  const collectedCells = pendingNewRowCells.current.get(rowIndex) || {}
                  pendingNewRowCells.current.delete(rowIndex)
                  pendingNewRowTimers.current.delete(rowIndex)

                  if (onDataChange) {
                    const newRow: Record<string, unknown> = { ...collectedCells }
                    columns.forEach(col => {
                      if (!(col.name in newRow)) {
                        newRow[col.name] = col.defaultValue ?? ''
                      }
                    })

                    const newData = [...data]
                    while (newData.length < rowIndex) {
                      const emptyRow: Record<string, unknown> = {}
                      columns.forEach(col => {
                        emptyRow[col.name] = col.defaultValue ?? ''
                      })
                      newData.push(emptyRow)
                    }
                    newData.push(newRow)

                    onDataChange(newData)
                  }
                }, 50)
              )

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
              onRowsInsert(index, count, direction)
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
              onRowsDelete(start, end)
            }
          }
        })
      },
      [
        collaborationEnabled,
        collaboration,
        context,
        onCellChange,
        onDataChange,
        onColumnAdd,
        onColumnsInsert,
        onColumnsDelete,
        onRowsInsert,
        onRowsDelete,
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
            key={`workbook-${sheet.id}`}
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
