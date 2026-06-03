import { useEffect, useRef, type MutableRefObject } from 'react'
import { readSpreadsheetRowCellValue } from '../core'
import type { SpreadsheetBulkRemoteApplyMeta, SpreadsheetBulkRemoteCellItem } from '../core'
import type { ApplyRemoteCellUpdateOptions } from './UniverSheetGrid.types'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types/spreadsheet'
import { workbookSnapshotMismatchesViewerRows } from '../utils/univerAdapter'
import type { AuthoritativeGridRegion, PendingLocalFilterPolicy } from '../utils/spreadsheetAuthoritativeRegion'
import { SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH } from '../utils/spreadsheetBulkRemoteConstants'
import {
  buildAuthoritativePaintCellsFromViewerRows,
  mergeAuthoritativePaintCellLists
} from '../utils/spreadsheetAuthoritativeProjector'
import {
  shouldBlockSpreadsheetPendingLocalMutationCellProtection,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from '../utils/spreadsheetPendingMaterializationCells'
import { isServerAuthoritativeRepairReapply } from '../utils/spreadsheetBackendRepairReapply'
import { debugRemoteApply } from './univerGridDebug'
import { normalizeBlankLikeEchoSignature } from './univerGridWorkbookMutationModule'
import {
  buildAuthoritativeRowsByGridIndex,
  getAuthoritativeGridRowExtent,
  toEchoSignature
} from './univerGridAuthoritativeHelpers'
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
  /** Optional one-shot meta chained to the same session-derived paint wave. */
  authoritativePaintMetaRef?: MutableRefObject<SpreadsheetBulkRemoteApplyMeta | null>
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
    reason?: string
    pendingLocalFilterPolicy?: PendingLocalFilterPolicy
    preserveStagedDirectPaint?: boolean
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
    authoritativePaintMetaRef,
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
  const hasCompletedAuthoritativeSyncRef = useRef(false)

  const buildForcedRegionFallbackCells = (
    rows: Record<string, unknown>[],
    sheetColumns: SpreadsheetColumn[],
    regions: readonly AuthoritativeGridRegion[]
  ): SpreadsheetBulkRemoteCellItem[] => {
    const visibleColumns = sheetColumns.filter(column => column.isVisible !== false)
    if (visibleColumns.length === 0 || regions.length === 0) return []
    const rowsByGridIndex = buildAuthoritativeRowsByGridIndex([...rows])
    const items: SpreadsheetBulkRemoteCellItem[] = []

    for (const region of regions) {
      for (
        let rowIndex = Math.max(0, region.minRow);
        rowIndex <= Math.max(region.minRow, region.maxRow);
        rowIndex += 1
      ) {
        const row = rowsByGridIndex.get(rowIndex)
        for (
          let colIndex = Math.max(0, region.minCol);
          colIndex <= Math.max(region.minCol, Math.min(region.maxCol, visibleColumns.length - 1));
          colIndex += 1
        ) {
          const column = visibleColumns[colIndex]
          if (!column) continue
          items.push({
            rowIndex,
            colIndex,
            value: row ? (readSpreadsheetRowCellValue(row, column) ?? '') : '',
            rowId: row ? getCanonicalRowId(row) : undefined
          })
        }
      }
    }

    return items
  }

  const itemTouchesRegion = (item: SpreadsheetBulkRemoteCellItem, region: AuthoritativeGridRegion): boolean =>
    item.rowIndex >= region.minRow &&
    item.rowIndex <= region.maxRow &&
    item.colIndex >= region.minCol &&
    item.colIndex <= region.maxCol

  const hasExplicitStylePayload = (item: SpreadsheetBulkRemoteCellItem): boolean => {
    const stylePatch = item.options?.stylePatch
    const hasStylePatch =
      stylePatch != null &&
      ((stylePatch.set != null && Object.keys(stylePatch.set).length > 0) ||
        (Array.isArray(stylePatch.unset) && stylePatch.unset.length > 0))
    const univerStyles = item.options?.univerStyles
    const hasUniverStyles = univerStyles != null && Object.keys(univerStyles).length > 0
    return hasStylePatch || hasUniverStyles
  }

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
        hasCompletedAuthoritativeSyncRef.current = true
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

    const preferForcedRepairProjection =
      isForcedAuthoritativeReapply &&
      isServerAuthoritativeRepairReapply({
        reason: forcedSpec?.reason,
        pendingLocalFilterPolicy: forcedSpec?.pendingLocalFilterPolicy
      })
    const preferPreparedRegionProjection =
      !isForcedAuthoritativeReapply && prepareRegionOnly != null && prepareRegionOnly.length > 0

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
    const authoritativePaintMeta = authoritativePaintMetaRef?.current ?? null
    if (authoritativePaintMetaRef) {
      authoritativePaintMetaRef.current = null
    }

    let authoritativeBulkBuffer: SpreadsheetBulkRemoteCellItem[] = []
    const sessionPaintCellCount = sessionPaintCells?.length ?? 0
    const shouldMergeSessionPaintWithForcedRepair =
      preferForcedRepairProjection &&
      forcedSpec?.preserveStagedDirectPaint === true &&
      Boolean(sessionPaintCells?.length)
    const shouldUseSessionPaintCells =
      !preferForcedRepairProjection && !preferPreparedRegionProjection && Boolean(sessionPaintCells?.length)
    const sessionPaintDecision:
      | 'used'
      | 'merged_with_forced_repair'
      | 'forced_repair_precedence'
      | 'prepared_region_precedence'
      | 'not_staged' = shouldUseSessionPaintCells
      ? 'used'
      : shouldMergeSessionPaintWithForcedRepair
        ? 'merged_with_forced_repair'
        : preferForcedRepairProjection
          ? 'forced_repair_precedence'
          : preferPreparedRegionProjection
            ? 'prepared_region_precedence'
            : 'not_staged'
    const isViewerStateReprojection = !shouldUseSessionPaintCells && !shouldMergeSessionPaintWithForcedRepair
    let regionProjectedBuffer: SpreadsheetBulkRemoteCellItem[] = []
    if (shouldUseSessionPaintCells && sessionPaintCells && sessionPaintCells.length > 0) {
      authoritativeBulkBuffer = sessionPaintCells
    } else if (scanRegions.length > 0) {
      regionProjectedBuffer = buildAuthoritativePaintCellsFromViewerRows(data, columns, { regions: scanRegions })
      if (
        regionProjectedBuffer.length === 0 &&
        isForcedAuthoritativeReapply &&
        forcedSpec?.clearAllSignatures === true
      ) {
        regionProjectedBuffer = buildAuthoritativePaintCellsFromViewerRows(data, columns, {
          regions: scanRegions.map(region => ({
            ...region,
            minCol: 0,
            maxCol: Math.max(region.maxCol, visibleColumns.length - 1)
          }))
        })
      }
      authoritativeBulkBuffer =
        shouldMergeSessionPaintWithForcedRepair && sessionPaintCells
          ? mergeAuthoritativePaintCellLists(sessionPaintCells, regionProjectedBuffer)
          : regionProjectedBuffer
    } else if (!hasCompletedAuthoritativeSyncRef.current && nextToken === 0) {
      authoritativeBulkBuffer = buildAuthoritativePaintCellsFromViewerRows(data, columns)
    } else {
      debugRemoteApply('skip_authoritative_reapply_without_session_diff', {
        sheetId: sheet.id,
        token: nextToken,
        forced: isForcedAuthoritativeReapply
      })
    }

    const pendingLocalFilterPolicy = forcedSpec?.pendingLocalFilterPolicy ?? ('protect_in_flight_local_edits' as const)
    const acknowledgedCellKeys = authoritativePaintMeta?.acknowledgedCellKeys ?? []
    let filterBypassApplied = false

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
        const acknowledgedSemanticKey = row && column ? `${getCanonicalRowId(row)}\u0000${column.name}` : null
        if (
          semanticProtectionKey &&
          acknowledgedSemanticKey &&
          acknowledgedCellKeys.includes(acknowledgedSemanticKey)
        ) {
          filterBypassApplied = true
          filtered.push(item)
          continue
        }
        const nextProtectionSignature = normalizeBlankLikeEchoSignature(toEchoSignature(item.value ?? ''))
        const isPendingLocalMutationCell =
          shouldBlockSpreadsheetPendingLocalMutationCellProtection(
            pendingLocalMutationCellsRef,
            coordinateProtectionKey,
            nextProtectionSignature,
            pendingLocalFilterPolicy
          ) ||
          (semanticProtectionKey
            ? shouldBlockSpreadsheetPendingLocalMutationCellProtection(
                pendingLocalMutationCellsRef,
                semanticProtectionKey,
                nextProtectionSignature,
                pendingLocalFilterPolicy
              )
            : false)
        if (isPendingLocalMutationCell) continue
        filtered.push(item)
      }
      return filtered
    }

    const projectedBufferBeforeFilter = authoritativeBulkBuffer
    const filteredProjectedBuffer = filterPendingLocalCells(projectedBufferBeforeFilter)
    let filterDropReason:
      | 'none'
      | 'projector_empty'
      | 'primary_filtered_to_zero'
      | 'fallback_filtered_to_zero'
      | 'session_paint_fallback_restored'
      | 'style_session_fallback_restored'
      | 'fallback_bypass_restored' = projectedBufferBeforeFilter.length === 0 ? 'projector_empty' : 'none'
    authoritativeBulkBuffer = filteredProjectedBuffer
    if (
      authoritativeBulkBuffer.length === 0 &&
      isForcedAuthoritativeReapply &&
      scanRegions.length > 0 &&
      !sessionPaintCells
    ) {
      if (projectedBufferBeforeFilter.length > 0) {
        filterDropReason = 'primary_filtered_to_zero'
      }
      const fallbackBuffer = buildForcedRegionFallbackCells(data, columns, scanRegions)
      const filteredFallbackBuffer = filterPendingLocalCells(fallbackBuffer)
      authoritativeBulkBuffer = filteredFallbackBuffer
      if (fallbackBuffer.length > 0 && filteredFallbackBuffer.length === 0) {
        filterDropReason = 'fallback_filtered_to_zero'
      }
    }
    if (
      authoritativeBulkBuffer.length === 0 &&
      isForcedAuthoritativeReapply &&
      scanRegions.length > 0 &&
      sessionPaintCells?.length
    ) {
      const stagedSessionFallbackBuffer =
        forcedSpec?.preserveStagedDirectPaint === true
          ? sessionPaintCells.filter(item => scanRegions.some(region => itemTouchesRegion(item, region)))
          : sessionPaintCells.filter(
              item => hasExplicitStylePayload(item) && scanRegions.some(region => itemTouchesRegion(item, region))
            )
      if (stagedSessionFallbackBuffer.length > 0) {
        authoritativeBulkBuffer = stagedSessionFallbackBuffer
        filterDropReason =
          forcedSpec?.preserveStagedDirectPaint === true
            ? 'session_paint_fallback_restored'
            : 'style_session_fallback_restored'
      }
    }

    const allowAuthoritativeBulkFlush = !isForcedAuthoritativeReapply || !forcedSpec || forcedSpec.preferBulk !== false

    debugRemoteApply('authoritative_reapply_filter_result', {
      sheetId: sheet.id,
      token: nextToken,
      forced: isForcedAuthoritativeReapply,
      reason: forcedSpec?.reason,
      preferForcedRepairProjection,
      preferPreparedRegionProjection,
      sessionPaintCellCount,
      sessionPaintDecision,
      projectedCellCount: projectedBufferBeforeFilter.length,
      filteredProjectedCellCount: filteredProjectedBuffer.length,
      finalCellCount: authoritativeBulkBuffer.length,
      filterDropReason,
      filterBypassApplied,
      regionOnly: scanRegions.length > 0,
      regionCount: scanRegions.length
    })

    debugRemoteApply('authoritative_reapply_bulk_prepared', {
      sheetId: sheet.id,
      cellCount: authoritativeBulkBuffer.length,
      token: nextToken,
      forced: isForcedAuthoritativeReapply,
      preferForcedRepairProjection,
      preferPreparedRegionProjection,
      sessionPaintCellCount,
      sessionPaintDecision,
      regionOnly: scanRegions.length > 0,
      regionCount: scanRegions.length,
      sessionDerived: Boolean(sessionPaintCells?.length),
      filterDropReason,
      filterBypassApplied
    })

    const applyMeta: SpreadsheetBulkRemoteApplyMeta = {
      ...(authoritativePaintMeta ?? {}),
      operationType: authoritativePaintMeta?.operationType ?? 'authoritative_reapply',
      skipRemoteEchoRegistration: authoritativePaintMeta?.skipRemoteEchoRegistration ?? isViewerStateReprojection
    }

    if (authoritativeBulkBuffer.length === 0) {
      applyMeta.onApplyComplete?.()
    } else if (
      allowAuthoritativeBulkFlush &&
      authoritativeBulkBuffer.length >= SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH
    ) {
      applyRemoteCellUpdatesBulk(authoritativeBulkBuffer, applyMeta)
    } else {
      for (const it of authoritativeBulkBuffer) {
        applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value ?? '', it.rowId, {
          ...it.options,
          acknowledgedCellKeys: it.options?.acknowledgedCellKeys ?? applyMeta.acknowledgedCellKeys,
          skipRemoteEchoRegistration: it.options?.skipRemoteEchoRegistration ?? applyMeta.skipRemoteEchoRegistration
        })
      }
      applyMeta.onApplyComplete?.()
    }

    lastSyncedGridRowCountRef.current = getAuthoritativeGridRowExtent(data)
    lastSyncedGridColumnCountRef.current = visibleColumns.length
    lastProcessedAuthoritativeDataSyncTokenRef.current = nextToken
    lastProcessedAuthoritativeReapplySeedRef.current = authoritativeReapplySeed
    hasCompletedAuthoritativeSyncRef.current = true
  }, [
    applyRemoteCellUpdate,
    applyRemoteCellUpdatesBulk,
    authoritativePaintCellsRef,
    authoritativePaintMetaRef,
    authoritativeReapplySeed,
    columns,
    data,
    authoritativeDataSyncToken,
    collabBulkApplyIdleNonce,
    pendingLocalMutationCellsRef,
    sheet.id
  ])
}
