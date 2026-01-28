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
      participants = [],
      onOperationEmit = () => {},
      onCursorEmit = () => {},
      collaborationEnabled = false
    } = props

    // Track if we're currently processing a local edit (to prevent feedback loops)
    const isLocalEditRef = useRef(false)

    // Track pending row creations to prevent infinite loops
    const pendingRowCreations = useRef<Set<number>>(new Set())

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
        return convertToFortuneSheet(sheet, data, columns)
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

    // Poll current selection to emit cursor updates for collaboration (throttled)
    useEffect(() => {
      if (!collaborationEnabled) return

      let lastSelection: { row: number; col: number } | null = null
      const interval = setInterval(() => {
        const workbook = workbookRef.current
        if (!workbook || typeof workbook.getSelection !== 'function') return

        let selections
        try {
          selections = workbook.getSelection()
        } catch {
          return
        }
        const first = selections?.[0]
        const row = first?.row?.[0]
        const col = first?.column?.[0]

        if (typeof row !== 'number' || typeof col !== 'number') {
          return
        }

        if (!lastSelection || lastSelection.row !== row || lastSelection.col !== col) {
          lastSelection = { row, col }
          cursorTracking.handleCellSelection(row, col)
        }
      }, 500)

      return () => clearInterval(interval)
    }, [collaborationEnabled, cursorTracking])

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
          if (op.op === 'replace' && op.path.length >= 3 && op.path[0] === 'data') {
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
            let cellValue = op.value
            if (cellValue && typeof cellValue === 'object' && 'v' in cellValue) {
              cellValue = (cellValue as { v: unknown }).v
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

            // Handle new row - auto-create it when user edits beyond existing data
            if (!rowId && columnId) {
              if (pendingRowCreations.current.has(rowIndex)) {
                return
              }

              pendingRowCreations.current.add(rowIndex)

              const column = columns.find(c => c.id === columnId)
              const columnName = column?.name || columnId

              if (onDataChange) {
                const newRow: Record<string, unknown> = { [columnName]: cellValue }
                columns.forEach(col => {
                  if (col.name !== columnName) {
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

                setTimeout(() => {
                  pendingRowCreations.current.delete(rowIndex)
                }, 1000)
              }
              return
            }

            if (rowId && columnId) {
              const column = columns.find(c => c.id === columnId)
              const columnName = column?.name || columnId

              onCellChange(rowId, columnName, cellValue)
            }
          }
        })
      },
      [collaborationEnabled, collaboration, context, onCellChange, onDataChange, onColumnAdd, columns, data]
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
      <div
        className="fortunesheet-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <Workbook
          ref={workbookRef}
          data={[initialFortuneSheetData]}
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
          // Keep full context menu for Excel-like experience
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
    )
  }
)

export default FortuneSheetGrid
