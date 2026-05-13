import { useEffect } from 'react'
import type { RefObject } from 'react'
import { getHyperlinkUrlFromSelection } from '../utils/univerAdapter'
import {
  MERGE_WORKSHEET_COMMAND_ID,
  UNMERGE_WORKSHEET_COMMAND_ID,
  UNMERGE_WORKSHEET_MUTATION_ID
} from './univerGridMergeCommandIds'
import {
  createContextMenuItem,
  hideProtectContextMenuItem,
  isUniverSheetTabBarContextMenuTarget,
  removeInjectedContextMenuItem,
  scheduleContextMenuInjectionPoll,
  tryInjectContextMenuItem
} from './univerGridContextMenuDom'
import {
  type ClearAllRectangle,
  extractActiveRangePosition,
  resolveClearAllRanges,
  selectionIntersectsMergedRange
} from './univerGridRangeSelection'
import type { UniverGridController } from './useUniverGridController'

export type UniverGridContextMenuChromeDeps = Pick<
  UniverGridController,
  'univerAPIRef' | 'activeSelectionRef' | 'propsRef' | 'callbacksRef'
>

/**
 * Injects merge/unmerge, open-link, and comment entries into Univer's context menu via DOM observers.
 */
export function useUniverGridContextMenuChrome(
  params: {
    isReadOnly: boolean
    containerRef: RefObject<HTMLDivElement | null>
    mergeMenuLabels: { merge: string; unmerge: string }
    openLinkMenuLabel: string
  } & UniverGridContextMenuChromeDeps
): void {
  const {
    isReadOnly,
    containerRef,
    mergeMenuLabels,
    openLinkMenuLabel,
    univerAPIRef,
    activeSelectionRef,
    propsRef,
    callbacksRef
  } = params

  useEffect(() => {
    const container = containerRef.current
    if (!container || isReadOnly) return

    const customMarkerAttr = 'data-univer-custom-comment-item'
    const customClassName = 'univer-custom-comment-item'
    const openLinkMarkerAttr = 'data-univer-open-link-item'
    const openLinkClassName = 'univer-open-link-item'
    const mergeMarkerAttr = 'data-univer-merge-item'
    const mergeClassName = 'univer-merge-item'
    const unmergeMarkerAttr = 'data-univer-unmerge-item'
    const unmergeClassName = 'univer-unmerge-item'
    let contextMenuObserver: MutationObserver | null = null

    const createCommentItem = (template: HTMLElement) =>
      createContextMenuItem(template, customMarkerAttr, customClassName, 'Add comment', () => {
        callbacksRef.current.onOpenCommentRequest?.()
      })

    const injectComment = (x: number, y: number) => tryInjectContextMenuItem(x, y, customMarkerAttr, createCommentItem)
    const resolveSelectionRanges = (workbook: unknown): ClearAllRectangle[] => {
      const resolved = resolveClearAllRanges(workbook, undefined)
      if (resolved.length > 0) return resolved
      const active = activeSelectionRef.current ?? extractActiveRangePosition(workbook)
      if (!active) return []
      return [{ startRow: active.row, endRow: active.row, startColumn: active.col, endColumn: active.col }]
    }
    const getActiveWorksheetId = (workbook: unknown): string => {
      const activeSheet = (
        workbook as { getActiveSheet?: () => { getSheetId?: () => string } } | null | undefined
      )?.getActiveSheet?.()
      return activeSheet?.getSheetId?.() ?? propsRef.current.sheet.id
    }
    const getWorkbookSnapshot = (workbook: unknown): unknown => {
      try {
        return (
          (workbook as { save?: () => unknown; getSnapshot?: () => unknown } | null | undefined)?.save?.() ??
          (workbook as { getSnapshot?: () => unknown } | null | undefined)?.getSnapshot?.()
        )
      } catch {
        return null
      }
    }
    const getWorkbookUnitId = (workbook: unknown): string | undefined =>
      (workbook as { getUnitId?: () => string; getId?: () => string } | null | undefined)?.getUnitId?.() ??
      (workbook as { getId?: () => string } | null | undefined)?.getId?.()
    const executeMergeSelection = () => {
      const api = univerAPIRef.current
      const workbook = api?.getActiveWorkbook?.()
      if (!api || !workbook) return
      const ranges = resolveSelectionRanges(workbook)
      if (ranges.length === 0) return
      const unitId = getWorkbookUnitId(workbook)
      const subUnitId = getActiveWorksheetId(workbook)
      api.executeCommand?.(MERGE_WORKSHEET_COMMAND_ID, {
        ...(unitId ? { unitId } : {}),
        subUnitId,
        selections: ranges,
        ranges,
        defaultMerge: true
      })
    }
    const executeUnmergeSelection = () => {
      const api = univerAPIRef.current
      const workbook = api?.getActiveWorkbook?.()
      if (!api || !workbook) return
      const ranges = resolveSelectionRanges(workbook)
      if (ranges.length === 0) return
      const unitId = getWorkbookUnitId(workbook)
      const subUnitId = getActiveWorksheetId(workbook)
      const unmergePayload = {
        ...(unitId ? { unitId } : {}),
        subUnitId,
        sheetId: subUnitId,
        ranges
      }
      const result = api.executeCommand?.(UNMERGE_WORKSHEET_COMMAND_ID, unmergePayload)
      void Promise.resolve(result).then(commandResult => {
        if (commandResult === false) {
          api.executeCommand?.(UNMERGE_WORKSHEET_MUTATION_ID, unmergePayload)
        }
      })
    }
    const injectMerge = (x: number, y: number) => {
      const workbook = univerAPIRef.current?.getActiveWorkbook?.()
      if (!workbook) return false
      const ranges = resolveSelectionRanges(workbook)
      const sheetId = getActiveWorksheetId(workbook)
      if (ranges.length === 0 || selectionIntersectsMergedRange(getWorkbookSnapshot(workbook), sheetId, ranges)) {
        return false
      }
      return tryInjectContextMenuItem(x, y, mergeMarkerAttr, (template: HTMLElement) =>
        createContextMenuItem(
          template,
          mergeMarkerAttr,
          mergeClassName,
          mergeMenuLabels.merge,
          executeMergeSelection,
          'merge'
        )
      )
    }
    const injectUnmerge = (x: number, y: number) => {
      const workbook = univerAPIRef.current?.getActiveWorkbook?.()
      if (!workbook) return false
      const ranges = resolveSelectionRanges(workbook)
      const sheetId = getActiveWorksheetId(workbook)
      if (!selectionIntersectsMergedRange(getWorkbookSnapshot(workbook), sheetId, ranges)) return false
      return tryInjectContextMenuItem(x, y, unmergeMarkerAttr, (template: HTMLElement) =>
        createContextMenuItem(
          template,
          unmergeMarkerAttr,
          unmergeClassName,
          mergeMenuLabels.unmerge,
          executeUnmergeSelection,
          'unmerge'
        )
      )
    }
    const syncMergeContextMenuItem = (x: number, y: number) => {
      const workbook = univerAPIRef.current?.getActiveWorkbook?.()
      if (!workbook) return false
      const ranges = resolveSelectionRanges(workbook)
      const sheetId = getActiveWorksheetId(workbook)
      if (ranges.length === 0) {
        removeInjectedContextMenuItem(mergeMarkerAttr)
        removeInjectedContextMenuItem(unmergeMarkerAttr)
        return false
      }
      if (selectionIntersectsMergedRange(getWorkbookSnapshot(workbook), sheetId, ranges)) {
        removeInjectedContextMenuItem(mergeMarkerAttr)
        return injectUnmerge(x, y)
      }
      removeInjectedContextMenuItem(unmergeMarkerAttr)
      return injectMerge(x, y)
    }
    const injectOpenLink = (x: number, y: number) => {
      const wb = univerAPIRef.current?.getActiveWorkbook?.()
      const active = activeSelectionRef.current ?? extractActiveRangePosition(wb)
      if (active == null) return false
      const { data, columns, sheet } = propsRef.current
      let cellFormula: string | null = null
      try {
        const snap =
          (wb as { save?: () => unknown; getSnapshot?: () => unknown })?.save?.() ??
          (wb as { getSnapshot?: () => unknown })?.getSnapshot?.()
        const sheets =
          snap && typeof snap === 'object'
            ? ((snap as Record<string, unknown>).sheets as Record<
                string,
                { cellData?: Record<number | string, Record<number | string, { f?: string }>> }
              >)
            : null
        const sheetId =
          sheet?.id ??
          (Array.isArray((snap as Record<string, unknown>)?.sheetOrder)
            ? (snap as { sheetOrder: string[] }).sheetOrder[0]
            : '')
        const ws = sheetId ? sheets?.[sheetId] : null
        const rowCells = ws?.cellData?.[active.row] ?? ws?.cellData?.[String(active.row)]
        const cell =
          rowCells && typeof rowCells === 'object' ? (rowCells[active.col] ?? rowCells[String(active.col)]) : null
        if (cell?.f) cellFormula = cell.f
      } catch {
        /* ignore */
      }
      const url = getHyperlinkUrlFromSelection(active.row, active.col, data, columns, cellFormula)
      if (!url) return false
      return tryInjectContextMenuItem(x, y, openLinkMarkerAttr, (template: HTMLElement) =>
        createContextMenuItem(template, openLinkMarkerAttr, openLinkClassName, openLinkMenuLabel, () => {
          window.open(url, '_blank', 'noopener,noreferrer')
        })
      )
    }

    const stopObserver = () => {
      if (contextMenuObserver) {
        contextMenuObserver.disconnect()
        contextMenuObserver = null
      }
    }

    const pollInjection = (x: number, y: number, attempts: { count: number }, maxAttempts: number) => {
      attempts.count += 1
      hideProtectContextMenuItem()
      syncMergeContextMenuItem(x, y)
      injectOpenLink(x, y)
      if (injectComment(x, y)) {
        stopObserver()
        return
      }
      if (attempts.count < maxAttempts) {
        globalThis.setTimeout(() => pollInjection(x, y, attempts, maxAttempts), 50)
      } else {
        stopObserver()
      }
    }

    const onNativeContextMenu = (e: MouseEvent) => {
      if (isUniverSheetTabBarContextMenuTarget(e.target)) return
      const x = e.clientX
      const y = e.clientY
      const attempts = { count: 0 }
      stopObserver()
      contextMenuObserver = new MutationObserver(() => {
        hideProtectContextMenuItem()
        syncMergeContextMenuItem(x, y)
        injectOpenLink(x, y)
        if (injectComment(x, y)) stopObserver()
      })
      contextMenuObserver.observe(document.body, { childList: true, subtree: true })
      scheduleContextMenuInjectionPoll(() => pollInjection(x, y, attempts, 40))
    }

    container.addEventListener('contextmenu', onNativeContextMenu, true)
    return () => {
      stopObserver()
      container.removeEventListener('contextmenu', onNativeContextMenu, true)
    }
  }, [isReadOnly, mergeMenuLabels.merge, mergeMenuLabels.unmerge, openLinkMenuLabel])
}
