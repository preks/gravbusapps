import { useEffect, type MutableRefObject } from 'react'
import type { SpreadsheetBulkRemoteApplyMeta, SpreadsheetBulkRemoteCellItem } from '../core'
import type { ApplyRemoteCellUpdateOptions } from './UniverSheetGrid.types'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types/spreadsheet'
import { workbookSnapshotMismatchesViewerRows } from '../utils/univerAdapter'
import type { AuthoritativeGridRegion } from '../utils/spreadsheetAuthoritativeRegion'
import { SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH } from '../utils/spreadsheetBulkRemoteConstants'
import { buildAuthoritativePaintCellsFromViewerRows } from '../utils/spreadsheetAuthoritativeProjector'
import {
  reconcileSpreadsheetPendingLocalMutationCellProtection,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../utils/spreadsheetPendingMaterializationCells'
import { debugRemoteApply } from './univerGridDebug'
import { normalizeBlankLikeEchoSignature } from './univerGridWorkbookMutationModule'
import { getAuthoritativeGridRowExtent } from './univerGridAuthoritativeHelpers'
import { getCanonicalRowId } from '../utils/spreadsheetRowIdentity'

export interface UniverAuthoritativeGridSyncParams {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
  authoritativeDataSyncToken?: number
  authoritativeReapplySeed: number
  collabBulkApplyIdleNonce: number
  univerAPIRef: MutableRefObject<unknown>
  /** Consumed once per sync: explicit cells the session applied (projector-only path). */
  authoritativePaintCellsRef?: MutableRefObject<SpreadsheetBulkRemoteCellItem[] | null>
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
  pendingLocalMutationCellsRef?: MutableRefObject<Set<string>>
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
 * Paints the Univer grid from authoritative viewer-row state. Uses an explicit cell list
 * produced by the session apply path when available; otherwise projects the full sheet or a
 * bounded region directly from `data` (no signature-cache diff).
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
    authoritativePaintCellsRef,
    lastSyncedGridRowCountRef,
    lastSyncedGridColumnCountRef,
    lastProcessedAuthoritativeDataSyncTokenRef,
    lastProcessedAuthoritativeReapplySeedRef,
    collabPersistedBulkApplyDepthRef,
    skipNextAuthoritativeSyncAfterSnapshotInitRef,
    getWorkbookSnapshotRef,
    pendingAuthoritativeRegionRef,
    pendingForcedAuthoritativeReapplyRef,
    pendingLocalMutationCellsRef,
    applyRemoteCellUpdate,
    applyRemoteCellUpdatesBulk
  } = params

  useEffect(() => {
    lastSyncedGridRowCountRef.current = getAuthoritativeGridRowExtent(data)
    lastSyncedGridColumnCountRef.current = columns.filter(column => column.isVisible !== false).length
  }, [data, columns, lastSyncedGridColumnCountRef, lastSyncedGridRowCountRef])

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
      skipNextAuthoritativeSyncAfterSnapshotInitRef.current = false
      if (snapshotAlreadyMatchesRows) {
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

    const forcedSpec = isForcedAuthoritativeReapply ? pendingForcedAuthoritativeReapplyRef.current : null
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

    const sessionPaintCells = authoritativePaintCellsRef?.current ?? null
    if (authoritativePaintCellsRef) {
      authoritativePaintCellsRef.current = null
    }

    let authoritativeBulkBuffer: SpreadsheetBulkRemoteCellItem[] = []
    if (sessionPaintCells && sessionPaintCells.length > 0) {
      authoritativeBulkBuffer = sessionPaintCells
    } else if (scanRegions.length > 0) {
      authoritativeBulkBuffer = buildAuthoritativePaintCellsFromViewerRows(data, columns, { regions: scanRegions })
      if (
        authoritativeBulkBuffer.length === 0 &&
        isForcedAuthoritativeReapply &&
        forcedSpec?.clearAllSignatures === true
      ) {
        authoritativeBulkBuffer = buildAuthoritativePaintCellsFromViewerRows(data, columns, {
          regions: scanRegions.map(region => ({
            ...region,
            minCol: 0,
            maxCol: Math.max(region.maxCol, visibleColumns.length - 1)
          }))
        })
      }
    } else {
      authoritativeBulkBuffer = buildAuthoritativePaintCellsFromViewerRows(data, columns)
    }

    const filterPendingLocalCells = (items: SpreadsheetBulkRemoteCellItem[]): SpreadsheetBulkRemoteCellItem[] => {
      const filtered: SpreadsheetBulkRemoteCellItem[] = []
      for (const item of items) {
        const row =
          data.find((candidate, index) => {
            const visual = candidate._gridRowIndex
            const gridIndex = typeof visual === 'number' && Number.isFinite(visual) ? Math.trunc(visual) : index
            return gridIndex === item.rowIndex
          }) ?? undefined
        const column = visibleColumns[item.colIndex]
        const coordinateProtectionKey = spreadsheetPendingLocalMutationCoordinateCellKey(
          sheet.id,
          item.rowIndex,
          item.colIndex
        )
        const semanticProtectionKey =
          row && column
            ? spreadsheetPendingLocalMutationSemanticCellKey(sheet.id, getCanonicalRowId(row), column.name)
            : null
        const nextProtectionSignature = normalizeBlankLikeEchoSignature(String(item.value ?? ''))
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
          pendingLocalMutationCellsRef?.current?.has(coordinateProtectionKey) ||
          (semanticProtectionKey ? pendingLocalMutationCellsRef?.current?.has(semanticProtectionKey) : false)
        if (isPendingLocalMutationCell) continue
        filtered.push(item)
      }
      return filtered
    }

    authoritativeBulkBuffer = filterPendingLocalCells(authoritativeBulkBuffer)

    const allowAuthoritativeBulkFlush = !isForcedAuthoritativeReapply || !forcedSpec || forcedSpec.preferBulk !== false

    debugRemoteApply('authoritative_reapply_bulk_prepared', {
      sheetId: sheet.id,
      cellCount: authoritativeBulkBuffer.length,
      token: nextToken,
      forced: isForcedAuthoritativeReapply,
      regionOnly: scanRegions.length > 0,
      regionCount: scanRegions.length,
      sessionDerived: Boolean(sessionPaintCells?.length)
    })

    if (allowAuthoritativeBulkFlush && authoritativeBulkBuffer.length >= SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH) {
      applyRemoteCellUpdatesBulk(authoritativeBulkBuffer, { operationType: 'authoritative_reapply' })
    } else {
      for (const it of authoritativeBulkBuffer) {
        applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value ?? '', it.rowId)
      }
    }

    lastSyncedGridRowCountRef.current = getAuthoritativeGridRowExtent(data)
    lastSyncedGridColumnCountRef.current = visibleColumns.length
    lastProcessedAuthoritativeDataSyncTokenRef.current = nextToken
    lastProcessedAuthoritativeReapplySeedRef.current = authoritativeReapplySeed
  }, [
    applyRemoteCellUpdate,
    applyRemoteCellUpdatesBulk,
    authoritativePaintCellsRef,
    authoritativeReapplySeed,
    columns,
    data,
    authoritativeDataSyncToken,
    collabBulkApplyIdleNonce,
    pendingLocalMutationCellsRef,
    sheet.id
  ])
}
