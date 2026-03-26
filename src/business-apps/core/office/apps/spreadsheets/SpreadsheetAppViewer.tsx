/**
 * SpreadsheetAppViewer
 *
 * Runtime viewer for a generated spreadsheet app.
 * Standardized on the top-level `components/`, `hooks/`, `views/` structure (no `viewer/` directory).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'

import type { SpreadsheetAppViewerProps, SpreadsheetColumn, SpreadsheetSheet } from './types'
import { columnToFormField } from './types'
import {
  SpreadsheetApiService,
  SpreadsheetApiRequestError,
  revalidateSpreadsheetUniverSnapshotAfterIdleTab,
  type SpreadsheetBatchOperation,
  type SpreadsheetBatchOperationResponse
} from './services/SpreadsheetApiService'

import { useSpreadsheetViewerState } from './hooks/useSpreadsheetViewerState'
import { useSpreadsheetPersistenceIndicator, maxPersistDate } from './hooks/useSpreadsheetPersistenceIndicator'
import translations from './_i18n'
import { useSpreadsheetViewerCollaboration } from './hooks/useSpreadsheetViewerCollaboration'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { useSpreadsheetBulkRows } from './hooks/useSpreadsheetBulkRows'
import { useSpreadsheetColumns } from './hooks/useSpreadsheetColumns'
import { useVersionUserDisplays } from '@/business-apps/core/office/apps/documents/hooks/useVersionUserDisplays'

import { useVersioning } from '@/business-apps/platform/apps/shared/hooks/useVersioning'
import { useComments } from '@/business-apps/platform/apps/shared/hooks/useComments'
import { useFileLock } from '@/business-apps/platform/apps/shared/hooks/useFileLock'
import { usePublishing } from '@/business-apps/platform/apps/shared/hooks/usePublishing'

import { TableView, FormView, DashboardView, KanbanView } from './views'
import type { UniverSheetGridHandle, CellDimensionsPayload } from './components/UniverSheetGrid'
import { createUniverConversionContext } from './utils/univerAdapter'
import {
  readLatestUniverSnapshot,
  writeUniverSnapshotCache,
  clearUniverSnapshotCache
} from './utils/univerSnapshotCache'
import { exportSnapshotAsXlsx } from './utils/exportToExcel'
import { AutomationsPanel } from './components/AutomationsPanel'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { SheetsAIPanel } from './components/SheetsAIPanel'
import { EntityDataStatusBar } from './components/EntityDataStatusBar'
import { SpreadsheetDialogsSection } from './components/SpreadsheetDialogsSection'
import { SpreadsheetHeader } from './components/SpreadsheetHeader'
import { SpreadsheetSheetTabs } from './components/SpreadsheetSheetTabs'

const isSpreadsheetAppsDebugEnabled = (): boolean => {
  try {
    return (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.localStorage !== 'undefined' &&
      globalThis.localStorage.getItem('debug:spreadsheet-apps') === '1'
    )
  } catch {
    return false
  }
}

const debugLog = (...args: unknown[]) => {
  if (isSpreadsheetAppsDebugEnabled()) {
    console.debug('[SpreadsheetAppViewer]', ...args)
  }
}

/** Monotonic id for `debug:spreadsheet-apps=1` operation-queue traces */
let spreadsheetOpQueueJobSeq = 0

const debugOpQueue = (
  phase: 'enqueue' | 'start' | 'done' | 'fail',
  jobId: number,
  detail?: Record<string, unknown>
) => {
  if (!isSpreadsheetAppsDebugEnabled()) return
  console.debug('[SpreadsheetAppViewer][op-queue]', phase, { jobId, ...detail })
}

type ViewerRow = Record<string, unknown>
type CellChange = { rowId: string; columnName: string; value: unknown }

const viewerRowId = (row: Record<string, unknown>): string => {
  const id = row._id ?? row.id
  if (id == null) return ''
  if (typeof id === 'string') return id
  if (typeof id === 'number') return String(id)
  return ''
}

const SNAPSHOT_FETCH_TIMEOUT_MS = 15000

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const backendRowIdOf = (row: ViewerRow): string => String(row._rowUuid || row._id || row.id || '')

const fetchUniverSnapshotWithTimeout = async (
  appId: string,
  sheetId: string,
  timeoutMs: number
): Promise<{ version?: number; snapshot?: unknown }> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Snapshot fetch timed out')), timeoutMs)
  })
  return Promise.race([SpreadsheetApiService.getUniverSnapshot(appId, sheetId), timeoutPromise])
}

const buildAnalyticsInsertPayloads = (
  rows: Array<Record<string, unknown>>,
  columns: SpreadsheetColumn[]
): Array<Record<string, unknown>> =>
  rows
    .map(row => {
      const payload: Record<string, unknown> = {}
      columns.forEach(column => {
        if (row[column.name] !== undefined) {
          payload[column.name] = row[column.name]
        }
      })
      return payload
    })
    .filter(payload => Object.keys(payload).length > 0)

const applySetCellDelta = (rows: ViewerRow[], payload: Record<string, unknown>): ViewerRow[] => {
  const rowId = String(payload.rowId || '')
  const columnName = String(payload.columnName || '')
  const value = payload.value
  return rows.map(row => (backendRowIdOf(row) === rowId ? { ...row, [columnName]: value } : row))
}

const applySetRangeDelta = (rows: ViewerRow[], payload: Record<string, unknown>): ViewerRow[] => {
  const cells = Array.isArray(payload.cells) ? (payload.cells as Array<Record<string, unknown>>) : []
  const updatesByRowId = new Map<string, Record<string, unknown>>()
  for (const cell of cells) {
    const rowId = String(cell.rowId || '')
    const columnName = String(cell.columnName || '')
    if (!rowId || !columnName) continue
    const updates = updatesByRowId.get(rowId) ?? {}
    updates[columnName] = cell.value
    updatesByRowId.set(rowId, updates)
  }
  return rows.map(row => {
    const updates = updatesByRowId.get(backendRowIdOf(row))
    if (!updates) return row
    return { ...row, ...updates }
  })
}

const applyClearCellDelta = (rows: ViewerRow[], payload: Record<string, unknown>): ViewerRow[] => {
  const rowId = String(payload.rowId || '')
  const columnName = String(payload.columnName || '')
  return rows.map(row => {
    if (backendRowIdOf(row) !== rowId) return row
    const rowCopy = { ...row }
    delete rowCopy[columnName]
    return rowCopy
  })
}

const mapAddedRowsFromDeltaResult = (result: Record<string, unknown>): ViewerRow[] => {
  const rows = Array.isArray(result.rows) ? (result.rows as Array<Record<string, unknown>>) : []
  return rows.map(entry => {
    const rowData = ((entry.data as Record<string, unknown>) || {}) as Record<string, unknown>
    const clientRowId = rowData._clientRowId
    if (clientRowId) {
      return {
        ...rowData,
        _id: clientRowId,
        _rowUuid: (entry.id as string) || `row_${Math.random().toString(16).slice(2)}`
      }
    }
    return {
      ...rowData,
      _id: (entry.id as string) || `row_${Math.random().toString(16).slice(2)}`
    }
  })
}

const applyDeleteRowsDelta = (rows: ViewerRow[], payload: Record<string, unknown>): ViewerRow[] => {
  const rowIds = Array.isArray(payload.rowIds) ? (payload.rowIds as Array<unknown>).map(String) : []
  return rows.filter(row => !rowIds.includes(backendRowIdOf(row)))
}

const applySingleDeltaChange = (rows: ViewerRow[], change: unknown): ViewerRow[] => {
  const changeRecord = change as Record<string, unknown>
  const opType = String(changeRecord.operationType || '')
  const payload = (changeRecord.payload || {}) as Record<string, unknown>
  const result = (changeRecord.result || {}) as Record<string, unknown>

  switch (opType) {
    case 'set_cell':
      return applySetCellDelta(rows, payload)
    case 'set_range':
      return applySetRangeDelta(rows, payload)
    case 'clear_cell':
      return applyClearCellDelta(rows, payload)
    case 'add_rows':
      return [...rows, ...mapAddedRowsFromDeltaResult(result)]
    case 'delete_rows':
      return applyDeleteRowsDelta(rows, payload)
    default:
      return rows
  }
}

const applyDeltaChangesToRows = (baseRows: ViewerRow[], changes: unknown[] | undefined): ViewerRow[] => {
  let next = [...baseRows]
  for (const change of changes || []) {
    next = applySingleDeltaChange(next, change)
  }
  return next
}

const mapSnapshotRowsToViewerRows = (snapshotRows: unknown[]): ViewerRow[] =>
  snapshotRows.map(row => {
    const rowRecord = row as Record<string, unknown>
    const raw = (rowRecord.data as Record<string, unknown>) || {}
    const clientRowId = raw._clientRowId
    if (clientRowId) {
      return {
        ...raw,
        _id: clientRowId,
        _rowUuid: rowRecord.id as string
      }
    }
    return {
      ...raw,
      _id: rowRecord.id as string
    }
  })

const buildUiToBackendRowIdMap = (rows: ViewerRow[], isUuid: (value: string) => boolean): Map<string, string> => {
  const map = new Map<string, string>()
  rows.forEach(row => {
    const uiRowId = viewerRowId(row)
    if (!uiRowId) return
    const backendCandidate = String(row._rowUuid || '')
    if (isUuid(backendCandidate)) {
      map.set(uiRowId, backendCandidate)
      return
    }
    if (isUuid(uiRowId)) {
      map.set(uiRowId, uiRowId)
    }
  })
  return map
}

const partitionCellUpdatesByBackendRowId = (
  queuedCells: CellChange[],
  uiToBackendRowId: Map<string, string>,
  pendingClientRowUpdates: Map<string, Record<string, unknown>>,
  isUuid: (value: string) => boolean
): Map<string, Record<string, unknown>> => {
  const updatesByBackendRowId = new Map<string, Record<string, unknown>>()
  for (const cell of queuedCells) {
    const uiRowId = String(cell.rowId)
    const backendRowId = uiToBackendRowId.get(uiRowId) ?? (isUuid(uiRowId) ? uiRowId : undefined)
    if (!backendRowId) {
      const pending = pendingClientRowUpdates.get(uiRowId) ?? {}
      pending[cell.columnName] = cell.value
      pendingClientRowUpdates.set(uiRowId, pending)
      continue
    }
    const backendUpdates = updatesByBackendRowId.get(backendRowId) ?? {}
    backendUpdates[cell.columnName] = cell.value
    updatesByBackendRowId.set(backendRowId, backendUpdates)
  }
  return updatesByBackendRowId
}

const flattenUpdatesToCells = (
  updatesByBackendRowId: Map<string, Record<string, unknown>>
): Array<{ rowId: string; columnName: string; value: unknown }> =>
  Array.from(updatesByBackendRowId.entries()).flatMap(([rowId, updates]) =>
    Object.entries(updates).map(([columnName, value]) => ({
      rowId,
      columnName,
      value
    }))
  )

const buildAddRowPayloadsFromUniverRows = (
  rows: Array<Record<string, unknown>>,
  columns: SpreadsheetColumn[]
): Array<Record<string, unknown>> =>
  rows.map(row => {
    const payload: Record<string, unknown> = {}
    const clientRowId = String(row._id || '')
    if (clientRowId) payload._clientRowId = clientRowId
    columns.forEach(col => {
      const value = row[col.name]
      if (value !== undefined) payload[col.name] = value
    })
    return payload
  })

const chainOnOperationQueue = (
  queueRef: React.MutableRefObject<Promise<void>>,
  fn: () => Promise<void>
): Promise<void> => {
  const jobId = ++spreadsheetOpQueueJobSeq
  debugOpQueue('enqueue', jobId)

  const run = async () => {
    debugOpQueue('start', jobId)
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
    try {
      await fn()
      const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      debugOpQueue('done', jobId, { ms: Math.round(t1 - t0) })
    } catch (error) {
      const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      debugOpQueue('fail', jobId, {
        ms: Math.round(t1 - t0),
        message: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  const nextRun = queueRef.current.then(run, run)
  queueRef.current = nextRun.then(
    () => undefined,
    () => undefined
  )
  return nextRun
}

const buildDimensionPayloadFromSnapshot = (
  snapshotToSave: unknown,
  activeSheetId: string
): CellDimensionsPayload | null => {
  try {
    const snap = snapshotToSave as Record<string, unknown>
    const sheetOrder = snap?.sheetOrder as string[] | undefined
    const sheets = snap?.sheets as Record<string, Record<string, unknown>> | undefined
    const firstSheetId = sheetOrder?.[0]
    let sheetSnapRaw: unknown
    if (firstSheetId && sheets) {
      sheetSnapRaw = sheets[firstSheetId]
    } else if (sheets) {
      sheetSnapRaw = Object.values(sheets)[0]
    }
    const sheetSnap = sheetSnapRaw as Record<string, unknown> | undefined
    if (!sheetSnap) return null
    const rowHeader = sheetSnap.rowHeader as { width?: number } | undefined
    const columnHeader = sheetSnap.columnHeader as { height?: number } | undefined
    return {
      sheetId: activeSheetId,
      defaultColWidth: (sheetSnap.defaultColumnWidth as number | undefined) ?? 73,
      defaultRowHeight: (sheetSnap.defaultRowHeight as number | undefined) ?? 23,
      columnData: (sheetSnap.columnData as Record<string | number, { w?: number }>) ?? {},
      rowData: (sheetSnap.rowData as Record<string | number, { h?: number }>) ?? {},
      rowHeaderWidth: rowHeader?.width ?? 48,
      columnHeaderHeight: columnHeader?.height ?? 28,
      zoomRatio: (sheetSnap.zoomRatio as number | undefined) ?? 1
    }
  } catch {
    return null
  }
}

const buildCreatedRowsFromBatch = (
  rowPayloads: Array<Record<string, unknown>>,
  returnedRows: Array<Record<string, unknown>>,
  pendingUpdates: Map<string, Record<string, unknown>>
): {
  createdRows: Array<Record<string, unknown>>
  flushCells: Array<{ rowId: string; columnName: string; value: unknown }>
} => {
  const flushCells: Array<{ rowId: string; columnName: string; value: unknown }> = []
  const persistedIdByClientRowId = new Map<string, string>()
  returnedRows.forEach(entry => {
    const persistedId = entry.id
    if (typeof persistedId !== 'string' || !persistedId) return
    const data = entry.data
    if (!data || typeof data !== 'object') return
    const clientRowId = (data as Record<string, unknown>)._clientRowId
    if (typeof clientRowId === 'string' && clientRowId) {
      persistedIdByClientRowId.set(clientRowId, persistedId)
    }
  })
  const createdRows = rowPayloads.map((rowPayload, index) => {
    const clientRowId = String(rowPayload._clientRowId || '')
    const persistedId =
      (clientRowId ? persistedIdByClientRowId.get(clientRowId) : undefined) ??
      (returnedRows[index]?.id as string | undefined)
    const pending = clientRowId ? pendingUpdates.get(clientRowId) : undefined
    if (clientRowId && pending) {
      pendingUpdates.delete(clientRowId)
      if (persistedId) {
        for (const [columnName, value] of Object.entries(pending)) {
          flushCells.push({ rowId: persistedId, columnName, value })
        }
      }
    }
    const merged = pending ? { ...rowPayload, ...pending } : rowPayload
    return {
      ...merged,
      _id: clientRowId || persistedId || `temp_${index}`,
      ...(persistedId ? { _rowUuid: persistedId } : {})
    }
  })
  return { createdRows, flushCells }
}

const persistReconcileCellsLegacy = async (
  reconcileCells: Array<{ rowId: string; columnName: string; value: unknown }>,
  appId: string,
  sheetId: string,
  onRowUpdate?: (appId: string, sheetId: string, rowId: string, data: Record<string, unknown>) => Promise<unknown>
): Promise<void> => {
  for (const cell of reconcileCells) {
    if (onRowUpdate) {
      await onRowUpdate(appId, sheetId, cell.rowId, { [cell.columnName]: cell.value })
    } else {
      await SpreadsheetApiService.updateRow(appId, sheetId, cell.rowId, {
        [cell.columnName]: cell.value
      })
    }
  }
}

const getSnapshotSizeBytes = (snapshot: unknown): number | null => {
  try {
    return new Blob([JSON.stringify(snapshot)]).size
  } catch {
    try {
      return JSON.stringify(snapshot).length
    } catch {
      return null
    }
  }
}

const toComparableCellValue = (value: unknown): string => {
  if (value === undefined) return 'u:'
  if (value === null) return 'n:'
  if (typeof value === 'string') return `s:${value}`
  if (typeof value === 'number') return `d:${value}`
  if (typeof value === 'boolean') return `b:${value ? 1 : 0}`
  try {
    return `j:${JSON.stringify(value)}`
  } catch {
    return `x:${String(value)}`
  }
}

const getValidatedBackendRowId = (row: ViewerRow, isUuid: (value: string) => boolean): string | undefined => {
  const rowUuid = String(row._rowUuid || '')
  if (isUuid(rowUuid)) return rowUuid
  const uiId = viewerRowId(row)
  return isUuid(uiId) ? uiId : undefined
}

const loadBootstrapSnapshotData = async (
  appId: string,
  sheetId: string,
  minVersion: number
): Promise<{
  snapshot: Record<string, unknown> | null
  seed: string
  source: 'cache' | 'remote' | 'rows_fallback'
  version: number
  cacheWrite?: ReturnType<typeof writeUniverSnapshotCache>
}> => {
  const cached = readLatestUniverSnapshot(appId, sheetId, minVersion)
  if (cached?.snapshot) {
    return {
      snapshot: cached.snapshot,
      seed: `cache-v${cached.version}`,
      source: 'cache',
      version: cached.version
    }
  }

  const remote = await fetchUniverSnapshotWithTimeout(appId, sheetId, SNAPSHOT_FETCH_TIMEOUT_MS)
  const remoteVersion = Number(remote?.version ?? 0)
  const isRemoteSnapshotUsable = remoteVersion >= minVersion
  if (remote?.snapshot && typeof remote.snapshot === 'object' && isRemoteSnapshotUsable) {
    const cacheWrite = writeUniverSnapshotCache(appId, sheetId, remoteVersion, remote.snapshot)
    return {
      snapshot: remote.snapshot as Record<string, unknown>,
      seed: `remote-v${remoteVersion}`,
      source: 'remote',
      version: remoteVersion,
      cacheWrite
    }
  }

  return {
    snapshot: null,
    seed: `rows-fallback-v${minVersion}`,
    source: 'rows_fallback',
    version: remoteVersion
  }
}

const buildSnapshotReconcilePlan = ({
  cellData,
  visibleColumns,
  currentRows,
  persistedBaseline,
  isUuid
}: {
  cellData: Record<string, Record<string, unknown>> | undefined
  visibleColumns: SpreadsheetColumn[]
  currentRows: ViewerRow[]
  persistedBaseline: ViewerRow[]
  isUuid: (value: string) => boolean
}): {
  hasCellData: boolean
  updatesByRowIndex: Map<number, Record<string, unknown>>
  reconcileCells: Array<{ rowId: string; columnName: string; value: unknown }>
} => {
  const hasCellData = Boolean(cellData && typeof cellData === 'object')
  const updatesByRowIndex = new Map<number, Record<string, unknown>>()
  const reconcileCells: Array<{ rowId: string; columnName: string; value: unknown }> = []
  if (!hasCellData || !cellData) {
    return { hasCellData, updatesByRowIndex, reconcileCells }
  }

  const collectRowUpdates = (rowIndex: number, rowCells: Record<string, unknown>, backendRowId: string | null) => {
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex) || colIndex < 0) continue
      const columnName = visibleColumns[colIndex]?.name
      if (!columnName) continue

      const nextValue = rowCells[colKey]
      const persistedValue = (persistedBaseline[rowIndex] as Record<string, unknown> | undefined)?.[columnName]
      if (toComparableCellValue(persistedValue) === toComparableCellValue(nextValue)) continue

      const rowUpdates = updatesByRowIndex.get(rowIndex) ?? {}
      rowUpdates[columnName] = nextValue
      updatesByRowIndex.set(rowIndex, rowUpdates)

      if (backendRowId) {
        reconcileCells.push({ rowId: backendRowId, columnName, value: nextValue })
      }
    }
  }

  for (const rowKey of Object.keys(cellData)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex) || rowIndex < 0) continue
    const row = currentRows[rowIndex]
    if (!row) continue

    const rowCells = cellData[rowKey]
    if (!rowCells || typeof rowCells !== 'object') continue

    const backendRowId = getValidatedBackendRowId(row, isUuid)
    collectRowUpdates(rowIndex, rowCells as Record<string, unknown>, backendRowId)
  }

  return { hasCellData, updatesByRowIndex, reconcileCells }
}

const getWorksheetFromSnapshot = (snapshot: unknown, activeSheetId: string): Record<string, unknown> | undefined => {
  const workbook = snapshot as Record<string, unknown>
  const sheets = workbook.sheets as Record<string, unknown> | undefined
  if (!sheets) return undefined
  if (sheets[activeSheetId] != null) return sheets[activeSheetId] as Record<string, unknown>
  if (Array.isArray(workbook.sheetOrder)) {
    const orderedKey = workbook.sheetOrder[0] as string | undefined
    if (orderedKey && sheets[orderedKey] != null) return sheets[orderedKey] as Record<string, unknown>
  }
  const firstSheet = Object.values(sheets)[0]
  return firstSheet as Record<string, unknown> | undefined
}

const mergeRowsWithIndexUpdates = (
  rows: ViewerRow[],
  updatesByRowIndex: Map<number, Record<string, unknown>>
): ViewerRow[] =>
  rows.map((row, idx) => {
    const updates = updatesByRowIndex.get(idx)
    if (!updates) return row
    return { ...row, ...updates, _updatedAt: new Date().toISOString() }
  })

const saveSnapshotWithRetry = async ({
  appId,
  activeSheetId,
  baseSnapshot,
  sheetVersionRef,
  snapshotSaveMetricsRef,
  recoverFromVersionConflict,
  spreadsheetGridRef,
  collaboration,
  maxSnapshotRetries
}: {
  appId: string
  activeSheetId: string
  baseSnapshot: unknown
  sheetVersionRef: React.MutableRefObject<number>
  snapshotSaveMetricsRef: React.MutableRefObject<{
    attempts: number
    conflicts: number
    failures: number
    fallbackLoads: number
  }>
  recoverFromVersionConflict: () => Promise<void>
  spreadsheetGridRef: React.MutableRefObject<UniverSheetGridHandle | null>
  collaboration: {
    isCollaborationConnected: boolean
    emitOperation: (operation: { type: 'dimension_sync'; data: CellDimensionsPayload; broadcastOnly: true }) => void
  }
  maxSnapshotRetries: number
}): Promise<{ savedSnapshot: unknown; cacheResult: { stored: boolean; reason: string | null } }> => {
  let lastError: unknown
  for (let attempt = 0; attempt < maxSnapshotRetries; attempt++) {
    try {
      const snapshotToSave =
        attempt === 0 ? baseSnapshot : (spreadsheetGridRef.current?.getWorkbookSnapshot?.() ?? baseSnapshot)
      const cacheResult = writeUniverSnapshotCache(
        appId,
        activeSheetId,
        Number(sheetVersionRef.current || 0),
        snapshotToSave
      )
      await SpreadsheetApiService.saveUniverSnapshot(appId, activeSheetId, {
        version: sheetVersionRef.current,
        snapshot: snapshotToSave
      })
      if (collaboration.isCollaborationConnected) {
        const dimensionPayload = buildDimensionPayloadFromSnapshot(snapshotToSave, activeSheetId)
        if (dimensionPayload) {
          collaboration.emitOperation({
            type: 'dimension_sync',
            data: dimensionPayload,
            broadcastOnly: true
          })
        }
      }
      return { savedSnapshot: snapshotToSave, cacheResult }
    } catch (error) {
      lastError = error
      if (error instanceof SpreadsheetApiRequestError && error.status === 409 && attempt < maxSnapshotRetries - 1) {
        snapshotSaveMetricsRef.current.conflicts += 1
        await recoverFromVersionConflict()
        continue
      }
      snapshotSaveMetricsRef.current.failures += 1
      throw error
    }
  }
  throw lastError
}

const insertAnalyticsRowsWithOnRowAdd = async ({
  payloads,
  onRowAdd,
  appId,
  sheetId
}: {
  payloads: Array<Record<string, unknown>>
  onRowAdd: (
    appId: string,
    sheetId: string,
    rowData: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  appId: string
  sheetId: string
}): Promise<Array<Record<string, unknown>>> => {
  const createdRows: Array<Record<string, unknown>> = []
  for (const payload of payloads) {
    const created = await onRowAdd(appId, sheetId, payload)
    if (created) {
      createdRows.push({ ...payload, ...created })
    }
  }
  return createdRows
}

const insertAnalyticsRowsWithApiFallback = async ({
  payloads,
  appId,
  sheetId
}: {
  payloads: Array<Record<string, unknown>>
  appId: string
  sheetId: string
}): Promise<Array<Record<string, unknown>>> => {
  try {
    return await SpreadsheetApiService.bulkAddRows(appId, sheetId, payloads)
  } catch (error) {
    if (!(error instanceof SpreadsheetApiRequestError) || (error.status !== 404 && error.status !== 405)) {
      throw error
    }

    const createdRows: Array<Record<string, unknown>> = []
    for (const payload of payloads) {
      const created = await SpreadsheetApiService.addRow(appId, sheetId, payload)
      createdRows.push({ ...payload, ...created })
    }
    return createdRows
  }
}

export const SpreadsheetAppViewer: React.FC<SpreadsheetAppViewerProps> = ({
  app,
  activeSheetId: initialSheetId,
  activeViewId: initialViewId,
  onDataChange,
  onRowAdd,
  onRowUpdate,
  onAppUpdate,
  onSheetUpdate,
  onBack,
  onShare,
  onEdit,
  isEditing = true,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  type AnalyticsPanelTab = 'charts' | 'insights' | 'summary' | 'pivot'
  type SheetsAITab = 'formula' | 'analyze' | 'review' | 'insights'
  type AICapability = 'charts' | SheetsAITab

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sheetVersionRef = useRef<number>(0)
  const snapshotSaveMetricsRef = useRef({
    attempts: 0,
    conflicts: 0,
    failures: 0,
    fallbackLoads: 0
  })
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve())
  const pendingClientRowUpdatesRef = useRef<Map<string, Record<string, unknown>>>(new Map())
  const pendingCellChangesRef = useRef<Array<{ rowId: string; columnName: string; value: unknown }>>([])
  const pendingCellPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistenceTriggeredSnapshotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enqueueSnapshotCheckpointRef = useRef<(() => Promise<void>) | null>(null)
  const lastSuccessfulSnapshotCheckpointAtRef = useRef<number>(0)
  const latestUniverDataRef = useRef<Record<string, unknown>[] | null>(null)
  const univerDataChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProcessedLengthRef = useRef<number>(0)
  const lastPersistedSheetDataRef = useRef<Record<string, unknown>[]>([])
  const cellFlushSequenceRef = useRef<number>(0)
  const [bootstrapSnapshot, setBootstrapSnapshot] = useState<Record<string, unknown> | null>(null)
  const [bootstrapSnapshotSeed, setBootstrapSnapshotSeed] = useState<string>('none')
  const [isBootstrapSnapshotLoading, setIsBootstrapSnapshotLoading] = useState<boolean>(true)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [isSheetsAIOpen, setIsSheetsAIOpen] = useState(false)
  const [analyticsInitialTab, setAnalyticsInitialTab] = useState<AnalyticsPanelTab>('charts')
  const [sheetsAIInitialTab, setSheetsAIInitialTab] = useState<SheetsAITab>('formula')
  const UNIVER_DATA_CHANGE_DEBOUNCE_MS = 350
  // 400ms debounce batches rapid keystrokes into a single flush without noticeable delay.
  const CELL_PERSIST_DEBOUNCE_MS = 400
  const isOpsV2Enabled = useMemo(() => {
    try {
      return typeof globalThis === 'undefined' ? true : globalThis.localStorage.getItem('spreadsheetOpsV2') !== '0'
    } catch {
      return true
    }
  }, [])

  // --- Viewer State (sheet/view + local sheet data) ---
  const {
    activeSheetId,
    setActiveSheetId,
    activeSheet,
    activeView,
    localSheetData,
    setLocalSheetData,
    localSheetDataRef
  } = useSpreadsheetViewerState({
    app,
    initialSheetId,
    initialViewId: initialViewId ?? null
  })

  const sheetPersist = useSpreadsheetPersistenceIndicator(activeSheetId)
  const { t: sheetT } = useTranslation(translations)

  // --- Entity data source (optional per-sheet) ---
  const {
    state: entityState,
    loadData: loadEntityData,
    refresh: refreshEntityData
  } = useEntityDataSource({ accessToken, userId })
  const entityEnabled = Boolean(activeSheet.entityDataSource?.enabled)
  const entityEnabledRef = useRef(entityEnabled)
  entityEnabledRef.current = entityEnabled

  useEffect(() => {
    if (!entityEnabled || !activeSheet.entityDataSource) return
    void loadEntityData(activeSheet.entityDataSource)
  }, [activeSheetId, entityEnabled, activeSheet.entityDataSource, loadEntityData])

  const sheetData: Record<string, unknown>[] = useMemo(() => {
    if (!entityEnabled) return localSheetData
    return entityState.data?.records ?? []
  }, [entityEnabled, entityState.data?.records, localSheetData])

  const entityDataCount = entityEnabled ? (entityState.data?.count ?? 0) : localSheetData.length

  useEffect(() => {
    sheetVersionRef.current = Number(activeSheet.version ?? 0)
  }, [activeSheet.version, activeSheetId])

  useEffect(() => {
    let cancelled = false

    const setBootstrapState = (snapshot: Record<string, unknown> | null, seed: string) => {
      if (cancelled) return
      setBootstrapSnapshot(snapshot)
      setBootstrapSnapshotSeed(seed)
      setIsBootstrapSnapshotLoading(false)
    }

    const loadBootstrapSnapshot = async () => {
      if (entityEnabled) {
        setBootstrapState(null, 'entity-data-source')
        return
      }
      if (!activeSheetId) {
        setBootstrapState(null, 'no-sheet')
        return
      }

      setIsBootstrapSnapshotLoading(true)
      const minVersion = Number(activeSheet.version ?? 0)
      try {
        const result = await loadBootstrapSnapshotData(app.id, activeSheetId, minVersion)
        if (cancelled) return
        setBootstrapState(result.snapshot, result.seed)
        if (result.source === 'cache') {
          debugLog('bootstrap snapshot loaded from cache', {
            appId: app.id,
            sheetId: activeSheetId,
            version: result.version
          })
          return
        }
        if (result.source === 'remote') {
          debugLog('bootstrap snapshot loaded from backend', {
            appId: app.id,
            sheetId: activeSheetId,
            version: result.version,
            cacheStored: result.cacheWrite?.stored,
            cacheReason: result.cacheWrite?.reason
          })
          return
        }
        debugLog('bootstrap snapshot missing-or-stale; using row fallback', {
          appId: app.id,
          sheetId: activeSheetId,
          minVersion,
          remoteVersion: result.version
        })
      } catch (error) {
        if (cancelled) return
        setBootstrapState(null, `rows-fallback-error-v${minVersion}`)
        console.error('[SpreadsheetAppViewer] Failed to load backend Univer snapshot:', error)
      }
    }

    void loadBootstrapSnapshot()
    return () => {
      cancelled = true
    }
  }, [activeSheet.version, activeSheetId, app.id, entityEnabled])

  useEffect(() => {
    lastProcessedLengthRef.current = localSheetDataRef.current.length
    lastPersistedSheetDataRef.current = localSheetDataRef.current
  }, [activeSheetId])

  // --- Versioning / Comments / Lock / Publishing ---

  // Called by useVersioning after a successful version restore.
  // The backend has already replaced all row data; we need to:
  //   1. Re-fetch the full app so we have the restored rows
  //   2. Wipe the stale Univer snapshot from localStorage (it reflects pre-restore data)
  //   3. Push fresh rows into localSheetData
  //   4. Force Univer to reinitialise from the fresh rows (bump snapshotSeed with no snapshot)
  const handleVersionRestored = useCallback(async () => {
    // Always bump the seed at the end so Univer reinitialises even if individual
    // fetches below fail.  We track what we managed to load so we can provide the
    // best possible initialisation (snapshot > rows > empty).
    let restoredRows: Record<string, unknown>[] | null = null
    let restoredUniverSnapshot: Record<string, unknown> | null = null

    // 1. Fetch fresh app data (rows + columns) from the backend.
    try {
      const freshApp = await SpreadsheetApiService.getApp(app.id)
      if (freshApp) {
        for (const sheet of freshApp.sheets) {
          clearUniverSnapshotCache(app.id, sheet.id)
        }
        onAppUpdate?.(freshApp)
        restoredRows = freshApp.sheets.find(s => s.id === activeSheetId)?.data ?? []
        setLocalSheetData(restoredRows)
        lastPersistedSheetDataRef.current = restoredRows
      } else {
        console.warn('[SpreadsheetAppViewer] getApp returned null after restore; Univer will reinit with previous rows')
      }
    } catch (err) {
      console.warn('[SpreadsheetAppViewer] Could not fetch app after restore:', err)
    }

    // 2. Fetch the restored Univer snapshot (includes cell styling, merges, formulas).
    //    The backend wrote it to the sheet row during restoreToVersion; use it to boot
    //    Univer so the visual state matches the checkpoint exactly.
    try {
      const univerData = await SpreadsheetApiService.getUniverSnapshot(app.id, activeSheetId)
      if (univerData?.snapshot && typeof univerData.snapshot === 'object') {
        restoredUniverSnapshot = univerData.snapshot
        writeUniverSnapshotCache(app.id, activeSheetId, univerData.version, univerData.snapshot)
      }
    } catch (e) {
      console.warn('[SpreadsheetAppViewer] Could not fetch restored Univer snapshot:', e)
    }

    // 3. Always reinitialise Univer regardless of what succeeded above.
    //    bootstrapSnapshot = null falls back to buildWorkbookSnapshot from rows.
    setBootstrapSnapshot(restoredUniverSnapshot)
    setBootstrapSnapshotSeed(`restore-${Date.now()}`)
    sheetPersist.recordSuccess(true)
  }, [activeSheetId, app.id, onAppUpdate, setLocalSheetData, sheetPersist.recordSuccess])

  const versioning = useVersioning({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService,
    autoSaveEnabled: true,
    autoSaveInterval: 30000,
    onVersionRestored: handleVersionRestored
  })
  const versionUserDisplayMap = useVersionUserDisplays(versioning.versions, accessToken)

  const headerSaveStatus = useMemo(
    () => ({
      versioning: {
        isSaving: versioning.isSaving || sheetPersist.isSaving,
        hasUnsavedChanges: versioning.hasUnsavedChanges || sheetPersist.hasLocalDirty || Boolean(sheetPersist.error),
        lastSaveTime: maxPersistDate(versioning.lastSaveTime, sheetPersist.lastPersistedAt)
      },
      persistenceError: sheetPersist.error
    }),
    [
      versioning.isSaving,
      versioning.lastSaveTime,
      versioning.hasUnsavedChanges,
      sheetPersist.isSaving,
      sheetPersist.hasLocalDirty,
      sheetPersist.lastPersistedAt,
      sheetPersist.error
    ]
  )

  const comments = useComments({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService
  })

  const publishing = usePublishing({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    currentStatus: app.publishMetadata?.status || 'draft',
    apiService: SpreadsheetApiService
  })

  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showComments, setShowComments] = useState(false)

  // Bump snapshot seed so Univer reinitializes with fresh data when automation adds/updates rows.
  // Clear bootstrap snapshot so the grid builds from current localSheetData (which has the new rows).
  const requestGridRefresh = useCallback(() => {
    setBootstrapSnapshot(null)
    setBootstrapSnapshotSeed(prev => `${prev}-refresh-${Date.now()}`)
  }, [])

  // --- Bulk row handlers (used by automation responses) ---
  const bulkRows = useSpreadsheetBulkRows({
    app,
    activeSheet: activeSheet ?? null,
    localSheetDataRef,
    setLocalSheetData,
    onDataChange,
    onAppUpdate,
    onSheetUpdate,
    onRowUpdate,
    onRowAdd,
    saveTimeoutRef,
    onRequestGridRefresh: requestGridRefresh
  })

  // Persist automations/workflow links back into the sheet config
  const persistSheetPatch = useCallback(
    (patch: Partial<SpreadsheetSheet>) => {
      if (onSheetUpdate) {
        void onSheetUpdate(app.id, activeSheetId, patch)
        return
      }
      if (!onAppUpdate) return
      const updatedSheets = app.sheets.map(sheet =>
        sheet.id === activeSheetId ? { ...sheet, ...patch, data: localSheetDataRef.current } : sheet
      )
      onAppUpdate({ ...app, sheets: updatedSheets })
    },
    [app, activeSheetId, localSheetDataRef, onAppUpdate, onSheetUpdate]
  )

  const automations = useSpreadsheetAutomations({
    spreadsheetId: app.id,
    sheetId: activeSheetId,
    accessToken,
    currentUserId: userId || '',
    initialAutomations: activeSheet.automations || [],
    initialWorkflowLinks: activeSheet.workflowLinks || [],
    onAutomationsChange: newAutomations => persistSheetPatch({ automations: newAutomations }),
    onWorkflowLinksChange: newLinks => persistSheetPatch({ workflowLinks: newLinks }),
    onAddRows: bulkRows.handleAddRows,
    onUpdateRows: bulkRows.handleUpdateRows,
    enablePolling: true,
    pollInterval: 30000
  })

  const [hasTaskForCollectionCopy, setHasTaskForCollectionCopy] = useState(false)
  const fromCollectionLink =
    typeof globalThis !== 'undefined' && new URLSearchParams(globalThis.location.search).get('excel_collection') === '1'
  const isCollectionCopy = Boolean(
    (app.settings as Record<string, unknown> | undefined)?.excel_collection_copy ||
      hasTaskForCollectionCopy ||
      fromCollectionLink
  )
  const isCopyOwner = Boolean(userId && app.createdBy && app.createdBy === userId)
  const canSubmitCollection = Boolean(
    (((app.settings as Record<string, unknown> | undefined)?.excel_collection_copy as boolean | undefined) &&
      isCopyOwner) ||
      hasTaskForCollectionCopy
  )
  const collectionSubmittedAt = ((app.settings as Record<string, unknown> | undefined)?.excel_collection_submitted_at ||
    null) as string | null
  const collectionCopyFlagPersistedRef = useRef(false)

  useEffect(() => {
    if (collectionCopyFlagPersistedRef.current) return
    if (!fromCollectionLink) return
    if ((app.settings as Record<string, unknown> | undefined)?.excel_collection_copy === true) return

    collectionCopyFlagPersistedRef.current = true
    const nextSettings = { ...app.settings, excel_collection_copy: true }
    void SpreadsheetApiService.updateApp(app.id, { settings: nextSettings })
      .then(() => {
        onAppUpdate?.({ ...app, settings: nextSettings })
      })
      .catch(() => {
        collectionCopyFlagPersistedRef.current = false
      })
  }, [app, fromCollectionLink, onAppUpdate])

  useEffect(() => {
    if (
      (app.settings as Record<string, unknown> | undefined)?.excel_collection_copy ||
      !userId ||
      !app.id ||
      !automations.hasExcelCollectionTaskForApp
    ) {
      return
    }
    let isUnmounted = false
    const runCheck = () =>
      void automations.hasExcelCollectionTaskForApp(app.id).then(has => {
        if (!isUnmounted && has) setHasTaskForCollectionCopy(true)
      })
    runCheck()
    const retryTimer = globalThis.setTimeout(() => {
      runCheck()
    }, 1500)
    return () => {
      isUnmounted = true
      globalThis.clearTimeout(retryTimer)
    }
  }, [app.id, app.settings, userId, automations.hasExcelCollectionTaskForApp])

  const handleSubmitCollection = useCallback(async () => {
    if (!userId || !automations.completeExcelCollectionTask) return

    // Gather spreadsheet row data so it gets captured in the report sheet
    const internalKeys = new Set([
      '_id',
      '_createdAt',
      '_updatedAt',
      '_workflow_id',
      '_recipient_id',
      '_isBulkCollectionPending',
      '_automationId'
    ])
    let formData: Record<string, unknown> | undefined
    const sourceRows = localSheetDataRef.current
    if (sourceRows?.length > 0) {
      const firstDataRow = sourceRows.find(row =>
        Object.entries(row).some(([k, v]) => !internalKeys.has(k) && v != null && String(v).trim() !== '')
      )
      if (firstDataRow) {
        formData = {}
        for (const [key, value] of Object.entries(firstDataRow)) {
          if (!internalKeys.has(key) && value != null && value !== '') {
            formData[key] = value
          }
        }
        // Include column headers so the response sheet gets proper labels (not "Unnamed Column")
        const columnLabels: Record<string, string> = {}
        for (const col of activeSheet.columns.filter(c => c.isVisible !== false)) {
          if (col.label?.trim()) columnLabels[col.name] = col.label.trim()
        }
        if (Object.keys(columnLabels).length > 0) {
          formData.__columnLabels__ = columnLabels
        }
      }
    }

    const result = await automations.completeExcelCollectionTask(app.id, formData)
    if (result.success) {
      const submittedAt = new Date().toISOString()
      try {
        await SpreadsheetApiService.updateApp(app.id, {
          settings: { ...app.settings, excel_collection_submitted_at: submittedAt }
        })
        onAppUpdate?.({
          ...app,
          settings: { ...app.settings, excel_collection_submitted_at: submittedAt }
        })
      } catch {
        // Non-critical: task completion already succeeded on workflow side.
      }
      toast.success('Submitted successfully. Your task is now complete.')
      onBack?.()
    } else {
      toast.error(result.error || 'Failed to submit')
    }
  }, [activeSheet.columns, app, automations.completeExcelCollectionTask, onAppUpdate, onBack, userId])

  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false)
  const handleOpenAICapability = useCallback((capability: AICapability) => {
    if (capability === 'charts') {
      setAnalyticsInitialTab('charts')
      setIsSheetsAIOpen(false)
      setIsAutomationsOpen(false)
      setIsAnalyticsOpen(true)
      return
    }

    setSheetsAIInitialTab(capability as SheetsAITab)
    setIsAnalyticsOpen(false)
    setIsAutomationsOpen(false)
    setIsSheetsAIOpen(true)
  }, [])
  const [isExporting, setIsExporting] = useState(false)

  const spreadsheetGridRef = useRef<UniverSheetGridHandle | null>(null)
  const commentedCells = useMemo(() => {
    const allComments = Array.isArray(comments.comments) ? comments.comments : []
    const roots = allComments
      .filter(comment => {
        const record = comment as {
          type?: string
          parentId?: string
          resolvedAt?: string
          sheetId?: string
          cellReference?: string
          content?: string
          createdByName?: string
          createdByAvatar?: string
          createdAt?: string
        }
        return (
          record.type === 'cell' &&
          !record.parentId &&
          !record.resolvedAt &&
          typeof record.cellReference === 'string' &&
          record.cellReference.trim().length > 0 &&
          (!record.sheetId || record.sheetId === activeSheetId)
        )
      })
      .map(comment => {
        const record = comment as {
          cellReference: string
          content?: string
          createdByName?: string
          createdByAvatar?: string
          createdAt?: string
        }
        return {
          cellReference: record.cellReference.trim().toUpperCase(),
          content: String(record.content || ''),
          createdByName: record.createdByName,
          createdByAvatar: record.createdByAvatar,
          createdAt: record.createdAt
        }
      })
    const latestByCell = new Map<
      string,
      { cellReference: string; content: string; createdByName?: string; createdByAvatar?: string; createdAt?: string }
    >()
    for (const comment of roots) {
      const existing = latestByCell.get(comment.cellReference)
      if (!existing) {
        latestByCell.set(comment.cellReference, comment)
        continue
      }
      const existingTs = existing.createdAt ? Date.parse(existing.createdAt) : 0
      const nextTs = comment.createdAt ? Date.parse(comment.createdAt) : 0
      if (nextTs >= existingTs) {
        latestByCell.set(comment.cellReference, comment)
      }
    }
    return Array.from(latestByCell.values())
  }, [comments.comments, activeSheetId])
  const getSelectedCellRef = useCallback(
    (): string | null => spreadsheetGridRef.current?.getActiveCellReference?.() ?? null,
    []
  )
  const handleOpenCommentRequest = useCallback(() => {
    setShowComments(true)
  }, [])

  const resolveRemoteCellCoordinates = useCallback(
    (
      columnKey: string,
      remoteRowId: string
    ): {
      rowIndex: number | undefined
      colIndex: number | undefined
      targetColumnName: string
    } => {
      const ctx = createUniverConversionContext(activeSheet.columns, localSheetDataRef.current)
      let rowIndex = ctx.rowIdToIndex.get(remoteRowId)
      if (rowIndex === undefined) {
        const fallbackIndex = localSheetDataRef.current.findIndex(row => backendRowIdOf(row) === remoteRowId)
        if (fallbackIndex >= 0) rowIndex = fallbackIndex
      }

      let colIndex = ctx.columnIdToIndex.get(columnKey)
      if (colIndex === undefined) {
        colIndex = activeSheet.columns.findIndex(c => c.id === columnKey || c.name === columnKey)
      }

      const targetColumnName =
        activeSheet.columns.find(c => c.id === columnKey)?.name ??
        activeSheet.columns.find(c => c.name === columnKey)?.name ??
        String(columnKey)

      return { rowIndex, colIndex, targetColumnName }
    },
    [activeSheet.columns, localSheetDataRef]
  )

  // --- Collaboration (header presence + Univer grid operations/cursors) ---
  const handleCollaborationOperation = useCallback(
    (payload: { operation: { type: string; data?: unknown }; version?: number }) => {
      const operation = payload.operation
      if (operation.type === 'dimension_sync') {
        const d = operation.data as CellDimensionsPayload | undefined
        if (d?.sheetId === activeSheetId && spreadsheetGridRef.current?.applyRemoteDimensions) {
          spreadsheetGridRef.current.applyRemoteDimensions(d)
        }
        return
      }
      if (operation.type !== 'cell_update' && operation.type !== 'cell_change') return
      const d = operation.data as {
        sheetId?: string
        rowId?: string
        column?: string
        columnId?: string
        value?: unknown
      }
      if (!d?.sheetId || d.sheetId !== activeSheetId || d.rowId == null || d.value === undefined) return
      const columnKey = d.column ?? d.columnId
      if (columnKey == null) return
      const remoteRowId = String(d.rowId)
      const { rowIndex, colIndex, targetColumnName } = resolveRemoteCellCoordinates(String(columnKey), remoteRowId)
      const nextLocal = localSheetDataRef.current.map(row => {
        if (backendRowIdOf(row) !== remoteRowId) return row
        return { ...row, [targetColumnName]: d.value, _updatedAt: new Date().toISOString() }
      })
      setLocalSheetData(nextLocal)
      lastPersistedSheetDataRef.current = nextLocal
      onDataChange?.(activeSheetId, nextLocal)

      if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
        spreadsheetGridRef.current?.applyRemoteCellUpdate(rowIndex, colIndex, d.value)
      }
    },
    [activeSheetId, localSheetDataRef, onDataChange, resolveRemoteCellCoordinates, setLocalSheetData]
  )

  const collaboration = useSpreadsheetViewerCollaboration({
    appId: app.id,
    accessToken,
    onOperationReceived: handleCollaborationOperation
  })

  const fileLock = useFileLock({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    currentUserId: userId,
    apiService: SpreadsheetApiService,
    // Keep a low-frequency polling fallback; primary updates are socket-driven.
    autoRefreshInterval: 15000,
    realtimeSocket: collaboration.socket,
    blockEditingUntilLockResolved: true
  })
  const canEditWithLock = isEditing && !entityEnabled && fileLock.canEdit
  const canEditWithLockRef = useRef(canEditWithLock)
  canEditWithLockRef.current = canEditWithLock

  // --- Column handling (includes auto-add for Univer grid) ---
  const handleCellChangeRef = useRef<(rowId: string, columnName: string, value: unknown) => void>(() => {})

  const columnsState = useSpreadsheetColumns({
    app,
    activeSheet,
    localSheetDataRef,
    handleCellChangeRef,
    onAppUpdate,
    onSheetUpdate,
    isCollaborationConnected: collaboration.isCollaborationConnected,
    emitOperation: op => {
      collaboration.emitOperation(op as any)
    }
  })

  // --- Row edit dialog state + handlers ---
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null)

  const createOperationId = useCallback((prefix: string) => {
    try {
      return `${prefix}_${crypto.randomUUID()}`
    } catch {
      return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
    }
  }, [])

  const isUuid = useCallback((value: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  }, [])

  const getBackendRowIdForUiRowId = useCallback(
    (uiRowId: string): string | undefined => {
      const row = localSheetDataRef.current.find(r => viewerRowId(r) === uiRowId)
      if (!row) return undefined
      const rowUuid = String(row._rowUuid || '')
      if (isUuid(rowUuid)) return rowUuid
      const persistedId = String(row.id ?? '')
      if (isUuid(persistedId)) return persistedId
      const localId = String(row._id ?? '')
      if (isUuid(localId)) return localId
      return undefined
    },
    [isUuid, localSheetDataRef]
  )

  const scheduleSnapshotCheckpointFromPersistence = useCallback(() => {
    if (entityEnabled) return
    // Snapshot is primarily driven by the 2000ms CommandExecuted debounce in UniverSheetGrid,
    // which fires after the cell flush completes and captures a valid (non-stale) version.
    // This function acts as a secondary safety net for cases where CommandExecuted does not
    // fire (e.g. programmatic operations) or where 30 seconds have elapsed without a snapshot.
    const nowMs = Date.now()
    const MAX_INTERVAL_MS = 30000
    if (nowMs - lastSuccessfulSnapshotCheckpointAtRef.current >= MAX_INTERVAL_MS) {
      const enqueue = enqueueSnapshotCheckpointRef.current
      if (enqueue) {
        void enqueue()
      }
      return
    }
    if (persistenceTriggeredSnapshotTimeoutRef.current) {
      clearTimeout(persistenceTriggeredSnapshotTimeoutRef.current)
    }
    persistenceTriggeredSnapshotTimeoutRef.current = setTimeout(() => {
      persistenceTriggeredSnapshotTimeoutRef.current = null
      const enqueue = enqueueSnapshotCheckpointRef.current
      if (enqueue) {
        void enqueue()
      }
    }, 5000)
  }, [entityEnabled])

  const recoverFromVersionConflict = useCallback(async () => {
    try {
      const delta = await SpreadsheetApiService.getSheetChangesSince(app.id, activeSheetId, sheetVersionRef.current)
      if (!delta.requiresSnapshot) {
        const next = applyDeltaChangesToRows(localSheetDataRef.current, delta.changes)
        sheetVersionRef.current = Number(delta.currentVersion || sheetVersionRef.current)
        setLocalSheetData(next)
        lastPersistedSheetDataRef.current = next
        onDataChange?.(activeSheetId, next)
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
        return
      }

      snapshotSaveMetricsRef.current.fallbackLoads += 1
      const snapshot = await SpreadsheetApiService.getSheetSnapshot(app.id, activeSheetId)
      const rows = mapSnapshotRowsToViewerRows(snapshot.rows || [])
      sheetVersionRef.current = Number(snapshot.version || 0)
      setLocalSheetData(rows)
      lastPersistedSheetDataRef.current = rows
      onDataChange?.(activeSheetId, rows)
      debugLog('version conflict fallback snapshot loaded', {
        appId: app.id,
        sheetId: activeSheetId,
        fallbackLoads: snapshotSaveMetricsRef.current.fallbackLoads
      })
      sheetPersist.recordSuccess(true)
      versioning.markAsSaved()
    } catch (error) {
      console.error('[SpreadsheetAppViewer] Failed to recover from version conflict:', error)
    }
  }, [
    activeSheetId,
    app.id,
    localSheetDataRef,
    onDataChange,
    setLocalSheetData,
    sheetPersist.recordSuccess,
    versioning.markAsSaved
  ])

  // applyBatchDirect: calls the API immediately without chaining to operationQueueRef.
  // Use this inside functions that are already running as part of the queue to avoid
  // a circular promise dependency (deadlock) where the queued function awaits an inner
  // operation that is itself waiting for the queue to drain.
  const applyBatchDirect = useCallback(
    async (
      operations: SpreadsheetBatchOperation[],
      batchIdPrefix = 'batch'
    ): Promise<SpreadsheetBatchOperationResponse> => {
      try {
        const response = await SpreadsheetApiService.applyOperationBatch(app.id, activeSheetId, {
          baseVersion: sheetVersionRef.current,
          operations,
          batchId: createOperationId(batchIdPrefix)
        })
        sheetVersionRef.current = response.newVersion
        lastPersistedSheetDataRef.current = localSheetDataRef.current
        scheduleSnapshotCheckpointFromPersistence()
        return response
      } catch (error) {
        if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
          snapshotSaveMetricsRef.current.conflicts += 1
          await recoverFromVersionConflict()
          const retry = await SpreadsheetApiService.applyOperationBatch(app.id, activeSheetId, {
            baseVersion: sheetVersionRef.current,
            operations,
            batchId: createOperationId(`${batchIdPrefix}_retry`)
          })
          sheetVersionRef.current = retry.newVersion
          lastPersistedSheetDataRef.current = localSheetDataRef.current
          scheduleSnapshotCheckpointFromPersistence()
          return retry
        }
        throw error
      }
    },
    [
      activeSheetId,
      app.id,
      createOperationId,
      localSheetDataRef,
      recoverFromVersionConflict,
      scheduleSnapshotCheckpointFromPersistence
    ]
  )

  const applyBatchWithConflictRetry = useCallback(
    async (
      operations: SpreadsheetBatchOperation[],
      batchIdPrefix: string
    ): Promise<SpreadsheetBatchOperationResponse> => {
      try {
        const response = await SpreadsheetApiService.applyOperationBatch(app.id, activeSheetId, {
          baseVersion: sheetVersionRef.current,
          operations,
          batchId: createOperationId(batchIdPrefix)
        })
        sheetVersionRef.current = response.newVersion
        return response
      } catch (error) {
        if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
          snapshotSaveMetricsRef.current.conflicts += 1
          await recoverFromVersionConflict()
          const retry = await SpreadsheetApiService.applyOperationBatch(app.id, activeSheetId, {
            baseVersion: sheetVersionRef.current,
            operations,
            batchId: createOperationId(`${batchIdPrefix}_retry`)
          })
          sheetVersionRef.current = retry.newVersion
          return retry
        }
        throw error
      }
    },
    [activeSheetId, app.id, createOperationId, recoverFromVersionConflict]
  )

  const enqueueUniverSnapshotCheckpoint = useCallback((): Promise<void> => {
    const run = async () => {
      if (entityEnabled) return
      const saveStartedAt = nowMs()
      snapshotSaveMetricsRef.current.attempts += 1

      const snapshot = spreadsheetGridRef.current?.getWorkbookSnapshot?.()
      if (!snapshot) {
        snapshotSaveMetricsRef.current.failures += 1
        debugLog('snapshot checkpoint skipped: snapshot unavailable', {
          appId: app.id,
          sheetId: activeSheetId
        })
        return
      }

      const snapshotSizeBytes = getSnapshotSizeBytes(snapshot)
      if (snapshotSizeBytes == null) {
        snapshotSaveMetricsRef.current.failures += 1
        debugLog('snapshot checkpoint skipped: serialization failed', {
          appId: app.id,
          sheetId: activeSheetId
        })
        return
      }

      if (snapshotSizeBytes > 8_500_000) {
        snapshotSaveMetricsRef.current.failures += 1
        debugLog('snapshot checkpoint skipped: payload too large', {
          appId: app.id,
          sheetId: activeSheetId,
          sizeBytes: snapshotSizeBytes
        })
        return
      }

      sheetPersist.beginPersist()
      try {
        const worksheet = getWorksheetFromSnapshot(snapshot, activeSheetId)
        const wsRowCount =
          typeof (worksheet as { rowCount?: number })?.rowCount === 'number'
            ? (worksheet as { rowCount: number }).rowCount
            : 1000
        const wsColCount =
          typeof (worksheet as { columnCount?: number })?.columnCount === 'number'
            ? (worksheet as { columnCount: number }).columnCount
            : 32

        const visibleColumns = activeSheet.columns.filter(c => c.isVisible !== false)
        const current = localSheetDataRef.current
        const cellDataFromSnapshot = (worksheet as Record<string, unknown> | undefined)?.cellData as
          | Record<string, Record<string, unknown>>
          | undefined
        const cellDataFromGrid = spreadsheetGridRef.current?.getVisibleRangeValues?.(
          Math.min(current.length, wsRowCount),
          Math.min(visibleColumns.length, wsColCount)
        )
        const cellData =
          cellDataFromGrid && typeof cellDataFromGrid === 'object' ? cellDataFromGrid : cellDataFromSnapshot
        const persistedBaseline = lastPersistedSheetDataRef.current
        const { hasCellData, updatesByRowIndex, reconcileCells } = buildSnapshotReconcilePlan({
          cellData,
          visibleColumns,
          currentRows: current,
          persistedBaseline,
          isUuid
        })
        if (!hasCellData) {
          debugLog('snapshot checkpoint: missing worksheet cellData, saving snapshot-only fallback')
        }

        if (updatesByRowIndex.size > 0) {
          const nextLocal = mergeRowsWithIndexUpdates(current, updatesByRowIndex)
          setLocalSheetData(nextLocal)
          onDataChange?.(activeSheetId, nextLocal)
        }

        if (reconcileCells.length > 0) {
          if (isOpsV2Enabled) {
            const op: SpreadsheetBatchOperation = {
              operationId: createOperationId('reconcile_set_range'),
              type: 'set_range',
              data: { cells: reconcileCells }
            }
            await applyBatchWithConflictRetry([op], 'checkpoint_reconcile')
          } else {
            await persistReconcileCellsLegacy(reconcileCells, app.id, activeSheetId, onRowUpdate)
          }
          lastPersistedSheetDataRef.current = localSheetDataRef.current
        }

        const { cacheResult } = await saveSnapshotWithRetry({
          appId: app.id,
          activeSheetId,
          baseSnapshot: snapshot,
          sheetVersionRef,
          snapshotSaveMetricsRef,
          recoverFromVersionConflict,
          spreadsheetGridRef,
          collaboration,
          maxSnapshotRetries: 3
        })
        const saveFinishedAt = nowMs()
        debugLog('snapshot checkpoint saved', {
          appId: app.id,
          sheetId: activeSheetId,
          version: sheetVersionRef.current,
          sizeBytes: snapshotSizeBytes,
          latencyMs: Math.round(saveFinishedAt - saveStartedAt),
          cacheStored: cacheResult.stored,
          cacheReason: cacheResult.reason,
          metrics: snapshotSaveMetricsRef.current
        })
        lastSuccessfulSnapshotCheckpointAtRef.current = Date.now()
        const queueClear = pendingCellChangesRef.current.length === 0 && pendingCellPersistTimeoutRef.current == null
        sheetPersist.recordSuccess(queueClear)
        if (queueClear) {
          versioning.markAsSaved()
        }
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Snapshot checkpoint failed:', error)
        sheetPersist.recordError(sheetT('persist-snapshot-failed'))
      } finally {
        sheetPersist.endPersist()
      }
    }

    return chainOnOperationQueue(operationQueueRef, run)
  }, [
    activeSheet.columns,
    activeSheetId,
    app.id,
    collaboration,
    createOperationId,
    entityEnabled,
    isOpsV2Enabled,
    isUuid,
    localSheetDataRef,
    onDataChange,
    onRowUpdate,
    recoverFromVersionConflict,
    setLocalSheetData,
    sheetPersist.beginPersist,
    sheetPersist.endPersist,
    sheetPersist.recordError,
    sheetPersist.recordSuccess,
    sheetT,
    versioning.markAsSaved
  ])

  useEffect(() => {
    enqueueSnapshotCheckpointRef.current = enqueueUniverSnapshotCheckpoint
  }, [enqueueUniverSnapshotCheckpoint])

  const flushPendingCellChanges = useCallback(async () => {
    if (entityEnabled) return

    const queuedCells = pendingCellChangesRef.current
    if (queuedCells.length === 0) return
    pendingCellChangesRef.current = []
    const flushId = ++cellFlushSequenceRef.current
    const startedAt = nowMs()

    const current = localSheetDataRef.current
    const uiToBackendRowId = buildUiToBackendRowIdMap(current, isUuid)
    const updatesByBackendRowId = partitionCellUpdatesByBackendRowId(
      queuedCells,
      uiToBackendRowId,
      pendingClientRowUpdatesRef.current,
      isUuid
    )
    const cellsToPersist = flattenUpdatesToCells(updatesByBackendRowId)
    if (cellsToPersist.length === 0) {
      debugLog('cell-flush skipped', {
        flushId,
        queuedCells: queuedCells.length,
        dedupedCells: 0,
        deferredClientRows: pendingClientRowUpdatesRef.current.size
      })
      return
    }

    sheetPersist.beginPersist()
    try {
      if (isOpsV2Enabled) {
        const op: SpreadsheetBatchOperation = {
          operationId: createOperationId('set_range'),
          type: 'set_range',
          data: { cells: cellsToPersist }
        }
        // Use applyBatchDirect (not persistOperationBatch) because flushPendingCellChanges
        // is already running inside operationQueueRef; chaining to the queue again would
        // create a circular promise dependency and deadlock.
        await applyBatchDirect([op], 'set_range')
        const finishedAt = nowMs()
        debugLog('cell-flush persisted', {
          flushId,
          mode: 'batch_set_range',
          queuedCells: queuedCells.length,
          dedupedCells: cellsToPersist.length,
          durationMs: Math.round(finishedAt - startedAt)
        })
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
        return
      }

      for (const [rowId, updates] of updatesByBackendRowId.entries()) {
        if (onRowUpdate) {
          await onRowUpdate(app.id, activeSheetId, rowId, updates)
        } else {
          await SpreadsheetApiService.updateRow(app.id, activeSheetId, rowId, updates)
        }
      }
      const finishedAt = nowMs()
      debugLog('cell-flush persisted', {
        flushId,
        mode: 'row_patch_loop',
        queuedCells: queuedCells.length,
        dedupedCells: cellsToPersist.length,
        touchedRows: updatesByBackendRowId.size,
        durationMs: Math.round(finishedAt - startedAt)
      })
      scheduleSnapshotCheckpointFromPersistence()
      sheetPersist.recordSuccess(true)
      versioning.markAsSaved()
    } catch (error) {
      pendingCellChangesRef.current = [...queuedCells, ...pendingCellChangesRef.current]
      console.error('[SpreadsheetAppViewer] Failed to persist cell changes:', error)
      debugLog('cell-flush failed', {
        flushId,
        queuedCells: queuedCells.length,
        dedupedCells: cellsToPersist.length
      })
      sheetPersist.recordError(sheetT('persist-cell-failed'))
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        await recoverFromVersionConflict()
      }
    } finally {
      sheetPersist.endPersist()
    }
  }, [
    activeSheetId,
    app.id,
    applyBatchDirect,
    createOperationId,
    entityEnabled,
    isOpsV2Enabled,
    isUuid,
    localSheetDataRef,
    onRowUpdate,
    recoverFromVersionConflict,
    scheduleSnapshotCheckpointFromPersistence,
    sheetPersist.beginPersist,
    sheetPersist.endPersist,
    sheetPersist.recordError,
    sheetPersist.recordSuccess,
    sheetT,
    versioning.markAsSaved
  ])

  const flushPendingCellChangesRef = useRef(flushPendingCellChanges)
  flushPendingCellChangesRef.current = flushPendingCellChanges

  const schedulePendingCellPersist = useCallback(() => {
    if (pendingCellPersistTimeoutRef.current) {
      clearTimeout(pendingCellPersistTimeoutRef.current)
    }
    debugLog('cell-flush scheduled', {
      queuedCells: pendingCellChangesRef.current.length,
      debounceMs: CELL_PERSIST_DEBOUNCE_MS
    })
    pendingCellPersistTimeoutRef.current = setTimeout(() => {
      pendingCellPersistTimeoutRef.current = null
      void chainOnOperationQueue(operationQueueRef, () => flushPendingCellChangesRef.current())
    }, CELL_PERSIST_DEBOUNCE_MS)
  }, [CELL_PERSIST_DEBOUNCE_MS])

  // Wrapped createCheckpoint that guarantees a complete, consistent checkpoint:
  //   1. Cancels the cell debounce and flushes all pending cell changes through the queue
  //      so every keystroke is in the DB before the snapshot is taken.
  //   2. Reads the live Univer snapshot from the grid (includes cell values AND styling).
  //      This snapshot is passed directly into createVersion — no saveUniverSnapshot
  //      DB round-trip, so there is no risk of a 409 version-conflict causing styling
  //      to be silently dropped from the checkpoint.
  const createCheckpointWithFlush = useCallback(
    async (description: string) => {
      // Step 1: cancel debounce and drain the operation queue
      if (pendingCellPersistTimeoutRef.current) {
        clearTimeout(pendingCellPersistTimeoutRef.current)
        pendingCellPersistTimeoutRef.current = null
      }
      let flushFailed = false
      try {
        await chainOnOperationQueue(operationQueueRef, () => flushPendingCellChangesRef.current())
      } catch (error) {
        flushFailed = true
        console.warn('[SpreadsheetAppViewer] Checkpoint flush failed; continuing with live snapshot', error)
      }

      // Step 2: grab the live Univer snapshot and pass it directly to createVersion.
      // univerSnapshots is keyed by sheetId so multi-sheet apps work correctly.
      const liveSnapshot = spreadsheetGridRef.current?.getWorkbookSnapshot?.() ?? null
      const univerSnapshots: Record<string, Record<string, unknown> | null> = {
        [activeSheetId]: liveSnapshot
      }

      const checkpoint = await versioning.createCheckpoint(description, { univerSnapshots })
      if (checkpoint && flushFailed) {
        toast.error('Checkpoint saved, but some pending edits may not be included.')
      }
      return checkpoint
    },
    [activeSheetId, versioning]
  )

  const handleCellsChange = useCallback(
    (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => {
      if (!canEditWithLock) return
      if (entityEnabled) return
      if (cells.length === 0) return

      sheetPersist.markDirty()
      versioning.markAsChanged()

      pendingCellChangesRef.current.push(...cells)
      const firstCell = cells[0]
      if (firstCell) {
        const ctx = createUniverConversionContext(activeSheet.columns, localSheetDataRef.current)
        const rowIndex = ctx.rowIdToIndex.get(String(firstCell.rowId))
        const colIndex =
          activeSheet.columns.findIndex(c => c.name === firstCell.columnName) >= 0
            ? activeSheet.columns.findIndex(c => c.name === firstCell.columnName)
            : (ctx.columnIdToIndex.get(String(firstCell.columnName)) ?? -1)
        if (rowIndex !== undefined && colIndex >= 0) {
          collaboration.emitCursor({ path: [`row:${rowIndex}`, `col:${colIndex}`] })
        }
      }
      cells.forEach(cell => {
        const backendRowId = getBackendRowIdForUiRowId(String(cell.rowId))
        if (!backendRowId) return
        collaboration.emitOperation({
          type: 'cell_update',
          data: {
            sheetId: activeSheetId,
            rowId: backendRowId,
            column: cell.columnName,
            value: cell.value
          },
          broadcastOnly: true
        } as any)
      })
      debugLog('cells queued', {
        addedCells: cells.length,
        queuedCells: pendingCellChangesRef.current.length
      })

      const current = localSheetDataRef.current
      const updatesByUiRowId = new Map<string, Record<string, unknown>>()
      for (const cell of cells) {
        const uiRowId = String(cell.rowId)
        const uiUpdates = updatesByUiRowId.get(uiRowId) ?? {}
        uiUpdates[cell.columnName] = cell.value
        updatesByUiRowId.set(uiRowId, uiUpdates)
      }

      const next = current.map(row => {
        const uiRowId = viewerRowId(row)
        const updates = updatesByUiRowId.get(uiRowId)
        if (!updates) return row
        return { ...row, ...updates, _updatedAt: new Date().toISOString() }
      })
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
      schedulePendingCellPersist()
    },
    [
      activeSheetId,
      canEditWithLock,
      collaboration.emitOperation,
      collaboration.emitCursor,
      entityEnabled,
      getBackendRowIdForUiRowId,
      localSheetDataRef,
      onDataChange,
      schedulePendingCellPersist,
      setLocalSheetData,
      sheetPersist.markDirty,
      versioning.markAsChanged
    ]
  )

  const handleCellChange = useCallback(
    (rowId: string, columnName: string, value: unknown) => {
      handleCellsChange([{ rowId, columnName, value }])
    },
    [handleCellsChange]
  )

  useEffect(() => {
    handleCellChangeRef.current = handleCellChange
  }, [handleCellChange])

  const flushPendingCellsForPersistedRow = useCallback(
    async (persistedId: string, pending: Record<string, unknown>) => {
      if (isOpsV2Enabled) {
        const flushOp: SpreadsheetBatchOperation = {
          operationId: createOperationId('set_range'),
          type: 'set_range',
          data: {
            cells: Object.entries(pending).map(([columnName, value]) => ({
              rowId: persistedId,
              columnName,
              value
            }))
          }
        }
        await applyBatchDirect([flushOp], 'set_range_flush')
        return
      }

      await SpreadsheetApiService.updateRow(app.id, activeSheetId, persistedId, pending)
    },
    [activeSheetId, app.id, applyBatchDirect, createOperationId, isOpsV2Enabled]
  )

  const persistAddedRowsWithBatch = useCallback(
    async (
      rowPayloads: Record<string, unknown>[],
      updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
    ) => {
      const op: SpreadsheetBatchOperation = {
        operationId: createOperationId('add_rows'),
        type: 'add_rows',
        data: { rows: rowPayloads }
      }
      // Use applyBatchDirect: processUniverDataChange runs inside operationQueueRef,
      // so calling persistOperationBatch here would deadlock (circular queue chain).
      const result = await applyBatchDirect([op], 'add_rows')
      const opResult = result.operationResults.find(r => r.operationId === op.operationId)
      const returnedRows = Array.isArray(opResult?.result?.rows)
        ? (opResult?.result?.rows as Array<Record<string, unknown>>)
        : []
      const { createdRows, flushCells } = buildCreatedRowsFromBatch(
        rowPayloads,
        returnedRows,
        pendingClientRowUpdatesRef.current
      )
      updateLocalRowsAfterCreate(createdRows)

      if (flushCells.length === 0) return

      const flushOp: SpreadsheetBatchOperation = {
        operationId: createOperationId('set_range'),
        type: 'set_range',
        data: { cells: flushCells }
      }
      await applyBatchDirect([flushOp], 'set_range_flush')
    },
    [applyBatchDirect, createOperationId]
  )

  const persistSingleAddedRow = useCallback(
    async (
      rowPayloads: Record<string, unknown>[],
      updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
    ) => {
      const singlePayload = rowPayloads[0]
      const singleClientRowId = String(singlePayload._clientRowId || '')
      const saved = onRowAdd
        ? await onRowAdd(app.id, activeSheetId, singlePayload)
        : await SpreadsheetApiService.addRow(app.id, activeSheetId, singlePayload)
      const persistedId = String(((saved as Record<string, unknown> | null)?.['_id'] as string | undefined) || '')
      const pending = singleClientRowId ? pendingClientRowUpdatesRef.current.get(singleClientRowId) : undefined
      if (singleClientRowId && pending) {
        pendingClientRowUpdatesRef.current.delete(singleClientRowId)
      }
      const mergedPayload = pending ? { ...singlePayload, ...pending } : singlePayload
      const createdRows: Record<string, unknown>[] = [{ ...mergedPayload, ...(saved || {}) }]
      updateLocalRowsAfterCreate(createdRows)

      // If we had pending pasted cell updates for this just-created row, persist them now.
      if (pending && persistedId) {
        await flushPendingCellsForPersistedRow(persistedId, pending)
      }

      if (!onRowAdd) {
        const sheet = await SpreadsheetApiService.getSheet(app.id, activeSheetId)
        if (sheet?.version != null) sheetVersionRef.current = Number(sheet.version)
      }
    },
    [activeSheetId, app.id, flushPendingCellsForPersistedRow, onRowAdd]
  )

  const processUniverDataChange = useCallback(async () => {
    const newData = latestUniverDataRef.current
    // Refs: debounced work and the op queue often run a stale processUniverDataChange closure
    // (e.g. lock still false when scheduled, true when run) — reading latest flags avoids stuck "Unsaved".
    if (!newData || entityEnabledRef.current || !canEditWithLockRef.current) return

    const lastProcessed = lastProcessedLengthRef.current
    if (newData.length <= lastProcessed) return

    sheetPersist.markDirty()
    versioning.markAsChanged()

    const prev = localSheetDataRef.current
    const added = newData.slice(lastProcessed)
    const rowPayloads = buildAddRowPayloadsFromUniverRows(added, activeSheet.columns)

    // Under ops-v2, always create rows via a batch operation to avoid per-row /rows bursts
    // when paste events arrive in small chunks.
    const useBatchAddRows = isOpsV2Enabled || rowPayloads.length > 1 || !onRowAdd

    const updateLocalRowsAfterCreate = (createdRows: Array<Record<string, unknown>>) => {
      const next = [...prev, ...createdRows]
      lastProcessedLengthRef.current = newData.length
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
    }

    sheetPersist.beginPersist()
    try {
      if (useBatchAddRows) {
        await persistAddedRowsWithBatch(rowPayloads, updateLocalRowsAfterCreate)
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
        return
      }

      await persistSingleAddedRow(rowPayloads, updateLocalRowsAfterCreate)
      sheetPersist.recordSuccess(true)
      versioning.markAsSaved()
    } catch (error) {
      console.error('[SpreadsheetAppViewer] Failed to persist added rows:', error)
      sheetPersist.recordError(sheetT('persist-rows-add-failed'))
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        await recoverFromVersionConflict()
      }
    } finally {
      sheetPersist.endPersist()
    }
  }, [
    activeSheet.columns,
    activeSheetId,
    app.id,
    applyBatchDirect,
    createOperationId,
    isOpsV2Enabled,
    localSheetDataRef,
    onDataChange,
    onRowAdd,
    persistAddedRowsWithBatch,
    persistSingleAddedRow,
    recoverFromVersionConflict,
    setLocalSheetData,
    sheetPersist.beginPersist,
    sheetPersist.endPersist,
    sheetPersist.markDirty,
    sheetPersist.recordError,
    sheetPersist.recordSuccess,
    sheetT,
    versioning.markAsChanged,
    versioning.markAsSaved
  ])

  const processUniverDataChangeRef = useRef(processUniverDataChange)
  processUniverDataChangeRef.current = processUniverDataChange

  const handleUniverDataChange = useCallback((newData: Record<string, unknown>[]) => {
    latestUniverDataRef.current = newData
    if (univerDataChangeTimeoutRef.current) {
      clearTimeout(univerDataChangeTimeoutRef.current)
    }
    univerDataChangeTimeoutRef.current = setTimeout(() => {
      univerDataChangeTimeoutRef.current = null
      void chainOnOperationQueue(operationQueueRef, () => processUniverDataChangeRef.current())
    }, UNIVER_DATA_CHANGE_DEBOUNCE_MS)
  }, [])

  const prevCanEditWithLockRef = useRef<boolean | null>(null)
  useEffect(() => {
    const prev = prevCanEditWithLockRef.current
    prevCanEditWithLockRef.current = canEditWithLock
    if (entityEnabled) return
    if (prev === null) return
    if (prev || !canEditWithLock) return
    // Lock check / socket just caught up after backgrounding the tab — drain row creates that were skipped.
    void chainOnOperationQueue(operationQueueRef, () => processUniverDataChangeRef.current())
  }, [canEditWithLock, entityEnabled])

  const flushPendingPersistenceNow = useCallback(() => {
    if (entityEnabled) return

    if (univerDataChangeTimeoutRef.current) {
      clearTimeout(univerDataChangeTimeoutRef.current)
      univerDataChangeTimeoutRef.current = null
    }
    if (pendingCellPersistTimeoutRef.current) {
      clearTimeout(pendingCellPersistTimeoutRef.current)
      pendingCellPersistTimeoutRef.current = null
    }
    if (persistenceTriggeredSnapshotTimeoutRef.current) {
      clearTimeout(persistenceTriggeredSnapshotTimeoutRef.current)
      persistenceTriggeredSnapshotTimeoutRef.current = null
    }

    const run = async () => {
      await processUniverDataChangeRef.current()
      await flushPendingCellChangesRef.current()
      const enqueue = enqueueSnapshotCheckpointRef.current
      // MUST NOT await enqueue() here: enqueueUniverSnapshotCheckpoint chains onto operationQueueRef.
      // While `run` is executing as the current queue job, queueRef.current already points to the tail
      // that resolves only after `run` completes — awaiting enqueue() waits for snapshot to run after
      // that tail, causing a permanent deadlock (tab switch / visibility flush freezes saves + checkpoints).
      if (enqueue) {
        debugLog('op-queue: post-flush snapshot scheduled (non-blocking; avoids deadlock with visibility flush)')
        void enqueue().catch(err => {
          console.error('[SpreadsheetAppViewer] Post-flush snapshot checkpoint failed:', err)
        })
      }
    }

    void chainOnOperationQueue(operationQueueRef, run).catch(() => undefined)
  }, [entityEnabled])

  useEffect(() => {
    if (typeof globalThis === 'undefined' || typeof document === 'undefined') return

    let resumeFlushTimeout: ReturnType<typeof setTimeout> | null = null

    const handlePageHide = () => {
      flushPendingPersistenceNow()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (resumeFlushTimeout) {
          clearTimeout(resumeFlushTimeout)
          resumeFlushTimeout = null
        }
        flushPendingPersistenceNow()
        return
      }
      if (document.visibilityState === 'visible') {
        // A prior 404/501 caches "no univer-snapshot API" and skips snapshot HTTP until reload — looks like missing network calls.
        revalidateSpreadsheetUniverSnapshotAfterIdleTab()
        // Brief defer so tab-focus and persistence flush do not race the same tick.
        if (resumeFlushTimeout) clearTimeout(resumeFlushTimeout)
        resumeFlushTimeout = setTimeout(() => {
          resumeFlushTimeout = null
          flushPendingPersistenceNow()
        }, 300)
      }
    }

    globalThis.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      if (resumeFlushTimeout) clearTimeout(resumeFlushTimeout)
      globalThis.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [flushPendingPersistenceNow])

  useEffect(() => {
    return () => {
      if (univerDataChangeTimeoutRef.current) {
        clearTimeout(univerDataChangeTimeoutRef.current)
        univerDataChangeTimeoutRef.current = null
      }
      if (pendingCellPersistTimeoutRef.current) {
        clearTimeout(pendingCellPersistTimeoutRef.current)
        pendingCellPersistTimeoutRef.current = null
      }
      if (persistenceTriggeredSnapshotTimeoutRef.current) {
        clearTimeout(persistenceTriggeredSnapshotTimeoutRef.current)
        persistenceTriggeredSnapshotTimeoutRef.current = null
      }
    }
  }, [])

  const formFields = useMemo(() => {
    const visible = activeSheet.columns.filter(c => c.isVisible)
    return visible.map((col, idx) => columnToFormField(col, idx))
  }, [activeSheet.columns])

  const handleUpdateRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!canEditWithLock) return
      if (!editingRow) return
      const rowId = viewerRowId(editingRow)
      if (!rowId) return

      const next = localSheetDataRef.current.map(r => (viewerRowId(r) === rowId ? { ...r, ...values } : r))
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
      setEditingRow(null)

      sheetPersist.beginPersist()
      try {
        if (onRowUpdate) {
          await onRowUpdate(app.id, activeSheetId, rowId, values)
        } else {
          await SpreadsheetApiService.updateRow(app.id, activeSheetId, rowId, values)
        }
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to update row:', error)
        sheetPersist.recordError(sheetT('persist-row-update-failed'))
      } finally {
        sheetPersist.endPersist()
      }
    },
    [
      canEditWithLock,
      activeSheetId,
      app.id,
      editingRow,
      localSheetDataRef,
      onDataChange,
      onRowUpdate,
      setLocalSheetData,
      sheetPersist.beginPersist,
      sheetPersist.endPersist,
      sheetPersist.recordError,
      sheetPersist.recordSuccess,
      sheetT,
      versioning.markAsSaved
    ]
  )

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      if (!canEditWithLock) return
      const next = localSheetDataRef.current.filter(r => viewerRowId(r) !== String(rowId))
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
      sheetPersist.beginPersist()
      try {
        await SpreadsheetApiService.deleteRow(app.id, activeSheetId, rowId)
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to delete row:', error)
        sheetPersist.recordError(sheetT('persist-row-delete-failed'))
      } finally {
        sheetPersist.endPersist()
      }
    },
    [
      activeSheetId,
      app.id,
      canEditWithLock,
      localSheetDataRef,
      onDataChange,
      setLocalSheetData,
      sheetPersist.beginPersist,
      sheetPersist.endPersist,
      sheetPersist.recordError,
      sheetPersist.recordSuccess,
      sheetT,
      versioning.markAsSaved
    ]
  )

  // --- Column editing save (from dialog) ---
  const [editingColumns, setEditingColumns] = useState<SpreadsheetColumn[]>([])
  const onSaveColumns = useCallback(
    (columns: SpreadsheetColumn[]) => persistSheetPatch({ columns }),
    [persistSheetPatch]
  )

  // --- Export to Excel ---
  const handleExportToExcel = useCallback(async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const snapshot = spreadsheetGridRef.current?.getWorkbookSnapshot?.()
      if (!snapshot) {
        console.error('[SpreadsheetAppViewer] Export failed: workbook snapshot unavailable')
        return
      }
      const safeName =
        (app.name || activeSheet.name || 'spreadsheet').replaceAll(/[/\\?%*:|"<>]/g, '-').trim() || 'spreadsheet'
      await exportSnapshotAsXlsx(snapshot, safeName)
    } catch (err) {
      console.error('[SpreadsheetAppViewer] Export to Excel failed:', err)
    } finally {
      setIsExporting(false)
    }
  }, [isExporting, app.name, activeSheet.name])

  const handleInsertAnalyticsRows = useCallback(
    async (rows: Array<Record<string, unknown>>): Promise<boolean> => {
      if (!canEditWithLock) return false
      if (!activeSheetId || rows.length === 0 || entityEnabled) return false

      const payloads = buildAnalyticsInsertPayloads(rows, activeSheet.columns)

      if (payloads.length === 0) {
        toast.error('No matching columns found to insert pivot result.')
        return false
      }

      sheetPersist.beginPersist()
      try {
        const createdRows = onRowAdd
          ? await insertAnalyticsRowsWithOnRowAdd({
              payloads,
              onRowAdd,
              appId: app.id,
              sheetId: activeSheetId
            })
          : await insertAnalyticsRowsWithApiFallback({
              payloads,
              appId: app.id,
              sheetId: activeSheetId
            })

        if (createdRows.length === 0) {
          toast.error('No rows were inserted into the sheet.')
          return false
        }

        const next = [...localSheetDataRef.current, ...createdRows]
        setLocalSheetData(next)
        onDataChange?.(activeSheetId, next)
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
        toast.success(`Inserted ${createdRows.length} analytics row${createdRows.length > 1 ? 's' : ''}.`)
        return true
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to insert analytics rows:', error)
        sheetPersist.recordError(sheetT('persist-rows-add-failed'))
        toast.error('Failed to insert analytics result into sheet.')
        return false
      } finally {
        sheetPersist.endPersist()
      }
    },
    [
      activeSheet.columns,
      activeSheetId,
      app.id,
      canEditWithLock,
      entityEnabled,
      localSheetDataRef,
      onDataChange,
      onRowAdd,
      setLocalSheetData,
      sheetPersist.beginPersist,
      sheetPersist.endPersist,
      sheetPersist.recordError,
      sheetPersist.recordSuccess,
      sheetT,
      versioning.markAsSaved
    ]
  )

  const handleApplyFormulaToColumn = useCallback(
    async (columnName: string, formula: string): Promise<boolean> => {
      if (!canEditWithLock) return false
      if (!columnName || !formula) return false
      const normalizedFormula = formula.trim().startsWith('=') ? formula.trim() : `=${formula.trim()}`
      const cells = localSheetDataRef.current
        .map(row => {
          const rowId = viewerRowId(row)
          if (!rowId) return null
          return { rowId, columnName, value: normalizedFormula }
        })
        .filter((cell): cell is { rowId: string; columnName: string; value: string } => Boolean(cell))

      if (cells.length === 0) {
        toast.error('No rows available to apply formula.')
        return false
      }

      handleCellsChange(cells)
      toast.success(`Applied formula to ${cells.length} row${cells.length > 1 ? 's' : ''}.`)
      return true
    },
    [canEditWithLock, handleCellsChange, localSheetDataRef]
  )

  const handleCreateReviewComment = useCallback(
    async (content: string): Promise<boolean> => {
      const created = await comments.createComment({
        type: 'document',
        content
      })
      if (!created) {
        toast.error('Failed to create comment from review finding.')
        return false
      }
      toast.success('Review finding added to comments.')
      return true
    },
    [comments]
  )

  // --- Active view type ---
  const viewType = activeView?.config.type || activeSheet.viewType || 'table'

  const getHeaderRowFromGrid = useCallback((): Map<string, string> | null => {
    const grid = spreadsheetGridRef.current
    const visibleColumns = activeSheet.columns.filter(c => c.isVisible)
    if (!grid?.getVisibleRangeValues || !visibleColumns.length) return null
    const values = grid.getVisibleRangeValues(1, visibleColumns.length)
    if (!values || !values[0]) return null
    const row0 = values[0]
    const map = new Map<string, string>()
    const extract = (v: unknown): string => {
      if (v == null || v === '') return ''
      if (typeof v === 'string') return String(v).trim()
      if (typeof v === 'number' && Number.isFinite(v)) return String(v)
      if (typeof v === 'object' && !Array.isArray(v)) {
        const obj = v as Record<string, unknown>
        const x = obj.v ?? obj.m ?? obj.url ?? obj.src
        if (typeof x === 'string') return String(x).trim()
        if (typeof x === 'number' && Number.isFinite(x)) return String(x)
      }
      return String(v).trim()
    }
    visibleColumns.forEach((col, i) => {
      const raw = row0[i]
      const label = extract(raw)
      if (label) map.set(col.name, label)
    })
    return map.size > 0 ? map : null
  }, [activeSheet.columns])

  /** Read live data from Univer grid with column names - guarantees correct structure for charts */
  const getSheetDataFromGrid = useCallback((): Record<string, unknown>[] | null => {
    const grid = spreadsheetGridRef.current
    const visibleColumns = activeSheet.columns.filter(c => c.isVisible !== false)
    if (!grid?.getVisibleRangeValues || !visibleColumns.length) return null
    const rowCount = Math.min(Math.max(sheetData.length, 500), 5000)
    const colCount = visibleColumns.length
    const values = grid.getVisibleRangeValues(rowCount, colCount)
    if (!values || Object.keys(values).length === 0) return null
    const extractValue = (v: unknown): unknown => {
      if (v == null) return v
      if (typeof v === 'object' && !Array.isArray(v)) {
        const obj = v as Record<string, unknown>
        const x = obj.v ?? obj.m ?? obj.url ?? obj.src
        return x !== undefined ? x : v
      }
      return v
    }
    const rows: Record<string, unknown>[] = []
    for (let r = 0; r < rowCount; r++) {
      const rowCells = values[r]
      if (!rowCells || typeof rowCells !== 'object') {
        rows.push({})
        continue
      }
      const row: Record<string, unknown> = {}
      visibleColumns.forEach((col, c) => {
        const raw = rowCells[c]
        const val = extractValue(raw)
        if (val !== undefined) row[col.name] = val
      })
      rows.push(row)
    }
    return rows.length > 0 ? rows : null
  }, [activeSheet.columns, sheetData.length])

  const renderMainView = useCallback((): React.ReactNode => {
    if (viewType === 'table') {
      if (isBootstrapSnapshotLoading) {
        return (
          <div className="gba:flex gba:h-full gba:w-full gba:items-center gba:justify-center">
            <div className="gba:text-sm gba:text-muted-foreground">Loading spreadsheet snapshot...</div>
          </div>
        )
      }
      return (
        <TableView
          sheet={activeSheet}
          data={sheetData}
          initialSnapshot={bootstrapSnapshot}
          snapshotSeed={bootstrapSnapshotSeed}
          columns={[]}
          spreadsheetColumns={activeSheet.columns.filter(c => c.isVisible)}
          testId={`${testId}-table-view`}
          onCellChange={handleCellChange}
          onCellsChange={handleCellsChange}
          onSnapshotRequested={enqueueUniverSnapshotCheckpoint}
          onOpenCommentRequest={handleOpenCommentRequest}
          commentedCells={commentedCells}
          onDataChange={handleUniverDataChange}
          participants={collaboration.cursorParticipants}
          onOperationEmit={op => collaboration.emitOperation(op as any)}
          onCursorEmit={pos => collaboration.emitCursor({ path: pos.path })}
          collaborationEnabled={collaboration.isCollaborationConnected}
          onColumnAdd={canEditWithLock ? columnsState.handleAutoColumnAdd : undefined}
          isReadOnly={!canEditWithLock}
          gridRef={spreadsheetGridRef}
        />
      )
    }

    if (viewType === 'form') {
      return (
        <FormView
          sheet={activeSheet}
          data={sheetData}
          onEdit={row => setEditingRow(row)}
          onDelete={handleDeleteRow}
          canEdit={canEditWithLock}
          testId={`${testId}-form-view`}
        />
      )
    }

    if (viewType === 'dashboard') {
      return <DashboardView sheet={activeSheet} data={sheetData} testId={`${testId}-dashboard-view`} />
    }

    if (viewType === 'kanban') {
      return (
        <KanbanView
          sheet={activeSheet}
          data={sheetData}
          view={activeView!}
          onEdit={row => setEditingRow(row)}
          canEdit={canEditWithLock}
          testId={`${testId}-kanban-view`}
        />
      )
    }

    return null
  }, [
    viewType,
    isBootstrapSnapshotLoading,
    activeSheet,
    sheetData,
    bootstrapSnapshot,
    bootstrapSnapshotSeed,
    testId,
    handleCellChange,
    handleCellsChange,
    enqueueUniverSnapshotCheckpoint,
    handleOpenCommentRequest,
    commentedCells,
    handleUniverDataChange,
    collaboration,
    canEditWithLock,
    columnsState.handleAutoColumnAdd,
    spreadsheetGridRef,
    setEditingRow,
    handleDeleteRow,
    activeView
  ])

  return (
    <div className="gba:flex gba:flex-col gba:w-full gba:h-full gba:overflow-hidden" data-testid={testId}>
      <SpreadsheetHeader
        app={app}
        activeSheet={activeSheet}
        onBack={onBack}
        isEditing={isEditing}
        canEdit={canEditWithLock}
        headerParticipants={collaboration.headerParticipants}
        isCollaborationConnected={collaboration.isCollaborationConnected}
        isEntityDataLoading={entityState.isLoading}
        onRefreshEntityData={() => void refreshEntityData()}
        versioning={headerSaveStatus.versioning}
        persistenceError={headerSaveStatus.persistenceError}
        onShowCheckpointDialog={() => setShowCheckpointDialog(true)}
        onShowVersionHistory={() => setShowVersionHistory(true)}
        publishingStatus={app.publishMetadata?.status || 'draft'}
        showComments={showComments}
        setShowComments={setShowComments}
        unresolvedCommentCount={comments.unresolvedCount}
        fileLock={{
          lock: fileLock.lock,
          isLockedByMe: fileLock.isLockedByMe,
          acquireLock: () => {
            void fileLock.acquireLock()
          },
          releaseLock: () => {
            void fileLock.releaseLock()
          }
        }}
        onShare={onShare}
        onOpenAICapability={handleOpenAICapability}
        onOpenAnalytics={() => {
          setAnalyticsInitialTab('charts')
          setIsSheetsAIOpen(false)
          setIsAutomationsOpen(false)
          setIsAnalyticsOpen(true)
        }}
        onOpenAutomations={() => {
          setIsSheetsAIOpen(false)
          setIsAnalyticsOpen(false)
          setIsAutomationsOpen(true)
        }}
        onEdit={onEdit}
        onExport={() => void handleExportToExcel()}
        isCollectionCopy={isCollectionCopy}
        collectionSubmittedAt={collectionSubmittedAt}
        onSubmitCollection={canSubmitCollection && !collectionSubmittedAt ? handleSubmitCollection : undefined}
        testId={testId}
      />

      {entityEnabled && (
        <EntityDataStatusBar
          isLoading={entityState.isLoading}
          error={entityState.error}
          dataCount={entityDataCount}
          dataSourceName={activeSheet.entityDataSource?.entityDisplayName}
          onRefresh={() => void refreshEntityData()}
          onEdit={onEdit}
          data-testid={`${testId}-entity-data-status-bar`}
        />
      )}

      <div className="gba:flex-1 gba:relative gba:min-h-0 gba:overflow-hidden">{renderMainView()}</div>

      <SpreadsheetSheetTabs
        sheets={app.sheets}
        activeSheetId={activeSheetId}
        onSheetChange={setActiveSheetId}
        entityDataLength={entityEnabled ? entityDataCount : undefined}
        data-testid={`${testId}-sheet-tabs`}
      />

      <SpreadsheetDialogsSection
        editingRow={editingRow}
        setEditingRow={setEditingRow}
        formFields={formFields}
        handleUpdateRow={handleUpdateRow}
        accessToken={accessToken}
        isManageColumnsDialogOpen={columnsState.isManageColumnsDialogOpen}
        setIsManageColumnsDialogOpen={columnsState.setIsManageColumnsDialogOpen}
        columns={activeSheet.columns}
        editingColumns={editingColumns}
        setEditingColumns={setEditingColumns}
        handleAddColumn={() => {
          if (!canEditWithLock) return
          columnsState.handleAddColumn()
        }}
        onSaveColumns={cols => {
          if (!canEditWithLock) return
          onSaveColumns(cols)
        }}
        showVersionHistory={showVersionHistory}
        setShowVersionHistory={setShowVersionHistory}
        versionUserDisplayMap={versionUserDisplayMap}
        versioning={{ ...versioning, createCheckpoint: createCheckpointWithFlush } as any}
        handleRestoreVersion={versioning.restoreVersion as any}
        showCheckpointDialog={showCheckpointDialog}
        setShowCheckpointDialog={setShowCheckpointDialog}
        showPublishDialog={showPublishDialog}
        setShowPublishDialog={setShowPublishDialog}
        publishing={publishing as any}
        showComments={showComments}
        setShowComments={setShowComments}
        getSelectedCellRef={getSelectedCellRef}
        activeSheetId={activeSheetId}
        comments={comments as any}
        currentUserId={userId}
        currentUserName={collaboration.currentUserName}
        currentUserAvatar={collaboration.currentUserAvatar}
        testId={testId}
      />

      <AutomationsPanel
        isOpen={isAutomationsOpen}
        onClose={() => setIsAutomationsOpen(false)}
        automations={automations.automations}
        executionHistory={automations.executionHistory}
        workflowLinks={automations.workflowLinks}
        isLoading={automations.isLoading}
        columns={activeSheet.columns}
        sheetData={sheetData}
        spreadsheetId={app.id}
        sheetId={activeSheetId}
        accessToken={accessToken}
        onCreateAutomation={automations.createAutomation}
        onUpdateAutomation={automations.updateAutomation}
        onDeleteAutomation={automations.deleteAutomation}
        onToggleAutomation={async (id, enabled) => automations.toggleAutomation(id, enabled)}
        onDuplicateAutomation={automations.duplicateAutomation}
        onRunAutomation={(id, rows) => automations.runAutomation(id, rows)}
        onRefreshWorkflowStatuses={() => void automations.refreshWorkflowStatuses()}
        data-testid={`${testId}-automations-panel`}
      />

      <AnalyticsPanel
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        initialTab={analyticsInitialTab}
        columns={activeSheet.columns}
        sheetData={sheetData}
        sheetName={activeSheet.name}
        sheetId={activeSheetId}
        accessToken={accessToken}
        canEdit={canEditWithLock}
        onInsertRows={handleInsertAnalyticsRows}
        getHeaderRowFromGrid={viewType === 'table' ? getHeaderRowFromGrid : undefined}
        getSheetDataFromGrid={viewType === 'table' && !entityEnabled ? getSheetDataFromGrid : undefined}
        data-testid={`${testId}-analytics-panel`}
      />
      <SheetsAIPanel
        isOpen={isSheetsAIOpen}
        onClose={() => setIsSheetsAIOpen(false)}
        initialTab={sheetsAIInitialTab}
        appId={app.id}
        sheetId={activeSheetId}
        sheetName={activeSheet.name}
        accessToken={accessToken}
        columns={activeSheet.columns}
        sheetData={sheetData}
        onApplyFormula={handleApplyFormulaToColumn}
        onCreateReviewComment={handleCreateReviewComment}
        onOpenCheckpointDialog={() => setShowCheckpointDialog(true)}
        getHeaderRowFromGrid={viewType === 'table' ? getHeaderRowFromGrid : undefined}
        getSheetDataFromGrid={viewType === 'table' && !entityEnabled ? getSheetDataFromGrid : undefined}
        data-testid={`${testId}-sheets-ai-panel`}
      />
    </div>
  )
}
