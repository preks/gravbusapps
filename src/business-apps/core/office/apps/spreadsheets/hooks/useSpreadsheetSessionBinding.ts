import { useEffect, useMemo, type MutableRefObject } from 'react'

import { createSpreadsheetSession, type SpreadsheetSession } from '../core'
import type { SpreadsheetSheet } from '../types'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'

export interface UseSpreadsheetSessionBindingParams {
  appId: string
  activeSheetId: string
  sheets: SpreadsheetSheet[]
  sheetVersionRef: MutableRefObject<number>
  workbookSnapshotVersionRef: MutableRefObject<number>
  sessionRef: MutableRefObject<SpreadsheetSession | null>
}

/**
 * Owns spreadsheet session construction and keeps it aligned with app sheets and active tab.
 * Session lifetime is one object per `appId`; tab switches call `setActiveSheet` only.
 * Rows already in session are preserved — server `sheet.data` seeds only new sheet ids (bootstrap).
 * Active-sheet version merges session, props, and `sheetVersionRef`; inactive sheets merge session + props only.
 */
export function useSpreadsheetSessionBinding({
  appId,
  activeSheetId,
  sheets,
  sheetVersionRef,
  workbookSnapshotVersionRef,
  sessionRef
}: UseSpreadsheetSessionBindingParams): SpreadsheetSession {
  const spreadsheetSession = useMemo(
    () =>
      createSpreadsheetSession({
        appId,
        activeSheetId,
        workbookSnapshotVersion: workbookSnapshotVersionRef.current,
        workbookSnapshot: null,
        sheets: sheets.map(sheet => ({
          sheet,
          rows: sortSpreadsheetRowsBySheetSettings(sheet.data ?? [], sheet) as Array<Record<string, unknown>>,
          version: Number(sheet.version ?? 0)
        }))
      }),
    /* Stable workbook-level session (keyed by appId only); reconcile sheets/active tab in useEffect below. */
    [appId]
  )

  sessionRef.current = spreadsheetSession

  useEffect(() => {
    spreadsheetSession.setActiveSheet(activeSheetId)

    for (const sheet of sheets) {
      const sortedServerRows = sortSpreadsheetRowsBySheetSettings(sheet.data ?? [], sheet) as Array<
        Record<string, unknown>
      >
      const existing = spreadsheetSession.getSheetState(sheet.id)

      if (existing) {
        const mergedVersion = Math.max(
          existing.version,
          Number(sheet.version ?? 0),
          sheet.id === activeSheetId ? sheetVersionRef.current : 0
        )
        spreadsheetSession.replaceSheetState(sheet, [...existing.rows], mergedVersion)
      } else {
        const initialVersion = Math.max(
          Number(sheet.version ?? 0),
          sheet.id === activeSheetId ? sheetVersionRef.current : 0
        )
        spreadsheetSession.replaceSheetState(sheet, sortedServerRows, initialVersion)
      }
    }
    spreadsheetSession.updateWorkbookSnapshot(null, workbookSnapshotVersionRef.current)
  }, [activeSheetId, sheets, spreadsheetSession])

  return spreadsheetSession
}
