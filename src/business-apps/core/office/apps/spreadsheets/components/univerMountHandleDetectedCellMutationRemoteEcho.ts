import type { SheetCellMatrix } from './cellMatrixUtils'
import { remoteEchoKey, toEchoSignature } from './univerGridAuthoritativeHelpers'
import {
  normalizeBlankLikeEchoSignature,
  normalizeSelectionReconcileSignature
} from './univerGridWorkbookMutationModule'
import type { UniverMountHandleDetectedCellMutationDeps } from './univerMountHandleDetectedCellMutation.types'

export function buildShouldSuppressRemoteEcho(
  deps: Pick<UniverMountHandleDetectedCellMutationDeps, 'remoteEchoSuppressionRef'>,
  now: number
): (globalRowIndex: number, globalColIndex: number, value: unknown) => boolean {
  const { remoteEchoSuppressionRef } = deps
  return (globalRowIndex: number, globalColIndex: number, value: unknown): boolean => {
    const key = remoteEchoKey(globalRowIndex, globalColIndex)
    const entry = remoteEchoSuppressionRef.current.get(key)
    if (!entry) return false
    if (now > entry.expiresAt) {
      remoteEchoSuppressionRef.current.delete(key)
      return false
    }
    return entry.signatures.has(normalizeBlankLikeEchoSignature(toEchoSignature(value)))
  }
}

export function cellMatrixHasAnyNonSuppressedCell(
  cellValue: SheetCellMatrix,
  shouldSuppress: (globalRowIndex: number, globalColIndex: number, value: unknown) => boolean,
  rowOffset: number,
  colOffset: number
): boolean {
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    const globalRowIndex = rowIndex + rowOffset
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const globalColIndex = colIndex + colOffset
      const cell = rowCells[colIndex]
      if (!shouldSuppress(globalRowIndex, globalColIndex, cell)) {
        return true
      }
    }
  }
  return false
}

export function selectionReconcileAllCellsRecentlyLocal(
  deps: Pick<UniverMountHandleDetectedCellMutationDeps, 'recentLocallyMutatedGridCellsRef'>,
  cellValue: SheetCellMatrix,
  now: number,
  rowOffset: number,
  colOffset: number
): boolean {
  const { recentLocallyMutatedGridCellsRef } = deps
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const key = remoteEchoKey(rowIndex + rowOffset, colIndex + colOffset)
      const expiresAt = recentLocallyMutatedGridCellsRef.current.get(key) ?? 0
      if (expiresAt <= now) {
        return false
      }
    }
  }
  return true
}

export function selectionReconcileHasAuthoritativeDiff(
  deps: Pick<UniverMountHandleDetectedCellMutationDeps, 'lastSyncedGridCellSignaturesRef'>,
  cellValue: SheetCellMatrix
): boolean {
  const { lastSyncedGridCellSignaturesRef } = deps
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const nextSignature = normalizeSelectionReconcileSignature(toEchoSignature(rowCells[colIndex]))
      const authoritativeSignature = normalizeSelectionReconcileSignature(
        lastSyncedGridCellSignaturesRef.current.get(remoteEchoKey(rowIndex, colIndex))
      )
      if (authoritativeSignature !== nextSignature) {
        return true
      }
    }
  }
  return false
}
