import { createUniver } from '@univerjs/presets'
import { CURSOR_OVERLAY_COL_WIDTH_PX, CURSOR_OVERLAY_ROW_HEIGHT_PX } from './univerGridLayoutConstants'
import type { UniverGridController } from './useUniverGridController'

export type UniverMountScrollSyncRefs = Pick<
  UniverGridController,
  'cellDimensionsRef' | 'sheetScrollRef' | 'refreshCursorRectsRef' | 'refreshCommentRectsRef' | 'propsRef'
> & {
  univerAPI: ReturnType<typeof createUniver>['univerAPI']
  emitWorksheetFromUniver: () => void
}

export type UniverMountScrollSyncHandles = {
  scrollEventDisposable: { dispose(): void } | undefined
  worksheetScrollDisposable: { dispose(): void } | undefined
  scrollPollIntervalId: ReturnType<typeof setInterval>
  activeWorksheetPollIntervalId: ReturnType<typeof setInterval> | null
}

/**
 * Scroll position sync for collaboration overlays (cursor/comments) + optional active-sheet polling.
 */
export function registerUniverMountScrollSync(refs: UniverMountScrollSyncRefs): UniverMountScrollSyncHandles {
  const {
    univerAPI,
    cellDimensionsRef,
    sheetScrollRef,
    refreshCursorRectsRef,
    refreshCommentRectsRef,
    propsRef,
    emitWorksheetFromUniver
  } = refs

  const handleSheetScroll = (scrollLeft: number, scrollTop: number) => {
    sheetScrollRef.current = { scrollLeft, scrollTop }
    refreshCursorRectsRef.current?.()
    refreshCommentRectsRef.current?.()
  }

  let scrollStateReadBlockedUntil = 0
  const syncScrollFromWorksheet = () => {
    if (Date.now() < scrollStateReadBlockedUntil) return
    const workbook = univerAPI.getActiveWorkbook?.()
    const worksheet = workbook?.getActiveSheet?.()
    if (!worksheet) return
    const dims = cellDimensionsRef.current
    const zoom = dims?.zoomRatio ?? 1
    const getColumnWidth = (c: number): number =>
      (dims?.columnData[c]?.w ?? dims?.defaultColWidth ?? CURSOR_OVERLAY_COL_WIDTH_PX) * zoom
    const getRowHeight = (r: number): number =>
      (dims?.rowData[r]?.h ?? dims?.defaultRowHeight ?? CURSOR_OVERLAY_ROW_HEIGHT_PX) * zoom
    let scrollState:
      | {
          sheetViewStartRow?: number
          sheetViewStartColumn?: number
          offsetX?: number
          offsetY?: number
        }
      | undefined
    try {
      scrollState = (
        worksheet as
          | {
              getScrollState?: () => {
                sheetViewStartRow?: number
                sheetViewStartColumn?: number
                offsetX?: number
                offsetY?: number
              }
            }
          | undefined
      )?.getScrollState?.()
    } catch {
      // Univer can throw while DI graph is still bootstrapping; retry shortly.
      scrollStateReadBlockedUntil = Date.now() + 500
      return
    }
    if (!scrollState) return
    const startCol = Math.max(0, scrollState.sheetViewStartColumn ?? 0)
    const startRow = Math.max(0, scrollState.sheetViewStartRow ?? 0)
    let left = 0
    let top = 0
    for (let c = 0; c < startCol; c++) left += getColumnWidth(c)
    for (let r = 0; r < startRow; r++) top += getRowHeight(r)
    left += (scrollState.offsetX ?? 0) * zoom
    top += (scrollState.offsetY ?? 0) * zoom
    if (Number.isFinite(left) && Number.isFinite(top)) {
      handleSheetScroll(left, top)
    }
  }

  syncScrollFromWorksheet()
  const scrollEventName = (univerAPI as { Event?: { Scroll?: string } }).Event?.Scroll ?? 'Scroll'
  const scrollEventDisposable = (
    univerAPI as {
      addEvent?(
        event: string,
        cb: (p: {
          sheetViewStartRow?: number
          sheetViewStartColumn?: number
          offsetX?: number
          offsetY?: number
        }) => void
      ): { dispose(): void }
    }
  ).addEvent?.(scrollEventName, () => {
    syncScrollFromWorksheet()
  })
  const activeWorksheet = univerAPI.getActiveWorkbook?.()?.getActiveSheet?.()
  const worksheetScrollDisposable = (
    activeWorksheet as {
      onScroll?: (cb: (s: unknown) => void) => { dispose(): void }
    }
  )?.onScroll?.(() => {
    syncScrollFromWorksheet()
  })
  const scrollPollIntervalId = setInterval(syncScrollFromWorksheet, 120)
  const activeWorksheetPollIntervalId = propsRef.current.multiSheetWorkbookMode
    ? setInterval(emitWorksheetFromUniver, 150)
    : null

  return {
    scrollEventDisposable,
    worksheetScrollDisposable,
    scrollPollIntervalId,
    activeWorksheetPollIntervalId
  }
}
