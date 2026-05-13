import { useEffect, type MutableRefObject } from 'react'

import type { SpreadsheetSession, SpreadsheetSessionState } from '../core'

export interface UseSpreadsheetSessionRowsRefParams {
  spreadsheetSession: SpreadsheetSession
  activeSheetId: string
  /** Snapshot from `useSyncExternalStore(session.subscribe, () => session.getState(), …)` — updates when session mutates. */
  sessionSnapshot: SpreadsheetSessionState
  localSheetDataRef: MutableRefObject<Record<string, unknown>[]>
}

/**
 * Keeps `localSheetDataRef` aligned with canonical spreadsheet session rows for the active sheet.
 * Hooks that still read this ref (bulk rows, columns) see session-backed rows without mirroring into React state.
 */
export function useSpreadsheetSessionRowsRef(params: UseSpreadsheetSessionRowsRefParams): void {
  useEffect(() => {
    const sheetState = params.spreadsheetSession.getSheetState(params.activeSheetId)
    if (sheetState) {
      params.localSheetDataRef.current = sheetState.rows
    }
  }, [params.activeSheetId, params.spreadsheetSession, params.sessionSnapshot, params.localSheetDataRef])
}
