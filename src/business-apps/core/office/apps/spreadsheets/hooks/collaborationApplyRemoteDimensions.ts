import type React from 'react'

import type { SpreadsheetRemoteDimensionsPayload } from '../core/SpreadsheetCollaborationContract'

const ECHO_WINDOW_MS = 5000

export interface CollaborationApplyRemoteDimensionsDeps {
  /** Current active sheet id (state); used so baseline maps track the visible sheet across renders. */
  activeSheetId: string
  spreadsheetGridRef: React.MutableRefObject<
    | {
        applyRemoteDimensions?: (payload: SpreadsheetRemoteDimensionsPayload) => void
      }
    | null
    | undefined
  >
  recentLocalRowHeightRef: React.MutableRefObject<Map<string, { height: number; at: number }>>
  recentLocalColWidthRef: React.MutableRefObject<Map<string, { width: number; at: number }>>
  baselineRowHeightsRef: React.MutableRefObject<Map<number, number>>
  baselineColWidthsRef: React.MutableRefObject<Map<number, number>>
}

/** Applies peer dimension deltas while stripping echoes of our own recent local resize dispatches. */
export function createCollaborationApplyRemoteDimensions(
  deps: CollaborationApplyRemoteDimensionsDeps
): (d: SpreadsheetRemoteDimensionsPayload) => void {
  const {
    activeSheetId,
    spreadsheetGridRef,
    recentLocalRowHeightRef,
    recentLocalColWidthRef,
    baselineRowHeightsRef,
    baselineColWidthsRef
  } = deps

  return (d: SpreadsheetRemoteDimensionsPayload) => {
    const now = Date.now()
    const sheetScopedKey = (idx: number) => `${d.sheetId}:${idx}`

    let filteredRowData = d.rowData
    if (recentLocalRowHeightRef.current.size > 0) {
      const filtered: Record<string, { h?: number; hd?: number }> = {}
      let changed = false
      for (const [rawIdx, entry] of Object.entries(d.rowData ?? {})) {
        const rowIndex = Number(rawIdx)
        const echo = recentLocalRowHeightRef.current.get(sheetScopedKey(rowIndex))
        if (
          echo &&
          now - echo.at < ECHO_WINDOW_MS &&
          typeof entry?.h === 'number' &&
          Math.round(entry.h) === Math.round(echo.height)
        ) {
          changed = true
          continue
        }
        filtered[rawIdx] = entry
      }
      if (changed) filteredRowData = filtered
    }

    let filteredColumnData = d.columnData
    if (recentLocalColWidthRef.current.size > 0) {
      const filtered: Record<string, { w?: number; hd?: number }> = {}
      let changed = false
      for (const [rawIdx, entry] of Object.entries(d.columnData ?? {})) {
        const colIndex = Number(rawIdx)
        const echo = recentLocalColWidthRef.current.get(sheetScopedKey(colIndex))
        if (
          echo &&
          now - echo.at < ECHO_WINDOW_MS &&
          typeof entry?.w === 'number' &&
          Math.round(entry.w) === Math.round(echo.width)
        ) {
          changed = true
          continue
        }
        filtered[rawIdx] = entry
      }
      if (changed) filteredColumnData = filtered
    }

    const isEmpty =
      Object.keys(filteredRowData ?? {}).length === 0 && Object.keys(filteredColumnData ?? {}).length === 0
    if (isEmpty) return

    spreadsheetGridRef.current?.applyRemoteDimensions?.({
      ...d,
      rowData: filteredRowData,
      columnData: filteredColumnData
    })

    if (d.sheetId === activeSheetId) {
      for (const [rawIdx, entry] of Object.entries(filteredRowData ?? {})) {
        const rowIndex = Number(rawIdx)
        if (Number.isFinite(rowIndex) && rowIndex >= 0 && typeof entry?.h === 'number') {
          baselineRowHeightsRef.current.set(rowIndex, Math.round(entry.h))
        }
      }
      for (const [rawIdx, entry] of Object.entries(filteredColumnData ?? {})) {
        const colIndex = Number(rawIdx)
        if (Number.isFinite(colIndex) && colIndex >= 0 && typeof entry?.w === 'number') {
          baselineColWidthsRef.current.set(colIndex, Math.round(entry.w))
        }
      }
    }
  }
}
