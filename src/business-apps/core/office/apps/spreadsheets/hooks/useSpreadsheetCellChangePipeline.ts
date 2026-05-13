import { useCallback, type MutableRefObject } from 'react'

import { normalizeCellValueForBatchPersistence, type SnapshotCellCoordinate } from '../core'
import type { SpreadsheetTraceEventInput, SpreadsheetTraceSession } from '../services/spreadsheetDiagnostics'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types'
import { coalesceQueuedCellChanges } from '../utils/spreadsheetPendingCells'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import { applySheetCellChanges } from '../utils/applySheetCellChanges'

type ViewerRow = Record<string, unknown>

export interface SpreadsheetCellChangeInput {
  rowId: string
  columnName: string
  value: unknown
  univerRow?: number
  univerCol?: number
  sheetId?: string
  traceId?: string
}

export interface UseSpreadsheetCellChangePipelineParams {
  canEditWithLock: boolean
  entityEnabled: boolean
  activeSheetId: string
  activeSheetColumns: SpreadsheetColumn[]
  sheets: SpreadsheetSheet[]
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  pendingCellChangesRef: MutableRefObject<SpreadsheetCellChangeInput[]>
  activeTraceSessionRef: MutableRefObject<SpreadsheetTraceSession | null>
  peerSheetDataCacheRef: MutableRefObject<Map<string, ViewerRow[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  collaborationConnected: boolean
  collaborationParticipantCount: number
  defaultPersistDebounceMs: number
  collaborationPersistDebounceMs: number
  collectSnapshotClearCoordinates: (cells: SpreadsheetCellChangeInput[]) => SnapshotCellCoordinate[]
  collectSnapshotValueWriteCoordinates: (cells: SpreadsheetCellChangeInput[]) => SnapshotCellCoordinate[]
  trackSnapshotCellClears: (sheetId: string, coords: SnapshotCellCoordinate[]) => void
  forgetSnapshotCellClears: (sheetId: string, coords: SnapshotCellCoordinate[]) => number
  getKnownRowsForSheet: (sheetId: string) => ViewerRow[]
  getActiveSessionRows: () => ViewerRow[]
  syncSheetRowsIntoLocalState: (sheetId: string, rows: ViewerRow[], options: { syncGrid: boolean }) => void
  schedulePendingCellPersist: (delayMs?: number) => void
  persistPendingCellJournal: () => void
  commitLocalSheetData: (rows: ViewerRow[], options?: { syncGrid?: boolean }) => void
  markSheetDirty: () => void
  markVersionAsChanged: () => void
  debugLog: (message: string, meta?: Record<string, unknown>) => void
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
}

export interface UseSpreadsheetCellChangePipelineResult {
  handleCellsChange: (cells: SpreadsheetCellChangeInput[]) => void
  handleCellChange: (rowId: string, columnName: string, value: unknown, sheetId?: string) => void
}

export function useSpreadsheetCellChangePipeline(
  params: UseSpreadsheetCellChangePipelineParams
): UseSpreadsheetCellChangePipelineResult {
  const {
    canEditWithLock,
    entityEnabled,
    activeSheetId,
    activeSheetColumns,
    sheets,
    createdSheetIdAliasesRef,
    pendingCellChangesRef,
    activeTraceSessionRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    collaborationConnected,
    collaborationParticipantCount,
    defaultPersistDebounceMs,
    collaborationPersistDebounceMs,
    collectSnapshotClearCoordinates,
    collectSnapshotValueWriteCoordinates,
    trackSnapshotCellClears,
    forgetSnapshotCellClears,
    getKnownRowsForSheet,
    getActiveSessionRows,
    syncSheetRowsIntoLocalState,
    schedulePendingCellPersist,
    persistPendingCellJournal,
    commitLocalSheetData,
    markSheetDirty,
    markVersionAsChanged,
    debugLog,
    enqueueDiagnosticsTraceEvent
  } = params

  const getPersistDelayMs = useCallback(
    () =>
      collaborationConnected && collaborationParticipantCount > 1
        ? collaborationPersistDebounceMs
        : defaultPersistDebounceMs,
    [collaborationConnected, collaborationParticipantCount, collaborationPersistDebounceMs, defaultPersistDebounceMs]
  )

  const handleCellsChange = useCallback(
    (cells: SpreadsheetCellChangeInput[]) => {
      if (!canEditWithLock) return
      if (entityEnabled) return
      if (cells.length === 0) return
      const canonicalActiveSheetId = resolveReconciledSheetId(activeSheetId, createdSheetIdAliasesRef.current)
      const targetSheetId = resolveReconciledSheetId(
        cells[0]?.sheetId || activeSheetId,
        createdSheetIdAliasesRef.current
      )

      const snapshotClearCells = collectSnapshotClearCoordinates(cells)
      if (snapshotClearCells.length > 0) {
        trackSnapshotCellClears(targetSheetId, snapshotClearCells)
      }
      const snapshotValueWriteCells = collectSnapshotValueWriteCoordinates(cells)
      const resolvedSnapshotClearCount = forgetSnapshotCellClears(targetSheetId, snapshotValueWriteCells)

      markSheetDirty()
      markVersionAsChanged()
      pendingCellChangesRef.current = coalesceQueuedCellChanges([
        ...pendingCellChangesRef.current,
        ...cells.map(cell => ({
          ...cell,
          value: normalizeCellValueForBatchPersistence(cell.value),
          sheetId: resolveReconciledSheetId(cell.sheetId || targetSheetId, createdSheetIdAliasesRef.current)
        }))
      ])
      persistPendingCellJournal()
      debugLog('cells queued for http batch', {
        addedCells: cells.length,
        queuedCells: pendingCellChangesRef.current.length
      })
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: 'http_cells_queued',
        traceId:
          Array.from(new Set(cells.map(cell => cell.traceId).filter(Boolean))).length === 1
            ? (cells.find(cell => cell.traceId)?.traceId ?? null)
            : null,
        traceSessionId: activeTraceSessionRef.current?.id ?? null,
        payload: {
          targetSheetId,
          snapshotClearCellCount: snapshotClearCells.length,
          resolvedSnapshotClearCount,
          cells
        }
      })

      const nextCellUpdates = cells.map(cell => ({
        rowId: String(cell.rowId),
        columnName: cell.columnName,
        value: normalizeCellValueForBatchPersistence(cell.value)
      }))

      if (targetSheetId !== canonicalActiveSheetId) {
        const peerUpdate = applySheetCellChanges(
          getKnownRowsForSheet(targetSheetId),
          nextCellUpdates,
          sheets.find(sheet => sheet.id === targetSheetId)?.columns
        )
        if (peerUpdate.mutatedAnyRow) {
          peerSheetDataCacheRef.current.set(targetSheetId, peerUpdate.nextRows)
          authoritativePeerSheetDataCacheRef.current.add(targetSheetId)
          syncSheetRowsIntoLocalState(targetSheetId, peerUpdate.nextRows, { syncGrid: false })
        }
        schedulePendingCellPersist(getPersistDelayMs())
        return
      }

      const { nextRows, mutatedAnyRow } = applySheetCellChanges(
        getActiveSessionRows(),
        nextCellUpdates,
        activeSheetColumns
      )
      if (mutatedAnyRow) {
        commitLocalSheetData(nextRows, { syncGrid: false })
      }
      schedulePendingCellPersist(getPersistDelayMs())
    },
    [
      canEditWithLock,
      entityEnabled,
      activeSheetId,
      createdSheetIdAliasesRef,
      collectSnapshotClearCoordinates,
      trackSnapshotCellClears,
      collectSnapshotValueWriteCoordinates,
      forgetSnapshotCellClears,
      markSheetDirty,
      markVersionAsChanged,
      persistPendingCellJournal,
      debugLog,
      enqueueDiagnosticsTraceEvent,
      activeTraceSessionRef,
      getKnownRowsForSheet,
      sheets,
      peerSheetDataCacheRef,
      authoritativePeerSheetDataCacheRef,
      syncSheetRowsIntoLocalState,
      schedulePendingCellPersist,
      getPersistDelayMs,
      getActiveSessionRows,
      activeSheetColumns,
      commitLocalSheetData,
      pendingCellChangesRef
    ]
  )

  const handleCellChange = useCallback(
    (rowId: string, columnName: string, value: unknown, sheetId?: string) => {
      handleCellsChange([{ rowId, columnName, value, sheetId }])
    },
    [handleCellsChange]
  )

  return { handleCellsChange, handleCellChange }
}
