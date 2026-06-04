import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

import type { SpreadsheetMutationFacade } from '../core'
import type { CellDimensionsPayload, UniverSheetGridHandle } from '../components/UniverSheetGrid.types'
import type { SpreadsheetApp, SpreadsheetColumn, SpreadsheetSheet } from '../types'
import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import {
  applyColumnWidthsFromDimensions,
  areColumnWidthPatchesEquivalent,
  buildDimensionDeltaOps,
  extractDimensionBaselineFromSnapshot
} from '../utils/spreadsheetViewerDimensions'

import { runDimensionPersistFlush } from './spreadsheetDimensionPersistenceFlush'
import { handleSpreadsheetRemoteColumnUpdate } from './spreadsheetDimensionRemoteColumnHandler'

export interface UseSpreadsheetDimensionPersistenceParams {
  bootstrapSnapshot: unknown | null
  activeSheetId: string
  activeSheetColumns: SpreadsheetColumn[]
  canEditWithLockRef: MutableRefObject<boolean>
  emitDimensionSyncRef: MutableRefObject<(payload: CellDimensionsPayload) => void>
  applyLocalAppUpdate: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  onAppUpdate?: (app: SpreadsheetApp) => void
  onLocalAppUpdate?: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  mutationFacadeRef: MutableRefObject<SpreadsheetMutationFacade | null>
  enqueueSnapshotCheckpointRef: MutableRefObject<(() => Promise<void>) | null>
  appSheetsRef: MutableRefObject<SpreadsheetSheet[]>
  spreadsheetGridRef: MutableRefObject<UniverSheetGridHandle | null>
}

export interface UseSpreadsheetDimensionPersistenceResult {
  pendingColumnWidthOverrides: Record<string, number>
  handleDimensionsChanged: (payload: CellDimensionsPayload) => void
  handleRemoteColumnUpdate: (data: Record<string, unknown>) => void
  recentLocalColumnResizeRef: MutableRefObject<Map<string, { width: number; at: number }>>
  recentLocalRowHeightRef: MutableRefObject<Map<string, { height: number; at: number }>>
  recentLocalColWidthRef: MutableRefObject<Map<string, { width: number; at: number }>>
  baselineRowHeightsRef: MutableRefObject<Map<number, number>>
  baselineColWidthsRef: MutableRefObject<Map<number, number>>
}

export function useSpreadsheetDimensionPersistence(
  params: UseSpreadsheetDimensionPersistenceParams
): UseSpreadsheetDimensionPersistenceResult {
  const pendingDimensionColumnsRef = useRef<SpreadsheetColumn[] | null>(null)
  const pendingDimensionChangesRef = useRef<Array<{ columnId: string; width: number }>>([])
  const pendingDimensionOpsRef = useRef<SpreadsheetBatchOperation[]>([])
  const pendingDimensionPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recentLocalColumnResizeRef = useRef<Map<string, { width: number; at: number }>>(new Map())

  const baselineRowHeightsRef = useRef<Map<number, number>>(new Map())
  const baselineColWidthsRef = useRef<Map<number, number>>(new Map())
  const baselineDefaultRowHeightRef = useRef<number>(23)
  const baselineDefaultColWidthRef = useRef<number>(73)

  const recentLocalRowHeightRef = useRef<Map<string, { height: number; at: number }>>(new Map())
  const recentLocalColWidthRef = useRef<Map<string, { width: number; at: number }>>(new Map())
  const [pendingColumnWidthOverrides, setPendingColumnWidthOverrides] = useState<Record<string, number>>({})

  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    const baseline = extractDimensionBaselineFromSnapshot(params.bootstrapSnapshot ?? null, params.activeSheetId)
    baselineRowHeightsRef.current = baseline.rowHeights
    baselineColWidthsRef.current = baseline.colWidths
    baselineDefaultRowHeightRef.current = baseline.defaultRowHeight
    baselineDefaultColWidthRef.current = baseline.defaultColWidth
    pendingDimensionColumnsRef.current = null
    pendingDimensionChangesRef.current = []
    pendingDimensionOpsRef.current = []
    recentLocalRowHeightRef.current.clear()
    recentLocalColWidthRef.current.clear()
    setPendingColumnWidthOverrides({})
    if (pendingDimensionPersistTimeoutRef.current) {
      clearTimeout(pendingDimensionPersistTimeoutRef.current)
      pendingDimensionPersistTimeoutRef.current = null
    }
  }, [params.bootstrapSnapshot, params.activeSheetId])

  useEffect(() => {
    setPendingColumnWidthOverrides(prev => {
      const next: Record<string, number> = {}
      let changed = false
      params.activeSheetColumns.forEach(column => {
        const overrideWidth = prev[column.id]
        if (overrideWidth == null) return
        const currentWidth =
          typeof column.width === 'number' && Number.isFinite(column.width) ? Math.round(column.width) : undefined
        if (currentWidth === Math.round(overrideWidth)) {
          changed = true
          return
        }
        next[column.id] = overrideWidth
      })
      const prevKeys = Object.keys(prev)
      if (!changed && prevKeys.length === Object.keys(next).length) return prev
      return next
    })
  }, [params.activeSheetColumns])

  const clearPendingWidthOverridesForColumns = useCallback((columnIds: string[]) => {
    setPendingColumnWidthOverrides(prev => {
      if (columnIds.length === 0) return prev
      const updated = { ...prev }
      columnIds.forEach(id => {
        delete updated[id]
      })
      return updated
    })
  }, [])

  const handleRemoteColumnUpdate = useCallback(
    (data: Record<string, unknown>) => {
      handleSpreadsheetRemoteColumnUpdate(data, {
        activeSheetId: params.activeSheetId,
        pendingColumnWidthOverrides,
        appSheetsRef: params.appSheetsRef,
        applyLocalAppUpdate: params.applyLocalAppUpdate,
        onAppUpdate: params.onAppUpdate,
        onLocalAppUpdate: params.onLocalAppUpdate,
        spreadsheetGridRef: params.spreadsheetGridRef,
        recentLocalColumnResizeRef,
        baselineColWidthsRef
      })
    },
    [
      params.activeSheetId,
      params.applyLocalAppUpdate,
      params.onAppUpdate,
      params.onLocalAppUpdate,
      params.appSheetsRef,
      params.spreadsheetGridRef,
      pendingColumnWidthOverrides
    ]
  )

  const handleDimensionsChanged = useCallback(
    (payload: CellDimensionsPayload) => {
      const p = paramsRef.current
      if (!p.canEditWithLockRef.current) return
      if (payload.sheetId !== p.activeSheetId) {
        console.warn('[SpreadsheetAppViewer] Ignoring dimensions payload for inactive sheet', {
          payloadSheetId: payload.sheetId,
          activeSheetId: p.activeSheetId
        })
        return
      }

      const colResult = applyColumnWidthsFromDimensions(p.activeSheetColumns, payload)
      const hasColumnWidthChanges =
        !!colResult &&
        !areColumnWidthPatchesEquivalent(p.activeSheetColumns, pendingColumnWidthOverrides, colResult.changedColumns)

      const visibleSpreadsheetColCount = p.activeSheetColumns.reduce(
        (count, column) => (column.isVisible === false ? count : count + 1),
        0
      )
      const skippedColIndices = new Set<number>()
      for (let i = 0; i < visibleSpreadsheetColCount; i += 1) skippedColIndices.add(i)

      const dimensionOps = buildDimensionDeltaOps(
        payload,
        {
          defaultRowHeight: baselineDefaultRowHeightRef.current,
          defaultColWidth: baselineDefaultColWidthRef.current,
          rowHeights: baselineRowHeightsRef.current,
          colWidths: baselineColWidthsRef.current
        },
        skippedColIndices
      )

      if (!hasColumnWidthChanges && dimensionOps.length === 0) return

      if (hasColumnWidthChanges && colResult) {
        setPendingColumnWidthOverrides(prev => {
          const hasMaterialOverrideChange = colResult.changedColumns.some(
            change => prev[change.columnId] !== change.width
          )
          if (!hasMaterialOverrideChange) return prev
          const updated = { ...prev }
          colResult.changedColumns.forEach(change => {
            updated[change.columnId] = change.width
          })
          return updated
        })
        pendingDimensionColumnsRef.current = colResult.nextColumns
        pendingDimensionChangesRef.current = colResult.changedColumns
      } else {
        pendingDimensionColumnsRef.current = null
        pendingDimensionChangesRef.current = []
      }

      pendingDimensionOpsRef.current = dimensionOps

      if (pendingDimensionPersistTimeoutRef.current) {
        clearTimeout(pendingDimensionPersistTimeoutRef.current)
      }

      pendingDimensionPersistTimeoutRef.current = setTimeout(() => {
        pendingDimensionPersistTimeoutRef.current = null
        const columnsToPersist = pendingDimensionColumnsRef.current
        const changedColumns = pendingDimensionChangesRef.current
        const dimOps = pendingDimensionOpsRef.current
        pendingDimensionColumnsRef.current = null
        pendingDimensionChangesRef.current = []
        pendingDimensionOpsRef.current = []

        const q = paramsRef.current
        runDimensionPersistFlush(columnsToPersist, changedColumns, dimOps, {
          activeSheetId: q.activeSheetId,
          mutationFacadeRef: q.mutationFacadeRef,
          enqueueSnapshotCheckpointRef: q.enqueueSnapshotCheckpointRef,
          recentLocalColumnResizeRef,
          recentLocalRowHeightRef,
          recentLocalColWidthRef,
          baselineRowHeightsRef,
          baselineColWidthsRef,
          applyLocalAppUpdate: q.applyLocalAppUpdate,
          onAppUpdate: q.onAppUpdate,
          onLocalAppUpdate: q.onLocalAppUpdate,
          clearPendingWidthOverridesForColumns
        })
      }, 500)
    },
    [clearPendingWidthOverridesForColumns, pendingColumnWidthOverrides]
  )

  useEffect(() => {
    return () => {
      if (pendingDimensionPersistTimeoutRef.current) clearTimeout(pendingDimensionPersistTimeoutRef.current)
    }
  }, [])

  return {
    pendingColumnWidthOverrides,
    handleDimensionsChanged,
    handleRemoteColumnUpdate,
    recentLocalColumnResizeRef,
    recentLocalRowHeightRef,
    recentLocalColWidthRef,
    baselineRowHeightsRef,
    baselineColWidthsRef
  }
}
