import { useEffect, useRef, type MutableRefObject } from 'react'
import {
  readSpreadsheetRowCellValue,
  type SpreadsheetBulkRemoteApplyMeta,
  type SpreadsheetBulkRemoteCellItem
} from '../core'
import type { ApplyRemoteCellUpdateOptions } from './UniverSheetGrid.types'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types/spreadsheet'
import { workbookSnapshotMismatchesViewerRows } from '../utils/univerAdapter'
import type { AuthoritativeGridRegion } from '../utils/spreadsheetAuthoritativeRegion'
import { SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH } from '../utils/spreadsheetBulkRemoteConstants'
import { getCanonicalRowId } from '../utils/spreadsheetRowIdentity'
import { debugRemoteApply } from './univerGridDebug'
import {
  buildAuthoritativeCellSignatureMap,
  buildAuthoritativeRowsByGridIndex,
  getAuthoritativeGridRowExtent,
  remoteEchoKey,
  toEchoSignature
} from './univerGridAuthoritativeHelpers'

export interface UniverAuthoritativeGridSyncParams {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
  authoritativeDataSyncToken?: number
  authoritativeReapplySeed: number
  collabBulkApplyIdleNonce: number
  univerAPIRef: MutableRefObject<unknown>
  lastSyncedGridCellSignaturesRef: MutableRefObject<Map<string, string>>
  lastSyncedGridRowCountRef: MutableRefObject<number>
  lastSyncedGridColumnCountRef: MutableRefObject<number>
  lastProcessedAuthoritativeDataSyncTokenRef: MutableRefObject<number>
  lastProcessedAuthoritativeReapplySeedRef: MutableRefObject<number>
  collabPersistedBulkApplyDepthRef: MutableRefObject<number>
  skipNextAuthoritativeSyncAfterSnapshotInitRef: MutableRefObject<boolean>
  getWorkbookSnapshotRef: MutableRefObject<(() => Record<string, unknown> | null) | null>
  pendingAuthoritativeRegionRef: MutableRefObject<AuthoritativeGridRegion | null>
  pendingForcedAuthoritativeReapplyRef: MutableRefObject<{
    region: AuthoritativeGridRegion | null
    preferBulk: boolean
    clearAllSignatures: boolean
  } | null>
  recentLocallyMutatedGridCellsRef: MutableRefObject<Map<string, number>>
  applyRemoteCellUpdate: (
    rowIndex: number,
    colIndex: number,
    value: unknown,
    rowId?: string,
    options?: ApplyRemoteCellUpdateOptions
  ) => void
  applyRemoteCellUpdatesBulk: (items: SpreadsheetBulkRemoteCellItem[], meta?: SpreadsheetBulkRemoteApplyMeta) => void
}

/**
 * Authoritative viewer-row signature cache rebuild (non-token data changes) and
 * workbook re-sync when `authoritativeDataSyncToken` / forced reapply seed changes.
 *
 * Rebuild the authoritative signature cache when rendered `data`/`columns` change
 * WITHOUT the parent bumping `authoritativeDataSyncToken`. Token bumps mean the
 * change is authoritative (`handleCellsChange`, backend round-trips, reloads, bulk
 * ops) — then `handleDetectedCellMutation` seeds the map and the re-apply pass diffs
 * against that baseline. Non-authoritative prop updates (tab switch, entity refresh)
 * do not bump the token; without rebuilding, the re-apply would diff the new sheet
 * against stale signatures (whole-grid blink after tab switch). Tracking the last
 * seen token distinguishes token bumps (leave cache) from other `data`/`columns`
 * churn (rebuild), including two-phase sheet switches where `sheet.id` moves before
 * `data` catches up.
 */
export function useUniverAuthoritativeGridSync(params: UniverAuthoritativeGridSyncParams): void {
  const {
    sheet,
    data,
    columns,
    authoritativeDataSyncToken,
    authoritativeReapplySeed,
    collabBulkApplyIdleNonce,
    univerAPIRef,
    lastSyncedGridCellSignaturesRef,
    lastSyncedGridRowCountRef,
    lastSyncedGridColumnCountRef,
    lastProcessedAuthoritativeDataSyncTokenRef,
    lastProcessedAuthoritativeReapplySeedRef,
    collabPersistedBulkApplyDepthRef,
    skipNextAuthoritativeSyncAfterSnapshotInitRef,
    getWorkbookSnapshotRef,
    pendingAuthoritativeRegionRef,
    pendingForcedAuthoritativeReapplyRef,
    recentLocallyMutatedGridCellsRef,
    applyRemoteCellUpdate,
    applyRemoteCellUpdatesBulk
  } = params

  const lastObservedAuthoritativeTokenForRebuildRef = useRef<number>(authoritativeDataSyncToken ?? 0)

  useEffect(() => {
    if (!univerAPIRef.current) return
    const currentToken = authoritativeDataSyncToken ?? 0
    const tokenChanged = currentToken !== lastObservedAuthoritativeTokenForRebuildRef.current
    lastObservedAuthoritativeTokenForRebuildRef.current = currentToken
    if (tokenChanged) return
    lastSyncedGridCellSignaturesRef.current = buildAuthoritativeCellSignatureMap(data, columns)
    lastSyncedGridRowCountRef.current = data.length
    lastSyncedGridColumnCountRef.current = columns.filter(column => column.isVisible !== false).length
  }, [data, columns, authoritativeDataSyncToken])

  useEffect(() => {
    const api = univerAPIRef.current
    if (!api) return
    const nextToken = authoritativeDataSyncToken ?? 0
    const shouldSyncWorkbook =
      nextToken !== lastProcessedAuthoritativeDataSyncTokenRef.current ||
      authoritativeReapplySeed !== lastProcessedAuthoritativeReapplySeedRef.current
    if (!shouldSyncWorkbook) return
    if (collabPersistedBulkApplyDepthRef.current > 0) {
      return
    }
    const visibleColumns = columns.filter(column => column.isVisible !== false)
    const isForcedAuthoritativeReapply = authoritativeReapplySeed !== lastProcessedAuthoritativeReapplySeedRef.current
    if (skipNextAuthoritativeSyncAfterSnapshotInitRef.current && !isForcedAuthoritativeReapply) {
      const snapshotAfterInit = getWorkbookSnapshotRef.current?.() ?? null
      const snapshotAlreadyMatchesRows =
        snapshotAfterInit &&
        typeof snapshotAfterInit === 'object' &&
        !workbookSnapshotMismatchesViewerRows(snapshotAfterInit as Record<string, unknown>, sheet.id, data, columns)
      if (!snapshotAlreadyMatchesRows) {
        skipNextAuthoritativeSyncAfterSnapshotInitRef.current = false
      } else {
        skipNextAuthoritativeSyncAfterSnapshotInitRef.current = false
        lastSyncedGridCellSignaturesRef.current = buildAuthoritativeCellSignatureMap(data, columns)
        lastSyncedGridRowCountRef.current = getAuthoritativeGridRowExtent(data)
        lastSyncedGridColumnCountRef.current = visibleColumns.length
        lastProcessedAuthoritativeDataSyncTokenRef.current = nextToken
        lastProcessedAuthoritativeReapplySeedRef.current = authoritativeReapplySeed
        debugRemoteApply('skip_authoritative_reapply_after_snapshot_init', {
          rowCount: data.length,
          columnCount: visibleColumns.length,
          token: nextToken
        })
        return
      }
    }
    const signatures = lastSyncedGridCellSignaturesRef.current
    const previousRowCount = lastSyncedGridRowCountRef.current
    const previousColumnCount = lastSyncedGridColumnCountRef.current
    const rowsByGridIndex = buildAuthoritativeRowsByGridIndex(data)
    const nextRowCount = getAuthoritativeGridRowExtent(data)
    const maxRowCount = Math.max(previousRowCount, nextRowCount)
    const maxColumnCount = Math.max(previousColumnCount, visibleColumns.length)
    const nowForLocalMutationCheck = Date.now()
    const forcedSpec = isForcedAuthoritativeReapply ? pendingForcedAuthoritativeReapplyRef.current : null
    if (isForcedAuthoritativeReapply) {
      pendingForcedAuthoritativeReapplyRef.current = null
    }
    const prepareRegionOnly = !isForcedAuthoritativeReapply ? pendingAuthoritativeRegionRef.current : null
    pendingAuthoritativeRegionRef.current = null

    let rowLoopStart = 0
    let rowLoopEnd = maxRowCount
    let colLoopStart = 0
    let colLoopEnd = maxColumnCount
    if (isForcedAuthoritativeReapply && forcedSpec?.region) {
      const pr = forcedSpec.region
      rowLoopStart = Math.max(0, pr.minRow)
      rowLoopEnd = Math.min(maxRowCount, pr.maxRow + 1)
      colLoopStart = Math.max(0, pr.minCol)
      colLoopEnd = Math.min(maxColumnCount, pr.maxCol + 1)
    } else if (prepareRegionOnly) {
      rowLoopStart = Math.max(0, prepareRegionOnly.minRow)
      rowLoopEnd = Math.min(maxRowCount, prepareRegionOnly.maxRow + 1)
      colLoopStart = Math.max(0, prepareRegionOnly.minCol)
      colLoopEnd = Math.min(maxColumnCount, prepareRegionOnly.maxCol + 1)
    }

    const authoritativeBulkBuffer: SpreadsheetBulkRemoteCellItem[] = []
    const allowAuthoritativeBulkFlush = !isForcedAuthoritativeReapply || !forcedSpec || forcedSpec.preferBulk !== false

    for (let rowIndex = rowLoopStart; rowIndex < rowLoopEnd; rowIndex++) {
      const row = rowsByGridIndex.get(rowIndex)
      const rowInBounds = rowsByGridIndex.has(rowIndex)
      for (let colIndex = colLoopStart; colIndex < colLoopEnd; colIndex++) {
        const column = visibleColumns[colIndex]
        const colInBounds = colIndex < visibleColumns.length
        const key = remoteEchoKey(rowIndex, colIndex)
        if (!rowInBounds || !colInBounds) {
          signatures.delete(key)
          if (isForcedAuthoritativeReapply) {
            authoritativeBulkBuffer.push({ rowIndex, colIndex, value: '' })
          }
          continue
        }
        const nextValue = row && column ? (readSpreadsheetRowCellValue(row, column) ?? '') : ''
        const nextSignature = toEchoSignature(nextValue)
        const previousSignature = signatures.get(key)
        signatures.set(key, nextSignature)
        if (previousSignature === nextSignature && !isForcedAuthoritativeReapply) continue
        const localMutationExpiresAt = recentLocallyMutatedGridCellsRef.current.get(key) ?? 0
        if (localMutationExpiresAt > nowForLocalMutationCheck && !isForcedAuthoritativeReapply) continue
        authoritativeBulkBuffer.push({
          rowIndex,
          colIndex,
          value: nextValue,
          rowId: row ? getCanonicalRowId(row) : undefined
        })
      }
    }

    if (allowAuthoritativeBulkFlush && authoritativeBulkBuffer.length >= SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH) {
      applyRemoteCellUpdatesBulk(authoritativeBulkBuffer, { operationType: 'authoritative_reapply' })
    } else {
      for (const it of authoritativeBulkBuffer) {
        applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value ?? '', it.rowId)
      }
    }

    lastSyncedGridRowCountRef.current = nextRowCount
    lastSyncedGridColumnCountRef.current = visibleColumns.length
    lastProcessedAuthoritativeDataSyncTokenRef.current = nextToken
    lastProcessedAuthoritativeReapplySeedRef.current = authoritativeReapplySeed
  }, [
    applyRemoteCellUpdate,
    applyRemoteCellUpdatesBulk,
    authoritativeReapplySeed,
    columns,
    data,
    authoritativeDataSyncToken,
    collabBulkApplyIdleNonce
  ])
}
