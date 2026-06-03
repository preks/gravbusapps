import type { MutableRefObject } from 'react'
import type { SpreadsheetVersionCausalOwnershipRegistry } from '../core/spreadsheetVersionCausalOwnership'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import { getCanonicalRowId } from './spreadsheetRowIdentity'
import {
  protectSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from './spreadsheetPendingMaterializationCells'
import { getViewerRowVisualIndex } from './spreadsheetPeerRowHydration'

const getRowAtUniverGridIndex = (
  data: Record<string, unknown>[],
  gridRowIndex: number
): Record<string, unknown> | undefined => {
  for (let index = 0; index < data.length; index += 1) {
    const row = data[index]
    if (getViewerRowVisualIndex(row, index) === gridRowIndex) {
      return row
    }
  }
  return undefined
}

export type SpreadsheetLocalCellPaintGuardContext = {
  sheetId: string
  columns: SpreadsheetColumn[]
  rows: Record<string, unknown>[]
  versionCausalOwnership?: SpreadsheetVersionCausalOwnershipRegistry | null
  pendingLocalMutationCellsRef?: MutableRefObject<Set<string>> | null
  resolveKnownSheetVersion?: (sheetId: string) => number
}

export function buildSpreadsheetLocalCellPaintGuard(params: {
  sheetId: string
  rows: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
  versionCausalOwnershipRef?: MutableRefObject<SpreadsheetVersionCausalOwnershipRegistry | null>
  pendingLocalMutationCellsRef?: MutableRefObject<Set<string>>
  resolveKnownSheetVersion?: (sheetId: string) => number
}): SpreadsheetLocalCellPaintGuardContext {
  return {
    sheetId: params.sheetId,
    rows: params.rows,
    columns: params.columns,
    versionCausalOwnership: params.versionCausalOwnershipRef?.current ?? null,
    pendingLocalMutationCellsRef: params.pendingLocalMutationCellsRef,
    resolveKnownSheetVersion: params.resolveKnownSheetVersion
  }
}

const resolveColumnNameAtIndex = (columns: SpreadsheetColumn[], colIndex: number): string | undefined => {
  const visible = columns.filter(column => column.isVisible !== false)
  return visible[colIndex]?.name
}

/**
 * True when a pending local intent still owns this grid cell (version-causal registry
 * and/or pending-mutation protection). Replaces the former selection-reconcile TTL map.
 */
export function isGridCellLocallyOwned(
  context: SpreadsheetLocalCellPaintGuardContext,
  globalRowIndex: number,
  globalColIndex: number
): boolean {
  const row = getRowAtUniverGridIndex(context.rows, globalRowIndex)
  const columnName = resolveColumnNameAtIndex(context.columns, globalColIndex)
  const pendingLocalMutationCells = context.pendingLocalMutationCellsRef?.current
  const coordinateKey = spreadsheetPendingLocalMutationCoordinateCellKey(
    context.sheetId,
    globalRowIndex,
    globalColIndex
  )
  if (pendingLocalMutationCells?.has(coordinateKey)) {
    return true
  }

  const logicalRowHandle = row ? getCanonicalRowId(row) || undefined : undefined
  if (logicalRowHandle && columnName && pendingLocalMutationCells) {
    const semanticKey = spreadsheetPendingLocalMutationSemanticCellKey(context.sheetId, logicalRowHandle, columnName)
    if (pendingLocalMutationCells.has(semanticKey)) {
      return true
    }
  }

  return false
}

export function protectDeferredLocalUserMutationCells(
  context: SpreadsheetLocalCellPaintGuardContext,
  cells: Array<{ globalRowIndex: number; globalColIndex: number }>
): void {
  const pendingRef = context.pendingLocalMutationCellsRef
  if (!pendingRef || cells.length === 0) return
  const protectionEntries: Array<{ key: string; ownerId: string }> = []
  for (const { globalRowIndex, globalColIndex } of cells) {
    const coordinateKey = spreadsheetPendingLocalMutationCoordinateCellKey(
      context.sheetId,
      globalRowIndex,
      globalColIndex
    )
    const ownerId = `deferred:${context.sheetId}:${globalRowIndex}:${globalColIndex}`
    protectionEntries.push({ key: coordinateKey, ownerId: `${ownerId}:${coordinateKey}` })
    const row = getRowAtUniverGridIndex(context.rows, globalRowIndex)
    const columnName = resolveColumnNameAtIndex(context.columns, globalColIndex)
    const logicalRowHandle = row ? getCanonicalRowId(row) || undefined : undefined
    if (logicalRowHandle && columnName) {
      const semanticKey = spreadsheetPendingLocalMutationSemanticCellKey(context.sheetId, logicalRowHandle, columnName)
      protectionEntries.push({ key: semanticKey, ownerId: `${ownerId}:${semanticKey}` })
      const baseVersion = Math.max(0, Math.trunc(context.resolveKnownSheetVersion?.(context.sheetId) ?? 0))
      context.versionCausalOwnership?.registerIntent({
        sheetId: context.sheetId,
        logicalRowHandle,
        columnName,
        baseVersion
      })
    }
  }
  protectSpreadsheetPendingLocalMutationCells(pendingRef, protectionEntries)
}

export function resolveLogicalRowHandleAtGridIndex(
  rows: Record<string, unknown>[],
  globalRowIndex: number
): string | undefined {
  const row = getRowAtUniverGridIndex(rows, globalRowIndex)
  if (!row) return undefined
  return getCanonicalRowId(row) || undefined
}
