import { useEffect, type MutableRefObject } from 'react'
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
import type { ClearAllGridBounds } from './univerGridRangeSelection'
import { getCanonicalRowId, getClientRowIdentity } from '../utils/spreadsheetRowIdentity'
import type { SpreadsheetVersionCausalOwnershipRegistry } from '../core/spreadsheetVersionCausalOwnership'
import {
  reconcileSpreadsheetPendingLocalMutationCellProtection,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../utils/spreadsheetPendingMaterializationCells'
import { debugRemoteApply } from './univerGridDebug'
import { normalizeBlankLikeEchoSignature } from './univerGridWorkbookMutationModule'
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
  pendingAuthoritativeRegionRef: MutableRefObject<AuthoritativeGridRegion[] | null>
  pendingForcedAuthoritativeReapplyRef: MutableRefObject<{
    regions: AuthoritativeGridRegion[] | null
    preferBulk: boolean
    clearAllSignatures: boolean
  } | null>
  versionCausalOwnershipRef?: MutableRefObject<SpreadsheetVersionCausalOwnershipRegistry | null>
  /** Version of the authoritative row snapshot being painted (for version-causal ownership). */
  resolveAuthoritativeAppliedVersion?: () => number
  pendingLocalMutationCellsRef?: MutableRefObject<Set<string>>
  applyRemoteCellUpdate: (
    rowIndex: number,
    colIndex: number,
    value: unknown,
    rowId?: string,
    options?: ApplyRemoteCellUpdateOptions
  ) => void
  applyRemoteCellUpdatesBulk: (items: SpreadsheetBulkRemoteCellItem[], meta?: SpreadsheetBulkRemoteApplyMeta) => void
  resolveActiveWorksheetBounds?: () => ClearAllGridBounds | null
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
    versionCausalOwnershipRef,
    resolveAuthoritativeAppliedVersion,
    pendingLocalMutationCellsRef,
    applyRemoteCellUpdate,
    applyRemoteCellUpdatesBulk,
    resolveActiveWorksheetBounds
  } = params

  useEffect(() => {
    if (!univerAPIRef.current) return
    // Do not rebuild the full signature map on data-only updates: optimistic local session
    // merges can advance row state before the grid is painted, which would make later
    // authoritative reapply think remote cells are already in sync (cellCount: 0).
    lastSyncedGridRowCountRef.current = getAuthoritativeGridRowExtent(data)
    lastSyncedGridColumnCountRef.current = columns.filter(column => column.isVisible !== false).length
  }, [data, columns])

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
    const worksheetBounds = resolveActiveWorksheetBounds?.() ?? null
    const gridColumnCount = worksheetBounds != null ? worksheetBounds.maxColIndex + 1 : visibleColumns.length
    const maxColumnCount = Math.min(Math.max(previousColumnCount, visibleColumns.length), gridColumnCount)
    const forcedSpec = isForcedAuthoritativeReapply ? pendingForcedAuthoritativeReapplyRef.current : null
    if (isForcedAuthoritativeReapply && forcedSpec && forcedSpec.regions == null) {
      debugRemoteApply('authoritative_reapply_full_grid_scan', {
        sheetId: sheet.id,
        clearAllSignatures: forcedSpec.clearAllSignatures,
        preferBulk: forcedSpec.preferBulk
      })
    }
    if (isForcedAuthoritativeReapply) {
      pendingForcedAuthoritativeReapplyRef.current = null
    }
    const prepareRegionOnly = !isForcedAuthoritativeReapply ? pendingAuthoritativeRegionRef.current : null
    pendingAuthoritativeRegionRef.current = null

    const scanRegions: AuthoritativeGridRegion[] = []
    if (isForcedAuthoritativeReapply && forcedSpec?.regions) {
      scanRegions.push(...forcedSpec.regions)
    } else if (prepareRegionOnly) {
      scanRegions.push(...prepareRegionOnly)
    }

    const authoritativeBulkBuffer: SpreadsheetBulkRemoteCellItem[] = []
    const allowAuthoritativeBulkFlush = !isForcedAuthoritativeReapply || !forcedSpec || forcedSpec.preferBulk !== false

    const scanCell = (rowIndex: number, colIndex: number) => {
      const row = rowsByGridIndex.get(rowIndex)
      const rowInBounds = rowsByGridIndex.has(rowIndex)
      const column = visibleColumns[colIndex]
      const colInBounds = colIndex < visibleColumns.length
      const key = remoteEchoKey(rowIndex, colIndex)
      if (!rowInBounds || !colInBounds) {
        signatures.delete(key)
        return
      }
      const nextValue = row && column ? (readSpreadsheetRowCellValue(row, column) ?? '') : ''
      const nextSignature = toEchoSignature(nextValue)
      const pendingLocalMutationCells = pendingLocalMutationCellsRef?.current
      const coordinateProtectionKey = spreadsheetPendingLocalMutationCoordinateCellKey(sheet.id, rowIndex, colIndex)
      const semanticProtectionKey =
        row && column
          ? spreadsheetPendingLocalMutationSemanticCellKey(sheet.id, getCanonicalRowId(row), column.name)
          : null
      const nextProtectionSignature = normalizeBlankLikeEchoSignature(nextSignature)
      const isPendingLocalMutationCell =
        reconcileSpreadsheetPendingLocalMutationCellProtection(
          pendingLocalMutationCellsRef,
          coordinateProtectionKey,
          nextProtectionSignature
        ) ||
        (semanticProtectionKey
          ? reconcileSpreadsheetPendingLocalMutationCellProtection(
              pendingLocalMutationCellsRef,
              semanticProtectionKey,
              nextProtectionSignature
            )
          : false) ||
        pendingLocalMutationCells?.has(coordinateProtectionKey) ||
        (semanticProtectionKey ? pendingLocalMutationCells?.has(semanticProtectionKey) : false)
      if (isPendingLocalMutationCell) {
        return
      }
      const previousSignature = signatures.get(key)
      signatures.set(key, nextSignature)
      if (previousSignature === nextSignature && !isForcedAuthoritativeReapply) return

      const ownershipRegistry = versionCausalOwnershipRef?.current
      if (ownershipRegistry && row && column) {
        const remoteAppliedVersion = Math.max(
          0,
          Math.trunc(resolveAuthoritativeAppliedVersion?.() ?? Number(sheet.version ?? 0))
        )
        const logicalRowHandle = getCanonicalRowId(row) || getClientRowIdentity(row)
        if (
          logicalRowHandle &&
          ownershipRegistry.shouldSuppressRemotePaint({
            sheetId: sheet.id,
            rowId: logicalRowHandle,
            columnName: column.name,
            remoteAppliedVersion
          })
        ) {
          return
        }
      }
      authoritativeBulkBuffer.push({
        rowIndex,
        colIndex,
        value: nextValue,
        rowId: row ? getCanonicalRowId(row) : undefined
      })
    }

    if (scanRegions.length === 0) {
      for (let rowIndex = 0; rowIndex < maxRowCount; rowIndex += 1) {
        for (let colIndex = 0; colIndex < maxColumnCount; colIndex += 1) {
          scanCell(rowIndex, colIndex)
        }
      }
    } else {
      for (const bounded of scanRegions) {
        const rowLoopStart = Math.max(0, bounded.minRow)
        const rowLoopEnd = Math.min(maxRowCount, bounded.maxRow + 1)
        const colLoopStart = Math.max(0, bounded.minCol)
        const colLoopEnd = Math.min(maxColumnCount, bounded.maxCol + 1)
        for (let rowIndex = rowLoopStart; rowIndex < rowLoopEnd; rowIndex += 1) {
          for (let colIndex = colLoopStart; colIndex < colLoopEnd; colIndex += 1) {
            scanCell(rowIndex, colIndex)
          }
        }
      }
    }

    if (authoritativeBulkBuffer.length === 0 && scanRegions.length > 0 && !isForcedAuthoritativeReapply) {
      for (const bounded of scanRegions) {
        const rowLoopStart = Math.max(0, bounded.minRow)
        const rowLoopEnd = Math.min(maxRowCount, bounded.maxRow + 1)
        for (let rowIndex = rowLoopStart; rowIndex < rowLoopEnd; rowIndex += 1) {
          for (let colIndex = 0; colIndex < maxColumnCount; colIndex += 1) {
            scanCell(rowIndex, colIndex)
          }
        }
      }
    }

    debugRemoteApply('authoritative_reapply_bulk_prepared', {
      sheetId: sheet.id,
      cellCount: authoritativeBulkBuffer.length,
      token: nextToken,
      forced: isForcedAuthoritativeReapply,
      regionOnly: scanRegions.length > 0,
      regionCount: scanRegions.length
    })

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
    collabBulkApplyIdleNonce,
    pendingLocalMutationCellsRef
  ])
}
