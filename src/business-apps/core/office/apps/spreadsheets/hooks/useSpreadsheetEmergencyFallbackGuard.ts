import { useEffect, useMemo, useState } from 'react'

import type { SpreadsheetColumn, ViewType } from '../types'
import type { UniverSheetGridInitLifecycleEvent } from '../components/UniverSheetGrid.types'

export interface UseSpreadsheetEmergencyFallbackGuardParams {
  appId: string
  activeSheetId: string
  viewType: ViewType
  testId: string
  workbookInstanceKey?: string
  /** After canonical snapshot seeding the grid can mount; defer blank-view probe until then. */
  isBootstrapCanonicalReady: boolean
  activeSheetColumns: SpreadsheetColumn[]
  sheetRowCount: number
  gridInitLifecycle: UniverSheetGridInitLifecycleEvent | null
}

export interface UseSpreadsheetEmergencyFallbackGuardResult {
  showEmergencyFallback: boolean
  emergencyFallbackColumns: SpreadsheetColumn[]
}

export function useSpreadsheetEmergencyFallbackGuard(
  params: UseSpreadsheetEmergencyFallbackGuardParams
): UseSpreadsheetEmergencyFallbackGuardResult {
  const {
    appId,
    activeSheetId,
    viewType,
    testId,
    workbookInstanceKey,
    isBootstrapCanonicalReady,
    activeSheetColumns,
    sheetRowCount,
    gridInitLifecycle
  } = params
  const [showEmergencyFallback, setShowEmergencyFallback] = useState(false)

  const emergencyFallbackColumns = useMemo(() => {
    const visible = activeSheetColumns.filter(column => column.isVisible !== false)
    if (visible.length > 0) return visible
    return activeSheetColumns
  }, [activeSheetColumns])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!isBootstrapCanonicalReady) {
      setShowEmergencyFallback(false)
      return
    }

    setShowEmergencyFallback(false)
    if (
      viewType === 'table' &&
      gridInitLifecycle &&
      gridInitLifecycle.sheetId === activeSheetId &&
      (!workbookInstanceKey || gridInitLifecycle.workbookInstanceKey === workbookInstanceKey) &&
      (gridInitLifecycle.phase === 'bootstrap_failed' || gridInitLifecycle.phase === 'canvas_timeout')
    ) {
      console.warn('[SpreadsheetAppViewer] Grid init lifecycle failed; showing emergency fallback', {
        appId,
        sheetId: activeSheetId,
        viewType,
        phase: gridInitLifecycle.phase,
        reason: gridInitLifecycle.reason,
        message: gridInitLifecycle.message,
        columns: activeSheetColumns.length,
        rows: sheetRowCount
      })
      setShowEmergencyFallback(true)
      return
    }
    if (
      viewType === 'table' &&
      gridInitLifecycle?.sheetId === activeSheetId &&
      (!workbookInstanceKey || gridInitLifecycle.workbookInstanceKey === workbookInstanceKey) &&
      gridInitLifecycle.phase
    ) {
      return
    }

    const checkId = globalThis.setTimeout(() => {
      const root = document.querySelector(`[data-testid="${testId}"]`)
      if (!root) return
      const hasUniverCanvas = Boolean(root.querySelector('[data-testid="univer-sheet-grid-container"] canvas'))
      const hasRenderedView = Boolean(
        root.querySelector(
          `[data-testid="${testId}-form-view"], [data-testid="${testId}-dashboard-view"], [data-testid="${testId}-kanban-view"]`
        )
      )
      if (!hasUniverCanvas && !hasRenderedView) {
        console.warn('[SpreadsheetAppViewer] Blank-view guard triggered; showing emergency fallback', {
          appId,
          sheetId: activeSheetId,
          viewType,
          columns: activeSheetColumns.length,
          rows: sheetRowCount
        })
        setShowEmergencyFallback(true)
      }
    }, 3500)

    return () => clearTimeout(checkId)
  }, [
    appId,
    activeSheetId,
    viewType,
    isBootstrapCanonicalReady,
    activeSheetColumns.length,
    sheetRowCount,
    testId,
    workbookInstanceKey,
    gridInitLifecycle
  ])

  return {
    showEmergencyFallback,
    emergencyFallbackColumns
  }
}
