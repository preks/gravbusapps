import type { SheetCellMatrix } from './cellMatrixUtils'
import { remoteEchoKey, toEchoSignature } from './univerGridAuthoritativeHelpers'
import {
  normalizeBlankLikeEchoSignature,
  normalizeSelectionReconcileSignature
} from './univerGridWorkbookMutationModule'
import type { SpreadsheetLocalCellPaintGuardContext } from '../utils/spreadsheetLocalCellPaintGuard'
import { isGridCellLocallyOwned } from '../utils/spreadsheetLocalCellPaintGuard'

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

export function selectionReconcileAllCellsLocallyOwned(
  paintGuard: SpreadsheetLocalCellPaintGuardContext,
  cellValue: SheetCellMatrix,
  rowOffset: number,
  colOffset: number
): boolean {
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      if (!isGridCellLocallyOwned(paintGuard, rowIndex + rowOffset, colIndex + colOffset)) {
        return false
      }
    }
  }
  return true
}

const toSelectionReconcileEchoSignature = (value: unknown): string => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return toEchoSignature(value)
  }
  const cell = value as Record<string, unknown>
  if (cell.v !== undefined || cell.m !== undefined || cell.f !== undefined) {
    return toEchoSignature(cell)
  }
  return toEchoSignature('')
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
      const nextSignature = normalizeSelectionReconcileSignature(toSelectionReconcileEchoSignature(rowCells[colIndex]))
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
