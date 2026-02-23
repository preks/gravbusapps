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
import {
  convertToFortuneSheet,
  createConversionContext,
  HEADER_ROW_OFFSET,
  indexToExcelColumn,
  parseA1CellReference
} from '../utils/fortuneSheetConverter'
import { useFortuneSheetCollaboration, useFortuneSheetCursorTracking } from '../hooks/useFortuneSheetCollaboration'
import { useEditorKeyboardIsolation } from '../../shared/hooks/useEditorKeyboardIsolation'

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
  receivedOpsQueueRef?: React.MutableRefObject<any[]>
  processOpsTrigger?: number
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
  /** Scroll to and select a cell by Excel reference (e.g. "A1") */
  scrollToCellRef: (cellRef: string) => void
  /** Get currently selected cell as A1 reference, or null if none/multi */
  getSelectedCellRef: () => string | null
}

function getBaseOrigin(): string {
  return typeof globalThis.window !== 'undefined' ? globalThis.window.location.origin : ''
}

function openSafeHttpUrl(rawUrl: string): void {
  if (typeof globalThis.window === 'undefined' || !rawUrl) return
  if (!(rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) return
  globalThis.window.open(rawUrl, '_blank', 'noopener,noreferrer')
}

const EURO_CURRENCY_FORMAT = '€#,##0.00'

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
      receivedOpsQueueRef,
      processOpsTrigger,
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
    const sheetContainerRef = useRef<HTMLDivElement>(null)
    const presenceUsersRef = useRef<Map<string, { username: string; userId?: string }>>(new Map())
    /** Track last applied remote cell to suppress duplicate apply to adjacent column (G6 value appearing in H6) */
    const lastRemoteAppliedRef = useRef<{ row: number; col: number; value: unknown; at: number } | null>(null)
    const lastDataOpRef = useRef<{ path: (string | number)[]; op: string; at: number } | null>(null)
    const REMOTE_APPLY_DEDUPE_MS = 150
    /**
     * Track last known cell selection (FortuneSheet row + col indices).
     * getSelection() can return [] when FortuneSheet's internal ctx is undefined
     * (e.g. during the paste capture phase). This ref is updated by afterSelectionChange
     * which fires reliably before any paste starts, giving handlePasteCapture a safe
     * fallback to identify the target cell even when getSelection() fails.
     */
    const lastKnownSelectionRef = useRef<{ fortuneSheetRow: number; colIndex: number } | null>(null)

    useEditorKeyboardIsolation(sheetContainerRef)

    // Create conversion context
    const context = useMemo(() => {
      return createConversionContext(columns, data)
    }, [columns, data])

    // Convert data to FortuneSheet format. Re-init when sheet, data, or columns change
    // so that late-arriving data (e.g. bulk collection avatars) is reflected.
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
    }, [sheet.id, remoteUpdateKey, data, columns])

    // Signature that changes when avatar/tracking data is populated - forces Workbook remount
    // so FortuneSheet picks up late-arriving data (it ignores data prop updates)
    const dataSignature = useMemo(() => {
      const avatarCol = columns.find(c => c.type === 'image' && c.name)
      if (!avatarCol) return ''
      return data.map(r => (r[avatarCol.name] && '1') || '0').join('')
    }, [data, columns])

    // Apply remote cell updates directly to FortuneSheet without full re-render
    const applyRemoteCellUpdate = useCallback(
      (rowIndex: number, colIndex: number, value: unknown) => {
        const workbook = workbookRef.current
        if (!workbook) return

        try {
          isLocalEditRef.current = true
          const targetColumn = columns[colIndex]

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
            // FortuneSheet can keep empty display text (`m`) for URL-only updates.
            // Force a visible label for View Response links.
            if (targetColumn?.name === '_copy_link' && typeof value === 'string' && value.trim()) {
              workbook.setCellFormat(rowIndex, colIndex, 'm', targetColumn.label || 'View Response', { id: sheet.id })
            }
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
      [sheet.id, columns]
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

    const scrollToCellRef = useCallback(
      (cellRef: string) => {
        const parsed = parseA1CellReference(cellRef)
        if (!parsed) return
        const workbook = workbookRef.current as unknown as { setSelection?: (r: object, opts?: object) => void }
        if (!workbook?.setSelection) return
        try {
          workbook.setSelection(
            {
              row: [parsed.row, parsed.row],
              column: [parsed.column, parsed.column],
              row_focus: parsed.row,
              column_focus: parsed.column
            } as object,
            { id: sheet.id }
          )
        } catch {
          // Ignore if FortuneSheet not ready
        }
      },
      [sheet.id]
    )

    const getSelectedCellRef = useCallback(() => {
      const toA1 = (row: number, col: number) => `${indexToExcelColumn(col)}${row + 1}`

      const workbook = workbookRef.current as unknown as {
        getSelection?: () => Array<{ row: number[]; column: number[] }>
      }
      try {
        const sel = workbook?.getSelection?.()
        if (sel?.length) {
          const r = sel[0]
          const rowStart = r?.row?.[0]
          const rowEnd = r?.row?.[1] ?? rowStart
          const colStart = r?.column?.[0]
          const colEnd = r?.column?.[1] ?? colStart
          if (
            typeof rowStart === 'number' &&
            typeof colStart === 'number' &&
            rowStart === rowEnd &&
            colStart === colEnd
          ) {
            return toA1(rowStart, colStart)
          }
        }
        const last = lastKnownSelectionRef.current
        if (last) {
          return toA1(last.fortuneSheetRow, last.colIndex)
        }
        return null
      } catch {
        const last = lastKnownSelectionRef.current
        return last ? toA1(last.fortuneSheetRow, last.colIndex) : null
      }
    }, [])

    // Expose imperative methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        applyRemoteCellUpdate,
        scrollToCellRef,
        getSelectedCellRef
      }),
      [applyRemoteCellUpdate, scrollToCellRef, getSelectedCellRef]
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
        if (op.op !== 'replace' || op.path.length < 3 || op.path[0] !== 'data') {
          return
        }

        // Path uses FortuneSheet row (0=header, 1+=data)
        const fortuneSheetRow = op.path[1] as number
        const colIndex = op.path[2] as number
        const dataRowIndex = fortuneSheetRow - HEADER_ROW_OFFSET
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

        // Path already uses FortuneSheet row; apply directly
        if (isFormula && typeof value === 'string') {
          applyRemoteCellUpdate(fortuneSheetRow, colIndex, { f: value })
        } else if (isFullCellWithFormula) {
          applyRemoteCellUpdate(fortuneSheetRow, colIndex, value)
        } else {
          applyRemoteCellUpdate(fortuneSheetRow, colIndex, value)
        }

        // Defer state updates to avoid setState-during-render warning
        const rowId = context.rowIndexToId.get(dataRowIndex)
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

    // Process queued remote operations (prevents dropping ops when multiple arrive rapidly)
    useEffect(() => {
      if (!receivedOpsQueueRef?.current || !collaborationEnabled) return
      const queue = receivedOpsQueueRef.current
      while (queue.length > 0) {
        const op = queue.shift()
        if (op) collaboration.handleDocumentOp(op)
      }
    }, [processOpsTrigger, collaborationEnabled, collaboration, receivedOpsQueueRef])

    const cursorTracking = useFortuneSheetCursorTracking({
      sheetId: sheet.id,
      context,
      enabled: collaborationEnabled,
      onCursorEmit
    })

    // Stable cursor tracking reference for FortuneSheet hooks
    const cursorTrackingRef = useRef(cursorTracking)
    cursorTrackingRef.current = cursorTracking

    const openSelectedCopyLink = useCallback(() => {
      const workbook = workbookRef.current
      if (!workbook || !data.length || !columns.length) return

      // Defer to next tick so FortuneSheet has updated selection.
      requestAnimationFrame(() => {
        try {
          const sel = (workbook as any).getSelection?.()
          if (!sel || !Array.isArray(sel) || sel.length === 0) return
          const item = sel[0]
          const row = item?.row?.[0]
          const col = item?.column?.[0]
          if (typeof row !== 'number' || typeof col !== 'number') return
          if (row < HEADER_ROW_OFFSET) return

          const dataRowIndex = row - HEADER_ROW_OFFSET
          const column = columns[col]
          if (!column || column.name !== '_copy_link') return

          const rowData = data[dataRowIndex]
          if (!rowData) return
          const url = rowData[column.name]
          if (typeof url !== 'string' || !url.trim()) return
          const href = url.startsWith('/') ? `${getBaseOrigin()}${url}` : url
          openSafeHttpUrl(href)
        } catch {
          // getSelection can throw; ignore
        }
      })
    }, [columns, data])

    const normalizeCurrencyFormatAtCell = useCallback(
      (row: number, col: number) => {
        try {
          const workbook = workbookRef.current as any
          if (!workbook) return
          const options = { id: sheet.id }
          workbook.setCellFormat(row, col, 'fa', EURO_CURRENCY_FORMAT, options)
          workbook.setCellFormat(row, col, 'ct', { t: 'n', fa: EURO_CURRENCY_FORMAT }, options)
        } catch {
          // Ignore normalization errors; native formatting may still apply.
        }
      },
      [sheet.id]
    )

    useEffect(() => {
      const container = sheetContainerRef.current
      if (!container || typeof MutationObserver === 'undefined') return

      const applyEuroToToolbar = () => {
        const toolbarCurrencyAction = container.querySelector<HTMLElement>("[data-menu-id='currency-format']")
        if (!toolbarCurrencyAction) return
        const symbolElement = toolbarCurrencyAction.querySelector<HTMLElement>('i, span') ?? toolbarCurrencyAction
        if (!symbolElement) return
        if (symbolElement.textContent?.trim() === '€') return
        symbolElement.textContent = '€'
      }

      const applySortMenuIcons = () => {
        const menuLines = document.body.querySelectorAll<HTMLElement>(
          '.fortune-toolbar-select .fortune-toolbar-menu-line'
        )
        menuLines.forEach(line => {
          const text = (line.textContent || '').toLowerCase().trim()
          const isAscendingLine = text.startsWith('ascending')
          const isDescendingLine = text.startsWith('descending')
          if (!isAscendingLine && !isDescendingLine) return

          const arrow = isAscendingLine ? '↓' : '↑'
          const existingSvg = line.querySelector('svg')
          if (existingSvg) {
            existingSvg.remove()
          }

          let customArrow = line.querySelector<HTMLElement>('.nw-sort-arrow')
          if (!customArrow) {
            customArrow = document.createElement('span')
            customArrow.className = 'nw-sort-arrow'
            customArrow.setAttribute('aria-hidden', 'true')
            customArrow.style.marginLeft = '8px'
            customArrow.style.fontSize = '20px'
            customArrow.style.lineHeight = '1'
            customArrow.style.fontWeight = '700'
            line.appendChild(customArrow)
          }
          customArrow.textContent = arrow
        })
      }

      applyEuroToToolbar()
      const observer = new MutationObserver(() => {
        applyEuroToToolbar()
      })
      observer.observe(container, { childList: true, subtree: true, characterData: true })

      // Keep sort icon patch lightweight: only run after toolbar interactions,
      // instead of observing the entire document continuously.
      const handleToolbarInteraction = () => {
        setTimeout(() => applySortMenuIcons(), 0)
      }
      container.addEventListener('click', handleToolbarInteraction, true)

      return () => {
        observer.disconnect()
        container.removeEventListener('click', handleToolbarInteraction, true)
      }
    }, [])

    // Handle pointer release on View Response / copy_link cells - open URL
    // (FortuneSheet doesn't render links clickable).
    const handleContainerMouseUp = useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 0) return
        openSelectedCopyLink()
      },
      [openSelectedCopyLink]
    )

    const handleDeleteCapture = useCallback(() => {
      if (!onCellChange || isReadOnly) return
      const workbook = workbookRef.current as any
      const sel = workbook?.getSelection?.()
      if (!sel?.[0]) return
      const r = sel[0]
      const rowStart = r?.row?.[0]
      const rowEnd = r?.row?.[1] ?? rowStart
      const colStart = r?.column?.[0]
      const colEnd = r?.column?.[1] ?? colStart
      if (
        typeof rowStart !== 'number' ||
        typeof rowEnd !== 'number' ||
        typeof colStart !== 'number' ||
        typeof colEnd !== 'number'
      )
        return
      for (let row = rowStart; row <= rowEnd; row++) {
        if (row < HEADER_ROW_OFFSET) continue
        const dataRowIndex = row - HEADER_ROW_OFFSET
        const rowId = context.rowIndexToId.get(dataRowIndex)
        if (!rowId) continue
        for (let col = colStart; col <= colEnd; col++) {
          const columnId = context.columnIndexToId.get(col)
          if (!columnId) continue
          const column = columns.find(c => c.id === columnId)
          const columnName = column?.name ?? columnId
          onCellChange(rowId, columnName, null)
        }
      }
    }, [context, columns, onCellChange, isReadOnly])

    const persistDeleteSelectionFromWorkbook = useCallback(() => {
      if (!onCellChange || isReadOnly) return

      const workbook = workbookRef.current as any
      const currentSheet = workbook?.getSheet?.()
      const workbookData = currentSheet?.data
      if (!Array.isArray(workbookData)) return

      const selection = workbook?.getSelection?.()
      const ranges = Array.isArray(selection) ? selection : []
      if (ranges.length === 0) return

      const getPersistValueFromWorkbookCell = (rawCell: unknown): unknown => {
        if (rawCell === null || rawCell === undefined) return null
        if (typeof rawCell === 'string' || typeof rawCell === 'number' || typeof rawCell === 'boolean') {
          return rawCell
        }
        if (!rawCell || typeof rawCell !== 'object' || Array.isArray(rawCell)) return null

        const cellObject = rawCell as Record<string, unknown>
        if ('f' in cellObject) return rawCell
        if ('v' in cellObject) {
          const value = cellObject.v
          if (value === null || value === undefined) {
            if ('m' in cellObject && typeof cellObject.m === 'string' && cellObject.m.trim().length > 0) {
              return cellObject.m
            }
            return null
          }
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return value
          }
          return null
        }
        if ('m' in cellObject && typeof cellObject.m === 'string' && cellObject.m.trim().length > 0) {
          return cellObject.m
        }
        return null
      }

      ranges.forEach((range: { row?: [number, number?]; column?: [number, number?] }) => {
        const rowStart = range?.row?.[0]
        const rowEnd = range?.row?.[1] ?? rowStart
        const colStart = range?.column?.[0]
        const colEnd = range?.column?.[1] ?? colStart
        if (
          typeof rowStart !== 'number' ||
          typeof rowEnd !== 'number' ||
          typeof colStart !== 'number' ||
          typeof colEnd !== 'number'
        ) {
          return
        }

        for (let row = rowStart; row <= rowEnd; row += 1) {
          if (row < HEADER_ROW_OFFSET) continue
          const dataRowIndex = row - HEADER_ROW_OFFSET
          const rowId = context.rowIndexToId.get(dataRowIndex)
          if (!rowId) continue

          for (let col = colStart; col <= colEnd; col += 1) {
            const columnId = context.columnIndexToId.get(col)
            if (!columnId) continue
            const column = columns.find(c => c.id === columnId)
            const columnName = column?.name ?? columnId
            const rawCell = workbookData?.[row]?.[col] ?? null
            const valueToPersist = getPersistValueFromWorkbookCell(rawCell)
            onCellChange(rowId, columnName, valueToPersist)
          }
        }
      })
    }, [context, columns, onCellChange, isReadOnly])

    const handleContainerKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const workbook = workbookRef.current as any
          const selection = workbook?.getSelection?.()
          const hasMultiCellSelection =
            Array.isArray(selection) &&
            selection.some((range: { row?: [number, number?]; column?: [number, number?] }) => {
              const rowStart = range?.row?.[0]
              const rowEnd = range?.row?.[1] ?? rowStart
              const colStart = range?.column?.[0]
              const colEnd = range?.column?.[1] ?? colStart
              if (
                typeof rowStart !== 'number' ||
                typeof rowEnd !== 'number' ||
                typeof colStart !== 'number' ||
                typeof colEnd !== 'number'
              ) {
                return false
              }
              return rowEnd > rowStart || colEnd > colStart
            })

          const active = document.activeElement
          const isEditing =
            active?.tagName === 'INPUT' ||
            active?.tagName === 'TEXTAREA' ||
            (active as HTMLElement)?.getAttribute?.('contenteditable') === 'true'
          if (!isEditing || hasMultiCellSelection) {
            handleDeleteCapture()
            // Reconcile persisted values with workbook after FortuneSheet applies delete.
            setTimeout(() => {
              persistDeleteSelectionFromWorkbook()
            }, 0)
          }
          return
        }
        if (e.target !== e.currentTarget) return
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        openSelectedCopyLink()
      },
      [openSelectedCopyLink, handleDeleteCapture, persistDeleteSelectionFromWorkbook]
    )

    // Capture paste to persist clipboard text before FortuneSheet processes it.
    // FortuneSheet emits meta-only ops ({ct,fs}) for long pastes and never stores the text
    // in the workbook model - so we must persist from clipboard directly.
    const handlePasteCapture = useCallback(
      (e: React.ClipboardEvent) => {
        const text = e.clipboardData?.getData('text/plain')
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'ltdbg',
            hypothesisId: 'H1',
            location: 'FortuneSheetGrid.tsx:handlePasteCapture:entry',
            message: 'Paste capture fired',
            data: {
              textLen: text?.length ?? 0,
              hasText: Boolean(text),
              hasOnCellChange: Boolean(onCellChange),
              hasContext: Boolean(context),
              lastKnownSel: lastKnownSelectionRef.current
            },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
        if (!text || !onCellChange || !context) return
        try {
          // getSelection() is called during the capture phase — before FortuneSheet's own
          // paste handler runs — and can crash (ctx undefined), returning [] from the patch.
          // Use lastKnownSelectionRef (updated by afterSelectionChange which fires before
          // every paste) as a reliable fallback so we always know the target cell.
          const workbook = workbookRef.current
          const sel = (workbook as any)?.getSelection?.()

          let fortuneSheetRow: number | undefined
          let colIndex: number | undefined

          if (sel?.[0]) {
            fortuneSheetRow = sel[0]?.row?.[0]
            colIndex = sel[0]?.column?.[0]
          }

          const usedFallback = typeof fortuneSheetRow !== 'number' || typeof colIndex !== 'number'
          if (usedFallback) {
            // Fall back to the last recorded selection
            const last = lastKnownSelectionRef.current
            if (!last) {
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  runId: 'ltdbg',
                  hypothesisId: 'H2',
                  location: 'FortuneSheetGrid.tsx:handlePasteCapture:noSelection',
                  message: 'BAILED: no selection from getSelection AND lastKnownSelectionRef is null',
                  data: { selRaw: sel },
                  timestamp: Date.now()
                })
              }).catch(() => {})
              // #endregion
              return
            }
            fortuneSheetRow = last.fortuneSheetRow
            colIndex = last.colIndex
          }

          if (fortuneSheetRow < HEADER_ROW_OFFSET) return
          const dataRowIndex = fortuneSheetRow - HEADER_ROW_OFFSET
          const rowId = context.rowIndexToId.get(dataRowIndex)
          const columnId = context.columnIndexToId.get(colIndex)
          if (!rowId || !columnId) {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                runId: 'ltdbg',
                hypothesisId: 'H2',
                location: 'FortuneSheetGrid.tsx:handlePasteCapture:noRowCol',
                message: 'BAILED: rowId or columnId not found in context',
                data: {
                  fortuneSheetRow,
                  colIndex,
                  dataRowIndex,
                  rowId,
                  columnId,
                  contextRowCount: context.rowIndexToId.size,
                  contextColCount: context.columnIndexToId.size,
                  usedFallback
                },
                timestamp: Date.now()
              })
            }).catch(() => {})
            // #endregion
            return
          }
          const column = columns.find(c => c.id === columnId)
          const columnName = column?.name ?? columnId
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              runId: 'ltdbg',
              hypothesisId: 'H1_H2',
              location: 'FortuneSheetGrid.tsx:handlePasteCapture:callingOnCellChange',
              message: 'Calling onCellChange with pasted text',
              data: { rowId, columnName, textLen: text.length, usedFallback, fortuneSheetRow, colIndex },
              timestamp: Date.now()
            })
          }).catch(() => {})
          // #endregion
          onCellChange(rowId, columnName, text)
        } catch (err) {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              runId: 'ltdbg',
              hypothesisId: 'H1',
              location: 'FortuneSheetGrid.tsx:handlePasteCapture:caught',
              message: 'CAUGHT exception in handlePasteCapture',
              data: { error: String(err) },
              timestamp: Date.now()
            })
          }).catch(() => {})
          // #endregion
        }
      },
      [context, columns, onCellChange]
    )

    // Use FortuneSheet native selection hook (avoids calling Workbook.getSelection() which can crash when ctx is undefined)
    const workbookHooks = useMemo(() => {
      return {
        afterSelectionChange: (activeSheetId: string, selection: any) => {
          const fortuneSheetRow = selection?.row?.[0]
          const col = selection?.column?.[0]

          if (typeof fortuneSheetRow === 'number' && typeof col === 'number') {
            // Always keep the last selection recorded so handlePasteCapture can
            // identify the target cell even when getSelection() crashes and
            // returns [] (FortuneSheet's ctx is transiently undefined during paste).
            lastKnownSelectionRef.current = { fortuneSheetRow, colIndex: col }
          }

          if (!collaborationEnabled) return
          if (activeSheetId !== sheet.id) return

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

    /** Apply text wrap + row-height expansion to cells after paste/edit */
    const applyTextWrapAndExpand = useCallback(
      (cells: Array<{ row: number; col: number; text: string }>) => {
        const workbook = workbookRef.current
        if (!workbook || cells.length === 0) return

        const sheetId = sheet.id
        const options = { id: sheetId }

        // Approximate px per character for monospace-ish fonts
        const DEFAULT_ROW_HEIGHT = 25
        const CHARS_PER_LINE = 25

        const rowHeights: Record<string, number> = {}
        cells.forEach(({ row, text }) => {
          try {
            // Do NOT set tb=2 (word wrap) here - FortuneSheet has a bug where setting
            // format 'tb' to 2 can cause the cell to display "2" as the value when
            // the display cache is missing. Only expand row height for long text.
            const len = text.length
            const lineBreaks = (text.match(/\n/g) || []).length
            const lines = Math.max(1, lineBreaks + Math.ceil(len / CHARS_PER_LINE))
            const rowHeight = Math.max(DEFAULT_ROW_HEIGHT, Math.min(200, DEFAULT_ROW_HEIGHT * lines))
            rowHeights[String(row)] = Math.max(rowHeights[String(row)] ?? 0, rowHeight)
          } catch {
            // FortuneSheet may throw if sheet not ready
          }
        })
        try {
          if (Object.keys(rowHeights).length > 0) {
            workbook.setRowHeight(rowHeights, options, true)
          }
        } catch {
          // Workbook may not be ready
        }
      },
      [sheet.id]
    )

    const isCompactColumn = (col: { name?: string; label?: string; type?: string }) =>
      col.name?.startsWith('_') ||
      col.type === 'workflow_status' ||
      col.type === 'image' ||
      col.type === 'date' ||
      col.type === 'datetime' ||
      col.type === 'url' ||
      /status/i.test(col.name || '') ||
      /status/i.test(col.label || '')

    useEffect(() => {
      const logWorkbookSnapshotOnHide = () => {
        const lastDataOp = lastDataOpRef.current
        if (!lastDataOp || lastDataOp.path.length < 3) return
        const row = Number(lastDataOp.path[1])
        const col = Number(lastDataOp.path[2])
        let cellType = 'unknown'
        let cellPreview: string | null = null
        try {
          const currentSheet = workbookRef.current?.getSheet() as any
          let rawCell = currentSheet?.data?.[row]?.[col] ?? null
          if (!rawCell && Array.isArray(currentSheet?.celldata)) {
            const found = currentSheet.celldata.find(
              (cd: { r: number; c: number; v?: unknown }) => cd.r === row && cd.c === col
            )
            rawCell = found?.v ?? null
          }
          const cellValue =
            rawCell && typeof rawCell === 'object' && !Array.isArray(rawCell) && 'v' in rawCell ? rawCell.v : rawCell
          cellType = cellValue === null ? 'null' : Array.isArray(cellValue) ? 'array' : typeof cellValue
          if (typeof cellValue === 'string') {
            cellPreview = cellValue.slice(0, 120)
          } else if (cellValue !== null && cellValue !== undefined) {
            cellPreview = String(cellValue).slice(0, 120)
          }
          // Persist last edited cell on visibility hidden (e.g. user refreshes) - handles meta-only ops that skipped onCellChange
          if (rawCell && onCellChange && row >= HEADER_ROW_OFFSET) {
            const dataRowIndex = row - HEADER_ROW_OFFSET
            const rowId = context.rowIndexToId.get(dataRowIndex)
            const columnId = context.columnIndexToId.get(col)
            if (rowId && columnId) {
              const oc = rawCell as Record<string, unknown>
              let val: unknown = null
              if ('m' in oc && typeof oc.m === 'string') val = oc.m
              else if ('v' in oc) {
                const v = oc.v
                if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') val = v
                else if (v && typeof v === 'object' && !Array.isArray(v)) {
                  const vo = v as Record<string, unknown>
                  if ('m' in vo && typeof vo.m === 'string') val = vo.m
                  else if ('v' in vo) val = (vo as { v: unknown }).v
                  else val = String(v)
                } else val = v
              }
              if (val !== null && val !== undefined && (typeof val !== 'string' || val.trim().length > 0)) {
                const column = columns.find(c => c.id === columnId)
                const columnName = column?.name ?? columnId
                onCellChange(rowId, columnName, val)
              }
            }
          }
        } catch {
          cellType = 'read-error'
        }
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'long-paste-debug',
            hypothesisId: 'H11',
            location: 'FortuneSheetGrid.tsx:visibilitySnapshot',
            message: 'Workbook snapshot on visibility hidden',
            data: { lastDataOpPath: lastDataOp.path, lastDataOpType: lastDataOp.op, cellType, cellPreview },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
      }
      const onVisibility = () => {
        if (document.visibilityState === 'hidden') {
          logWorkbookSnapshotOnHide()
        }
      }
      document.addEventListener('visibilitychange', onVisibility)
      return () => {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }, [context, columns, onCellChange])

    /**
     * Handle FortuneSheet onOp event
     */
    const handleOp = useCallback(
      (ops: FortuneSheetOp[]) => {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'paste-refresh-debug-v5',
            hypothesisId: 'H11_H12',
            location: 'FortuneSheetGrid.tsx:handleOp:opsSummary',
            message: 'FortuneSheet onOp batch received',
            data: {
              opsCount: Array.isArray(ops) ? ops.length : 0,
              sample: Array.isArray(ops) ? ops.slice(0, 8).map(o => ({ op: o.op, path: o.path })) : [],
              isLocalEdit: Boolean(isLocalEditRef.current)
            },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
        // Ignore operations that come from programmatic updates (remote sync)
        if (isLocalEditRef.current) {
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              runId: 'paste-refresh-debug-v3',
              hypothesisId: 'H8',
              location: 'FortuneSheetGrid.tsx:handleOp:ignoredLocalEdit',
              message: 'Ops ignored due isLocalEditRef',
              data: {
                opsCount: Array.isArray(ops) ? ops.length : 0,
                ops: Array.isArray(ops) ? ops.slice(0, 5).map(o => ({ op: o.op, path: o.path })) : []
              },
              timestamp: Date.now()
            })
          }).catch(() => {})
          // #endregion
          return
        }

        if (!ops || ops.length === 0) {
          return
        }

        const hasFilterOrSortOp = ops.some(op => {
          const pathSegments = Array.isArray(op.path) ? op.path.map(p => String(p).toLowerCase()) : []
          const pathText = pathSegments.join('.')
          return (
            pathSegments[0] === 'filter' ||
            pathSegments[0] === 'filter_select' ||
            pathText.includes('sort') ||
            (op.op === 'replace' && pathSegments[0] === 'config')
          )
        })
        const hasDataAdd = ops.some(op => op.op === 'add' && op.path?.[0] === 'data')
        const hasDataRemove = ops.some(op => op.op === 'remove' && op.path?.[0] === 'data')
        const isLikelyDataReorderBatch = hasDataAdd && hasDataRemove && ops.length >= 6
        const shouldSkipCellPersistenceForBatch = hasFilterOrSortOp || isLikelyDataReorderBatch

        const cellsToWrap: Array<{ row: number; col: number; text: string }> = []

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
            // Sorting/filtering can emit data add/remove operations for row reordering.
            // Persisting those as normal cell edits can wipe/misplace values.
            if (shouldSkipCellPersistenceForBatch) {
              return
            }

            // Ignore most deep nested property ops (e.g. ['data', r, c, 'ct', 's']).
            // Keep background-color updates even when emitted as nested paths
            // (e.g. ['data', r, c, 'v', 'bg']) so fill/highlight survives refresh.
            const deepProp = op.path.length > 4 ? String(op.path[op.path.length - 1]) : null
            if (
              deepProp === 'fa' &&
              typeof op.value === 'string' &&
              (op.value.includes('¥') || op.value.toUpperCase().includes('JPY'))
            ) {
              normalizeCurrencyFormatAtCell(op.path[1] as number, op.path[2] as number)
              return
            }
            const isNestedBackgroundOp = deepProp === 'bg'
            if (op.path.length > 4 && !isNestedBackgroundOp) {
              // #region agent log
              fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  runId: 'paste-refresh-debug-v4',
                  hypothesisId: 'H10',
                  location: 'FortuneSheetGrid.tsx:handleOp:skipDeepPathOp',
                  message: 'Skipping deep nested data op',
                  data: {
                    op: op.op,
                    path: op.path,
                    valueType: op.value === null ? 'null' : Array.isArray(op.value) ? 'array' : typeof op.value
                  },
                  timestamp: Date.now()
                })
              }).catch(() => {})
              // #endregion
              return
            }
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                runId: 'paste-refresh-debug-v4',
                hypothesisId: 'H6_H7',
                location: 'FortuneSheetGrid.tsx:handleOp:dataOpRaw',
                message: 'Raw FortuneSheet data op',
                data: {
                  op: op.op,
                  path: op.path,
                  rawType: op.value === null ? 'null' : Array.isArray(op.value) ? 'array' : typeof op.value,
                  rawPreview:
                    typeof op.value === 'string'
                      ? op.value.slice(0, 120)
                      : op.value && typeof op.value === 'object'
                        ? {
                            keys: Object.keys(op.value as Record<string, unknown>).slice(0, 8),
                            vType: typeof (op.value as Record<string, unknown>).v,
                            mPreview:
                              typeof (op.value as Record<string, unknown>).m === 'string'
                                ? (op.value as Record<string, unknown>).m.slice(0, 120)
                                : null,
                            vPreview:
                              typeof (op.value as Record<string, unknown>).v === 'string'
                                ? (op.value as Record<string, unknown>).v.slice(0, 120)
                                : null
                          }
                        : null
                },
                timestamp: Date.now()
              })
            }).catch(() => {})
            // #endregion
            lastDataOpRef.current = { path: [...op.path], op: op.op, at: Date.now() }
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
            let cellProp: string = 'v'
            if (op.path.length >= 4) {
              cellProp = op.path.length > 4 ? String(op.path[op.path.length - 1]) : String(op.path[3])
              // Persist value and selected formatting changes.
              // `bg` (cell background color) must persist across refreshes.
              if (cellProp === 'ct') {
                const currencyFormat = (op.value as Record<string, unknown> | null)?.fa
                if (
                  typeof currencyFormat === 'string' &&
                  (currencyFormat.includes('¥') || currencyFormat.toUpperCase().includes('JPY'))
                ) {
                  normalizeCurrencyFormatAtCell(fortuneSheetRowIndex, colIndex)
                }
                return
              }
              if (cellProp !== 'v' && cellProp !== 'f' && cellProp !== 'm' && cellProp !== 'bg' && cellProp !== 'fa') {
                return
              }
              if (
                cellProp === 'fa' &&
                typeof op.value === 'string' &&
                (op.value.includes('¥') || op.value.toUpperCase().includes('JPY'))
              ) {
                normalizeCurrencyFormatAtCell(fortuneSheetRowIndex, colIndex)
                return
              }
            }

            // Map data row index to row ID (context uses data indices, not FortuneSheet indices)
            const rowId = context.rowIndexToId.get(rowIndex)
            const columnId = context.columnIndexToId.get(colIndex)

            // Extract cell value - handle both direct values and cell objects
            // For 'remove' ops (cell clear, undo), the cell should become null
            let cellValue = op.value
            // FortuneSheet can emit cell-level replace ops that only carry formatting/meta
            // (e.g. { ct, fs }) after paste. These are not data changes and must not be persisted.
            if (
              op.op !== 'remove' &&
              op.path.length === 3 &&
              cellValue &&
              typeof cellValue === 'object' &&
              !Array.isArray(cellValue)
            ) {
              const valueObject = cellValue as Record<string, unknown>
              const hasDataField = 'v' in valueObject || 'm' in valueObject || 'f' in valueObject
              if (!hasDataField) {
                // FortuneSheet can emit paste as a meta-only op (e.g. { ct, fs }) while the actual
                // text is applied internally. Defer reading the workbook to next tick so FortuneSheet
                // has finished applying the change, then persist if the cell has data.
                const capturedRowId = rowId
                const capturedColumnId = columnId
                const capturedColIndex = colIndex
                const capturedFortuneSheetRowIndex = fortuneSheetRowIndex
                const column = columns.find(c => c.id === capturedColumnId)
                const columnName = column?.name ?? capturedColumnId
                // #region agent log
                fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    runId: 'long-paste-debug',
                    hypothesisId: 'META_FALLBACK',
                    location: 'FortuneSheetGrid.tsx:handleOp:metaOnlyScheduling',
                    message: 'Meta-only: scheduling deferred read',
                    data: { rowId: rowId, columnId: columnId, hasOnCellChange: Boolean(onCellChange) },
                    timestamp: Date.now()
                  })
                }).catch(() => {})
                // #endregion
                if (capturedRowId && capturedColumnId && onCellChange) {
                  setTimeout(() => {
                    try {
                      const currentSheet = workbookRef.current?.getSheet() as any
                      const dataRows = currentSheet?.data
                      let rawCell = dataRows?.[capturedFortuneSheetRowIndex]?.[capturedColIndex] ?? null
                      if (!rawCell && Array.isArray(currentSheet?.celldata)) {
                        const found = currentSheet.celldata.find(
                          (cd: { r: number; c: number; v?: unknown }) =>
                            cd.r === capturedFortuneSheetRowIndex && cd.c === capturedColIndex
                        )
                        rawCell = found?.v ?? null
                      }
                      const rawCellKeys =
                        rawCell && typeof rawCell === 'object' && !Array.isArray(rawCell)
                          ? Object.keys(rawCell as object)
                          : []
                      const hasV = rawCell && typeof rawCell === 'object' && 'v' in (rawCell as object)
                      const hasM = rawCell && typeof rawCell === 'object' && 'm' in (rawCell as object)
                      // #region agent log
                      fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          runId: 'long-paste-debug',
                          hypothesisId: 'META_FALLBACK',
                          location: 'FortuneSheetGrid.tsx:handleOp:metaOnlyDeferredRead',
                          message: 'Meta-only: deferred read result',
                          data: {
                            rawCellNull: rawCell == null,
                            rawCellKeys,
                            hasV,
                            hasM,
                            dataRowsLen: Array.isArray(dataRows) ? dataRows.length : 0,
                            rowExists: dataRows?.[capturedFortuneSheetRowIndex] != null,
                            vType:
                              rawCell && typeof rawCell === 'object' && 'v' in (rawCell as object)
                                ? typeof (rawCell as Record<string, unknown>).v
                                : 'n/a'
                          },
                          timestamp: Date.now()
                        })
                      }).catch(() => {})
                      // #endregion
                      if (!rawCell || typeof rawCell !== 'object' || Array.isArray(rawCell)) return
                      const oc = rawCell as Record<string, unknown>
                      let val: unknown = null
                      if ('m' in oc && typeof oc.m === 'string') val = oc.m
                      else if ('v' in oc) {
                        const v = oc.v
                        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') val = v
                        else if (v && typeof v === 'object' && !Array.isArray(v)) {
                          const vo = v as Record<string, unknown>
                          if ('m' in vo && typeof vo.m === 'string') val = vo.m
                          else if ('v' in vo) {
                            const vv = vo.v
                            if (typeof vv === 'string' || typeof vv === 'number' || typeof vv === 'boolean') val = vv
                            else if (vv && typeof vv === 'object' && !Array.isArray(vv) && 'm' in (vv as object))
                              val = String((vv as { m?: unknown }).m ?? '')
                            else val = vv
                          } else val = String(v)
                        } else val = v
                      }
                      if (val !== null && val !== undefined && (typeof val !== 'string' || val.trim().length > 0)) {
                        // #region agent log
                        fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            runId: 'long-paste-debug',
                            hypothesisId: 'FIX',
                            location: 'FortuneSheetGrid.tsx:handleOp:metaOnlyFallback',
                            message: 'Meta-only fallback: persisting workbook value',
                            data: {
                              rowId: capturedRowId,
                              columnName,
                              valLen: typeof val === 'string' ? val.length : 0
                            },
                            timestamp: Date.now()
                          })
                        }).catch(() => {})
                        // #endregion
                        onCellChange(capturedRowId, columnName, val)
                      }
                    } catch (e) {
                      // #region agent log
                      fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          runId: 'long-paste-debug',
                          hypothesisId: 'META_FALLBACK',
                          location: 'FortuneSheetGrid.tsx:handleOp:metaOnlyError',
                          message: 'Meta-only fallback error',
                          data: { error: String(e) },
                          timestamp: Date.now()
                        })
                      }).catch(() => {})
                      // #endregion
                    }
                  }, 0)
                }
                return
              }
            }
            if (op.op === 'remove') {
              cellValue = null
            } else if (cellProp === 'm') {
              if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
                cellValue = String(cellValue)
              } else if (cellValue === null || cellValue === undefined) {
                cellValue = ''
              } else {
                cellValue = ''
              }
            } else {
              const isCellObject = cellValue && typeof cellValue === 'object' && !Array.isArray(cellValue)
              if (isCellObject && 'f' in (cellValue as Record<string, unknown>)) {
                // Preserve full cell object when it includes a formula
              } else if (isCellObject && 'v' in (cellValue as Record<string, unknown>)) {
                const nextValue = (cellValue as { v: unknown }).v
                if (
                  (nextValue === null || nextValue === undefined) &&
                  'm' in (cellValue as Record<string, unknown>) &&
                  typeof (cellValue as { m?: unknown }).m === 'string'
                ) {
                  // FortuneSheet may carry pasted text in `m` while `v` is null.
                  cellValue = (cellValue as { m: string }).m
                } else if (
                  nextValue === null ||
                  nextValue === undefined ||
                  typeof nextValue === 'string' ||
                  typeof nextValue === 'number' ||
                  typeof nextValue === 'boolean'
                ) {
                  cellValue = nextValue
                } else if (
                  nextValue &&
                  typeof nextValue === 'object' &&
                  !Array.isArray(nextValue) &&
                  'v' in (nextValue as Record<string, unknown>)
                ) {
                  const nestedValue = (nextValue as { v: unknown }).v
                  if (
                    (nestedValue === null || nestedValue === undefined) &&
                    'm' in (nextValue as Record<string, unknown>) &&
                    typeof (nextValue as { m?: unknown }).m === 'string'
                  ) {
                    cellValue = (nextValue as { m: string }).m
                  } else if (
                    nestedValue === null ||
                    nestedValue === undefined ||
                    typeof nestedValue === 'string' ||
                    typeof nestedValue === 'number' ||
                    typeof nestedValue === 'boolean'
                  ) {
                    cellValue = nestedValue
                  } else if ('m' in (cellValue as Record<string, unknown>)) {
                    cellValue = String((cellValue as { m?: unknown }).m ?? '')
                  } else {
                    cellValue = ''
                  }
                } else if ('m' in (cellValue as Record<string, unknown>)) {
                  // Some paste payloads contain structured value objects; persist visible text.
                  cellValue = String((cellValue as { m?: unknown }).m ?? '')
                } else {
                  cellValue = ''
                }
              } else if (isCellObject && 'm' in (cellValue as Record<string, unknown>)) {
                cellValue = String((cellValue as { m?: unknown }).m ?? '')
              } else if (isCellObject) {
                cellValue = ''
              }
            }

            // Default: text wrap + auto-expand for pasted/edited text (skip tracking columns - keep compact)
            if ((op.op === 'replace' || op.op === 'add') && cellValue != null) {
              const column = columns[colIndex]
              if (column && !isCompactColumn(column)) {
                const text =
                  typeof cellValue === 'string'
                    ? cellValue
                    : cellValue && typeof cellValue === 'object' && 'm' in (cellValue as object)
                      ? String((cellValue as { m: unknown }).m ?? '')
                      : String(cellValue)
                if (text && text.length > 0) {
                  cellsToWrap.push({ row: fortuneSheetRowIndex, col: colIndex, text })
                }
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
              let persistedCellValue = cellValue

              if (cellProp === 'bg') {
                const existingRaw = data[rowIndex]?.[columnName]
                let baseCell: Record<string, unknown>
                if (existingRaw && typeof existingRaw === 'object' && !Array.isArray(existingRaw)) {
                  const existingObject = existingRaw as Record<string, unknown>
                  if ('v' in existingObject || 'f' in existingObject || 'm' in existingObject) {
                    baseCell = { ...existingObject }
                  } else {
                    baseCell = { v: '', m: '' }
                  }
                } else if (
                  typeof existingRaw === 'string' ||
                  typeof existingRaw === 'number' ||
                  typeof existingRaw === 'boolean'
                ) {
                  baseCell = { v: existingRaw, m: String(existingRaw) }
                } else {
                  baseCell = { v: '', m: '' }
                }

                if (op.op === 'remove' || op.value === null || op.value === undefined || op.value === '') {
                  delete baseCell.bg
                } else {
                  baseCell.bg = op.value
                }

                persistedCellValue = baseCell
              }
              // #region agent log
              const cvLen =
                typeof persistedCellValue === 'string'
                  ? persistedCellValue.length
                  : persistedCellValue &&
                      typeof persistedCellValue === 'object' &&
                      'm' in (persistedCellValue as object)
                    ? String((persistedCellValue as { m: unknown }).m).length
                    : 0
              fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  runId: 'ltdbg',
                  hypothesisId: 'H3',
                  location: 'FortuneSheetGrid.tsx:handleOp:onCellChange',
                  message: 'handleOp emitting cell value via onCellChange',
                  data: {
                    op: op.op,
                    rowId,
                    columnName,
                    cellValueLen: cvLen,
                    cellValueType: persistedCellValue === null ? 'null' : typeof persistedCellValue,
                    cellValuePreview: typeof persistedCellValue === 'string' ? persistedCellValue.slice(0, 80) : null
                  },
                  timestamp: Date.now()
                })
              }).catch(() => {})
              // #endregion
              onCellChange(rowId, columnName, persistedCellValue)
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

        // Apply text wrap + auto-expand to pasted/edited cells
        if (cellsToWrap.length > 0) {
          setTimeout(() => applyTextWrapAndExpand(cellsToWrap), 0)
        }

        // Fallback persistence for background highlight (fill color).
        // Some FortuneSheet range-fill actions emit ops that don't carry all changed
        // cells explicitly. After bg-related ops, reconcile workbook cell bg against
        // local data and persist diffs so colors survive refresh.
        const hasBackgroundFormattingOp = ops.some(op => {
          const pathHasBg = op.path.some(segment => String(segment) === 'bg')
          const valueHasBg =
            op.value &&
            typeof op.value === 'object' &&
            !Array.isArray(op.value) &&
            'bg' in (op.value as Record<string, unknown>)
          return pathHasBg || valueHasBg
        })
        if (hasBackgroundFormattingOp && onCellChange) {
          setTimeout(() => {
            try {
              const currentSheet = workbookRef.current?.getSheet() as any
              const workbookData = currentSheet?.data
              if (!Array.isArray(workbookData)) return

              for (let rowIndex = 0; rowIndex < data.length; rowIndex += 1) {
                const rowId = context.rowIndexToId.get(rowIndex)
                if (!rowId) continue

                const fortuneSheetRow = rowIndex + HEADER_ROW_OFFSET
                for (let colIndex = 0; colIndex < columns.length; colIndex += 1) {
                  const columnId = context.columnIndexToId.get(colIndex)
                  if (!columnId) continue

                  const column = columns.find(c => c.id === columnId)
                  const columnName = column?.name || columnId

                  const localRaw = data[rowIndex]?.[columnName]
                  const workbookRaw = workbookData?.[fortuneSheetRow]?.[colIndex] ?? null

                  const localBg =
                    localRaw && typeof localRaw === 'object' && !Array.isArray(localRaw) && 'bg' in localRaw
                      ? (localRaw as Record<string, unknown>).bg
                      : null
                  const workbookBg =
                    workbookRaw && typeof workbookRaw === 'object' && !Array.isArray(workbookRaw) && 'bg' in workbookRaw
                      ? (workbookRaw as Record<string, unknown>).bg
                      : null

                  if ((localBg ?? null) === (workbookBg ?? null)) continue

                  let nextPersistValue: unknown = workbookRaw
                  if (workbookRaw && typeof workbookRaw === 'object' && !Array.isArray(workbookRaw)) {
                    const workbookObject = workbookRaw as Record<string, unknown>
                    if ('v' in workbookObject || 'f' in workbookObject || 'm' in workbookObject) {
                      nextPersistValue = { ...workbookObject }
                    }
                  } else if (workbookRaw === null || workbookRaw === undefined) {
                    if (localRaw && typeof localRaw === 'object' && !Array.isArray(localRaw)) {
                      const localObject = localRaw as Record<string, unknown>
                      if ('v' in localObject || 'f' in localObject || 'm' in localObject) {
                        const withoutBg = { ...localObject }
                        delete (withoutBg as { bg?: unknown }).bg
                        nextPersistValue = withoutBg
                      } else {
                        nextPersistValue = ''
                      }
                    } else {
                      nextPersistValue = localRaw ?? ''
                    }
                  }

                  onCellChange(rowId, columnName, nextPersistValue)
                }
              }
            } catch {
              // Workbook not ready or unsupported data shape
            }
          }, 0)
        }

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
        applyTextWrapAndExpand,
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
      <div ref={sheetContainerRef} className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:overflow-hidden">
        <div
          className="fortunesheet-container"
          onMouseUp={handleContainerMouseUp}
          onKeyDownCapture={handleContainerKeyDown}
          onPasteCapture={handlePasteCapture}
          role="button"
          tabIndex={0}
          aria-label="Spreadsheet grid"
        >
          <Workbook
            ref={ref => {
              workbookRef.current = ref
              patchWorkbookSelection(ref)
            }}
            key={`workbook-${sheet.id}-${remoteUpdateKey}-${dataSignature}`}
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
            currency="€"
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
