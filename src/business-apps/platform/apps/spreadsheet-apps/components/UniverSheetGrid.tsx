/**
 * UniverSheetGrid Component
 *
 * Wrapper that integrates Univer with our spreadsheet system.
 * Replaces FortuneSheetGrid; same props and ref contract for TableView and collaboration.
 */

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useMemo, useState } from 'react'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { CommandType } from '@univerjs/core'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types/spreadsheet'
import type { DocumentParticipant, DocumentOperation } from '../../shared/services/CollaborationClient'
import {
  buildWorkbookSnapshot,
  createUniverConversionContext,
  type UniverWorkbookSnapshot
} from '../utils/univerAdapter'

// Match Univer's standard defaults for consistent cursor sizing before snapshot is read
const CURSOR_OVERLAY_ROW_HEIGHT_PX = 23
const CURSOR_OVERLAY_COL_WIDTH_PX = 73
const CURSOR_OVERLAY_HEADER_HEIGHT_PX = 28
const CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX = 48

function parseCursorPath(path?: string[]): { row: number; col: number } | null {
  if (!path || path.length === 0) return null
  const rowEntry = path.find(item => item.startsWith('row:'))
  const colEntry = path.find(item => item.startsWith('col:'))
  if (!rowEntry || !colEntry) return null
  const row = Number(rowEntry.slice(4))
  const col = Number(colEntry.slice(4))
  if (!Number.isFinite(row) || !Number.isFinite(col) || row < 0 || col < 0) return null
  return { row, col }
}

export interface UniverSheetGridProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  initialSnapshot?: Record<string, unknown> | null
  snapshotSeed?: string
  columns: SpreadsheetColumn[]
  isReadOnly: boolean
  onCellChange: (rowId: string, columnId: string, value: unknown) => void
  onCellsChange?: (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => void
  onSnapshotRequested?: () => Promise<void> | void
  onDataChange: (data: Record<string, unknown>[]) => void
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  onFormulaEvaluated?: (rowId: string, columnId: string, result: unknown) => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: DocumentOperation) => void
  onCursorEmit?: (position: { path: string[] }) => void
  collaborationEnabled?: boolean
  height?: string | number
  width?: string | number
}

export interface CellDimensionsPayload {
  sheetId: string
  defaultColWidth: number
  defaultRowHeight: number
  columnData: Record<string | number, { w?: number }>
  rowData: Record<string | number, { h?: number }>
  rowHeaderWidth: number
  columnHeaderHeight: number
  zoomRatio: number
}

export interface UniverSheetGridHandle {
  applyRemoteCellUpdate: (rowIndex: number, colIndex: number, value: unknown) => void
  getWorkbookSnapshot: () => Record<string, unknown> | null
  getVisibleRangeValues: (rowCount: number, colCount: number) => Record<number, Record<number, unknown>> | null
  applyRemoteDimensions: (payload: CellDimensionsPayload) => void
}

export const UniverSheetGrid = forwardRef<UniverSheetGridHandle, UniverSheetGridProps>(
  function UniverSheetGrid(props, ref) {
    const {
      sheet,
      data,
      columns,
      initialSnapshot,
      onCellChange,
      onCellsChange,
      onSnapshotRequested,
      onDataChange,
      onCursorEmit
    } = props

    const containerRef = useRef<HTMLDivElement>(null)
    // Tracks whether this sheet is the currently active editor on the page.
    // Needed for published screens where the host app may register global shortcuts (e.g. Cmd+B).
    const isSheetInteractionActiveRef = useRef<boolean>(false)
    const univerAPIRef = useRef<ReturnType<typeof createUniver>['univerAPI'] | null>(null)
    const isLocalEditRef = useRef(false)
    const isDirtyRef = useRef(false)
    const hasEditedRef = useRef(false)
    const snapshotRequestInFlightRef = useRef<Promise<void> | null>(null)
    const snapshotRequestQueuedCountRef = useRef<number>(0)
    const snapshotCheckpointTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const requestSnapshotCheckpointRef = useRef<((force?: boolean) => void) | null>(null)
    const newRowClientIdByIndexRef = useRef<Map<number, string>>(new Map())
    const contextRef = useRef<ReturnType<typeof createUniverConversionContext> | null>(null)
    const propsRef = useRef({ sheet, data, columns, initialSnapshot })
    propsRef.current = { sheet, data, columns, initialSnapshot }
    const callbacksRef = useRef({ onCellChange, onCellsChange, onSnapshotRequested, onDataChange, onCursorEmit })
    callbacksRef.current = { onCellChange, onCellsChange, onSnapshotRequested, onDataChange, onCursorEmit }
    const lastEmittedCursorPathRef = useRef<string>('')
    // Caches actual column widths and row heights read from the workbook snapshot so that
    // cursor overlays match the real rendered cell dimensions (not hardcoded constants).
    const cellDimensionsRef = useRef<{
      defaultColWidth: number
      defaultRowHeight: number
      columnData: Record<string | number, { w?: number }>
      rowData: Record<string | number, { h?: number }>
      rowHeaderWidth: number
      columnHeaderHeight: number
      zoomRatio: number
    } | null>(null)
    // Tracks viewport scroll used by Univer canvas rendering.
    const sheetScrollRef = useRef<{ scrollLeft: number; scrollTop: number }>({ scrollLeft: 0, scrollTop: 0 })
    // Allows the Univer init effect to trigger a cursor position refresh on scroll
    const refreshCursorRectsRef = useRef<(() => void) | null>(null)
    const [cursorRects, setCursorRects] = useState<
      Record<string, { top: number; left: number; width: number; height: number }>
    >({})
    const remoteCursorOverlays = useMemo(
      () =>
        (props.participants ?? [])
          .map(participant => {
            const parsed = parseCursorPath(participant.cursor?.path)
            if (!parsed) return null
            return {
              id: `${participant.userId}-${parsed.row}-${parsed.col}`,
              userName: participant.userName || 'User',
              userColor: participant.userColor || '#4ECDC4',
              row: parsed.row,
              col: parsed.col
            }
          })
          .filter(
            (entry): entry is { id: string; userName: string; userColor: string; row: number; col: number } => !!entry
          ),
      [props.participants]
    )

    const areCursorRectsEqual = (
      a: Record<string, { top: number; left: number; width: number; height: number }>,
      b: Record<string, { top: number; left: number; width: number; height: number }>
    ): boolean => {
      const aKeys = Object.keys(a)
      const bKeys = Object.keys(b)
      if (aKeys.length !== bKeys.length) return false
      for (const key of aKeys) {
        const ra = a[key]
        const rb = b[key]
        if (!rb) return false
        if (
          Math.abs(ra.top - rb.top) > 0.5 ||
          Math.abs(ra.left - rb.left) > 0.5 ||
          Math.abs(ra.width - rb.width) > 0.5 ||
          Math.abs(ra.height - rb.height) > 0.5
        ) {
          return false
        }
      }
      return true
    }

    const resolveCellRect = useCallback(
      (row: number, col: number): { top: number; left: number; width: number; height: number } | null => {
        const api = univerAPIRef.current
        const container = containerRef.current
        if (!api || !container) return null
        try {
          const workbook = api.getActiveWorkbook?.()
          const worksheet = workbook?.getActiveSheet?.()
          if (!worksheet) return null

          // Use the snapshot cache for cell dimensions. Apply zoomRatio so overlays
          // match the actual rendered size when the user has zoomed the sheet.
          const dims = cellDimensionsRef.current
          const zoom = dims?.zoomRatio ?? 1
          const rowHeaderWidth = dims?.rowHeaderWidth ?? CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX
          const columnHeaderHeight = dims?.columnHeaderHeight ?? CURSOR_OVERLAY_HEADER_HEIGHT_PX
          const getColumnWidth = (c: number): number =>
            (dims?.columnData[c]?.w ?? dims?.defaultColWidth ?? CURSOR_OVERLAY_COL_WIDTH_PX) * zoom
          const getRowHeight = (r: number): number =>
            (dims?.rowData[r]?.h ?? dims?.defaultRowHeight ?? CURSOR_OVERLAY_ROW_HEIGHT_PX) * zoom

          let cellLeft = 0
          for (let c = 0; c < col; c++) cellLeft += getColumnWidth(c)
          let cellTop = 0
          for (let r = 0; r < row; r++) cellTop += getRowHeight(r)

          const containerBox = container.getBoundingClientRect()

          const scrollState = (
            worksheet as {
              getScrollState?: () => {
                sheetViewStartRow?: number
                sheetViewStartColumn?: number
                offsetX?: number
                offsetY?: number
              }
            }
          ).getScrollState?.()
          let scrollLeftFromState: number | undefined
          let scrollTopFromState: number | undefined
          if (scrollState) {
            const startCol = Math.max(0, scrollState.sheetViewStartColumn ?? 0)
            const startRow = Math.max(0, scrollState.sheetViewStartRow ?? 0)
            let left = 0
            let top = 0
            for (let c = 0; c < startCol; c++) left += getColumnWidth(c)
            for (let r = 0; r < startRow; r++) top += getRowHeight(r)
            left += scrollState.offsetX ?? 0
            top += scrollState.offsetY ?? 0
            scrollLeftFromState = left
            scrollTopFromState = top
          }
          const scrollLeft =
            typeof scrollLeftFromState === 'number' && Number.isFinite(scrollLeftFromState)
              ? scrollLeftFromState
              : sheetScrollRef.current.scrollLeft
          const scrollTop =
            typeof scrollTopFromState === 'number' && Number.isFinite(scrollTopFromState)
              ? scrollTopFromState
              : sheetScrollRef.current.scrollTop

          // Use the topmost canvas to find where the sheet grid starts vertically
          // (below the Univer toolbar and formula bar). We use canvas.top for the
          // vertical anchor, but NOT canvas.left — the sheet always fills the container
          // horizontally from x=0, so the horizontal anchor is just the row index width.
          // Using canvas.left causes incorrect results because Univer may render the cell
          // content canvas starting at an offset that varies by version/layout.
          const canvases = Array.from(container.querySelectorAll<HTMLCanvasElement>('canvas'))
          // Pick the largest canvas by pixel area — that is the main sheet rendering canvas,
          // which sits below the toolbar and formula bar. Smaller canvases belong to the
          // formula bar input, overlays, or other internal Univer UI components.
          const mainCanvas = canvases.reduce<HTMLCanvasElement | null>((best, c) => {
            if (!best) return c
            return c.width * c.height > best.width * best.height ? c : best
          }, null)

          if (mainCanvas) {
            const canvasBox = mainCanvas.getBoundingClientRect()
            return {
              // Vertical: canvas top + column header height + row offsets - viewport scroll
              top: canvasBox.top - containerBox.top + columnHeaderHeight + cellTop - scrollTop,
              // Horizontal: row index width + column offsets - viewport scroll
              left: rowHeaderWidth + cellLeft - scrollLeft,
              width: getColumnWidth(col),
              height: getRowHeight(row)
            }
          }

          return null
        } catch {
          return null
        }
      },
      []
    )

    useEffect(() => {
      if (remoteCursorOverlays.length === 0) {
        refreshCursorRectsRef.current = null
        setCursorRects({})
        return
      }
      const refresh = () => {
        const next: Record<string, { top: number; left: number; width: number; height: number }> = {}
        for (const cursor of remoteCursorOverlays) {
          const rect = resolveCellRect(cursor.row, cursor.col)
          if (rect) next[cursor.id] = rect
        }
        setCursorRects(prev => (areCursorRectsEqual(prev, next) ? prev : next))
      }
      refreshCursorRectsRef.current = refresh
      refresh()
      const onResize = () => refresh()
      const onScroll = () => refresh()
      window.addEventListener('resize', onResize)
      window.addEventListener('scroll', onScroll, true)
      return () => {
        refreshCursorRectsRef.current = null
        window.removeEventListener('resize', onResize)
        window.removeEventListener('scroll', onScroll, true)
      }
    }, [remoteCursorOverlays, resolveCellRect])

    const applyRemoteCellUpdate = useCallback((rowIndex: number, colIndex: number, value: unknown) => {
      const api = univerAPIRef.current
      if (!api) return
      try {
        isLocalEditRef.current = true
        const workbook = api.getActiveWorkbook()
        if (!workbook) return
        const worksheet = workbook.getActiveSheet()
        if (!worksheet) return
        const range = worksheet.getRange(rowIndex, colIndex)
        if (range) range.setValue(value as string | number | boolean)
      } catch (e) {
        console.error('[UniverSheetGrid] applyRemoteCellUpdate error:', e)
      } finally {
        setTimeout(() => {
          isLocalEditRef.current = false
        }, 50)
      }
    }, [])

    const getWorkbookSnapshot = useCallback((): Record<string, unknown> | null => {
      const api = univerAPIRef.current
      if (!api) return null
      try {
        const workbook = api.getActiveWorkbook()
        if (!workbook) return null
        const wb = workbook as unknown as {
          save?: () => unknown
          getSnapshot?: () => unknown
          snapshot?: unknown
        }
        const rawSnapshot = wb.save?.() ?? wb.getSnapshot?.() ?? wb.snapshot
        if (!rawSnapshot || typeof rawSnapshot !== 'object') return null

        // Ensure payload is JSON-serializable before sending to API.
        try {
          return structuredClone(rawSnapshot as Record<string, unknown>)
        } catch {
          try {
            return JSON.parse(JSON.stringify(rawSnapshot)) as Record<string, unknown>
          } catch (cloneError) {
            console.error('[UniverSheetGrid] snapshot is not serializable:', cloneError)
            return null
          }
        }
      } catch (e) {
        console.error('[UniverSheetGrid] getWorkbookSnapshot error:', e)
        return null
      }
    }, [])

    const applyRemoteDimensions = useCallback(
      (payload: CellDimensionsPayload) => {
        if (payload.sheetId !== sheet.id) return
        cellDimensionsRef.current = {
          defaultColWidth: payload.defaultColWidth,
          defaultRowHeight: payload.defaultRowHeight,
          columnData: payload.columnData ?? {},
          rowData: payload.rowData ?? {},
          rowHeaderWidth: payload.rowHeaderWidth,
          columnHeaderHeight: payload.columnHeaderHeight,
          zoomRatio: payload.zoomRatio
        }
        const api = univerAPIRef.current
        const worksheet = api?.getActiveWorkbook?.()?.getActiveSheet?.()
        if (
          worksheet &&
          typeof (worksheet as { setColumnWidth?: (col: number, w: number) => unknown }).setColumnWidth === 'function'
        ) {
          const ws = worksheet as {
            setColumnWidth: (col: number, w: number) => unknown
            setRowHeight: (row: number, h: number) => unknown
          }
          Object.entries(payload.columnData ?? {}).forEach(([colStr, meta]) => {
            const w = meta?.w
            if (typeof w === 'number' && w > 0) ws.setColumnWidth(Number(colStr), w)
          })
          Object.entries(payload.rowData ?? {}).forEach(([rowStr, meta]) => {
            const h = meta?.h
            if (typeof h === 'number' && h > 0) ws.setRowHeight(Number(rowStr), h)
          })
        }
        refreshCursorRectsRef.current?.()
      },
      [sheet.id]
    )

    const getVisibleRangeValues = useCallback(
      (rowCount: number, colCount: number): Record<number, Record<number, unknown>> | null => {
        const api = univerAPIRef.current
        if (!api) return null
        try {
          const workbook = api.getActiveWorkbook()
          const worksheet = workbook?.getActiveSheet?.()
          if (!worksheet) return null

          const values: Record<number, Record<number, unknown>> = {}
          for (let row = 0; row < Math.max(0, rowCount); row++) {
            for (let col = 0; col < Math.max(0, colCount); col++) {
              const range = worksheet.getRange?.(row, col)
              const value =
                (range as { getValue?: () => unknown })?.getValue?.() ??
                (range as { getCellData?: () => { v?: unknown } })?.getCellData?.()?.v
              if (value === undefined) continue
              if (!values[row]) values[row] = {}
              values[row][col] = value
            }
          }
          return values
        } catch (e) {
          console.error('[UniverSheetGrid] getVisibleRangeValues error:', e)
          return null
        }
      },
      []
    )

    useImperativeHandle(
      ref,
      () => ({
        applyRemoteCellUpdate,
        getWorkbookSnapshot,
        getVisibleRangeValues,
        applyRemoteDimensions
      }),
      [applyRemoteCellUpdate, getWorkbookSnapshot, getVisibleRangeValues, applyRemoteDimensions]
    )

    // Keep conversion context in sync when data/columns change (e.g. after save) so value-change handler maps indices correctly.
    useEffect(() => {
      if (!univerAPIRef.current) return
      contextRef.current = createUniverConversionContext(columns, data)
    }, [data, columns])

    // Fallback interval: separate from Univer lifecycle so it keeps running even if the Univer effect re-runs.
    useEffect(() => {
      const FALLBACK_INTERVAL_MS = 10000
      const id = setInterval(() => {
        if (!hasEditedRef.current) return
        const req = requestSnapshotCheckpointRef.current
        if (!req || snapshotRequestInFlightRef.current) return
        req(true)
      }, FALLBACK_INTERVAL_MS)
      return () => clearInterval(id)
    }, [])

    // Only create/destroy Univer when sheet.id changes. Do not depend on data/columns/snapshot
    // so parent re-renders (new data reference) don't dispose and recreate the workbook (avoids flicker).
    useEffect(() => {
      if (!containerRef.current) return
      newRowClientIdByIndexRef.current.clear()
      const { sheet: s, data: d, columns: c, initialSnapshot: initialSnapshotForSheet } = propsRef.current
      let snapshotForInit: UniverWorkbookSnapshot
      try {
        if (initialSnapshotForSheet && typeof initialSnapshotForSheet === 'object') {
          snapshotForInit = initialSnapshotForSheet as UniverWorkbookSnapshot
        } else {
          snapshotForInit = buildWorkbookSnapshot(s, d, c)
        }
      } catch (e) {
        console.error('[UniverSheetGrid] buildWorkbookSnapshot error:', e)
        return
      }
      contextRef.current = createUniverConversionContext(c, d)

      const { univerAPI } = createUniver({
        locale: LocaleType.EN_US,
        locales: {
          [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS)
        },
        presets: [
          UniverSheetsCorePreset({
            container: containerRef.current
          })
        ]
      })

      // Populate cell dimensions from the initial snapshot immediately so cursor overlays
      // use correct sizes from the first render (no wait for Univer to hydrate).
      const applyDimensionsFromSnapshot = (snap: Record<string, unknown>) => {
        const sheetOrder = snap?.sheetOrder as string[] | undefined
        const sheets = snap?.sheets as Record<string, Record<string, unknown>> | undefined
        const firstSheetId = sheetOrder?.[0]
        const sheetSnap = firstSheetId && sheets ? sheets[firstSheetId] : sheets ? Object.values(sheets)[0] : undefined
        if (sheetSnap) {
          const rawCol = sheetSnap.columnData as Record<string | number, { w?: number }> | undefined
          const rawRow = sheetSnap.rowData as Record<string | number, { h?: number }> | undefined
          const rowHeader = sheetSnap.rowHeader as { width?: number } | undefined
          const columnHeader = sheetSnap.columnHeader as { height?: number } | undefined
          const zoomRatio = (sheetSnap.zoomRatio as number | undefined) ?? 1
          cellDimensionsRef.current = {
            defaultColWidth: (sheetSnap.defaultColumnWidth as number | undefined) ?? CURSOR_OVERLAY_COL_WIDTH_PX,
            defaultRowHeight: (sheetSnap.defaultRowHeight as number | undefined) ?? CURSOR_OVERLAY_ROW_HEIGHT_PX,
            columnData: rawCol ?? {},
            rowData: rawRow ?? {},
            rowHeaderWidth: rowHeader?.width ?? CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX,
            columnHeaderHeight: columnHeader?.height ?? CURSOR_OVERLAY_HEADER_HEIGHT_PX,
            zoomRatio
          }
        }
      }
      applyDimensionsFromSnapshot(snapshotForInit as unknown as Record<string, unknown>)

      univerAPIRef.current = univerAPI
      univerAPI.createWorkbook(snapshotForInit as unknown as Record<string, unknown>)

      // Re-read from Univer after it hydrates (handles column/row resizes, Excel imports, etc.)
      const updateCellDimensions = () => {
        try {
          const wb = univerAPIRef.current?.getActiveWorkbook() as unknown as {
            save?: () => Record<string, unknown>
            getSnapshot?: () => Record<string, unknown>
          } | null
          const snap = wb?.save?.() ?? wb?.getSnapshot?.()
          if (snap) applyDimensionsFromSnapshot(snap)
        } catch {}
      }
      setTimeout(updateCellDimensions, 200)

      const SNAPSHOT_TIMEOUT_MS = 10000
      const requestSnapshotCheckpoint = (force = false) => {
        const onSnapshotRequestedCb = callbacksRef.current.onSnapshotRequested
        if (!onSnapshotRequestedCb) return
        if (!force && !isDirtyRef.current) return
        if (snapshotRequestInFlightRef.current) {
          snapshotRequestQueuedCountRef.current += 1
          return
        }
        try {
          const result = onSnapshotRequestedCb()
          const promise = Promise.resolve(result) as Promise<void>
          snapshotRequestInFlightRef.current = promise
          const timeoutId = setTimeout(() => {
            if (snapshotRequestInFlightRef.current === promise) {
              snapshotRequestInFlightRef.current = null
              if (snapshotRequestQueuedCountRef.current > 0) {
                snapshotRequestQueuedCountRef.current -= 1
                requestSnapshotCheckpoint(true)
              }
            }
          }, SNAPSHOT_TIMEOUT_MS)
          void promise
            .then(() => {
              isDirtyRef.current = false
            })
            .catch(() => {
              // Keep dirty; we'll retry on the next trigger.
            })
            .finally(() => {
              clearTimeout(timeoutId)
              snapshotRequestInFlightRef.current = null
              if (snapshotRequestQueuedCountRef.current > 0) {
                snapshotRequestQueuedCountRef.current -= 1
                requestSnapshotCheckpoint(true)
              }
            })
        } catch {
          // Keep dirty
          if (snapshotRequestQueuedCountRef.current > 0) {
            snapshotRequestQueuedCountRef.current -= 1
            requestSnapshotCheckpoint(true)
          }
        }
      }
      // 2000ms gives the cell-flush debounce (400ms) + API round-trip time to finish
      // before we snapshot, so the saved snapshot always reflects a persisted version.
      const scheduleSnapshotCheckpoint = (delayMs = 2000) => {
        if (snapshotCheckpointTimerRef.current) {
          clearTimeout(snapshotCheckpointTimerRef.current)
        }
        snapshotCheckpointTimerRef.current = setTimeout(() => {
          snapshotCheckpointTimerRef.current = null
          requestSnapshotCheckpoint(true)
        }, delayMs)
      }
      requestSnapshotCheckpointRef.current = requestSnapshotCheckpoint
      const handleSheetScroll = (scrollLeft: number, scrollTop: number) => {
        sheetScrollRef.current = { scrollLeft, scrollTop }
        refreshCursorRectsRef.current?.()
      }
      const syncScrollFromWorksheet = () => {
        const workbook = univerAPI.getActiveWorkbook?.()
        const worksheet = workbook?.getActiveSheet?.()
        const dims = cellDimensionsRef.current
        const zoom = dims?.zoomRatio ?? 1
        const getColumnWidth = (c: number): number =>
          (dims?.columnData[c]?.w ?? dims?.defaultColWidth ?? CURSOR_OVERLAY_COL_WIDTH_PX) * zoom
        const getRowHeight = (r: number): number =>
          (dims?.rowData[r]?.h ?? dims?.defaultRowHeight ?? CURSOR_OVERLAY_ROW_HEIGHT_PX) * zoom
        const scrollState = (
          worksheet as
            | {
                getScrollState?: () => {
                  sheetViewStartRow?: number
                  sheetViewStartColumn?: number
                  offsetX?: number
                  offsetY?: number
                }
              }
            | undefined
        )?.getScrollState?.()
        if (!scrollState) return
        const startCol = Math.max(0, scrollState.sheetViewStartColumn ?? 0)
        const startRow = Math.max(0, scrollState.sheetViewStartRow ?? 0)
        let left = 0
        let top = 0
        for (let c = 0; c < startCol; c++) left += getColumnWidth(c)
        for (let r = 0; r < startRow; r++) top += getRowHeight(r)
        left += scrollState.offsetX ?? 0
        top += scrollState.offsetY ?? 0
        if (Number.isFinite(left) && Number.isFinite(top)) {
          handleSheetScroll(left, top)
        }
      }
      // Seed initial scroll and keep in sync through events + lightweight polling fallback.
      syncScrollFromWorksheet()
      const scrollEventName = (univerAPI as { Event?: { Scroll?: string } }).Event?.Scroll ?? 'Scroll'
      const scrollEventDisposable = (
        univerAPI as {
          addEvent?(
            event: string,
            cb: (p: {
              sheetViewStartRow?: number
              sheetViewStartColumn?: number
              offsetX?: number
              offsetY?: number
            }) => void
          ): { dispose(): void }
        }
      ).addEvent?.(scrollEventName, () => {
        syncScrollFromWorksheet()
      })
      const activeWorksheet = univerAPI.getActiveWorkbook?.()?.getActiveSheet?.()
      const worksheetScrollDisposable = (
        activeWorksheet as {
          onScroll?: (cb: (s: unknown) => void) => { dispose(): void }
        }
      )?.onScroll?.(() => {
        syncScrollFromWorksheet()
      })
      const scrollPollIntervalId = setInterval(syncScrollFromWorksheet, 120)

      const commandEventKey =
        (univerAPI as { Event?: { CommandExecuted?: string } }).Event?.CommandExecuted ?? 'CommandExecuted'
      const commandDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: { type?: number }) => void): { dispose(): void } }
      ).addEvent?.(commandEventKey, (event: { type?: number }) => {
        const t = event?.type
        // Only MUTATION (type 2) represents an actual data change. COMMAND (type 0)
        // includes selection/navigation commands which must not trigger snapshots.
        if (t === CommandType.MUTATION) {
          isDirtyRef.current = true
          hasEditedRef.current = true
          scheduleSnapshotCheckpoint()
          // Refresh cached dimensions — user may have resized columns/rows
          updateCellDimensions()
        }
      })
      const eventKey =
        (univerAPI as { Event?: { SheetValueChanged?: string } }).Event?.SheetValueChanged ?? 'SheetValueChanged'
      const valueChangeDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.(
        eventKey,
        (params: {
          effectedRanges?: Array<{
            getRange?: () => { startRow: number; endRow: number; startColumn: number; endColumn: number }
          }>
          payload?: {
            id?: string
            params?: {
              cellValue?: Record<number, Record<number, { v?: unknown }>>
              range?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
            }
          }
        }) => {
          if (isLocalEditRef.current) return
          const payload = params?.payload
          const payloadCellValue = payload?.params?.cellValue
          let cellValue = payloadCellValue
          if (!cellValue || typeof cellValue !== 'object') {
            // Fallback: derive changed values from effected ranges when mutation payload
            // does not provide `cellValue` (observed in some Univer command variants).
            const workbook = univerAPIRef.current?.getActiveWorkbook()
            const worksheet = workbook?.getActiveSheet()
            const derived: Record<number, Record<number, unknown>> = {}
            const ranges = (payload?.params?.range ??
              params.effectedRanges?.map(r => r.getRange?.()).filter(Boolean) ??
              []) as Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>

            const MAX_FALLBACK_CELLS = 10000
            let visited = 0
            for (const range of ranges) {
              for (let r = range.startRow; r <= range.endRow; r++) {
                for (let c = range.startColumn; c <= range.endColumn; c++) {
                  if (++visited > MAX_FALLBACK_CELLS) break
                  const cellRange = worksheet?.getRange?.(r, c)
                  const value =
                    (cellRange as { getValue?: () => unknown })?.getValue?.() ??
                    (cellRange as { getCellData?: () => { v?: unknown } })?.getCellData?.()?.v
                  if (value === undefined) continue
                  if (!derived[r]) derived[r] = {}
                  derived[r][c] = value
                }
                if (visited > MAX_FALLBACK_CELLS) break
              }
              if (visited > MAX_FALLBACK_CELLS) break
            }
            cellValue = Object.keys(derived).length > 0 ? derived : undefined
          }
          // Paste/edit mutations can use different internal command ids across Univer versions.
          // Persist whenever mutation payload carries concrete cell values.
          if (!cellValue || typeof cellValue !== 'object') return
          isDirtyRef.current = true
          hasEditedRef.current = true
          scheduleSnapshotCheckpoint()
          const ctxBefore = contextRef.current
          const {
            onCellChange: onCellChangeCb,
            onCellsChange: onCellsChangeCb,
            onDataChange: onDataChangeCb
          } = callbacksRef.current
          if (!ctxBefore) return
          const currentData = propsRef.current.data

          const range = payload.params?.range?.[0] ?? params.effectedRanges?.[0]?.getRange?.()
          let rowOffset = 0
          let colOffset = 0
          if (range) {
            const rowKeys = Object.keys(cellValue)
              .map(k => Number(k))
              .filter(n => !Number.isNaN(n))
            const minRow = rowKeys.length ? Math.min(...rowKeys) : 0
            const maxRow = rowKeys.length ? Math.max(...rowKeys) : 0

            const colKeys: number[] = []
            for (const rowKey of Object.keys(cellValue)) {
              const rowCells = cellValue[Number(rowKey)]
              if (!rowCells || typeof rowCells !== 'object') continue
              for (const colKey of Object.keys(rowCells)) {
                const n = Number(colKey)
                if (!Number.isNaN(n)) colKeys.push(n)
              }
            }
            const minCol = colKeys.length ? Math.min(...colKeys) : 0
            const maxCol = colKeys.length ? Math.max(...colKeys) : 0

            const looksAbsoluteRows = minRow >= range.startRow && maxRow <= range.endRow
            const looksRelativeRows = minRow >= 0 && maxRow <= range.endRow - range.startRow
            const looksAbsoluteCols = minCol >= range.startColumn && maxCol <= range.endColumn
            const looksRelativeCols = minCol >= 0 && maxCol <= range.endColumn - range.startColumn

            if (!looksAbsoluteRows && looksRelativeRows) rowOffset = range.startRow
            if (!looksAbsoluteCols && looksRelativeCols) colOffset = range.startColumn
          }

          const newRowIndices = Object.keys(cellValue)
            .map(k => Number(k))
            .filter(ri => !Number.isNaN(ri) && ctxBefore.rowIndexToId.get(ri + rowOffset) === undefined)
            .sort((a, b) => a - b)
          if (newRowIndices.length > 0 && onDataChangeCb) {
            const newRows: Record<string, unknown>[] = newRowIndices.map(rowIndex => {
              const rowCells = cellValue[rowIndex]
              const globalRowIndex = rowIndex + rowOffset
              let clientRowId = newRowClientIdByIndexRef.current.get(globalRowIndex)
              if (!clientRowId) {
                try {
                  clientRowId = `client_${crypto.randomUUID()}`
                } catch {
                  clientRowId = `client_${Date.now()}_${Math.random().toString(16).slice(2)}`
                }
                newRowClientIdByIndexRef.current.set(globalRowIndex, clientRowId)
              }

              const row: Record<string, unknown> = { _id: clientRowId }
              if (rowCells && typeof rowCells === 'object') {
                for (const colKey of Object.keys(rowCells)) {
                  const colIndex = Number(colKey)
                  if (Number.isNaN(colIndex)) continue
                  const columnName =
                    ctxBefore.columnIndexToName.get(colIndex + colOffset) ??
                    ctxBefore.columnIndexToId.get(colIndex + colOffset)
                  if (columnName === undefined) continue
                  const cell = rowCells[colIndex]
                  row[columnName] = cell ?? { v: '' }
                }
              }
              return row
            })
            const nextData = [...currentData, ...newRows]
            onDataChangeCb(nextData)
            // Keep mapping up to date immediately so subsequent events in the same paste burst can resolve rowIds.
            contextRef.current = createUniverConversionContext(propsRef.current.columns, nextData)
          }

          const ctx = contextRef.current ?? ctxBefore
          const changedCells: Array<{ rowId: string; columnName: string; value: unknown }> = []
          for (const rowKey of Object.keys(cellValue)) {
            const rowIndex = Number(rowKey)
            if (Number.isNaN(rowIndex)) continue
            const rowCells = cellValue[rowIndex]
            if (!rowCells || typeof rowCells !== 'object') continue
            const rowId = ctx.rowIndexToId.get(rowIndex + rowOffset)
            if (rowId === undefined) continue
            for (const colKey of Object.keys(rowCells)) {
              const colIndex = Number(colKey)
              if (Number.isNaN(colIndex)) continue
              const columnName =
                ctx.columnIndexToName.get(colIndex + colOffset) ?? ctx.columnIndexToId.get(colIndex + colOffset)
              if (columnName === undefined) continue
              const cell = rowCells[colIndex]
              changedCells.push({ rowId, columnName, value: cell ?? { v: '' } })
            }
          }

          if (changedCells.length > 0 && onCellsChangeCb) {
            onCellsChangeCb(changedCells)
            // Do NOT call requestSnapshotCheckpoint here. At this point the cell flush
            // (schedulePendingCellPersist) has not yet run, so the sheet version has not
            // been bumped. A snapshot saved now would be immediately stale. The debounced
            // CommandExecuted snapshot (fired below) runs after the flush completes and
            // captures the correct version.
            return
          }

          if (changedCells.length > 0 && onCellChangeCb) {
            for (const cell of changedCells) {
              onCellChangeCb(cell.rowId, cell.columnName, cell.value)
            }
            // Same reasoning: snapshot is triggered by CommandExecuted, not here.
          }
        }
      )
      const selectionEventKey =
        (univerAPI as { Event?: { SelectionMoveEnd?: string } }).Event?.SelectionMoveEnd ?? 'SelectionMoveEnd'
      const emitCursorByRowCol = (startRow: number, startColumn: number) => {
        const onCursorEmitCb = callbacksRef.current.onCursorEmit
        if (!onCursorEmitCb) return
        const path = [`row:${startRow}`, `col:${startColumn}`]
        const signature = path.join('|')
        if (lastEmittedCursorPathRef.current === signature) return
        lastEmittedCursorPathRef.current = signature
        onCursorEmitCb({ path })
      }
      const getRowColFromActiveRange = () => {
        const workbook = univerAPIRef.current?.getActiveWorkbook?.()
        const activeRange =
          (workbook as { getActiveRange?: () => unknown } | null | undefined)?.getActiveRange?.() ??
          (workbook?.getActiveSheet?.() as { getActiveRange?: () => unknown } | undefined)?.getActiveRange?.()
        if (!activeRange) return null
        const rangeRecord = activeRange as {
          getRow?: () => number
          getColumn?: () => number
          getRange?: () => { startRow?: number; startColumn?: number }
          startRow?: number
          startColumn?: number
          row?: number
          column?: number
        }
        const nestedRange = rangeRecord.getRange?.()
        const row = rangeRecord.getRow?.() ?? nestedRange?.startRow ?? rangeRecord.startRow ?? rangeRecord.row
        const col =
          rangeRecord.getColumn?.() ?? nestedRange?.startColumn ?? rangeRecord.startColumn ?? rangeRecord.column
        if (typeof row !== 'number' || typeof col !== 'number') return null
        return { row, col }
      }
      const emitCursorFromWorksheetSelection = () => {
        const fromRange = getRowColFromActiveRange()
        if (fromRange) {
          emitCursorByRowCol(fromRange.row, fromRange.col)
          return
        }
        const workbook = univerAPIRef.current?.getActiveWorkbook?.()
        const worksheet = workbook?.getActiveSheet?.()
        const selection = (
          worksheet as { getSelection?: () => { getCurrentCell?: () => unknown } | null }
        ).getSelection?.()
        const currentCell = selection?.getCurrentCell?.() as
          | { actualRow?: number; actualColumn?: number; row?: number; column?: number }
          | undefined
        const row = currentCell?.actualRow ?? currentCell?.row
        const col = currentCell?.actualColumn ?? currentCell?.column
        if (typeof row !== 'number' || typeof col !== 'number') return
        emitCursorByRowCol(row, col)
      }
      const emitCursorFromSelectionEvent = (event: unknown) => {
        const eventRecord = (event ?? {}) as {
          selections?: Array<{
            range?: {
              startRow?: number
              startColumn?: number
              row?: number
              column?: number
            }
            primary?: {
              actualRow?: number
              actualColumn?: number
              startRow?: number
              startColumn?: number
            }
          }>
          range?: {
            startRow?: number
            startColumn?: number
            row?: number
            column?: number
            actualRow?: number
            actualColumn?: number
          }
          params?: {
            selections?: Array<{
              range?: {
                startRow?: number
                startColumn?: number
                row?: number
                column?: number
              }
              primary?: {
                actualRow?: number
                actualColumn?: number
                startRow?: number
                startColumn?: number
              }
            }>
            range?: {
              startRow?: number
              startColumn?: number
              row?: number
              column?: number
              actualRow?: number
              actualColumn?: number
            }
          }
          primary?: {
            actualRow?: number
            actualColumn?: number
            startRow?: number
            startColumn?: number
          }
        }
        const selection =
          eventRecord.selections?.[0]?.range ??
          eventRecord.range ??
          eventRecord.params?.selections?.[0]?.range ??
          eventRecord.params?.range
        const primary =
          eventRecord.selections?.[0]?.primary ?? eventRecord.primary ?? eventRecord.params?.selections?.[0]?.primary
        const startRow = primary?.actualRow ?? primary?.startRow ?? selection?.startRow ?? selection?.row
        const startColumn = primary?.actualColumn ?? primary?.startColumn ?? selection?.startColumn ?? selection?.column
        if (typeof startRow !== 'number' || typeof startColumn !== 'number') return
        emitCursorByRowCol(startRow, startColumn)
      }
      const selectionDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.(selectionEventKey, emitCursorFromSelectionEvent)
      const selectionChangeDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.('SelectionChanged', emitCursorFromSelectionEvent)
      const currentSelectionChangeDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
      ).addEvent?.('CurrentSelectionChanged', emitCursorFromSelectionEvent)
      const cursorPollIntervalId = setInterval(emitCursorFromWorksheetSelection, 300)

      const dispose = () => {
        requestSnapshotCheckpointRef.current = null
        if (snapshotCheckpointTimerRef.current) {
          clearTimeout(snapshotCheckpointTimerRef.current)
          snapshotCheckpointTimerRef.current = null
        }
        try {
          valueChangeDisposable?.dispose()
        } catch {}
        try {
          selectionDisposable?.dispose()
        } catch {}
        try {
          selectionChangeDisposable?.dispose()
        } catch {}
        try {
          currentSelectionChangeDisposable?.dispose()
        } catch {}
        try {
          scrollEventDisposable?.dispose?.()
        } catch {}
        try {
          worksheetScrollDisposable?.dispose?.()
        } catch {}
        clearInterval(scrollPollIntervalId)
        clearInterval(cursorPollIntervalId)
        try {
          commandDisposable?.dispose?.()
        } catch {}
        sheetScrollRef.current = { scrollLeft: 0, scrollTop: 0 }
        univerAPI.dispose()
        univerAPIRef.current = null
        contextRef.current = null
      }

      return dispose
    }, [sheet.id, props.snapshotSeed])

    // Track "active sheet" based on pointer/focus so we can hijack shortcuts even when
    // Univer's canvas selection doesn't move DOM focus (common in published embeds).
    useEffect(() => {
      const onPointerDownCapture = (e: PointerEvent) => {
        const container = containerRef.current
        if (!container) return
        isSheetInteractionActiveRef.current = e.target instanceof Node && container.contains(e.target)
      }

      const onFocusInCapture = (e: FocusEvent) => {
        const container = containerRef.current
        if (!container) return
        isSheetInteractionActiveRef.current = e.target instanceof Node && container.contains(e.target)
      }

      window.addEventListener('pointerdown', onPointerDownCapture, true)
      window.addEventListener('focusin', onFocusInCapture, true)
      return () => {
        window.removeEventListener('pointerdown', onPointerDownCapture, true)
        window.removeEventListener('focusin', onFocusInCapture, true)
      }
    }, [])

    // Hijack Cmd/Ctrl+B at the window capture phase so host apps can't intercept it first.
    // We execute the Univer command directly, so we don't need the native event to reach the sheet DOM.
    useEffect(() => {
      const onKeyDownCapture = (e: KeyboardEvent) => {
        if (props.isReadOnly) return
        const api = univerAPIRef.current
        const container = containerRef.current
        if (!api || !container) return

        const activeEl = typeof document !== 'undefined' ? document.activeElement : null
        const inSheet =
          (activeEl instanceof Element && container.contains(activeEl)) || isSheetInteractionActiveRef.current
        if (!inSheet) return

        const isMod = e.metaKey || e.ctrlKey
        if (!isMod) return

        if (e.key.toLowerCase() !== 'b') return

        e.preventDefault()
        e.stopImmediatePropagation()
        e.stopPropagation()
        // Prefer Univer's built-in command (handles edit mode vs selection mode),
        // but fall back to explicitly toggling the active range's fontWeight so the
        // shortcut still works even if focus routing in the host app is unusual.
        try {
          const didExecute = api.syncExecuteCommand('sheet.command.set-range-bold')
          if (didExecute) return
        } catch {
          // continue to fallback
        }

        try {
          const wb = api.getActiveWorkbook?.()
          const range =
            (wb as { getActiveRange?: () => any } | null | undefined)?.getActiveRange?.() ??
            (wb as { getActiveSheet?: () => any } | null | undefined)?.getActiveSheet?.()?.getActiveRange?.()
          if (!range) return
          const style = (range as { getCellStyleData?: () => { bl?: number } | null })?.getCellStyleData?.()
          const isBold = style?.bl === 1
          ;(range as { setFontWeight?: (v: 'normal' | 'bold' | null) => unknown })?.setFontWeight?.(
            isBold ? 'normal' : 'bold'
          )
        } catch {
          // Ignore — shortcut is best-effort in published embeds
        }
      }

      window.addEventListener('keydown', onKeyDownCapture, true)
      return () => window.removeEventListener('keydown', onKeyDownCapture, true)
    }, [props.isReadOnly])

    // When embedded in a published platform, the host may use Cmd+B etc. for its own actions.
    // Hijack these shortcuts when the user is focused inside the spreadsheet so Univer handles them.
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!containerRef.current?.contains(e.target as Node)) return
      const isMod = e.metaKey || e.ctrlKey
      if (!isMod) return
      const key = e.key.toLowerCase()
      const spreadsheetShortcuts = ['b', 'i', 'u', 'c', 'v', 'x', 'z', 'y']
      if (spreadsheetShortcuts.includes(key)) {
        e.stopPropagation()
      }
    }, [])

    return (
      <div
        className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:overflow-hidden"
        style={{ height: props.height ?? '100%', width: props.width ?? '100%' }}
        onKeyDown={handleKeyDown}
      >
        <div ref={containerRef} className="gba:w-full gba:h-full" />
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:z-20">
          {remoteCursorOverlays.map(cursor =>
            (() => {
              const rect = cursorRects[cursor.id]
              const top = rect ? rect.top : CURSOR_OVERLAY_HEADER_HEIGHT_PX + cursor.row * CURSOR_OVERLAY_ROW_HEIGHT_PX
              const left = rect
                ? rect.left
                : CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX + cursor.col * CURSOR_OVERLAY_COL_WIDTH_PX
              const width = rect ? rect.width : CURSOR_OVERLAY_COL_WIDTH_PX
              const height = rect ? rect.height : CURSOR_OVERLAY_ROW_HEIGHT_PX
              return (
                <div
                  key={cursor.id}
                  className="gba:absolute gba:rounded-sm"
                  style={{
                    top,
                    left,
                    width,
                    height,
                    border: `2px solid ${cursor.userColor}`,
                    boxShadow: `0 0 8px ${cursor.userColor}33`
                  }}
                >
                  <div
                    className="gba:absolute gba:-top-6 gba:left-0 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-white gba:rounded-sm gba:whitespace-nowrap"
                    style={{ backgroundColor: cursor.userColor }}
                  >
                    {cursor.userName}
                  </div>
                </div>
              )
            })()
          )}
        </div>
      </div>
    )
  }
)

export default UniverSheetGrid
