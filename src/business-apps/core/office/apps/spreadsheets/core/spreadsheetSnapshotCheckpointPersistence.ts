import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types'
import type { UniverSheetGridHandle } from '../components/UniverSheetGrid.types'
import {
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot,
  normalizeWorkbookSnapshotToAppSheets,
  stripWorkbookSnapshotValuesPreservingFormatting
} from '../utils/univerAdapter'
import { writeUniverSnapshotCache } from '../utils/univerSnapshotCache'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import { saveSpreadsheetSnapshotWithRetry } from './spreadsheetSnapshotSaveWithRetry'
import {
  clearPendingSnapshotClearCoordinates,
  clearSnapshotCellsByCoordinate,
  cloneSnapshot,
  countLiveWorksheetSnapshotValues,
  getKnownCellValueCount,
  getPendingSnapshotClearCoordinates,
  getSnapshotSizeBytes,
  getWorksheetFromSnapshot
} from './spreadsheetSnapshotWorkbookUtils'
import { touchPendingSpreadsheetSnapshotCheckpointForSheet } from './spreadsheetSnapshotCheckpointEnqueue'

type ViewerRow = Record<string, unknown>

const mergeRowsWithIndexUpdates = (
  currentRows: ViewerRow[],
  updatesByRowIndex: Map<number, Record<string, unknown>>
): ViewerRow[] =>
  currentRows.map((row, index) => {
    const updates = updatesByRowIndex.get(index)
    return updates ? { ...row, ...updates } : row
  })

const buildSnapshotReconcilePlan = ({
  cellData,
  visibleColumns,
  currentRows,
  persistedBaseline,
  isUuid
}: {
  cellData: Record<string, Record<string, unknown>> | undefined
  visibleColumns: SpreadsheetColumn[]
  currentRows: ViewerRow[]
  persistedBaseline: ViewerRow[]
  isUuid: (value: string) => boolean
}): {
  hasCellData: boolean
  updatesByRowIndex: Map<number, Record<string, unknown>>
  reconcileCells: Array<{ rowId: string; columnName: string; value: unknown }>
} => {
  void visibleColumns
  void currentRows
  void persistedBaseline
  void isUuid
  return {
    hasCellData: Boolean(cellData && typeof cellData === 'object'),
    updatesByRowIndex: new Map<number, Record<string, unknown>>(),
    reconcileCells: []
  }
}

export type SpreadsheetSnapshotDebugInfo = {
  lastSuccessAt: number | null
  lastFailAt: number | null
  successCount: number
  failCount: number
}

export interface PersistSpreadsheetSnapshotCheckpointContext {
  appId: string
  sheets: SpreadsheetSheet[]
  entityEnabled: boolean
  socketPersistChainRef: MutableRefObject<Promise<unknown>>
  workbookSnapshotVersionRef: MutableRefObject<number>
  snapshotSaveMetricsRef: MutableRefObject<{
    attempts: number
    conflicts: number
    failures: number
    fallbackLoads: number
  }>
  spreadsheetGridRef: MutableRefObject<UniverSheetGridHandle | null>
  activeSheetIdRef: MutableRefObject<string>
  peerSheetDataCacheRef: MutableRefObject<Map<string, Record<string, unknown>[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  getPersistedBaselineRowsForSheet: (sheetId: string) => ViewerRow[] | null
  pendingLocalMutationCellsRef?: MutableRefObject<Set<string>>
  pendingSnapshotClearCellsRef: MutableRefObject<Map<string, Set<string>>>
  pendingSnapshotCheckpointBySheetRef: MutableRefObject<Map<string, { requestedAt: number }>>
  pendingCellPersistTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  unloadKeepAlivePersistRef: MutableRefObject<boolean>
  lastSuccessfulSnapshotCheckpointAtRef: MutableRefObject<number>
  activeTraceSessionRef: MutableRefObject<{ id?: string } | null>

  getActiveSessionRows: () => ViewerRow[]
  hasPendingCellPersistence: () => boolean
  isSheetPersistenceBusy?: (sheetId: string) => boolean
  isUuid: (value: string) => boolean

  commitLocalSheetData: (rows: ViewerRow[], options: { syncGrid: boolean; publishParent?: boolean }) => void

  setSnapshotDebugInfo: Dispatch<SetStateAction<SpreadsheetSnapshotDebugInfo>>
  debugLog: (message: string, meta?: Record<string, unknown>) => void
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void

  sheetPersist: {
    recordError: (message: string) => void
    recordSuccess: (quiet: boolean) => void
  }
  sheetT: (key: string) => string
  versioning: { markAsSaved: () => void }
}

/**
 * Debounced autosave snapshot checkpoint (Univer workbook PUT). Phase 5 extraction from SpreadsheetAppViewer.
 */
export async function persistSpreadsheetSnapshotCheckpointForSheet(
  targetSheetId: string,
  ctx: PersistSpreadsheetSnapshotCheckpointContext
): Promise<void> {
  const deferCheckpoint = (reason: string, meta: Record<string, unknown> = {}): void => {
    touchPendingSpreadsheetSnapshotCheckpointForSheet(
      ctx.pendingSnapshotCheckpointBySheetRef.current,
      targetSheetId,
      Date.now() + 250
    )
    ctx.debugLog('snapshot checkpoint deferred: sheet not safe', {
      appId: ctx.appId,
      sheetId: targetSheetId,
      reason,
      ...meta
    })
    ctx.enqueueDiagnosticsTraceEvent({
      source: 'client',
      stage: 'client_snapshot_checkpoint_deferred',
      severity: 'info',
      traceSessionId: ctx.activeTraceSessionRef.current?.id ?? null,
      payload: {
        targetSheetId,
        reason,
        ...meta
      }
    })
  }

  if (ctx.entityEnabled) return

  try {
    await ctx.socketPersistChainRef.current
  } catch {
    // Ignore errors - we just need to wait for completion
  }

  try {
    const meta = await SpreadsheetApiService.getUniverSnapshot(ctx.appId)
    const srv = Number(meta.version ?? 0)
    if (Number.isFinite(srv) && srv >= 0) {
      ctx.workbookSnapshotVersionRef.current = Math.max(ctx.workbookSnapshotVersionRef.current, srv)
    }
  } catch {
    // Best-effort; save still recovers from 409.
  }

  ctx.snapshotSaveMetricsRef.current.attempts += 1

  const rawSnapshot = ctx.spreadsheetGridRef.current?.getWorkbookSnapshot?.()
  if (!rawSnapshot) {
    ctx.snapshotSaveMetricsRef.current.failures += 1
    ctx.setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
    ctx.debugLog('snapshot checkpoint skipped: snapshot unavailable', {
      appId: ctx.appId,
      sheetId: targetSheetId
    })
    return
  }

  const snapshot = cloneSnapshot(rawSnapshot)
  const snapshotSizeBytes = getSnapshotSizeBytes(snapshot)
  if (snapshotSizeBytes == null) {
    ctx.snapshotSaveMetricsRef.current.failures += 1
    ctx.setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
    ctx.debugLog('snapshot checkpoint skipped: serialization failed', {
      appId: ctx.appId,
      sheetId: targetSheetId
    })
    return
  }

  if (snapshotSizeBytes > 8_500_000) {
    ctx.snapshotSaveMetricsRef.current.failures += 1
    ctx.setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
    ctx.debugLog('snapshot checkpoint skipped: payload too large', {
      appId: ctx.appId,
      sheetId: targetSheetId,
      sizeBytes: snapshotSizeBytes
    })
    ctx.sheetPersist.recordError(ctx.sheetT('persist-snapshot-too-large'))
    return
  }

  const targetSheetVersionRef = {
    current: ctx.workbookSnapshotVersionRef.current
  }
  const isTargetActiveSheet = targetSheetId === ctx.activeSheetIdRef.current
  const targetSheetMeta = ctx.sheets.find(sheet => sheet.id === targetSheetId)
  if (!targetSheetMeta) {
    ctx.snapshotSaveMetricsRef.current.failures += 1
    ctx.setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
    ctx.debugLog('snapshot checkpoint skipped: target sheet missing', {
      appId: ctx.appId,
      sheetId: targetSheetId
    })
    return
  }

  const fallbackTargetRows = sortSpreadsheetRowsBySheetSettings(targetSheetMeta.data ?? [], targetSheetMeta)
  const currentRows = isTargetActiveSheet
    ? ctx.getActiveSessionRows()
    : (ctx.peerSheetDataCacheRef.current.get(targetSheetId) ?? fallbackTargetRows)
  const persistedBaselineRows = isTargetActiveSheet
    ? (ctx.getPersistedBaselineRowsForSheet(targetSheetId) ?? fallbackTargetRows)
    : fallbackTargetRows
  const pendingProtectedCellCount = ctx.pendingLocalMutationCellsRef?.current.size ?? 0
  const hasPendingCellPersistence = ctx.hasPendingCellPersistence()
  const sheetPersistenceBusy = ctx.isSheetPersistenceBusy?.(targetSheetId) ?? false
  if (isTargetActiveSheet && pendingProtectedCellCount > 0) {
    deferCheckpoint('pending_local_mutation_protection', {
      pendingProtectedCellCount
    })
    return
  }
  if (hasPendingCellPersistence) {
    deferCheckpoint('pending_cell_persistence')
    return
  }
  if (sheetPersistenceBusy) {
    deferCheckpoint('sheet_persistence_busy')
    return
  }

  const recoverSnapshotConflict = async (): Promise<boolean> => {
    try {
      const workbookSnapshot = await SpreadsheetApiService.getUniverSnapshot(ctx.appId)
      targetSheetVersionRef.current = Number(workbookSnapshot.version ?? targetSheetVersionRef.current)
      ctx.workbookSnapshotVersionRef.current = targetSheetVersionRef.current
      return true
    } catch {
      return false
    }
  }

  try {
    let sizeBytesForSave: number | null = snapshotSizeBytes
    let cacheResult: { stored: boolean; reason: string | null } = { stored: false, reason: null }

    const worksheet = getWorksheetFromSnapshot(snapshot, targetSheetId)
    const wsRowCount =
      typeof (worksheet as { rowCount?: number })?.rowCount === 'number'
        ? (worksheet as { rowCount: number }).rowCount
        : 1000
    const wsColCount =
      typeof (worksheet as { columnCount?: number })?.columnCount === 'number'
        ? (worksheet as { columnCount: number }).columnCount
        : 32

    const visibleColumns = targetSheetMeta.columns.filter(c => c.isVisible !== false)
    const cellDataFromSnapshot = (worksheet as Record<string, unknown> | undefined)?.cellData as
      | Record<string, Record<string, unknown>>
      | undefined
    const cellDataFromGrid = isTargetActiveSheet
      ? ctx.spreadsheetGridRef.current?.getVisibleRangeValues?.(
          Math.min(currentRows.length, wsRowCount),
          Math.min(visibleColumns.length, wsColCount)
        )
      : null
    const cellData = cellDataFromGrid && typeof cellDataFromGrid === 'object' ? cellDataFromGrid : cellDataFromSnapshot
    const { hasCellData, updatesByRowIndex } = buildSnapshotReconcilePlan({
      cellData,
      visibleColumns,
      currentRows,
      persistedBaseline: persistedBaselineRows,
      isUuid: ctx.isUuid
    })
    if (!hasCellData) {
      ctx.debugLog('snapshot checkpoint: missing worksheet cellData, saving snapshot-only fallback', {})
    }

    if (isTargetActiveSheet && updatesByRowIndex.size > 0) {
      const nextLocal = mergeRowsWithIndexUpdates(currentRows, updatesByRowIndex)
      ctx.commitLocalSheetData(nextLocal, { syncGrid: false, publishParent: false })
    }

    const rowsForAuthoritativeSnapshot =
      updatesByRowIndex.size > 0 ? mergeRowsWithIndexUpdates(currentRows, updatesByRowIndex) : currentRows
    const rowsForAuthoritativeSnapshotValueCount = rowsForAuthoritativeSnapshot.reduce(
      (total, row) => total + getKnownCellValueCount(row),
      0
    )
    const liveSnapshotValueCount = countLiveWorksheetSnapshotValues(snapshot as Record<string, unknown>, targetSheetId)
    const pendingSnapshotClearCells = getPendingSnapshotClearCoordinates(
      ctx.pendingSnapshotClearCellsRef.current,
      targetSheetId
    )
    ctx.enqueueDiagnosticsTraceEvent({
      source: 'client',
      stage: 'client_snapshot_checkpoint_started',
      traceSessionId: ctx.activeTraceSessionRef.current?.id ?? null,
      payload: {
        targetSheetId,
        isTargetActiveSheet,
        pendingSnapshotClearCellCount: pendingSnapshotClearCells.length,
        rowCount: rowsForAuthoritativeSnapshot.length
      }
    })
    if (rowsForAuthoritativeSnapshotValueCount < liveSnapshotValueCount) {
      ctx.debugLog('snapshot checkpoint: replacing richer live workbook values with authoritative rows', {
        appId: ctx.appId,
        sheetId: targetSheetId,
        rowsForAuthoritativeSnapshotValueCount,
        liveSnapshotValueCount
      })
    }
    const snapshotToPersistBase = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(
      snapshot as Record<string, unknown>,
      targetSheetId,
      rowsForAuthoritativeSnapshot,
      targetSheetMeta.columns
    )
    const snapshotToPersist = normalizeWorkbookSnapshotToAppSheets(
      clearSnapshotCellsByCoordinate(snapshotToPersistBase, targetSheetId, pendingSnapshotClearCells),
      ctx.sheets
    )
    const visualSnapshotToPersist = stripWorkbookSnapshotValuesPreservingFormatting(snapshotToPersist)
    sizeBytesForSave = getSnapshotSizeBytes(visualSnapshotToPersist)
    if (sizeBytesForSave == null || sizeBytesForSave > 8_500_000) {
      ctx.snapshotSaveMetricsRef.current.failures += 1
      ctx.setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
      ctx.debugLog('snapshot checkpoint skipped: merged snapshot invalid or too large', {
        appId: ctx.appId,
        sheetId: targetSheetId,
        sizeBytes: sizeBytesForSave
      })
      if (sizeBytesForSave != null && sizeBytesForSave > 8_500_000) {
        ctx.sheetPersist.recordError(ctx.sheetT('persist-snapshot-too-large'))
      }
      return
    }

    const bestEffortCache = writeUniverSnapshotCache(
      ctx.appId,
      Number(targetSheetVersionRef.current || 0),
      visualSnapshotToPersist
    )

    const saved = await saveSpreadsheetSnapshotWithRetry({
      appId: ctx.appId,
      activeSheetId: targetSheetId,
      baseSnapshot: visualSnapshotToPersist,
      prepareSnapshotForSave: currentSnapshot =>
        normalizeWorkbookSnapshotToAppSheets(
          clearSnapshotCellsByCoordinate(
            mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(
              currentSnapshot as Record<string, unknown>,
              targetSheetId,
              rowsForAuthoritativeSnapshot,
              targetSheetMeta.columns
            ),
            targetSheetId,
            getPendingSnapshotClearCoordinates(ctx.pendingSnapshotClearCellsRef.current, targetSheetId)
          ),
          ctx.sheets
        ),
      workbookSnapshotVersionRef: targetSheetVersionRef,
      snapshotSaveMetricsRef: ctx.snapshotSaveMetricsRef,
      recoverFromVersionConflict: recoverSnapshotConflict,
      spreadsheetGridRef: ctx.spreadsheetGridRef,
      maxSnapshotRetries: 3,
      useKeepaliveHttp: ctx.unloadKeepAlivePersistRef.current
    })
    cacheResult = saved.cacheResult.stored
      ? saved.cacheResult
      : { stored: bestEffortCache.stored, reason: bestEffortCache.reason ?? null }
    ctx.enqueueDiagnosticsTraceEvent({
      source: 'client',
      stage: 'client_snapshot_checkpoint_succeeded',
      traceSessionId: ctx.activeTraceSessionRef.current?.id ?? null,
      version: targetSheetVersionRef.current,
      payload: {
        targetSheetId,
        isTargetActiveSheet,
        pendingSnapshotClearCellCount: pendingSnapshotClearCells.length,
        sizeBytes: sizeBytesForSave,
        cacheStored: cacheResult.stored,
        cacheReason: cacheResult.reason
      }
    })
    ctx.debugLog('snapshot checkpoint saved', {
      appId: ctx.appId,
      sheetId: targetSheetId,
      version: targetSheetVersionRef.current,
      sizeBytes: sizeBytesForSave,
      cacheStored: cacheResult.stored,
      cacheReason: cacheResult.reason,
      metrics: ctx.snapshotSaveMetricsRef.current
    })
    ctx.workbookSnapshotVersionRef.current = Math.max(
      ctx.workbookSnapshotVersionRef.current,
      targetSheetVersionRef.current
    )
    if (!isTargetActiveSheet) {
      ctx.peerSheetDataCacheRef.current.set(targetSheetId, [...rowsForAuthoritativeSnapshot])
      ctx.authoritativePeerSheetDataCacheRef.current.add(targetSheetId)
    }

    ctx.lastSuccessfulSnapshotCheckpointAtRef.current = Date.now()
    ctx.setSnapshotDebugInfo(prev => ({
      ...prev,
      lastSuccessAt: Date.now(),
      successCount: prev.successCount + 1
    }))
    clearPendingSnapshotClearCoordinates(ctx.pendingSnapshotClearCellsRef.current, targetSheetId)
    const persistenceQuiet =
      !ctx.hasPendingCellPersistence() &&
      ctx.pendingCellPersistTimeoutRef.current == null &&
      ctx.pendingSnapshotCheckpointBySheetRef.current.size === 0
    ctx.sheetPersist.recordSuccess(persistenceQuiet)
    if (persistenceQuiet) {
      ctx.versioning.markAsSaved()
    }
  } catch (error) {
    console.error('[Spreadsheet] Snapshot checkpoint failed:', error)
    ctx.enqueueDiagnosticsTraceEvent({
      source: 'client',
      stage: 'client_snapshot_checkpoint_failed',
      severity: 'error',
      traceSessionId: ctx.activeTraceSessionRef.current?.id ?? null,
      payload: {
        targetSheetId,
        message: error instanceof Error ? error.message : 'unknown'
      }
    })
    ctx.setSnapshotDebugInfo(prev => ({
      ...prev,
      lastFailAt: Date.now(),
      failCount: prev.failCount + 1
    }))
    ctx.sheetPersist.recordError(ctx.sheetT('persist-snapshot-failed'))
    throw error
  }
}
