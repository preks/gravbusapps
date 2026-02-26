/**
 * UniverSheetGrid Component
 *
 * Wrapper that integrates Univer with our spreadsheet system.
 * Replaces FortuneSheetGrid; same props and ref contract for TableView and collaboration.
 */

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { CommandType } from '@univerjs/core'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import '@univerjs/preset-sheets-core/lib/index.css'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types/spreadsheet'
import type { DocumentParticipant, DocumentOperation } from '../../shared/services/CollaborationClient'
import {
  buildWorkbookSnapshot,
  createUniverConversionContext,
  type UniverWorkbookSnapshot
} from '../utils/univerAdapter'

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

export interface UniverSheetGridHandle {
  applyRemoteCellUpdate: (rowIndex: number, colIndex: number, value: unknown) => void
  getWorkbookSnapshot: () => Record<string, unknown> | null
  getVisibleRangeValues: (rowCount: number, colCount: number) => Record<number, Record<number, unknown>> | null
}

export const UniverSheetGrid = forwardRef<UniverSheetGridHandle, UniverSheetGridProps>(
  function UniverSheetGrid(props, ref) {
    const { sheet, data, columns, initialSnapshot, onCellChange, onCellsChange, onSnapshotRequested, onDataChange } =
      props

    const containerRef = useRef<HTMLDivElement>(null)
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
    const callbacksRef = useRef({ onCellChange, onCellsChange, onSnapshotRequested, onDataChange })
    callbacksRef.current = { onCellChange, onCellsChange, onSnapshotRequested, onDataChange }

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
        getVisibleRangeValues
      }),
      [applyRemoteCellUpdate, getWorkbookSnapshot, getVisibleRangeValues]
    )

    // Keep conversion context in sync when data/columns change (e.g. after save) so value-change handler maps indices correctly.
    useEffect(() => {
      if (!univerAPIRef.current) return
      contextRef.current = createUniverConversionContext(columns, data)
    }, [data, columns])

    // Fallback interval: separate from Univer lifecycle so it keeps running even if the Univer effect re-runs.
    useEffect(() => {
      const FALLBACK_INTERVAL_MS = 5000
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

      univerAPIRef.current = univerAPI
      univerAPI.createWorkbook(snapshotForInit as unknown as Record<string, unknown>)

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
      const scheduleSnapshotCheckpoint = (delayMs = 450) => {
        if (snapshotCheckpointTimerRef.current) {
          clearTimeout(snapshotCheckpointTimerRef.current)
        }
        snapshotCheckpointTimerRef.current = setTimeout(() => {
          snapshotCheckpointTimerRef.current = null
          requestSnapshotCheckpoint(true)
        }, delayMs)
      }
      requestSnapshotCheckpointRef.current = requestSnapshotCheckpoint

      const commandEventKey =
        (univerAPI as { Event?: { CommandExecuted?: string } }).Event?.CommandExecuted ?? 'CommandExecuted'
      const commandDisposable = (
        univerAPI as { addEvent?(event: string, cb: (p: { type?: number }) => void): { dispose(): void } }
      ).addEvent?.(commandEventKey, (event: { type?: number }) => {
        const t = event?.type
        // MUTATION=2, COMMAND=0. Skip OPERATION=1 (scroll, selection).
        if (t === CommandType.MUTATION || t === CommandType.COMMAND) {
          isDirtyRef.current = true
          hasEditedRef.current = true
          scheduleSnapshotCheckpoint()
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
            requestSnapshotCheckpoint(true)
            // Large edits (paste) can be split into multiple chunks; request a checkpoint snapshot.
            if (changedCells.length > 100) {
              requestSnapshotCheckpoint(true)
            }
            return
          }

          if (changedCells.length > 0 && onCellChangeCb) {
            for (const cell of changedCells) {
              onCellChangeCb(cell.rowId, cell.columnName, cell.value)
            }
            requestSnapshotCheckpoint(true)
          }
        }
      )

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
          commandDisposable?.dispose?.()
        } catch {}
        univerAPI.dispose()
        univerAPIRef.current = null
        contextRef.current = null
      }

      return dispose
    }, [sheet.id, props.snapshotSeed])

    return (
      <div
        className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:overflow-hidden"
        style={{ height: props.height ?? '100%', width: props.width ?? '100%' }}
      >
        <div ref={containerRef} className="gba:w-full gba:h-full" />
      </div>
    )
  }
)

export default UniverSheetGrid
