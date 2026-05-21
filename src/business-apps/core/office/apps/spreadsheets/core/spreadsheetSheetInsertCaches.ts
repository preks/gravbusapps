import type { MutableRefObject } from 'react'

type ViewerRow = Record<string, unknown>
type PendingUniverRows = { data: ViewerRow[]; persistedRows: ViewerRow[] }

export interface PrimeSpreadsheetSheetInsertCachesContext {
  peerSheetDataCacheRef: MutableRefObject<Map<string, ViewerRow[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  pendingUniverRowsBySheetRef: MutableRefObject<Map<string, PendingUniverRows>>
}

export const primeSpreadsheetSheetInsertCaches = (
  previousActiveSheetId: string,
  nextSheetId: string,
  rowsToPreserve: ViewerRow[],
  currentActiveRows: ViewerRow[],
  ctx: PrimeSpreadsheetSheetInsertCachesContext
): void => {
  ctx.peerSheetDataCacheRef.current.set(previousActiveSheetId, [...rowsToPreserve])
  ctx.authoritativePeerSheetDataCacheRef.current.add(previousActiveSheetId)
  if (rowsToPreserve.length > currentActiveRows.length) {
    ctx.pendingUniverRowsBySheetRef.current.set(previousActiveSheetId, {
      data: [...rowsToPreserve],
      persistedRows: [...currentActiveRows]
    })
  }
  ctx.peerSheetDataCacheRef.current.set(nextSheetId, [])
  ctx.authoritativePeerSheetDataCacheRef.current.add(nextSheetId)
}
