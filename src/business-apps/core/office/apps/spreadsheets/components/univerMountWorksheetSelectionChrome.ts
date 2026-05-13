import { extractActiveRangePosition } from './univerGridRangeSelection'
import { COPY_ORIGIN_RESTORE_WINDOW_MS, FORMATTING_PASTE_INTENT_CLEANUP_WINDOW_MS } from './univerGridUniverConstants'
import type { FormattingPasteIntentSource } from './useUniverGridController'
import type { UniverGridController } from './useUniverGridController'

export type UniverMountWorksheetSelectionChromeRefs = Pick<
  UniverGridController,
  | 'univerAPIRef'
  | 'activeSelectionRef'
  | 'copiedSelectionAnchorRef'
  | 'pendingFormattingPasteIntentRef'
  | 'lastEmittedWorksheetIdRef'
  | 'callbacksRef'
>

/**
 * Active sheet discovery, selection restore after sheet switch, copy/paste intent
 * timestamps for formatting paste waves. Used by `mountUniverWorkbookBootstrap`.
 */
export function createUniverMountWorksheetSelectionChrome(refs: UniverMountWorksheetSelectionChromeRefs) {
  const {
    univerAPIRef,
    activeSelectionRef,
    copiedSelectionAnchorRef,
    pendingFormattingPasteIntentRef,
    lastEmittedWorksheetIdRef,
    callbacksRef
  } = refs

  const getActiveWorksheetIdFromUniver = (): string | null => {
    try {
      const wb = univerAPIRef.current?.getActiveWorkbook?.() as
        | {
            getActiveSheet?: () => { getSheetId?: () => string }
          }
        | undefined
      const activeWorksheet = wb?.getActiveSheet?.()
      return activeWorksheet?.getSheetId?.() ?? null
    } catch {
      return null
    }
  }

  const selectCellInWorksheet = (worksheetId: string, row: number, col: number): void => {
    try {
      const wb = univerAPIRef.current?.getActiveWorkbook?.() as
        | {
            getSheetBySheetId?: (id: string) => {
              getRange?: (row: number, col: number) => unknown
              setActiveSelection?: (range: unknown) => unknown
              setActiveRange?: (range: unknown) => unknown
            } | null
          }
        | undefined
      const worksheet = wb?.getSheetBySheetId?.(worksheetId)
      const range = worksheet?.getRange?.(row, col)
      if (!worksheet || !range) return
      ;(worksheet.setActiveSelection ?? worksheet.setActiveRange)?.(range)
      activeSelectionRef.current = { sheetId: worksheetId, row, col }
    } catch {
      /* ignore */
    }
  }

  const captureCopiedSelectionAnchor = (): void => {
    const workbook = univerAPIRef.current?.getActiveWorkbook?.()
    const worksheetId = getActiveWorksheetIdFromUniver()
    const cachedActive = activeSelectionRef.current
    const active =
      cachedActive && cachedActive.sheetId === worksheetId ? cachedActive : extractActiveRangePosition(workbook)
    if (!worksheetId || !active) return
    copiedSelectionAnchorRef.current = {
      sheetId: worksheetId,
      row: active.row,
      col: active.col,
      copiedAt: Date.now()
    }
  }

  let formattingPasteIntentSequence = 0

  const markFormattingPasteIntent = (source: FormattingPasteIntentSource = 'dom'): void => {
    formattingPasteIntentSequence += 1
    pendingFormattingPasteIntentRef.current = {
      id: formattingPasteIntentSequence,
      at: Date.now(),
      sheetId: getActiveWorksheetIdFromUniver(),
      source
    }
  }

  /** True while a paste-driven formatting wave is active; do not clear here — emit consumes the matching wave. */
  const peekPasteFormattingReplaceIntent = (sheetId: string): boolean => {
    const pending = pendingFormattingPasteIntentRef.current
    if (!pending) return false
    if (Date.now() - pending.at > FORMATTING_PASTE_INTENT_CLEANUP_WINDOW_MS) {
      pendingFormattingPasteIntentRef.current = null
      return false
    }
    if (pending.sheetId && pending.sheetId !== sheetId) return false
    return true
  }

  const restoreCopiedSelectionAnchorOnSheetSwitch = (worksheetId: string): void => {
    const anchor = copiedSelectionAnchorRef.current
    if (!anchor || anchor.sheetId === worksheetId) return
    if (Date.now() - anchor.copiedAt > COPY_ORIGIN_RESTORE_WINDOW_MS) {
      copiedSelectionAnchorRef.current = null
      return
    }

    globalThis.setTimeout(() => {
      const latest = copiedSelectionAnchorRef.current
      if (!latest || latest.sheetId === worksheetId) return
      selectCellInWorksheet(worksheetId, latest.row, latest.col)
    }, 0)
  }

  const emitWorksheetFromUniver = (): void => {
    try {
      const wb = univerAPIRef.current?.getActiveWorkbook?.() as
        | {
            getActiveSheet?: () => { getSheetId?: () => string; getSheetName?: () => string }
          }
        | undefined
      const activeWorksheet = wb?.getActiveSheet?.()
      const worksheetId = activeWorksheet?.getSheetId?.()
      if (!worksheetId || worksheetId === lastEmittedWorksheetIdRef.current) return
      lastEmittedWorksheetIdRef.current = worksheetId
      const worksheetName = typeof activeWorksheet?.getSheetName === 'function' ? activeWorksheet.getSheetName() : ''
      restoreCopiedSelectionAnchorOnSheetSwitch(worksheetId)
      callbacksRef.current.onActiveWorksheetChange?.(worksheetId, worksheetName)
    } catch {
      /* ignore */
    }
  }

  return {
    getActiveWorksheetIdFromUniver,
    captureCopiedSelectionAnchor,
    markFormattingPasteIntent,
    peekPasteFormattingReplaceIntent,
    emitWorksheetFromUniver
  }
}
