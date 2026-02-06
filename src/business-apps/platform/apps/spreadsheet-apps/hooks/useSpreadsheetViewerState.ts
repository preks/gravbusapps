/**
 * useSpreadsheetViewerState
 *
 * Core viewer state management: active sheet, active view, and local sheet data.
 * Handles syncing local data when switching sheets.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'

export interface UseSpreadsheetViewerStateProps {
  app: SpreadsheetApp
  initialSheetId?: string
  initialViewId?: string | null
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
  initialViewId
}: UseSpreadsheetViewerStateProps): SpreadsheetViewerState {
  // Active sheet state
  const [activeSheetId, setActiveSheetId] = useState(initialSheetId || app.sheets[0]?.id || '')

  // Active view state (read-only for now - no UI to change views)
  const [activeViewId] = useState<string | null>(initialViewId || null)

  // Sort data according to rowOrder from sheet settings (if present)
  const sortByRowOrder = (data: Record<string, unknown>[], sheet?: { settings?: { rowOrder?: string[] } }) => {
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

  // Track previous sheet ID to detect actual sheet changes
  const prevSheetIdRef = useRef(activeSheetId)

  // Sync from app.sheets when sheet ID changes (user switches sheets)
  useEffect(() => {
    if (prevSheetIdRef.current !== activeSheetId) {
      const sheet = app.sheets.find(s => s.id === activeSheetId)
      setLocalSheetData(sortByRowOrder(sheet?.data || [], sheet))
      prevSheetIdRef.current = activeSheetId
    }
  }, [activeSheetId, app.sheets])

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
