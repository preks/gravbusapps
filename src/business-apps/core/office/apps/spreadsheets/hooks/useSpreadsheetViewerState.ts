/**
 * useSpreadsheetViewerState
 *
 * Core viewer state management: active sheet, active view, and local sheet data.
 * Handles syncing local data when switching sheets.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'

function normalizeSpreadsheetViewerRowIds(data: Record<string, unknown>[]): Record<string, unknown>[] {
  const idCounts = new Map<string, number>()
  data.forEach(row => {
    const uiId = row._id ?? row.id
    const key = uiId == null ? '' : String(uiId)
    if (!key) return
    idCounts.set(key, (idCounts.get(key) ?? 0) + 1)
  })

  let mutated = false
  const normalized = data.map(row => {
    const uiId = row._id ?? row.id
    const key = uiId == null ? '' : String(uiId)
    if (!key || (idCounts.get(key) ?? 0) < 2) return row

    const backendRowId = row._rowUuid == null ? '' : String(row._rowUuid)
    if (!backendRowId || backendRowId === key) return row

    mutated = true
    return {
      ...row,
      _id: backendRowId
    }
  })

  return mutated ? normalized : data
}

/** Sort sheet rows by optional `settings.rowOrder` (same logic as local viewer state). */
export function sortSpreadsheetRowsBySheetSettings(
  data: Record<string, unknown>[],
  sheet?: SpreadsheetSheet | { settings?: { rowOrder?: string[] } }
): Record<string, unknown>[] {
  const normalizedData = normalizeSpreadsheetViewerRowIds(data)
  const rowOrder = sheet?.settings?.rowOrder
  if (!rowOrder || rowOrder.length === 0) return normalizedData

  const orderMap = new Map(rowOrder.map((id, idx) => [id, idx]))
  return [...normalizedData].sort((a, b) => {
    const aId = String(a._rowUuid ?? a._id ?? a.id ?? '')
    const bId = String(b._rowUuid ?? b._id ?? b.id ?? '')
    const aOrder = orderMap.get(aId) ?? Number.MAX_SAFE_INTEGER
    const bOrder = orderMap.get(bId) ?? Number.MAX_SAFE_INTEGER
    return aOrder - bOrder
  })
}

export interface UseSpreadsheetViewerStateProps {
  app: SpreadsheetApp
  initialSheetId?: string
  initialViewId?: string | null
  forceSyncToken?: number
}

export interface SpreadsheetViewerState {
  // Active sheet
  activeSheetId: string
  setActiveSheetId: (id: string) => void
  activeSheet: SpreadsheetSheet

  // Active view
  activeViewId: string | null
  activeView: SpreadsheetSheet['views'][0] | undefined

  // Local data
  localSheetData: Record<string, unknown>[]
  setLocalSheetData: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>
  localSheetDataRef: React.MutableRefObject<Record<string, unknown>[]>
}

export function useSpreadsheetViewerState({
  app,
  initialSheetId,
  initialViewId,
  forceSyncToken = 0
}: UseSpreadsheetViewerStateProps): SpreadsheetViewerState {
  const fallbackSheetRef = useRef<SpreadsheetSheet | null>(null)
  // Active sheet state
  const [activeSheetId, setActiveSheetId] = useState(initialSheetId || app.sheets[0]?.id || '')

  // Active view state (read-only for now - no UI to change views)
  const [activeViewId] = useState<string | null>(initialViewId || null)

  // Sort data according to rowOrder from sheet settings (if present)
  const sortByRowOrder = (data: Record<string, unknown>[], sheet?: SpreadsheetSheet) =>
    sortSpreadsheetRowsBySheetSettings(data, sheet)

  // Local data state - independent from app.sheets during editing
  const [localSheetData, setLocalSheetData] = useState<Record<string, unknown>[]>(() => {
    const sheet = app.sheets.find(s => s.id === activeSheetId)
    return sortByRowOrder(sheet?.data || [], sheet)
  })

  // Keep a ref to always have access to the LATEST localSheetData
  // Prevents stale closure issues when handlers are called rapidly
  const localSheetDataRef = useRef(localSheetData)
  useEffect(() => {
    localSheetDataRef.current = localSheetData
  }, [localSheetData])

  // Track previous sheet ID and sheet ids to detect changes
  const prevSheetIdRef = useRef(activeSheetId)
  const prevSheetIdsRef = useRef<string[]>(app.sheets.map(s => s.id))
  const prevForceSyncTokenRef = useRef(forceSyncToken)

  // Sync from app.sheets when the active sheet changes, the active sheet first
  // appears in app.sheets, or a caller explicitly forces a resync. Do not reload
  // the current active sheet just because another sheet was added: in multi-sheet
  // mode app.sheets[*].data can lag behind Univer's live workbook and would
  // overwrite the active tab with stale rows.
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
      setLocalSheetData(sortByRowOrder(sheet?.data || [], sheet))
      prevSheetIdRef.current = activeSheetId
    }
    prevSheetIdsRef.current = currentSheetIds
    prevForceSyncTokenRef.current = forceSyncToken
  }, [activeSheetId, app.sheets, forceSyncToken])

  // Get active sheet
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

  // Get active view
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
    localSheetData,
    setLocalSheetData,
    localSheetDataRef
  }
}
