/**
 * SpreadsheetAppViewer
 *
 * Runtime viewer for a generated spreadsheet app.
 * Standardized on the top-level `components/`, `hooks/`, `views/` structure (no `viewer/` directory).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'

import type { SpreadsheetAppViewerProps, SpreadsheetColumn, SpreadsheetSheet, ViewType } from './types'
import { columnToFormField } from './types'
import {
  SpreadsheetApiService,
  SpreadsheetApiRequestError,
  revalidateSpreadsheetUniverSnapshotAfterIdleTab,
  type SpreadsheetBatchOperation,
  type SpreadsheetBatchOperationResponse
} from './services/SpreadsheetApiService'

import { useSpreadsheetViewerState, sortSpreadsheetRowsBySheetSettings } from './hooks/useSpreadsheetViewerState'
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
import { recordSpreadsheetCellProbe } from './components/cellEditProbe'
import {
  buildWorkbookSnapshot,
  buildMultiSheetWorkbookFromAppSheets,
  countWorksheetsInUniverSnapshot,
  createUniverConversionContext
} from './utils/univerAdapter'
import {
  readLatestUniverSnapshot,
  writeUniverSnapshotCache,
  clearUniverSnapshotCache
} from './utils/univerSnapshotCache'
import { exportSnapshotAsXlsx } from './utils/exportToExcel'
import { resolveRenderedSpreadsheetViewType } from './utils/resolveRenderedSpreadsheetViewType'
import { AutomationsPanel } from './components/AutomationsPanel'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { SheetsAIPanel } from './components/SheetsAIPanel'
import { EntityDataStatusBar } from './components/EntityDataStatusBar'
import { SpreadsheetDialogsSection } from './components/SpreadsheetDialogsSection'
import { SpreadsheetHeader } from './components/SpreadsheetHeader'
import { SpreadsheetSheetTabs } from './components/SpreadsheetSheetTabs'

const debugLog = (...args: unknown[]) => {
  void args
}

/** Monotonic id for `debug:spreadsheet-apps=1` operation-queue traces */
let spreadsheetOpQueueJobSeq = 0

const debugOpQueue = (
  phase: 'enqueue' | 'start' | 'done' | 'fail',
  jobId: number,
  detail?: Record<string, unknown>
) => {
  void phase
  void jobId
  void detail
}

type ViewerRow = Record<string, unknown>
type CellChange = { rowId: string; columnName: string; value: unknown; sheetId?: string }

const viewerRowId = (row: Record<string, unknown>): string => {
  const id = row._id ?? row.id
  if (id == null) return ''
  if (typeof id === 'string') return id
  if (typeof id === 'number') return String(id)
  return ''
}

/**
 * Row id sent to document-service must be SpreadsheetRow.id. Prefer UUID `_id` for persisted rows
 * so a stale `_rowUuid` does not override the canonical backend row id. For client-only rows,
 * `_rowUuid` becomes valid after persistence.
 */
const resolveBackendRowIdForViewerRow = (row: ViewerRow, isUuid: (value: string) => boolean): string | undefined => {
  const uiKey = viewerRowId(row)
  if (!uiKey) return undefined

  const rowUuid = String(row._rowUuid || '')
  const idAsString = String(row._id ?? '')
  const recordId = String(row.id ?? '')

  if (!isUuid(uiKey) && isUuid(rowUuid)) {
    return rowUuid
  }
  if (isUuid(idAsString)) {
    return idAsString
  }
  if (isUuid(rowUuid)) {
    return rowUuid
  }
  if (isUuid(recordId)) {
    return recordId
  }
  return undefined
}

const SNAPSHOT_FETCH_TIMEOUT_MS = 15000

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const rowMatchesRemoteId = (row: ViewerRow, remoteRowId: string): boolean => {
  const candidateIds = [row._rowUuid, row._id, row.id]
    .map(value => (value == null ? '' : String(value)))
    .filter(Boolean)
  return candidateIds.includes(remoteRowId)
}

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
  return rows.map(row => (rowMatchesRemoteId(row, rowId) ? { ...row, [columnName]: value } : row))
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
    const updates =
      updatesByRowId.get(String(row._rowUuid || '')) ??
      updatesByRowId.get(String(row._id || '')) ??
      updatesByRowId.get(String(row.id || ''))
    if (!updates) return row
    return { ...row, ...updates }
  })
}

const applyClearCellDelta = (rows: ViewerRow[], payload: Record<string, unknown>): ViewerRow[] => {
  const rowId = String(payload.rowId || '')
  const columnName = String(payload.columnName || '')
  return rows.map(row => {
    if (!rowMatchesRemoteId(row, rowId)) return row
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
  return rows.filter(row => !rowIds.some(rowId => rowMatchesRemoteId(row, rowId)))
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

const applyRemoteColumnUpdate = (
  columns: SpreadsheetColumn[],
  payload: {
    columnId?: string
    columnPatch?: Partial<SpreadsheetColumn>
    label?: string
    columns?: SpreadsheetColumn[]
  }
): SpreadsheetColumn[] | null => {
  if (Array.isArray(payload.columns) && payload.columns.length > 0) {
    return payload.columns
  }
  if (!payload.columnId) return null
  const nextPatch: Partial<SpreadsheetColumn> = { ...(payload.columnPatch ?? {}) }
  if (typeof payload.label === 'string' && payload.label.trim()) {
    nextPatch.label = payload.label.trim()
  }
  if (Object.keys(nextPatch).length === 0) return null
  return columns.map(column => (column.id === payload.columnId ? { ...column, ...nextPatch } : column))
}

const applyColumnWidthsFromDimensions = (
  columns: SpreadsheetColumn[],
  payload: CellDimensionsPayload
): { nextColumns: SpreadsheetColumn[]; changedColumns: Array<{ columnId: string; width: number }> } | null => {
  const changedColumns: Array<{ columnId: string; width: number }> = []
  let visibleIndex = 0

  const nextColumns = columns.map(column => {
    if (column.isVisible === false) return column
    const entry = payload.columnData[visibleIndex] ?? payload.columnData[String(visibleIndex)]
    const rawWidth = entry?.w ?? payload.defaultColWidth
    visibleIndex += 1
    if (typeof rawWidth !== 'number' || !Number.isFinite(rawWidth) || rawWidth <= 0) return column
    const nextWidth = Math.round(rawWidth)
    const currentWidth =
      typeof column.width === 'number' && Number.isFinite(column.width) ? Math.round(column.width) : null
    if (currentWidth === nextWidth) return column
    changedColumns.push({ columnId: column.id, width: nextWidth })
    return { ...column, width: nextWidth }
  })

  return changedColumns.length > 0 ? { nextColumns, changedColumns } : null
}

const areColumnWidthPatchesEquivalent = (
  columns: SpreadsheetColumn[],
  pendingOverrides: Record<string, number>,
  changedColumns: Array<{ columnId: string; width: number }>
): boolean =>
  changedColumns.every(change => {
    const currentColumn = columns.find(column => column.id === change.columnId)
    const currentWidth =
      typeof currentColumn?.width === 'number' && Number.isFinite(currentColumn.width)
        ? Math.round(currentColumn.width)
        : undefined
    const pendingWidth = pendingOverrides[change.columnId]
    return currentWidth === change.width || Math.round(pendingWidth ?? NaN) === change.width
  })

const SPREADSHEET_STRUCTURAL_REMOTE_OPS = new Set([
  'row_add',
  'row_delete',
  'column_add',
  'column_delete',
  'columns_reorder'
])

function getSpreadsheetOperationSheetId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const d = data as Record<string, unknown>
  return typeof d.sheetId === 'string' ? d.sheetId : undefined
}

/**
 * Refuse to apply a delta when the server says so, when the version advanced without ops,
 * or when the first logged version is past sinceVersion+1 (truncated log / column-only bumps).
 */
function sheetDeltaRequiresFullSnapshot(
  sinceVersion: number,
  delta: { currentVersion: number; changes?: unknown[]; requiresSnapshot?: boolean }
): boolean {
  if (delta.requiresSnapshot) return true
  if (delta.currentVersion <= sinceVersion) return false
  const changes = delta.changes || []
  if (changes.length === 0) return true
  const applied = changes
    .map(c => Number((c as Record<string, unknown>).appliedVersion))
    .filter(n => Number.isFinite(n) && n > 0)
  if (applied.length === 0) return true
  const minApplied = Math.min(...applied)
  return minApplied > sinceVersion + 1
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
    const backend = resolveBackendRowIdForViewerRow(row, isUuid)
    if (backend) map.set(uiRowId, backend)
  })
  return map
}

const partitionCellUpdatesByBackendRowId = (
  queuedCells: CellChange[],
  uiToBackendRowId: Map<string, string>,
  pendingClientRowUpdates: Map<string, Record<string, unknown>>,
  isUuid: (value: string) => boolean
): {
  setUpdatesByBackendRowId: Map<string, Record<string, unknown>>
  clearCells: Array<{ rowId: string; columnName: string }>
} => {
  const setUpdatesByBackendRowId = new Map<string, Record<string, unknown>>()
  const clearColumnsByBackendRowId = new Map<string, Set<string>>()
  for (const cell of queuedCells) {
    const uiRowId = String(cell.rowId)
    const backendRowId = uiToBackendRowId.get(uiRowId) ?? (isUuid(uiRowId) ? uiRowId : undefined)
    if (!backendRowId) {
      const pending = pendingClientRowUpdates.get(uiRowId) ?? {}
      pending[cell.columnName] = cell.value
      pendingClientRowUpdates.set(uiRowId, pending)
      continue
    }
    const backendUpdates = setUpdatesByBackendRowId.get(backendRowId) ?? {}
    const clearColumns = clearColumnsByBackendRowId.get(backendRowId) ?? new Set<string>()
    if (cell.value === undefined) {
      delete backendUpdates[cell.columnName]
      if (Object.keys(backendUpdates).length === 0) {
        setUpdatesByBackendRowId.delete(backendRowId)
      } else {
        setUpdatesByBackendRowId.set(backendRowId, backendUpdates)
      }
      clearColumns.add(cell.columnName)
      clearColumnsByBackendRowId.set(backendRowId, clearColumns)
      continue
    }

    clearColumns.delete(cell.columnName)
    if (clearColumns.size === 0) {
      clearColumnsByBackendRowId.delete(backendRowId)
    } else {
      clearColumnsByBackendRowId.set(backendRowId, clearColumns)
    }
    backendUpdates[cell.columnName] = cell.value
    setUpdatesByBackendRowId.set(backendRowId, backendUpdates)
  }
  const clearCells = Array.from(clearColumnsByBackendRowId.entries()).flatMap(([rowId, columnNames]) =>
    Array.from(columnNames).map(columnName => ({ rowId, columnName }))
  )
  return { setUpdatesByBackendRowId, clearCells }
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
    let sheetSnapRaw: unknown
    if (sheets?.[activeSheetId]) {
      sheetSnapRaw = sheets[activeSheetId]
    } else if (sheetOrder?.[0] && sheets) {
      sheetSnapRaw = sheets[sheetOrder[0]]
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

const getDimensionPayloadSignature = (payload: CellDimensionsPayload): string =>
  JSON.stringify({
    sheetId: payload.sheetId,
    defaultColWidth: payload.defaultColWidth,
    defaultRowHeight: payload.defaultRowHeight,
    rowHeaderWidth: payload.rowHeaderWidth,
    columnHeaderHeight: payload.columnHeaderHeight,
    zoomRatio: payload.zoomRatio,
    columnData: Object.fromEntries(
      Object.entries(payload.columnData ?? {}).sort(([a], [b]) => String(a).localeCompare(String(b)))
    ),
    rowData: Object.fromEntries(
      Object.entries(payload.rowData ?? {}).sort(([a], [b]) => String(a).localeCompare(String(b)))
    )
  })

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

const cloneSnapshot = <T,>(value: T): T => {
  if (value == null) return value
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value)
    }
  } catch {
    // Fall through to JSON clone.
  }
  return JSON.parse(JSON.stringify(value)) as T
}

const stripCellDataFromWorkbookSnapshot = <T,>(snapshot: T): T => {
  if (snapshot == null || typeof snapshot !== 'object') return snapshot

  const nextSnapshot = cloneSnapshot(snapshot)
  const workbook = nextSnapshot as Record<string, unknown>
  const sheets = workbook.sheets as Record<string, unknown> | undefined
  if (!sheets || typeof sheets !== 'object') {
    return nextSnapshot
  }

  const sanitizedSheets: Record<string, unknown> = {}
  for (const [sheetKey, sheetValue] of Object.entries(sheets)) {
    if (!sheetValue || typeof sheetValue !== 'object') {
      sanitizedSheets[sheetKey] = sheetValue
      continue
    }

    const worksheet = { ...(sheetValue as Record<string, unknown>) }
    delete worksheet.cellData
    sanitizedSheets[sheetKey] = worksheet
  }

  workbook.sheets = sanitizedSheets
  return nextSnapshot
}

const mergeBootstrapSnapshotWithCanonicalRows = (
  snapshot: Record<string, unknown>,
  sheet: SpreadsheetSheet,
  rows: Record<string, unknown>[]
): Record<string, unknown> => {
  const canonicalWorkbook = buildWorkbookSnapshot(sheet, rows, sheet.columns) as unknown as Record<string, unknown>
  const canonicalWorksheet = getWorksheetFromSnapshot(canonicalWorkbook, sheet.id)
  if (!canonicalWorksheet) return snapshot

  const nextSnapshot = cloneSnapshot(snapshot)
  const sheets = ((nextSnapshot.sheets as Record<string, unknown> | undefined) ?? {}) as Record<string, unknown>
  const existingWorksheet = getWorksheetFromSnapshot(nextSnapshot, sheet.id) ?? {}
  sheets[sheet.id] = {
    ...existingWorksheet,
    id: sheet.id,
    name: sheet.name,
    cellData: canonicalWorksheet.cellData,
    rowCount: canonicalWorksheet.rowCount,
    columnCount: canonicalWorksheet.columnCount
  }
  nextSnapshot.sheets = sheets
  if (!Array.isArray(nextSnapshot.sheetOrder)) {
    nextSnapshot.sheetOrder = [sheet.id]
  }
  return nextSnapshot
}

const saveSnapshotWithRetry = async ({
  appId,
  activeSheetId,
  baseSnapshot,
  sheetVersionRef,
  snapshotSaveMetricsRef,
  recoverFromVersionConflict,
  spreadsheetGridRef,
  collaboration,
  maxSnapshotRetries,
  lastEmittedDimensionSignatureRef
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
  lastEmittedDimensionSignatureRef: React.MutableRefObject<string | null>
}): Promise<{ savedSnapshot: unknown; cacheResult: { stored: boolean; reason: string | null } }> => {
  let lastError: unknown
  for (let attempt = 0; attempt < maxSnapshotRetries; attempt++) {
    try {
      const rawSnapshot =
        attempt === 0 ? baseSnapshot : (spreadsheetGridRef.current?.getWorkbookSnapshot?.() ?? baseSnapshot)
      const snapshotToSave = stripCellDataFromWorkbookSnapshot(rawSnapshot)
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
          const signature = getDimensionPayloadSignature(dimensionPayload)
          if (lastEmittedDimensionSignatureRef.current !== signature) {
            lastEmittedDimensionSignatureRef.current = signature
            collaboration.emitOperation({
              type: 'dimension_sync',
              data: dimensionPayload,
              broadcastOnly: true
            })
          }
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
  const sheetVersionSyncSheetIdRef = useRef<string>('')
  const recoverFromVersionConflictRef = useRef<() => Promise<void>>(async () => {})
  const remoteStructuralResyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteVersionRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteAuthoritativeResyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteAuthoritativeHealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDimensionColumnsRef = useRef<SpreadsheetColumn[] | null>(null)
  const pendingDimensionChangesRef = useRef<Array<{ columnId: string; width: number }>>([])
  const pendingDimensionPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recentLocalColumnResizeRef = useRef<Map<string, { width: number; at: number }>>(new Map())
  const lastEmittedDimensionSignatureRef = useRef<string | null>(null)
  const [pendingColumnWidthOverrides, setPendingColumnWidthOverrides] = useState<Record<string, number>>({})
  const snapshotSaveMetricsRef = useRef({
    attempts: 0,
    conflicts: 0,
    failures: 0,
    fallbackLoads: 0
  })
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve())
  const pendingClientRowUpdatesRef = useRef<Map<string, Record<string, unknown>>>(new Map())
  const pendingCellChangesRef = useRef<CellChange[]>([])
  const pendingCellPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enqueueSnapshotCheckpointRef = useRef<(() => Promise<void>) | null>(null)
  const lastSuccessfulSnapshotCheckpointAtRef = useRef<number>(0)
  const latestUniverDataRef = useRef<Record<string, unknown>[] | null>(null)
  const univerDataChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProcessedLengthRef = useRef<number>(0)
  const lastPersistedSheetDataRef = useRef<Record<string, unknown>[]>([])
  const cellFlushSequenceRef = useRef<number>(0)
  const unloadKeepAlivePersistRef = useRef(false)
  const [bootstrapSnapshot, setBootstrapSnapshot] = useState<Record<string, unknown> | null>(null)
  const [bootstrapSnapshotSeed, setBootstrapSnapshotSeed] = useState<string>('none')
  const [isBootstrapSnapshotLoading, setIsBootstrapSnapshotLoading] = useState<boolean>(true)
  const [showEmergencyFallback, setShowEmergencyFallback] = useState(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [isSheetsAIOpen, setIsSheetsAIOpen] = useState(false)
  const [analyticsInitialTab, setAnalyticsInitialTab] = useState<AnalyticsPanelTab>('charts')
  const [sheetsAIInitialTab, setSheetsAIInitialTab] = useState<SheetsAITab>('formula')
  const UNIVER_DATA_CHANGE_DEBOUNCE_MS = 250
  // 400ms debounce batches rapid keystrokes into a single flush without noticeable delay.
  const CELL_PERSIST_DEBOUNCE_MS = 250
  const CELL_PERSIST_COLLAB_DEBOUNCE_MS = 40
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
  const activeSheetIdRef = useRef(activeSheetId)
  activeSheetIdRef.current = activeSheetId
  const peerSheetDataCacheRef = useRef<Map<string, Record<string, unknown>[]>>(new Map())

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
  const viewType = useMemo(
    () => resolveRenderedSpreadsheetViewType((activeView?.config.type || activeSheet.viewType || 'table') as ViewType),
    [activeView?.config.type, activeSheet.viewType]
  )
  const preferUniverNativeSheetTabs = useMemo(
    () => viewType === 'table' && !entityEnabled && app.sheets.length > 1,
    [viewType, entityEnabled, app.sheets.length]
  )

  const setActiveSheetIdWithPeerCache = useCallback(
    (nextId: string) => {
      if (!preferUniverNativeSheetTabs) {
        setActiveSheetId(nextId)
        return
      }
      setActiveSheetId(prev => {
        if (prev === nextId) return prev
        peerSheetDataCacheRef.current.set(prev, [...localSheetDataRef.current])
        return nextId
      })
    },
    [preferUniverNativeSheetTabs, setActiveSheetId, localSheetDataRef]
  )

  useEffect(() => {
    peerSheetDataCacheRef.current.clear()
  }, [app.id])

  const prevActiveSheetIdForPeerRestoreRef = useRef(activeSheetId)
  useEffect(() => {
    const prev = prevActiveSheetIdForPeerRestoreRef.current
    prevActiveSheetIdForPeerRestoreRef.current = activeSheetId
    if (!preferUniverNativeSheetTabs) return
    if (prev === activeSheetId) return
    const cached = peerSheetDataCacheRef.current.get(activeSheetId)
    if (!cached) return
    setLocalSheetData(sortSpreadsheetRowsBySheetSettings(cached, activeSheet))
  }, [activeSheetId, preferUniverNativeSheetTabs, activeSheet, setLocalSheetData])

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
    const nextVersion = Number(activeSheet.version ?? 0)
    if (sheetVersionSyncSheetIdRef.current !== activeSheetId) {
      sheetVersionSyncSheetIdRef.current = activeSheetId
      sheetVersionRef.current = nextVersion
      return
    }
    if (Number.isFinite(nextVersion) && nextVersion > sheetVersionRef.current) {
      sheetVersionRef.current = nextVersion
    }
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
      let minVersion = Number(activeSheet.version ?? 0)
      try {
        const canonicalSnapshot = await SpreadsheetApiService.getSheetSnapshot(app.id, activeSheetId)
        if (cancelled) return
        const canonicalSheetMeta = (canonicalSnapshot.sheet as SpreadsheetSheet | undefined) ?? activeSheet
        const canonicalRows = sortSpreadsheetRowsBySheetSettings(
          mapSnapshotRowsToViewerRows(canonicalSnapshot.rows || []),
          canonicalSheetMeta
        )
        const canonicalVersion = Number(canonicalSnapshot.version ?? minVersion)
        minVersion = Number.isFinite(canonicalVersion) ? canonicalVersion : minVersion
        sheetVersionRef.current = minVersion
        setLocalSheetData(canonicalRows)
        lastPersistedSheetDataRef.current = canonicalRows
        peerSheetDataCacheRef.current.set(activeSheetId, canonicalRows)

        const result = await loadBootstrapSnapshotData(app.id, activeSheetId, minVersion)
        if (cancelled) return
        const normalizedSnapshot =
          result.snapshot && typeof result.snapshot === 'object'
            ? mergeBootstrapSnapshotWithCanonicalRows(result.snapshot, activeSheet, canonicalRows)
            : result.snapshot
        setBootstrapState(normalizedSnapshot, result.seed)
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

    // Bootstrap from snapshot on initial sheet/app load only. Re-running this effect on every
    // sheet version bump can reinitialize Univer from a stale snapshot and undo recent
    // snapshot-only state like resized column widths before the new snapshot is persisted.
    void loadBootstrapSnapshot()
    return () => {
      cancelled = true
    }
  }, [activeSheetId, app.id, entityEnabled])

  useEffect(() => {
    lastProcessedLengthRef.current = localSheetDataRef.current.length
    lastPersistedSheetDataRef.current = localSheetDataRef.current
  }, [activeSheetId])

  const tableUniverSnapshot = useMemo((): Record<string, unknown> | null => {
    if (!preferUniverNativeSheetTabs) return null
    if (countWorksheetsInUniverSnapshot(bootstrapSnapshot) > 1) return bootstrapSnapshot
    return buildMultiSheetWorkbookFromAppSheets({
      appSheets: app.sheets,
      activeSheetId,
      getRowsForSheet: (sheetId: string) => {
        if (sheetId === activeSheetId) return localSheetData
        const cached = peerSheetDataCacheRef.current.get(sheetId)
        const sheet = app.sheets.find(entry => entry.id === sheetId)
        return cached ?? sortSpreadsheetRowsBySheetSettings(sheet?.data ?? [], sheet)
      },
      singleWorksheetBootstrap: bootstrapSnapshot,
      appId: app.id
    }) as unknown as Record<string, unknown>
  }, [preferUniverNativeSheetTabs, bootstrapSnapshot, app.sheets, activeSheetId, localSheetData, app.id])

  const tableSnapshotSeed = useMemo(() => {
    if (!preferUniverNativeSheetTabs) return bootstrapSnapshotSeed
    if (countWorksheetsInUniverSnapshot(bootstrapSnapshot) > 1) return bootstrapSnapshotSeed
    return `merged:${activeSheetId}:${bootstrapSnapshotSeed}`
  }, [preferUniverNativeSheetTabs, activeSheetId, bootstrapSnapshotSeed, bootstrapSnapshot])

  const tableWorkbookRemountKey = useMemo(() => {
    if (!preferUniverNativeSheetTabs) return undefined
    return `${app.id}:${app.sheets.map(sheet => sheet.id).join(':')}`
  }, [preferUniverNativeSheetTabs, app.id, app.sheets])

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
    onVersionRestored: handleVersionRestored,
    onError: error => {
      if (error.name === 'VersionRestoreError') {
        toast.error(error.message)
      }
    },
    t: sheetT
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
  const [authoritativeDataSyncToken, setAuthoritativeDataSyncToken] = useState(0)

  // Bump snapshot seed so Univer reinitializes with fresh data when automation adds/updates rows.
  // Clear bootstrap snapshot so the grid builds from current localSheetData (which has the new rows).
  const requestGridRefresh = useCallback(() => {
    setBootstrapSnapshot(null)
    setBootstrapSnapshotSeed(prev => `${prev}-refresh-${Date.now()}`)
  }, [])

  const commitLocalSheetData = useCallback(
    (next: Record<string, unknown>[], options?: { persisted?: boolean; syncGrid?: boolean }) => {
      localSheetDataRef.current = next
      setLocalSheetData(next)
      if (options?.persisted) {
        lastPersistedSheetDataRef.current = next
      }
      if (options?.syncGrid) {
        setAuthoritativeDataSyncToken(prev => prev + 1)
      }
      onDataChange?.(activeSheetId, next)
    },
    [activeSheetId, localSheetDataRef, onDataChange, setLocalSheetData]
  )

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
      toast.success(sheetT('toast-submit-success'))
      onBack?.()
    } else {
      toast.error(result.error || sheetT('toast-submit-failed'))
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
        const fallbackIndex = localSheetDataRef.current.findIndex(row => rowMatchesRemoteId(row, remoteRowId))
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

  const scheduleRemoteStructuralResync = useCallback(() => {
    if (remoteStructuralResyncTimeoutRef.current) clearTimeout(remoteStructuralResyncTimeoutRef.current)
    remoteStructuralResyncTimeoutRef.current = setTimeout(() => {
      remoteStructuralResyncTimeoutRef.current = null
      void recoverFromVersionConflictRef.current()
    }, 500)
  }, [])

  const scheduleSheetVersionRefreshFromApi = useCallback(() => {
    if (remoteVersionRefreshTimeoutRef.current) clearTimeout(remoteVersionRefreshTimeoutRef.current)
    remoteVersionRefreshTimeoutRef.current = setTimeout(() => {
      remoteVersionRefreshTimeoutRef.current = null
      void (async () => {
        try {
          const sheet = await SpreadsheetApiService.getSheet(app.id, activeSheetId)
          if (sheet?.version != null) {
            sheetVersionRef.current = Math.max(sheetVersionRef.current, Number(sheet.version))
          }
        } catch {
          /* ignore */
        }
      })()
    }, 250)
  }, [app.id, activeSheetId])

  const scheduleRemoteAuthoritativeResyncFromApi = useCallback(() => {
    if (remoteAuthoritativeResyncTimeoutRef.current) clearTimeout(remoteAuthoritativeResyncTimeoutRef.current)
    remoteAuthoritativeResyncTimeoutRef.current = setTimeout(() => {
      remoteAuthoritativeResyncTimeoutRef.current = null
      void recoverFromVersionConflictRef.current()
    }, 900)
  }, [])

  const scheduleRemoteAuthoritativeHealFromApi = useCallback(() => {
    if (remoteAuthoritativeHealTimeoutRef.current) clearTimeout(remoteAuthoritativeHealTimeoutRef.current)
    remoteAuthoritativeHealTimeoutRef.current = setTimeout(() => {
      remoteAuthoritativeHealTimeoutRef.current = null
      void (async () => {
        if (pendingCellPersistTimeoutRef.current != null || pendingCellChangesRef.current.length > 0) {
          scheduleRemoteAuthoritativeHealFromApi()
          return
        }
        try {
          const snapshot = await SpreadsheetApiService.getSheetSnapshot(app.id, activeSheetId)
          const recoveredSheetMeta = (snapshot.sheet as SpreadsheetSheet | undefined) ?? activeSheet
          const rows = sortSpreadsheetRowsBySheetSettings(
            mapSnapshotRowsToViewerRows(snapshot.rows || []),
            recoveredSheetMeta
          )
          sheetVersionRef.current = Number(snapshot.version || sheetVersionRef.current)
          commitLocalSheetData(rows, { persisted: true, syncGrid: true })

          const sheetMeta = snapshot.sheet as Record<string, unknown> | undefined
          if (onSheetUpdate && sheetMeta && Array.isArray(sheetMeta.columns)) {
            void onSheetUpdate(app.id, activeSheetId, {
              columns: sheetMeta.columns as SpreadsheetColumn[]
            })
          }
        } catch {
          void recoverFromVersionConflictRef.current()
        }
      })()
    }, 1200)
  }, [activeSheet, activeSheetId, app.id, commitLocalSheetData, onSheetUpdate])

  // --- Collaboration (header presence + Univer grid operations/cursors) ---
  const handleCollaborationOperation = useCallback(
    (payload: { operation: { type: string; data?: unknown; broadcastOnly?: boolean }; version?: number }) => {
      const applyOperation = (
        operation: { type: string; data?: unknown; broadcastOnly?: boolean },
        version?: number
      ) => {
        if (operation.type === 'dimension_sync') {
          const d = operation.data as CellDimensionsPayload | undefined
          if (d?.sheetId === activeSheetId && spreadsheetGridRef.current?.applyRemoteDimensions) {
            spreadsheetGridRef.current.applyRemoteDimensions(d)
          }
          return
        }

        const opSheetId = getSpreadsheetOperationSheetId(operation.data)
        if (operation.type === 'column_update') {
          const d = operation.data as {
            sheetId?: string
            columnId?: string
            columnPatch?: Partial<SpreadsheetColumn>
            label?: string
            columns?: SpreadsheetColumn[]
          }
          if (d?.sheetId !== activeSheetId) return
          if (typeof version === 'number' && Number.isFinite(version) && version >= 0) {
            sheetVersionRef.current = Math.max(sheetVersionRef.current, Math.trunc(version))
          } else {
            scheduleSheetVersionRefreshFromApi()
          }
          const nextWidth =
            typeof d.columnPatch?.width === 'number' && Number.isFinite(d.columnPatch.width)
              ? Math.round(d.columnPatch.width)
              : undefined
          const currentColumn = activeSheet.columns.find(column => column.id === d.columnId)
          const currentWidth =
            typeof currentColumn?.width === 'number' && Number.isFinite(currentColumn.width)
              ? Math.round(currentColumn.width)
              : undefined
          const pendingWidth = pendingColumnWidthOverrides[d.columnId ?? '']
          const localResizeKey = `${activeSheetId}:${d.columnId ?? ''}`
          const recentLocalResize = recentLocalColumnResizeRef.current.get(localResizeKey)
          if (
            nextWidth != null &&
            (currentWidth === nextWidth ||
              Math.round(pendingWidth ?? NaN) === nextWidth ||
              (recentLocalResize && recentLocalResize.width === nextWidth && Date.now() - recentLocalResize.at < 5000))
          ) {
            return
          }
          const nextColumns = applyRemoteColumnUpdate(activeSheet.columns, d)
          if (!nextColumns || !onAppUpdate) return
          onAppUpdate({
            ...app,
            sheets: app.sheets.map(sheet => (sheet.id === activeSheetId ? { ...sheet, columns: nextColumns } : sheet))
          })
          return
        }

        if (operation.type === 'row_update') {
          const d = operation.data as {
            sheetId?: string
            rowId?: string
            rowData?: Record<string, unknown>
          }
          if (!d?.sheetId || d.sheetId !== activeSheetId || !d.rowId || !d.rowData || typeof d.rowData !== 'object')
            return
          if (typeof version === 'number' && Number.isFinite(version) && version >= 0) {
            sheetVersionRef.current = Math.max(sheetVersionRef.current, Math.trunc(version))
          } else {
            scheduleRemoteAuthoritativeResyncFromApi()
          }
          const remoteRowId = String(d.rowId)
          const rowData = d.rowData
          const nextLocal = localSheetDataRef.current.map(row => {
            if (!rowMatchesRemoteId(row, remoteRowId)) return row
            return { ...row, ...rowData, _updatedAt: new Date().toISOString() }
          })
          commitLocalSheetData(nextLocal, { persisted: true, syncGrid: true })
          return
        }

        if (opSheetId === activeSheetId && typeof version === 'number' && Number.isFinite(version) && version >= 0) {
          sheetVersionRef.current = Math.max(sheetVersionRef.current, Math.trunc(version))
        } else if (
          opSheetId === activeSheetId &&
          (operation.type === 'cell_update' ||
            operation.type === 'cell_change' ||
            operation.type === 'set_range' ||
            operation.type === 'clear_cell' ||
            operation.type === 'row_update')
        ) {
          scheduleRemoteAuthoritativeResyncFromApi()
        }

        if (opSheetId === activeSheetId && SPREADSHEET_STRUCTURAL_REMOTE_OPS.has(operation.type)) {
          scheduleRemoteStructuralResync()
        }

        if (
          opSheetId === activeSheetId &&
          (operation.type === 'cell_update' ||
            operation.type === 'cell_change' ||
            operation.type === 'set_range' ||
            operation.type === 'clear_cell' ||
            operation.type === 'row_update')
        ) {
          scheduleRemoteAuthoritativeHealFromApi()
        }

        if (operation.type === 'set_range') {
          const d = operation.data as {
            sheetId?: string
            cells?: Array<{ rowId?: string; columnName?: string; column?: string; columnId?: string; value?: unknown }>
          }
          if (!d?.sheetId || d.sheetId !== activeSheetId || !Array.isArray(d.cells) || d.cells.length === 0) return

          const updatesByRowId = new Map<string, Record<string, unknown>>()
          const gridPatches: Array<{ rowIndex: number; colIndex: number; value: unknown }> = []
          for (const cell of d.cells) {
            if (!cell?.rowId) continue
            const columnKey = cell.columnName ?? cell.column ?? cell.columnId
            if (columnKey == null) continue
            const remoteRowId = String(cell.rowId)
            const { rowIndex, colIndex, targetColumnName } = resolveRemoteCellCoordinates(
              String(columnKey),
              remoteRowId
            )
            if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
              gridPatches.push({ rowIndex, colIndex, value: cell.value })
            }
            const rowUpdates = updatesByRowId.get(remoteRowId) ?? {}
            rowUpdates[targetColumnName] = cell.value
            updatesByRowId.set(remoteRowId, rowUpdates)
          }

          if (updatesByRowId.size === 0) return
          if (spreadsheetGridRef.current?.applyRemoteCellUpdate) {
            for (const patch of gridPatches) {
              spreadsheetGridRef.current.applyRemoteCellUpdate(patch.rowIndex, patch.colIndex, patch.value)
            }
          }
          const nextLocal = localSheetDataRef.current.map(row => {
            const updates =
              updatesByRowId.get(String(row._rowUuid || '')) ??
              updatesByRowId.get(String(row._id || '')) ??
              updatesByRowId.get(String(row.id || ''))
            if (!updates) return row
            return { ...row, ...updates, _updatedAt: new Date().toISOString() }
          })
          commitLocalSheetData(nextLocal, { persisted: true, syncGrid: true })
          return
        }

        if (operation.type === 'clear_cell') {
          const d = operation.data as {
            sheetId?: string
            rowId?: string
            columnName?: string
            column?: string
            columnId?: string
          }
          if (!d?.sheetId || d.sheetId !== activeSheetId || d.rowId == null) return
          const columnKey = d.columnName ?? d.column ?? d.columnId
          if (columnKey == null) return
          const remoteRowId = String(d.rowId)
          const { rowIndex, colIndex, targetColumnName } = resolveRemoteCellCoordinates(String(columnKey), remoteRowId)
          if (
            rowIndex !== undefined &&
            colIndex !== undefined &&
            colIndex >= 0 &&
            spreadsheetGridRef.current?.applyRemoteCellUpdate
          ) {
            spreadsheetGridRef.current.applyRemoteCellUpdate(rowIndex, colIndex, '')
          }
          const nextLocal = localSheetDataRef.current.map(row => {
            if (!rowMatchesRemoteId(row, remoteRowId)) return row
            const nextRow = { ...row, _updatedAt: new Date().toISOString() }
            delete nextRow[targetColumnName]
            return nextRow
          })
          commitLocalSheetData(nextLocal, { persisted: true, syncGrid: true })
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
        if (
          rowIndex !== undefined &&
          colIndex !== undefined &&
          colIndex >= 0 &&
          spreadsheetGridRef.current?.applyRemoteCellUpdate
        ) {
          spreadsheetGridRef.current.applyRemoteCellUpdate(rowIndex, colIndex, d.value)
        }
        const nextLocal = localSheetDataRef.current.map(row => {
          if (!rowMatchesRemoteId(row, remoteRowId)) return row
          return { ...row, [targetColumnName]: d.value, _updatedAt: new Date().toISOString() }
        })
        commitLocalSheetData(nextLocal, { persisted: true, syncGrid: true })
      }

      const operation = payload.operation
      if (operation.type === 'batch_operations') {
        const d = operation.data as {
          sheetId?: string
          operations?: Array<{ type: string; data?: unknown; broadcastOnly?: boolean }>
        }
        if (!d?.sheetId || d.sheetId !== activeSheetId || !Array.isArray(d.operations) || d.operations.length === 0) {
          return
        }
        for (const nestedOperation of d.operations) {
          applyOperation(nestedOperation, payload.version)
        }
        return
      }

      applyOperation(operation, payload.version)
    },
    [
      activeSheetId,
      activeSheet.columns,
      app,
      commitLocalSheetData,
      localSheetDataRef,
      onAppUpdate,
      pendingColumnWidthOverrides,
      resolveRemoteCellCoordinates,
      scheduleRemoteAuthoritativeHealFromApi,
      scheduleRemoteStructuralResync,
      scheduleRemoteAuthoritativeResyncFromApi,
      scheduleSheetVersionRefreshFromApi
    ]
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

  const effectiveGridColumns = useMemo(() => {
    const overrideEntries = Object.entries(pendingColumnWidthOverrides)
    if (overrideEntries.length === 0) return activeSheet.columns
    return activeSheet.columns.map(column => {
      const overrideWidth = pendingColumnWidthOverrides[column.id]
      if (typeof overrideWidth !== 'number' || !Number.isFinite(overrideWidth) || overrideWidth <= 0) {
        return column
      }
      const currentWidth =
        typeof column.width === 'number' && Number.isFinite(column.width) ? Math.round(column.width) : undefined
      if (currentWidth === Math.round(overrideWidth)) return column
      return { ...column, width: overrideWidth }
    })
  }, [activeSheet.columns, pendingColumnWidthOverrides])

  /** Prefer `isVisible !== false`; if that would hide every column (legacy data), fall back so Univer still mounts. */
  const spreadsheetColumnsForGrid = useMemo(() => {
    const visible = effectiveGridColumns.filter(c => c.isVisible !== false)
    if (visible.length > 0) return visible
    return effectiveGridColumns.length > 0 ? effectiveGridColumns : visible
  }, [effectiveGridColumns])

  useEffect(() => {
    setPendingColumnWidthOverrides(prev => {
      const next: Record<string, number> = {}
      let changed = false
      activeSheet.columns.forEach(column => {
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
  }, [activeSheet.columns])

  const handleDimensionsChanged = useCallback(
    (payload: CellDimensionsPayload) => {
      if (!canEditWithLock) return
      if (payload.sheetId !== activeSheetId) return
      if (!onSheetUpdate) return

      const next = applyColumnWidthsFromDimensions(activeSheet.columns, payload)
      if (!next) return
      if (areColumnWidthPatchesEquivalent(activeSheet.columns, pendingColumnWidthOverrides, next.changedColumns)) {
        return
      }

      setPendingColumnWidthOverrides(prev => {
        const hasMaterialOverrideChange = next.changedColumns.some(change => prev[change.columnId] !== change.width)
        if (!hasMaterialOverrideChange) {
          return prev
        }
        const updated = { ...prev }
        next.changedColumns.forEach(change => {
          updated[change.columnId] = change.width
        })
        return updated
      })
      pendingDimensionColumnsRef.current = next.nextColumns
      pendingDimensionChangesRef.current = next.changedColumns
      if (pendingDimensionPersistTimeoutRef.current) {
        clearTimeout(pendingDimensionPersistTimeoutRef.current)
      }

      pendingDimensionPersistTimeoutRef.current = setTimeout(() => {
        pendingDimensionPersistTimeoutRef.current = null
        const columnsToPersist = pendingDimensionColumnsRef.current
        const changedColumns = pendingDimensionChangesRef.current
        pendingDimensionColumnsRef.current = null
        pendingDimensionChangesRef.current = []
        if (!columnsToPersist || changedColumns.length === 0) return

        void (async () => {
          try {
            const updated = await onSheetUpdate(app.id, activeSheetId, { columns: columnsToPersist })
            if (updated?.version != null) {
              sheetVersionRef.current = Math.max(sheetVersionRef.current, Number(updated.version))
            } else {
              scheduleSheetVersionRefreshFromApi()
            }
            changedColumns.forEach(change => {
              recentLocalColumnResizeRef.current.set(`${activeSheetId}:${change.columnId}`, {
                width: change.width,
                at: Date.now()
              })
              collaboration.emitOperation({
                type: 'column_update',
                data: {
                  sheetId: activeSheetId,
                  columnId: change.columnId,
                  columnPatch: { width: change.width }
                },
                broadcastOnly: true,
                version: updated?.version != null ? Number(updated.version) : undefined
              } as any)
            })
          } catch (error) {
            setPendingColumnWidthOverrides(prev => {
              const updated = { ...prev }
              changedColumns.forEach(change => {
                delete updated[change.columnId]
              })
              return updated
            })
            console.error('[SpreadsheetAppViewer] Failed to persist column widths from dimensions:', error)
          }
        })()
      }, 500)
    },
    [
      activeSheet.columns,
      activeSheetId,
      app.id,
      canEditWithLock,
      collaboration,
      onSheetUpdate,
      pendingColumnWidthOverrides,
      scheduleSheetVersionRefreshFromApi
    ]
  )

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

  const recoverFromVersionConflict = useCallback(async () => {
    try {
      const sinceVersion = sheetVersionRef.current
      const delta = await SpreadsheetApiService.getSheetChangesSince(app.id, activeSheetId, sinceVersion)
      if (!sheetDeltaRequiresFullSnapshot(sinceVersion, delta)) {
        const next = applyDeltaChangesToRows(localSheetDataRef.current, delta.changes)
        sheetVersionRef.current = Number(delta.currentVersion || sheetVersionRef.current)
        commitLocalSheetData(next, { persisted: true, syncGrid: true })
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
        return
      }

      snapshotSaveMetricsRef.current.fallbackLoads += 1
      const snapshot = await SpreadsheetApiService.getSheetSnapshot(app.id, activeSheetId)
      const recoveredSheetMeta = (snapshot.sheet as SpreadsheetSheet | undefined) ?? activeSheet
      const rows = sortSpreadsheetRowsBySheetSettings(
        mapSnapshotRowsToViewerRows(snapshot.rows || []),
        recoveredSheetMeta
      )
      sheetVersionRef.current = Number(snapshot.version || 0)
      commitLocalSheetData(rows, { persisted: true })
      requestGridRefresh()

      const sheetMeta = snapshot.sheet as Record<string, unknown> | undefined
      if (onSheetUpdate && sheetMeta && Array.isArray(sheetMeta.columns)) {
        void onSheetUpdate(app.id, activeSheetId, {
          columns: sheetMeta.columns as SpreadsheetColumn[]
        })
      }

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
    commitLocalSheetData,
    localSheetDataRef,
    onDataChange,
    onSheetUpdate,
    requestGridRefresh,
    setLocalSheetData,
    sheetPersist.recordSuccess,
    versioning.markAsSaved
  ])

  useEffect(() => {
    recoverFromVersionConflictRef.current = recoverFromVersionConflict
  }, [recoverFromVersionConflict])

  useEffect(() => {
    return () => {
      if (remoteStructuralResyncTimeoutRef.current) clearTimeout(remoteStructuralResyncTimeoutRef.current)
      if (remoteVersionRefreshTimeoutRef.current) clearTimeout(remoteVersionRefreshTimeoutRef.current)
      if (remoteAuthoritativeResyncTimeoutRef.current) clearTimeout(remoteAuthoritativeResyncTimeoutRef.current)
      if (remoteAuthoritativeHealTimeoutRef.current) clearTimeout(remoteAuthoritativeHealTimeoutRef.current)
      if (pendingDimensionPersistTimeoutRef.current) clearTimeout(pendingDimensionPersistTimeoutRef.current)
    }
  }, [])

  // applyBatchDirect: calls the API immediately without chaining to operationQueueRef.
  // Use this inside functions that are already running as part of the queue to avoid
  // a circular promise dependency (deadlock) where the queued function awaits an inner
  // operation that is itself waiting for the queue to drain.
  const applyBatchDirectForSheet = useCallback(
    async (
      targetSheetId: string,
      operations: SpreadsheetBatchOperation[],
      batchIdPrefix = 'batch'
    ): Promise<SpreadsheetBatchOperationResponse> => {
      const isActiveTarget = () => targetSheetId === activeSheetIdRef.current
      const resolveBaseVersion = () =>
        isActiveTarget() ? sheetVersionRef.current : Number(app.sheets.find(s => s.id === targetSheetId)?.version ?? 0)
      const shouldRefreshBaseVersionBeforeWrite = () =>
        isActiveTarget() && collaboration.isCollaborationConnected && collaboration.headerParticipants.length > 1
      const refreshBaseVersionBeforeWrite = async (fallbackVersion: number): Promise<number> => {
        if (!shouldRefreshBaseVersionBeforeWrite()) return fallbackVersion
        try {
          const sheet = await SpreadsheetApiService.getSheet(app.id, targetSheetId)
          const fetchedVersion = Number(sheet?.version ?? fallbackVersion)
          if (!Number.isFinite(fetchedVersion)) return fallbackVersion
          const nextVersion = Math.max(fallbackVersion, fetchedVersion)
          sheetVersionRef.current = Math.max(sheetVersionRef.current, nextVersion)
          return nextVersion
        } catch {
          return fallbackVersion
        }
      }

      try {
        const baseVersion = await refreshBaseVersionBeforeWrite(resolveBaseVersion())
        const response = await SpreadsheetApiService.applyOperationBatch(
          app.id,
          targetSheetId,
          {
            baseVersion,
            operations,
            batchId: createOperationId(batchIdPrefix)
          },
          {
            keepalive: unloadKeepAlivePersistRef.current
          }
        )
        if (isActiveTarget()) {
          sheetVersionRef.current = response.newVersion
          lastPersistedSheetDataRef.current = localSheetDataRef.current
        } else if (onSheetUpdate) {
          void onSheetUpdate(app.id, targetSheetId, { version: response.newVersion })
        }
        return response
      } catch (error) {
        if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
          if (isActiveTarget()) {
            snapshotSaveMetricsRef.current.conflicts += 1
            await recoverFromVersionConflict()
            const retry = await SpreadsheetApiService.applyOperationBatch(
              app.id,
              targetSheetId,
              {
                baseVersion: sheetVersionRef.current,
                operations,
                batchId: createOperationId(`${batchIdPrefix}_retry`)
              },
              {
                keepalive: unloadKeepAlivePersistRef.current
              }
            )
            sheetVersionRef.current = retry.newVersion
            lastPersistedSheetDataRef.current = localSheetDataRef.current
            return retry
          }
          try {
            const sheet = await SpreadsheetApiService.getSheet(app.id, targetSheetId)
            const retry = await SpreadsheetApiService.applyOperationBatch(
              app.id,
              targetSheetId,
              {
                baseVersion: Number(sheet?.version ?? 0),
                operations,
                batchId: createOperationId(`${batchIdPrefix}_retry`)
              },
              {
                keepalive: unloadKeepAlivePersistRef.current
              }
            )
            if (onSheetUpdate) {
              void onSheetUpdate(app.id, targetSheetId, { version: retry.newVersion })
            }
            return retry
          } catch {
            throw error
          }
        }
        throw error
      }
    },
    [
      app.id,
      app.sheets,
      collaboration.headerParticipants.length,
      collaboration.isCollaborationConnected,
      createOperationId,
      localSheetDataRef,
      onSheetUpdate,
      recoverFromVersionConflict
    ]
  )

  const applyBatchDirect = useCallback(
    async (
      operations: SpreadsheetBatchOperation[],
      batchIdPrefix = 'batch'
    ): Promise<SpreadsheetBatchOperationResponse> => applyBatchDirectForSheet(activeSheetId, operations, batchIdPrefix),
    [activeSheetId, applyBatchDirectForSheet]
  )

  const enqueueUniverSnapshotCheckpoint = useCallback((): Promise<void> => {
    const run = async () => {
      if (entityEnabled) return
      const saveStartedAt = nowMs()
      snapshotSaveMetricsRef.current.attempts += 1

      const rawSnapshot = spreadsheetGridRef.current?.getWorkbookSnapshot?.()
      if (!rawSnapshot) {
        snapshotSaveMetricsRef.current.failures += 1
        debugLog('snapshot checkpoint skipped: snapshot unavailable', {
          appId: app.id,
          sheetId: activeSheetId
        })
        return
      }

      const snapshot = stripCellDataFromWorkbookSnapshot(rawSnapshot)
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
        const { cacheResult } = await saveSnapshotWithRetry({
          appId: app.id,
          activeSheetId,
          baseSnapshot: snapshot,
          sheetVersionRef,
          snapshotSaveMetricsRef,
          recoverFromVersionConflict,
          spreadsheetGridRef,
          collaboration,
          maxSnapshotRetries: 3,
          lastEmittedDimensionSignatureRef
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
    activeSheetId,
    app.id,
    collaboration,
    entityEnabled,
    recoverFromVersionConflict,
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

    const groupedCells = new Map<string, CellChange[]>()
    for (const cell of queuedCells) {
      const targetSheetId = cell.sheetId ?? activeSheetIdRef.current
      const next = groupedCells.get(targetSheetId) ?? []
      next.push(cell)
      groupedCells.set(targetSheetId, next)
    }

    const resolveRowsForCellFlush = (targetSheetId: string): ViewerRow[] => {
      if (targetSheetId === activeSheetIdRef.current) return localSheetDataRef.current
      const cached = peerSheetDataCacheRef.current.get(targetSheetId)
      if (cached) return cached as ViewerRow[]
      const sheet = app.sheets.find(entry => entry.id === targetSheetId)
      return sortSpreadsheetRowsBySheetSettings(sheet?.data ?? [], sheet) as ViewerRow[]
    }

    const workItems: Array<{
      targetSheetId: string
      touchedRowCount: number
      setCellsToPersist: Array<{ rowId: string; columnName: string; value: unknown }>
      clearCellsToPersist: Array<{ rowId: string; columnName: string }>
      operations: SpreadsheetBatchOperation[]
    }> = []

    for (const [targetSheetId, sheetCells] of groupedCells) {
      const uiToBackendRowId = buildUiToBackendRowIdMap(resolveRowsForCellFlush(targetSheetId), isUuid)
      const { setUpdatesByBackendRowId, clearCells } = partitionCellUpdatesByBackendRowId(
        sheetCells,
        uiToBackendRowId,
        pendingClientRowUpdatesRef.current,
        isUuid
      )
      const setCellsToPersist = flattenUpdatesToCells(setUpdatesByBackendRowId)
      const operations: SpreadsheetBatchOperation[] = []
      if (setCellsToPersist.length > 0) {
        operations.push({
          operationId: createOperationId('set_range'),
          type: 'set_range',
          data: { cells: setCellsToPersist }
        })
      }
      operations.push(
        ...clearCells.map(cell => ({
          operationId: createOperationId('clear_cell'),
          type: 'clear_cell' as const,
          data: {
            rowId: cell.rowId,
            columnName: cell.columnName
          }
        }))
      )
      if (operations.length === 0) continue
      const touchedRowIds = new Set([
        ...Array.from(setUpdatesByBackendRowId.keys()),
        ...clearCells.map(cell => cell.rowId)
      ])
      workItems.push({
        targetSheetId,
        touchedRowCount: touchedRowIds.size,
        setCellsToPersist,
        clearCellsToPersist: clearCells,
        operations
      })
    }

    if (workItems.length === 0) {
      recordSpreadsheetCellProbe('viewer:flush-skipped', {
        flushId,
        queuedCells: queuedCells.length,
        dedupedCells: 0,
        deferredClientRows: pendingClientRowUpdatesRef.current.size
      })
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
      recordSpreadsheetCellProbe('viewer:flush-start', {
        flushId,
        queuedCells: queuedCells.length,
        queuedRefs: queuedCells
          .map(cell => `${String(cell.sheetId || activeSheetId)}:${String(cell.rowId)}:${String(cell.columnName)}`)
          .slice(0, 30),
        workItems: workItems.map(item => ({
          targetSheetId: item.targetSheetId,
          touchedRowCount: item.touchedRowCount,
          setCellCount: item.setCellsToPersist.length,
          clearCellCount: item.clearCellsToPersist.length,
          cells: item.setCellsToPersist.slice(0, 30).map(cell => `${cell.rowId}:${cell.columnName}`),
          clears: item.clearCellsToPersist.slice(0, 30).map(cell => `${cell.rowId}:${cell.columnName}`)
        }))
      })
      for (const { targetSheetId, operations } of workItems) {
        const response = await applyBatchDirectForSheet(
          targetSheetId,
          operations,
          `cell_ops_${targetSheetId.replaceAll(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`
        )
        sheetVersionRef.current = Math.max(sheetVersionRef.current, Number(response.newVersion || 0))
      }
      const finishedAt = nowMs()
      debugLog('cell-flush persisted', {
        flushId,
        mode: 'batch_cell_ops',
        queuedCells: queuedCells.length,
        dedupedCells: workItems.reduce(
          (sum, item) => sum + item.setCellsToPersist.length + item.clearCellsToPersist.length,
          0
        ),
        touchedRows: workItems.reduce((sum, item) => sum + item.touchedRowCount, 0),
        durationMs: Math.round(finishedAt - startedAt)
      })
      recordSpreadsheetCellProbe('viewer:flush-success', {
        flushId,
        queuedCells: queuedCells.length,
        persistedCells: workItems.reduce(
          (sum, item) => sum + item.setCellsToPersist.length + item.clearCellsToPersist.length,
          0
        ),
        touchedRows: workItems.reduce((sum, item) => sum + item.touchedRowCount, 0)
      })
      sheetPersist.recordSuccess(true)
      versioning.markAsSaved()
    } catch (error) {
      pendingCellChangesRef.current = [...queuedCells, ...pendingCellChangesRef.current]
      recordSpreadsheetCellProbe('viewer:flush-error', {
        flushId,
        queuedCells: queuedCells.length,
        persistedCells: workItems.reduce(
          (sum, item) => sum + item.setCellsToPersist.length + item.clearCellsToPersist.length,
          0
        ),
        message: error instanceof Error ? error.message : String(error)
      })
      console.error('[SpreadsheetAppViewer] Failed to persist cell changes:', error)
      debugLog('cell-flush failed', {
        flushId,
        queuedCells: queuedCells.length,
        dedupedCells: workItems.reduce(
          (sum, item) => sum + item.setCellsToPersist.length + item.clearCellsToPersist.length,
          0
        )
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
    sheetPersist.beginPersist,
    sheetPersist.endPersist,
    sheetPersist.recordError,
    sheetPersist.recordSuccess,
    sheetT,
    versioning.markAsSaved
  ])

  const flushPendingCellChangesRef = useRef(flushPendingCellChanges)
  flushPendingCellChangesRef.current = flushPendingCellChanges

  const schedulePendingCellPersist = useCallback(
    (delayMs = CELL_PERSIST_DEBOUNCE_MS) => {
      if (pendingCellPersistTimeoutRef.current) {
        clearTimeout(pendingCellPersistTimeoutRef.current)
      }
      debugLog('cell-flush scheduled', {
        queuedCells: pendingCellChangesRef.current.length,
        debounceMs: delayMs
      })
      pendingCellPersistTimeoutRef.current = setTimeout(() => {
        pendingCellPersistTimeoutRef.current = null
        void chainOnOperationQueue(operationQueueRef, () => flushPendingCellChangesRef.current())
      }, delayMs)
    },
    [CELL_PERSIST_DEBOUNCE_MS]
  )
  const handleLocalCursorEmit = useCallback(
    (pos: { path: string[] }) => {
      collaboration.emitCursor({ path: pos.path })
      if (pendingCellChangesRef.current.length > 0) {
        schedulePendingCellPersist(60)
      }
    },
    [collaboration, schedulePendingCellPersist]
  )

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
        toast.error(sheetT('toast-checkpoint-flush-warning'))
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

      pendingCellChangesRef.current.push(...cells.map(cell => ({ ...cell, sheetId: activeSheetId })))
      recordSpreadsheetCellProbe('viewer:cells-queued', {
        addedCells: cells.length,
        addedRefs: cells.map(cell => `${cell.rowId}:${cell.columnName}`).slice(0, 30),
        queuedCells: pendingCellChangesRef.current.length
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
      commitLocalSheetData(next)
      const persistDelayMs =
        collaboration.isCollaborationConnected && collaboration.headerParticipants.length > 1
          ? CELL_PERSIST_COLLAB_DEBOUNCE_MS
          : CELL_PERSIST_DEBOUNCE_MS
      schedulePendingCellPersist(persistDelayMs)
    },
    [
      activeSheetId,
      canEditWithLock,
      collaboration,
      commitLocalSheetData,
      entityEnabled,
      localSheetDataRef,
      onDataChange,
      CELL_PERSIST_COLLAB_DEBOUNCE_MS,
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
      const cells = Object.entries(pending).map(([columnName, value]) => ({
        rowId: persistedId,
        columnName,
        value
      }))
      const flushOp: SpreadsheetBatchOperation = {
        operationId: createOperationId('set_range'),
        type: 'set_range',
        data: {
          cells
        }
      }
      const response = await applyBatchDirect([flushOp], 'set_range_flush')
      sheetVersionRef.current = Math.max(sheetVersionRef.current, Number(response.newVersion || 0))
    },
    [applyBatchDirect, createOperationId]
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
      commitLocalSheetData(next)
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
    const run = async () => {
      await processUniverDataChangeRef.current()
      await flushPendingCellChangesRef.current()
    }

    void chainOnOperationQueue(operationQueueRef, run).catch(() => undefined)
  }, [entityEnabled])

  useEffect(() => {
    if (typeof globalThis === 'undefined' || typeof document === 'undefined') return

    let resumeFlushTimeout: ReturnType<typeof setTimeout> | null = null

    const handlePageHide = () => {
      unloadKeepAlivePersistRef.current = true
      flushPendingPersistenceNow()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        unloadKeepAlivePersistRef.current = true
        if (resumeFlushTimeout) {
          clearTimeout(resumeFlushTimeout)
          resumeFlushTimeout = null
        }
        flushPendingPersistenceNow()
        return
      }
      if (document.visibilityState === 'visible') {
        unloadKeepAlivePersistRef.current = false
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
      unloadKeepAlivePersistRef.current = false
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
    }
  }, [])

  const formFields = useMemo(() => {
    const visible = activeSheet.columns.filter(c => c.isVisible !== false)
    return visible.map((col, idx) => columnToFormField(col, idx))
  }, [activeSheet.columns])

  const handleUpdateRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!canEditWithLock) return
      if (!editingRow) return
      const rowId = viewerRowId(editingRow)
      if (!rowId) return

      const next = localSheetDataRef.current.map(r => (viewerRowId(r) === rowId ? { ...r, ...values } : r))
      commitLocalSheetData(next)
      setEditingRow(null)

      sheetPersist.beginPersist()
      try {
        const updatedRow = onRowUpdate
          ? await onRowUpdate(app.id, activeSheetId, rowId, values)
          : await SpreadsheetApiService.updateRow(app.id, activeSheetId, rowId, values)
        if (collaboration.isCollaborationConnected) {
          const updatedSheetVersion =
            (updatedRow as Record<string, unknown> | null)?.sheetVersion != null
              ? Number((updatedRow as Record<string, unknown>).sheetVersion)
              : undefined
          if (updatedSheetVersion != null && Number.isFinite(updatedSheetVersion)) {
            sheetVersionRef.current = Math.max(sheetVersionRef.current, updatedSheetVersion)
          }
        }
        scheduleSheetVersionRefreshFromApi()
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
      collaboration,
      editingRow,
      localSheetDataRef,
      onDataChange,
      onRowUpdate,
      scheduleSheetVersionRefreshFromApi,
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
      commitLocalSheetData(next)
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
  const handleRenameAppName = useCallback(
    async (name: string): Promise<boolean> => {
      if (!canEditWithLock || !onAppUpdate) {
        return false
      }
      const nextName = name.trim()
      if (!nextName) {
        toast.error(sheetT('toast-file-name-required'))
        return false
      }
      if (nextName === app.name) {
        return true
      }
      try {
        const updatedApp = await Promise.resolve(onAppUpdate({ ...app, name: nextName }) as unknown)
        if (!updatedApp || typeof updatedApp !== 'object') {
          toast.error(sheetT('toast-file-rename-failed'))
          return false
        }
        const persistedName = (updatedApp as SpreadsheetApp).name
        if (persistedName !== nextName) {
          toast.error(sheetT('toast-file-rename-failed'))
          return false
        }
        toast.success(sheetT('toast-file-rename-success'))
        return true
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to rename spreadsheet:', error)
        toast.error(sheetT('toast-file-rename-failed'))
        return false
      }
    },
    [app, canEditWithLock, onAppUpdate, sheetT]
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
        toast.error(sheetT('toast-analytics-no-matching-columns'))
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
          toast.error(sheetT('toast-analytics-no-rows-inserted'))
          return false
        }

        const next = [...localSheetDataRef.current, ...createdRows]
        commitLocalSheetData(next)
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
        toast.success(sheetT('toast-analytics-inserted-rows', { count: createdRows.length }))
        return true
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to insert analytics rows:', error)
        sheetPersist.recordError(sheetT('persist-rows-add-failed'))
        toast.error(sheetT('toast-analytics-insert-failed'))
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
        toast.error(sheetT('toast-formula-no-rows'))
        return false
      }

      handleCellsChange(cells)
      toast.success(sheetT('toast-formula-applied', { count: cells.length }))
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
        toast.error(sheetT('toast-review-comment-create-failed'))
        return false
      }
      toast.success(sheetT('toast-review-comment-created'))
      return true
    },
    [comments]
  )

  const getHeaderRowFromGrid = useCallback((): Map<string, string> | null => {
    const grid = spreadsheetGridRef.current
    const visibleColumns = activeSheet.columns.filter(c => c.isVisible !== false)
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

  const handleUniverActiveWorksheetChange = useCallback(
    (worksheetId: string, worksheetName: string) => {
      const targetSheet =
        app.sheets.find(sheet => sheet.id === worksheetId) ?? app.sheets.find(sheet => sheet.name === worksheetName)
      if (!targetSheet || targetSheet.id === activeSheetIdRef.current) return
      setActiveSheetIdWithPeerCache(targetSheet.id)
    },
    [app.sheets, setActiveSheetIdWithPeerCache]
  )

  const renderMainView = useCallback((): React.ReactNode => {
    if (viewType === 'table') {
      const skipSnapshotLoadingBlocker = preferUniverNativeSheetTabs && app.sheets.length > 1
      if (isBootstrapSnapshotLoading && !skipSnapshotLoadingBlocker) {
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
          initialSnapshot={preferUniverNativeSheetTabs ? tableUniverSnapshot : bootstrapSnapshot}
          snapshotSeed={preferUniverNativeSheetTabs ? tableSnapshotSeed : bootstrapSnapshotSeed}
          authoritativeDataSyncToken={authoritativeDataSyncToken}
          workbookRemountKey={tableWorkbookRemountKey}
          multiSheetWorkbookMode={preferUniverNativeSheetTabs}
          onActiveWorksheetChange={handleUniverActiveWorksheetChange}
          columns={[]}
          spreadsheetColumns={spreadsheetColumnsForGrid}
          testId={`${testId}-table-view`}
          onCellChange={handleCellChange}
          onCellsChange={handleCellsChange}
          onSnapshotRequested={enqueueUniverSnapshotCheckpoint}
          onOpenCommentRequest={handleOpenCommentRequest}
          commentedCells={commentedCells}
          onDataChange={handleUniverDataChange}
          participants={collaboration.cursorParticipants}
          onOperationEmit={op => collaboration.emitOperation(op as any)}
          onCursorEmit={handleLocalCursorEmit}
          collaborationEnabled={collaboration.isCollaborationConnected}
          onColumnAdd={canEditWithLock ? columnsState.handleAutoColumnAdd : undefined}
          onDimensionsChange={handleDimensionsChanged}
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
    app.sheets,
    spreadsheetColumnsForGrid,
    sheetData,
    bootstrapSnapshot,
    bootstrapSnapshotSeed,
    preferUniverNativeSheetTabs,
    tableUniverSnapshot,
    tableSnapshotSeed,
    tableWorkbookRemountKey,
    testId,
    handleCellChange,
    handleCellsChange,
    enqueueUniverSnapshotCheckpoint,
    handleOpenCommentRequest,
    commentedCells,
    handleUniverDataChange,
    handleUniverActiveWorksheetChange,
    collaboration,
    canEditWithLock,
    columnsState.handleAutoColumnAdd,
    spreadsheetGridRef,
    setEditingRow,
    handleDeleteRow,
    activeView
  ])

  const emergencyFallbackColumns = useMemo(() => {
    const visible = activeSheet.columns.filter(c => c.isVisible !== false)
    if (visible.length > 0) return visible
    return activeSheet.columns
  }, [activeSheet.columns])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (isBootstrapSnapshotLoading) {
      setShowEmergencyFallback(false)
      return
    }
    setShowEmergencyFallback(false)
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
          appId: app.id,
          sheetId: activeSheetId,
          viewType,
          columns: activeSheet.columns.length,
          rows: sheetData.length
        })
        setShowEmergencyFallback(true)
      }
    }, 3500)
    return () => clearTimeout(checkId)
  }, [
    app.id,
    activeSheetId,
    viewType,
    isBootstrapSnapshotLoading,
    activeSheet.columns.length,
    sheetData.length,
    testId
  ])

  return (
    <div className="gba:flex gba:flex-col gba:w-full gba:h-dvh gba:min-h-dvh gba:overflow-hidden" data-testid={testId}>
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
        onShowVersionHistory={() => {
          setShowVersionHistory(true)
          void versioning.loadVersions()
        }}
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
        onRenameAppName={handleRenameAppName}
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

      <div className="gba:flex-1 gba:relative gba:min-h-0 gba:overflow-hidden">
        {renderMainView()}
        {showEmergencyFallback && (
          <div className="gba:absolute gba:inset-0 gba:z-50 gba:bg-background gba:p-4 gba:overflow-auto">
            <div className="gba:mb-3 gba:text-sm gba:text-muted-foreground">
              Spreadsheet grid failed to initialize. Showing emergency fallback table.
            </div>
            <div className="gba:overflow-auto gba:border gba:rounded-md">
              <table className="gba:min-w-full gba:text-sm">
                <thead className="gba:bg-muted/40">
                  <tr>
                    {emergencyFallbackColumns.map(col => (
                      <th key={col.id} className="gba:px-3 gba:py-2 gba:text-left gba:font-medium">
                        {col.label || col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(sheetData.length > 0 ? sheetData.slice(0, 100) : [{}]).map((row, idx) => (
                    <tr
                      key={String(
                        (row as Record<string, unknown>)._rowUuid || (row as Record<string, unknown>)._id || idx
                      )}
                      className="gba:border-t"
                    >
                      {emergencyFallbackColumns.map(col => (
                        <td key={col.id} className="gba:px-3 gba:py-2">
                          {String((row as Record<string, unknown>)[col.name] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {!preferUniverNativeSheetTabs && (
        <SpreadsheetSheetTabs
          sheets={app.sheets}
          activeSheetId={activeSheetId}
          onSheetChange={setActiveSheetIdWithPeerCache}
          entityDataLength={entityEnabled ? entityDataCount : undefined}
          data-testid={`${testId}-sheet-tabs`}
        />
      )}

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
