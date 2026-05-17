import type { ViewerRow } from './spreadsheetRowIdentity'
import { getClientRowIdentity } from './spreadsheetRowIdentity'
import { getViewerRowVisualIndex, sortRowsByCanonicalVisualOrder } from './spreadsheetPeerRowHydration'

export interface SpreadsheetResolvedVisibleRowIndex {
  visibleRowIndex: number
  virtualSlot: number
  rowId?: string
  clientRowId?: string
  isMaterialized: boolean
}

export interface SpreadsheetResolvedVirtualSlot {
  virtualSlot: number
  row?: ViewerRow
  rowId?: string
  clientRowId?: string
  isMaterialized: boolean
}

export interface SpreadsheetRowProjectionModel {
  isIdentityProjection: boolean
  resolveVisibleRowIndex: (visibleRowIndex: number) => SpreadsheetResolvedVisibleRowIndex
  resolveVirtualSlot: (virtualSlot: number) => SpreadsheetResolvedVirtualSlot
}

export function createIdentityRowProjectionModel(rows: ViewerRow[]): SpreadsheetRowProjectionModel {
  const canonicalRows = sortRowsByCanonicalVisualOrder(rows)
  const rowByVirtualSlot = new Map<number, ViewerRow>()
  canonicalRows.forEach((row, index) => {
    rowByVirtualSlot.set(getViewerRowVisualIndex(row, index), row)
  })

  return {
    isIdentityProjection: true,
    resolveVisibleRowIndex: visibleRowIndex => {
      const virtualSlot = Math.max(0, Math.trunc(visibleRowIndex))
      const row = rowByVirtualSlot.get(virtualSlot)
      const rowId =
        typeof row?._rowUuid === 'string' && row._rowUuid
          ? row._rowUuid
          : typeof row?.id === 'string' && row.id
            ? row.id
            : undefined
      const clientRowId = row ? getClientRowIdentity(row) || undefined : undefined
      return {
        visibleRowIndex: virtualSlot,
        virtualSlot,
        rowId,
        clientRowId,
        isMaterialized: Boolean(row)
      }
    },
    resolveVirtualSlot: virtualSlotInput => {
      const virtualSlot = Math.max(0, Math.trunc(virtualSlotInput))
      const row = rowByVirtualSlot.get(virtualSlot)
      const rowId =
        typeof row?._rowUuid === 'string' && row._rowUuid
          ? row._rowUuid
          : typeof row?.id === 'string' && row.id
            ? row.id
            : undefined
      const clientRowId = row ? getClientRowIdentity(row) || undefined : undefined
      return {
        virtualSlot,
        row,
        rowId,
        clientRowId,
        isMaterialized: Boolean(row)
      }
    }
  }
}
