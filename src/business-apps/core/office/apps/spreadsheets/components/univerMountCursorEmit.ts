import { createUniver } from '@univerjs/presets'
import { toA1Reference } from '../core'
import { buildSpreadsheetCursorPath } from './cursorPathUtils'
import { extractActiveRangeBounds } from './univerGridRangeSelection'
import { captureCutSelectionRange } from '../utils/spreadsheetCutPasteMove'
import type { FormattingPasteIntentSource, UniverGridController } from './useUniverGridController'

export type UniverMountCursorEmitRefs = Pick<
  UniverGridController,
  | 'univerAPIRef'
  | 'propsRef'
  | 'callbacksRef'
  | 'activeSelectionRef'
  | 'lastEmittedCursorPathRef'
  | 'pendingCutCellRangeRef'
> & {
  univerAPI: ReturnType<typeof createUniver>['univerAPI']
  reconcileSingleCell: (
    row: number | undefined,
    col: number | undefined,
    source: 'selection-reconcile' | 'deferred-reconcile',
    worksheetId?: string | null
  ) => void
  captureCopiedSelectionAnchor: () => void
  markFormattingPasteIntent: (source?: FormattingPasteIntentSource) => void
  getActiveWorksheetIdFromUniver: () => string | null
}

export type UniverMountCursorEmitHandles = {
  selectionDisposable: { dispose(): void } | undefined
  selectionChangeDisposable: { dispose(): void } | undefined
  currentSelectionChangeDisposable: { dispose(): void } | undefined
  captureCopyFromDomEvent: () => void
  captureCutFromDomEvent: () => void
  capturePasteFromDomEvent: () => void
  cursorPollIntervalId: ReturnType<typeof setInterval>
  clearPendingCursorTimeouts: () => void
}

/**
 * Collaboration cursor path emits + DOM copy/paste hooks + startup selection poll.
 */
export function registerUniverMountCursorEmit(refs: UniverMountCursorEmitRefs): UniverMountCursorEmitHandles {
  const {
    univerAPI,
    univerAPIRef,
    propsRef,
    callbacksRef,
    activeSelectionRef,
    lastEmittedCursorPathRef,
    reconcileSingleCell,
    captureCopiedSelectionAnchor,
    markFormattingPasteIntent,
    pendingCutCellRangeRef,
    getActiveWorksheetIdFromUniver
  } = refs

  const selectionEventKey =
    (univerAPI as { Event?: { SelectionMoveEnd?: string } }).Event?.SelectionMoveEnd ?? 'SelectionMoveEnd'

  let pendingCursorEmitTimeoutId: ReturnType<typeof setTimeout> | null = null
  let pendingCursorSelectionSyncTimeoutId: ReturnType<typeof setTimeout> | null = null

  const emitCursorByRowCol = (
    sheetId: string,
    startRow: number,
    startColumn: number,
    endRow?: number,
    endColumn?: number
  ) => {
    const canonicalSheetId = propsRef.current.getCanonicalSheetId?.(sheetId) ?? sheetId
    activeSelectionRef.current = { sheetId: canonicalSheetId, row: startRow, col: startColumn }
    const onCursorEmitCb = callbacksRef.current.onCursorEmit
    if (!onCursorEmitCb) return
    const a1 = toA1Reference(startRow, startColumn)
    const path = buildSpreadsheetCursorPath(canonicalSheetId, a1, startRow, startColumn, endRow, endColumn)
    const signature = path.join('|')
    if (lastEmittedCursorPathRef.current === signature) return
    lastEmittedCursorPathRef.current = signature
    onCursorEmitCb({ path })
  }

  const emitCursorFromWorksheetSelection = () => {
    const workbook = univerAPIRef.current?.getActiveWorkbook?.()
    const worksheet = workbook?.getActiveSheet?.()
    const worksheetId = (worksheet as { getSheetId?: () => string } | undefined)?.getSheetId?.()
    if (!worksheetId) return
    const canonicalWorksheetId = propsRef.current.getCanonicalSheetId?.(worksheetId) ?? worksheetId
    const selection = (
      worksheet as { getSelection?: () => { getCurrentCell?: () => unknown } | null } | undefined
    )?.getSelection?.()
    const currentCell = selection?.getCurrentCell?.() as
      | { actualRow?: number; actualColumn?: number; row?: number; column?: number }
      | undefined
    const rangeBounds = extractActiveRangeBounds(workbook)
    const anchorRow = currentCell?.actualRow ?? currentCell?.row
    const anchorCol = currentCell?.actualColumn ?? currentCell?.column
    const row = rangeBounds ? rangeBounds.startRow : anchorRow
    const col = rangeBounds ? rangeBounds.startColumn : anchorCol
    if (typeof row === 'number' && typeof col === 'number') {
      const previous = activeSelectionRef.current
      const trackedRow = typeof anchorRow === 'number' ? anchorRow : row
      const trackedCol = typeof anchorCol === 'number' ? anchorCol : col
      if (
        previous &&
        previous.sheetId === canonicalWorksheetId &&
        (previous.row !== trackedRow || previous.col !== trackedCol)
      ) {
        reconcileSingleCell(previous.row, previous.col, 'selection-reconcile', previous.sheetId)
      }
      const endRow = rangeBounds ? rangeBounds.endRow : undefined
      const endCol = rangeBounds ? rangeBounds.endColumn : undefined
      emitCursorByRowCol(canonicalWorksheetId, row, col, endRow, endCol)
      return
    }
    if (rangeBounds) {
      const previous = activeSelectionRef.current
      if (
        previous &&
        previous.sheetId === canonicalWorksheetId &&
        (previous.row !== rangeBounds.startRow || previous.col !== rangeBounds.startColumn)
      ) {
        reconcileSingleCell(previous.row, previous.col, 'selection-reconcile', previous.sheetId)
      }
      emitCursorByRowCol(
        canonicalWorksheetId,
        rangeBounds.startRow,
        rangeBounds.startColumn,
        rangeBounds.endRow,
        rangeBounds.endColumn
      )
    }
  }

  const scheduleCursorEmitFromWorksheetSelection = (delayMs = 80) => {
    if (pendingCursorSelectionSyncTimeoutId) {
      clearTimeout(pendingCursorSelectionSyncTimeoutId)
      pendingCursorSelectionSyncTimeoutId = null
    }
    pendingCursorSelectionSyncTimeoutId = setTimeout(() => {
      pendingCursorSelectionSyncTimeoutId = null
      emitCursorFromWorksheetSelection()
    }, delayMs)
  }

  const emitCursorFromSelectionEvent = () => {
    scheduleCursorEmitFromWorksheetSelection(80)
  }

  const selectionDisposable = (
    univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
  ).addEvent?.(selectionEventKey, emitCursorFromSelectionEvent)
  const selectionChangeDisposable = (
    univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
  ).addEvent?.('SelectionChanged', emitCursorFromSelectionEvent)
  const currentSelectionChangeDisposable = (
    univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
  ).addEvent?.('CurrentSelectionChanged', emitCursorFromSelectionEvent)

  const captureCopyFromDomEvent = () => {
    pendingCutCellRangeRef.current = null
    captureCopiedSelectionAnchor()
  }
  const captureCutFromDomEvent = () => {
    const sheetId = getActiveWorksheetIdFromUniver()
    const workbook = univerAPIRef.current?.getActiveWorkbook?.()
    if (!sheetId || !workbook) return
    const pendingCut = captureCutSelectionRange(workbook, sheetId)
    if (pendingCut) {
      pendingCutCellRangeRef.current = pendingCut
    }
  }
  const capturePasteFromDomEvent = () => {
    markFormattingPasteIntent('dom')
  }
  document.addEventListener('copy', captureCopyFromDomEvent, true)
  document.addEventListener('cut', captureCutFromDomEvent, true)
  document.addEventListener('paste', capturePasteFromDomEvent, true)

  const startupCursorPollStartedAt = Date.now()
  const cursorPollIntervalId = setInterval(() => {
    if (lastEmittedCursorPathRef.current) {
      clearInterval(cursorPollIntervalId)
      return
    }
    if (Date.now() - startupCursorPollStartedAt > 3000) {
      clearInterval(cursorPollIntervalId)
      return
    }
    emitCursorFromWorksheetSelection()
  }, 250)

  const clearPendingCursorTimeouts = () => {
    if (pendingCursorEmitTimeoutId) {
      clearTimeout(pendingCursorEmitTimeoutId)
      pendingCursorEmitTimeoutId = null
    }
    if (pendingCursorSelectionSyncTimeoutId) {
      clearTimeout(pendingCursorSelectionSyncTimeoutId)
      pendingCursorSelectionSyncTimeoutId = null
    }
  }

  return {
    selectionDisposable,
    selectionChangeDisposable,
    currentSelectionChangeDisposable,
    captureCopyFromDomEvent,
    captureCutFromDomEvent,
    capturePasteFromDomEvent,
    cursorPollIntervalId,
    clearPendingCursorTimeouts
  }
}
