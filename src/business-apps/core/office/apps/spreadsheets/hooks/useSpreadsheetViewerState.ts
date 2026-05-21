/**
 * useSpreadsheetViewerState
 *
 * Active sheet / view selection and a **`localSheetDataRef`** used for bootstrap + tab-switch
 * snapshots from `app.sheets`. No duplicate React row array — canonical edits live in
 * SpreadsheetSession in SpreadsheetAppViewer (`useSpreadsheetSessionRowsRef` keeps this ref in sync).
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'

export interface UseSpreadsheetViewerStateProps {
  app: SpreadsheetApp
  initialSheetId?: string
  initialViewId?: string | null
  forceSyncToken?: number
}

export interface SpreadsheetViewerState {
  activeSheetId: string
  setActiveSheetId: (id: string) => void
  activeSheet: SpreadsheetSheet

  activeViewId: string | null
  activeView: SpreadsheetSheet['views'][0] | undefined

  /** Bootstrap / tab-switch rows from `app.sheets`; session-backed viewers override via ref sync. */
  localSheetDataRef: React.MutableRefObject<Record<string, unknown>[]>
}

export function useSpreadsheetViewerState({
  app,
  initialSheetId,
  initialViewId,
  forceSyncToken = 0
}: UseSpreadsheetViewerStateProps): SpreadsheetViewerState {
  const fallbackSheetRef = useRef<SpreadsheetSheet | null>(null)

  const [activeSheetId, setActiveSheetId] = useState(() => initialSheetId || app.sheets[0]?.id || '')
  const [activeViewId] = useState<string | null>(initialViewId || null)

  const localSheetDataRef = useRef<Record<string, unknown>[]>([])
  const didSeedRef = useRef(false)
  if (!didSeedRef.current) {
    const sheet = app.sheets.find(s => s.id === activeSheetId)
    localSheetDataRef.current = sortSpreadsheetRowsBySheetSettings(sheet?.data ?? [], sheet)
    didSeedRef.current = true
  }

  const prevSheetIdRef = useRef(activeSheetId)
  const prevSheetIdsRef = useRef<string[]>(app.sheets.map(s => s.id))
  const prevForceSyncTokenRef = useRef(forceSyncToken)

  useEffect(() => {
    const currentSheetIds = app.sheets.map(s => s.id)
    const sheet = app.sheets.find(s => s.id === activeSheetId)
    if (sheet) {
      fallbackSheetRef.current = sheet
    }
    const activeSheetChanged = prevSheetIdRef.current !== activeSheetId
    const activeSheetFirstAppeared =
      !prevSheetIdsRef.current.includes(activeSheetId) && currentSheetIds.includes(activeSheetId)
    const forceSyncRequested = prevForceSyncTokenRef.current !== forceSyncToken

    if (activeSheetChanged || activeSheetFirstAppeared || forceSyncRequested) {
      localSheetDataRef.current = sortSpreadsheetRowsBySheetSettings(sheet?.data ?? [], sheet)
      prevSheetIdRef.current = activeSheetId
    }
    prevSheetIdsRef.current = currentSheetIds
    prevForceSyncTokenRef.current = forceSyncToken
  }, [activeSheetId, app.sheets, forceSyncToken])

  const activeSheet = useMemo(() => {
    const matchedSheet = app.sheets.find(s => s.id === activeSheetId)
    if (matchedSheet) {
      fallbackSheetRef.current = matchedSheet
      return matchedSheet
    }

    if (fallbackSheetRef.current) {
      return {
        ...fallbackSheetRef.current,
        id: activeSheetId || fallbackSheetRef.current.id
      }
    }

    return app.sheets[0]
  }, [app.sheets, activeSheetId])

  const activeView = useMemo(() => {
    if (activeViewId) {
      return activeSheet?.views.find(v => v.id === activeViewId)
    }
    return activeSheet?.views.find(v => v.isDefault) || activeSheet?.views[0]
  }, [activeSheet, activeViewId])

  return {
    activeSheetId,
    setActiveSheetId,
    activeSheet,
    activeViewId,
    activeView,
    localSheetDataRef
  }
}
