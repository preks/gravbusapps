/**
 * useSpreadsheetViewerState
 *
 * Core viewer state management: active sheet, active view, and local sheet data.
 * Handles syncing local data when switching sheets.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'

/** Sort sheet rows by optional `settings.rowOrder` (same logic as local viewer state). */
export function sortSpreadsheetRowsBySheetSettings(
  data: Record<string, unknown>[],
  sheet?: SpreadsheetSheet | { settings?: { rowOrder?: string[] } }
): Record<string, unknown>[] {
  const rowOrder = sheet?.settings?.rowOrder
  if (!rowOrder || rowOrder.length === 0) return data

  const orderMap = new Map(rowOrder.map((id, idx) => [id, idx]))
  return [...data].sort((a, b) => {
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

  // Sync from app.sheets when:
  // 1. User switches sheets (activeSheetId changes)
  // 2. A new sheet was added to the app (e.g. AI Summary after loadApp)
  // Avoid syncing on every app.sheets change so we don't overwrite in-flight automation
  // row updates (e.g. completed task writing to report sheet) before they're persisted.
  useEffect(() => {
    const currentSheetIds = app.sheets.map(s => s.id)
    const sheet = app.sheets.find(s => s.id === activeSheetId)
    const activeSheetChanged = prevSheetIdRef.current !== activeSheetId
    const newSheetAdded =
      currentSheetIds.length > prevSheetIdsRef.current.length ||
      currentSheetIds.some(id => !prevSheetIdsRef.current.includes(id))
    const forceSyncRequested = prevForceSyncTokenRef.current !== forceSyncToken

    if (activeSheetChanged || newSheetAdded || forceSyncRequested) {
      setLocalSheetData(sortByRowOrder(sheet?.data || [], sheet))
      prevSheetIdRef.current = activeSheetId
    }
    prevSheetIdsRef.current = currentSheetIds
    prevForceSyncTokenRef.current = forceSyncToken
  }, [activeSheetId, app.sheets, forceSyncToken])

  // Get active sheet
  const activeSheet = useMemo(
    () => app.sheets.find(s => s.id === activeSheetId) || app.sheets[0],
    [app.sheets, activeSheetId]
  )

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
