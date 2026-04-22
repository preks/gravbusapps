/**
 * SpreadsheetAppViewer
 *
 * Runtime viewer for a generated spreadsheet app.
 * Standardized on the top-level `components/`, `hooks/`, `views/` structure (no `viewer/` directory).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'

import type { SpreadsheetApp, SpreadsheetAppViewerProps, SpreadsheetColumn, SpreadsheetSheet, ViewType } from './types'
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
import { useSpreadsheetCollaboration } from './hooks/useSpreadsheetCollaboration'
import type {
  CollaborationCallbacks,
  CollaborationOperation,
  SpreadsheetCollaborationManager
} from './services/SpreadsheetCollaborationManager'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { useSpreadsheetBulkRows, syncTrackingHeaderRowWithColumnLabels } from './hooks/useSpreadsheetBulkRows'
import { useSpreadsheetColumns } from './hooks/useSpreadsheetColumns'
import { useVersionUserDisplays } from '@/business-apps/core/office/apps/documents/hooks/useVersionUserDisplays'
import { env } from '@/common/env/EnvUtils'

import { useVersioning } from '@/business-apps/platform/apps/shared/hooks/useVersioning'
import { useComments } from '@/business-apps/platform/apps/shared/hooks/useComments'
import { useFileLock } from '@/business-apps/platform/apps/shared/hooks/useFileLock'
import { usePublishing } from '@/business-apps/platform/apps/shared/hooks/usePublishing'

import { TableView, FormView, DashboardView, KanbanView } from './views'
import type {
  UniverSheetGridHandle,
  CellDimensionsPayload,
  ApplyRemoteCellUpdateOptions,
  WorkbookSnapshotLifecycleEvent
} from './components/UniverSheetGrid'
import {
  buildMultiSheetWorkbookFromAppSheets,
  isolateWorkbookSnapshotToSingleSheet,
  mergeAuthoritativeViewerRowsIntoWorkbookSnapshot,
  mergeWorkbookFormattingFromDonor,
  snapshotTrackingHeaderMatchesColumnLabels,
  workbookFormattingRichnessScore,
  workbookSnapshotMismatchesViewerRows
} from './utils/univerAdapter'
import {
  readUniverSnapshotCacheForBootstrap,
  listValidUniverSnapshotCacheEntries,
  writeUniverSnapshotCache,
  clearUniverSnapshotCache
} from './utils/univerSnapshotCache'
import { scheduleCoalescedTimeout } from './utils/collaborationRepairScheduler'
import { exportSnapshotAsXlsx } from './utils/exportToExcel'
import { resolveRenderedSpreadsheetViewType } from './utils/resolveRenderedSpreadsheetViewType'
import { AutomationsPanel } from './components/AutomationsPanel'
import { AnalyticsPanel } from './components/AnalyticsPanel'
import { SheetsAIPanel } from './components/SheetsAIPanel'
import { EntityDataStatusBar } from './components/EntityDataStatusBar'
import { SpreadsheetDialogsSection } from './components/SpreadsheetDialogsSection'
import { SpreadsheetHeader } from './components/SpreadsheetHeader'
import { SpreadsheetSheetTabs } from './components/SpreadsheetSheetTabs'

type ViewerRow = Record<string, unknown>
type CellChange = { rowId: string; columnName: string; value: unknown; sheetId?: string }
type SnapshotCellCoordinate = { row: number; col: number }
type PendingCellBatch = {
  batchId: string
  targetSheetId: string
  operations: SpreadsheetBatchOperation[]
}
type PendingCellJournal = {
  draftCells: CellChange[]
  pendingBatches: PendingCellBatch[]
}

const PENDING_CELL_JOURNAL_STORAGE_PREFIX = 'spreadsheet-pending-cell-journal:'

const isSpreadsheetAppsDebugEnabled = (): boolean => {
  try {
    return globalThis.localStorage?.getItem('spreadsheetAppsDebug') === '1'
  } catch {
    return false
  }
}

const debugLog = (message: string, meta?: Record<string, unknown>): void => {
  if (!isSpreadsheetAppsDebugEnabled()) return
  console.debug(`[SpreadsheetAppViewer] ${message}`, meta ?? {})
}

const isRecord = (value: unknown): value is Record<string, unknown> => value != null && typeof value === 'object'

const isCellChange = (value: unknown): value is CellChange => {
  if (!isRecord(value)) return false
  return typeof value.rowId === 'string' && typeof value.columnName === 'string'
}

const isSpreadsheetBatchOperation = (value: unknown): value is SpreadsheetBatchOperation => {
  if (!isRecord(value)) return false
  return typeof value.operationId === 'string' && typeof value.type === 'string' && isRecord(value.data)
}

const isPendingCellBatch = (value: unknown): value is PendingCellBatch => {
  if (!isRecord(value)) return false
  return (
    typeof value.batchId === 'string' &&
    typeof value.targetSheetId === 'string' &&
    Array.isArray(value.operations) &&
    value.operations.every(isSpreadsheetBatchOperation)
  )
}

const readPendingCellJournal = (storageKey: string): PendingCellJournal | null => {
  try {
    const raw = globalThis.sessionStorage?.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { draftCells?: unknown; pendingBatches?: unknown }
    const draftCells = Array.isArray(parsed.draftCells) ? parsed.draftCells.filter(isCellChange) : []
    const pendingBatches = Array.isArray(parsed.pendingBatches) ? parsed.pendingBatches.filter(isPendingCellBatch) : []
    if (draftCells.length === 0 && pendingBatches.length === 0) return null
    return { draftCells, pendingBatches }
  } catch {
    return null
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isUuidString = (value: string): boolean => UUID_RE.test(value)

const getSpreadsheetBatchConflictServerVersion = (details: unknown): number | undefined => {
  if (!details || typeof details !== 'object') return undefined
  const raw = (details as Record<string, unknown>).currentVersion
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw)
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw)
  return undefined
}

/**
 * Canonical row identifier. Prefer `_id` (server UUID for persisted rows), fall back to
 * `_rowUuid` then `id`. Returns empty string for rows with no usable ID.
 */
const getCanonicalRowId = (row: ViewerRow): string => {
  const idField = row._id ?? row.id
  if (idField != null) {
    const s = typeof idField === 'number' ? String(idField) : (idField as string)
    if (s) return s
  }
  const rowUuid = row._rowUuid
  if (typeof rowUuid === 'string' && rowUuid) return rowUuid
  return ''
}

const viewerRowId = (row: Record<string, unknown>): string => getCanonicalRowId(row)

/**
 * Backend row ID for API calls. Returns the first UUID found among the row's ID fields
 * (preferring _id, then _rowUuid, then id). Returns undefined for unsaved rows.
 */
const resolveBackendRowIdForViewerRow = (row: ViewerRow, isUuid: (value: string) => boolean): string | undefined => {
  const fields = [String(row._id ?? ''), String(row._rowUuid ?? ''), String(row.id ?? '')]
  return fields.find(f => f !== '' && isUuid(f))
}

const SNAPSHOT_FETCH_TIMEOUT_MS = 15000

/**
 * Optional: periodically remount Univer (`requestGridRefresh`). **Off by default** — full remount flickers badly.
 * Set `NEXT_PUBLIC_SPREADSHEET_GRID_REFRESH_INTERVAL_MS` to a positive ms (max 60000) only when debugging sync.
 */
const SPREADSHEET_GRID_AUTO_REFRESH_MS = ((): number => {
  const raw = env('NEXT_PUBLIC_SPREADSHEET_GRID_REFRESH_INTERVAL_MS')
  if (raw == null || raw === '' || raw === '0') return 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 60_000) : 0
})()

const rowMatchesRemoteId = (row: ViewerRow, remoteRowId: string): boolean => {
  return getCanonicalRowId(row) === remoteRowId
}

const getViewerRowIdentityCandidates = (row: ViewerRow): string[] =>
  Array.from(new Set([row._id, row.id, row._rowUuid].map(value => String(value ?? '')).filter(Boolean)))

const collectViewerRowUpdates = (
  row: ViewerRow,
  updatesByRowId: Map<string, Record<string, unknown>>
): Record<string, unknown> | null => {
  const mergedUpdates: Record<string, unknown> = {}
  for (const candidateId of getViewerRowIdentityCandidates(row)) {
    Object.assign(mergedUpdates, updatesByRowId.get(candidateId) ?? {})
  }
  return Object.keys(mergedUpdates).length > 0 ? mergedUpdates : null
}

const applyColumnUpdatesToViewerRow = (
  row: ViewerRow,
  updates: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): ViewerRow => {
  let nextRow: ViewerRow = { ...row }
  for (const [columnName, value] of Object.entries(updates)) {
    const cleared = stripEquivalentColumnKeysFromRow(nextRow, columnName, columns)
    nextRow = cleared.nextRow
    if (value !== undefined) {
      nextRow[cleared.targetColumnName] = value
    }
  }
  return nextRow
}

const toComparableCellSignature = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? '')
  } catch {
    return String(value ?? '')
  }
}

const isBlankLikeCellValue = (value: unknown): boolean => {
  if (value == null) return true
  if (typeof value === 'string') return value.length === 0
  if (typeof value !== 'object' || Array.isArray(value)) return false
  const obj = value as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(obj, 'v')) {
    const cellValue = obj.v
    return cellValue == null || cellValue === ''
  }
  if (Object.prototype.hasOwnProperty.call(obj, 'm')) {
    const displayValue = obj.m
    return displayValue == null || displayValue === ''
  }
  return false
}

const MAX_INDIVIDUAL_CLEAR_CELL_OPS = 200

const shouldSkipFreshRowCellReplay = (baselineValue: unknown, queuedValue: unknown): boolean => {
  if (toComparableCellSignature(baselineValue) === toComparableCellSignature(queuedValue)) {
    return true
  }
  return isBlankLikeCellValue(queuedValue) && !isBlankLikeCellValue(baselineValue)
}

const fetchUniverSnapshotWithTimeout = async (
  appId: string,
  sheetId: string,
  timeoutMs: number
): Promise<{ version?: number; snapshot?: unknown; updatedAt?: string | null }> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Snapshot fetch timed out')), timeoutMs)
  })
  return Promise.race([SpreadsheetApiService.getUniverSnapshot(appId, sheetId), timeoutPromise])
}

/**
 * Rank two candidate workbook snapshots by recency. The backend stores one Univer
 * snapshot row per sheet (`/sheets/:sheetId/univer-snapshot`) and each row holds
 * the *full* workbook blob (all worksheets' cellData, the shared styles map,
 * merges, etc.), but each row is only rewritten when THAT sheet is the active
 * one at checkpoint time. So after styling cells on sheet 9, only sheet 9's row
 * is fresh — other sheets' rows still carry the pre-style blob. To survive a
 * reload that restores a different sheet as active, pick the freshest row
 * across all sheets by comparing `updatedAt` timestamps (falls back to version
 * numbers, then to zero). Higher = fresher.
 */
const compareSnapshotCandidatesByRecency = (
  a: { updatedAt?: string | null; version?: number | null } | null | undefined,
  b: { updatedAt?: string | null; version?: number | null } | null | undefined
): number => {
  const toTime = (c: { updatedAt?: string | null; version?: number | null } | null | undefined): number => {
    if (!c) return -1
    if (typeof c.updatedAt === 'string' && c.updatedAt.length > 0) {
      const parsed = Date.parse(c.updatedAt)
      if (Number.isFinite(parsed)) return parsed
    }
    return Number(c.version ?? 0)
  }
  return toTime(a) - toTime(b)
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

const resolveColumnAliasInfo = (
  columnKey: string,
  columns?: SpreadsheetColumn[]
): { targetColumnName: string; normalizedAliases: Set<string> } => {
  const targetColumn = columns?.find(column => column.id === columnKey || column.name === columnKey)
  const aliases = [columnKey, targetColumn?.name, targetColumn?.id]
    .map(value => (value == null ? '' : String(value).trim()))
    .filter(Boolean)
    .map(value => value.toLowerCase())
  return {
    targetColumnName: targetColumn?.name ?? String(columnKey),
    normalizedAliases: new Set(aliases)
  }
}

const stripEquivalentColumnKeysFromRow = (
  row: ViewerRow,
  columnKey: string,
  columns?: SpreadsheetColumn[]
): { nextRow: ViewerRow; targetColumnName: string; removedKeys: string[] } => {
  const { targetColumnName, normalizedAliases } = resolveColumnAliasInfo(columnKey, columns)
  const nextRow: ViewerRow = { ...row }
  const removedKeys: string[] = []
  for (const rowKey of Object.keys(nextRow)) {
    if (!normalizedAliases.has(rowKey.toLowerCase())) continue
    removedKeys.push(rowKey)
    delete nextRow[rowKey]
  }
  return { nextRow, targetColumnName, removedKeys }
}

const applySetCellDelta = (
  rows: ViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): ViewerRow[] => {
  const rowId = String(payload.rowId || '')
  const columnName = String(payload.columnName || '')
  const value = payload.value
  return rows.map(row => {
    if (!rowMatchesRemoteId(row, rowId)) return row
    const { nextRow, targetColumnName } = stripEquivalentColumnKeysFromRow(row, columnName, columns)
    nextRow[targetColumnName] = value
    return nextRow
  })
}

const applySetRangeDelta = (
  rows: ViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): ViewerRow[] => {
  const cells = Array.isArray(payload.cells) ? (payload.cells as Array<Record<string, unknown>>) : []
  const updatesByRowId = new Map<string, Record<string, unknown>>()
  for (const cell of cells) {
    const rowId = String(cell.rowId || '')
    const columnName = String(cell.columnName || '')
    if (!rowId || !columnName) continue
    const updates = updatesByRowId.get(rowId) ?? {}
    const { targetColumnName } = resolveColumnAliasInfo(columnName, columns)
    updates[targetColumnName] = Object.prototype.hasOwnProperty.call(cell, 'value') ? cell.value : null
    updatesByRowId.set(rowId, updates)
  }
  return rows.map(row => {
    const canonical = getCanonicalRowId(row)
    const updates = canonical ? updatesByRowId.get(canonical) : undefined
    if (!updates) return row
    let nextRow: ViewerRow = { ...row }
    for (const [columnName, value] of Object.entries(updates)) {
      const cleared = stripEquivalentColumnKeysFromRow(nextRow, columnName, columns)
      nextRow = cleared.nextRow
      nextRow[cleared.targetColumnName] = value
    }
    return nextRow
  })
}

const applyClearCellDelta = (
  rows: ViewerRow[],
  payload: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): ViewerRow[] => {
  const rowId = String(payload.rowId || '')
  const columnName = String(payload.columnName || '')
  return rows.map(row => {
    if (!rowMatchesRemoteId(row, rowId)) return row
    return stripEquivalentColumnKeysFromRow(row, columnName, columns).nextRow
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

const applySingleDeltaChange = (rows: ViewerRow[], change: unknown, columns?: SpreadsheetColumn[]): ViewerRow[] => {
  const changeRecord = change as Record<string, unknown>
  const opType = String(changeRecord.operationType || '')
  const payload = (changeRecord.payload || {}) as Record<string, unknown>
  const result = (changeRecord.result || {}) as Record<string, unknown>

  switch (opType) {
    case 'set_cell':
      return applySetCellDelta(rows, payload, columns)
    case 'set_range':
      return applySetRangeDelta(rows, payload, columns)
    case 'clear_cell':
      return applyClearCellDelta(rows, payload, columns)
    case 'add_rows':
      return replaceClientRowsWithCreatedRows(rows, mapAddedRowsFromDeltaResult(result))
    case 'delete_rows':
      return applyDeleteRowsDelta(rows, payload)
    default:
      return rows
  }
}

const applyDeltaChangesToRows = (
  baseRows: ViewerRow[],
  changes: unknown[] | undefined,
  columns?: SpreadsheetColumn[]
): ViewerRow[] => {
  let next = [...baseRows]
  for (const change of changes || []) {
    next = applySingleDeltaChange(next, change, columns)
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

// SPREADSHEET_STRUCTURAL_REMOTE_OPS and getSpreadsheetOperationSheetId moved to SpreadsheetCollaborationManager

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
    const backend = resolveBackendRowIdForViewerRow(row, isUuid)
    if (!backend) return
    getViewerRowIdentityCandidates(row).forEach(candidateId => {
      map.set(candidateId, backend)
    })
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
  const run = async () => {
    await fn()
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
  persistedIdByClientRowId: Map<string, string>
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
    const reconciledPending: Record<string, unknown> = {}
    if (clientRowId && pending) {
      pendingUpdates.delete(clientRowId)
      for (const [columnName, value] of Object.entries(pending)) {
        if (shouldSkipFreshRowCellReplay(rowPayload[columnName], value)) {
          continue
        }
        reconciledPending[columnName] = value
        if (persistedId) {
          flushCells.push({ rowId: persistedId, columnName, value })
        }
      }
    }
    const merged = Object.keys(reconciledPending).length > 0 ? { ...rowPayload, ...reconciledPending } : rowPayload
    return {
      ...merged,
      _id: clientRowId || persistedId || `temp_${index}`,
      ...(persistedId ? { _rowUuid: persistedId } : {})
    }
  })
  return { createdRows, flushCells, persistedIdByClientRowId }
}

const reconcileQueuedDraftCellsForCreatedRows = (
  queuedCells: CellChange[],
  createdRows: ViewerRow[],
  persistedIdByClientRowId: Map<string, string>
): CellChange[] => {
  if (queuedCells.length === 0 || persistedIdByClientRowId.size === 0) {
    return queuedCells
  }

  const createdRowById = new Map<string, ViewerRow>()
  createdRows.forEach(row => {
    getViewerRowIdentityCandidates(row).forEach(candidateId => {
      createdRowById.set(candidateId, row)
    })
  })

  const nextQueuedCells: CellChange[] = []
  for (const cell of queuedCells) {
    const clientRowId = String(cell.rowId)
    const persistedId = persistedIdByClientRowId.get(clientRowId)
    if (!persistedId) {
      nextQueuedCells.push(cell)
      continue
    }

    const createdRow = createdRowById.get(clientRowId) ?? createdRowById.get(persistedId)
    const baselineValue = createdRow?.[cell.columnName]
    if (shouldSkipFreshRowCellReplay(baselineValue, cell.value)) {
      continue
    }

    nextQueuedCells.push({
      ...cell,
      rowId: persistedId
    })
  }

  return nextQueuedCells
}

const replaceClientRowsWithCreatedRows = (
  existingRows: Array<Record<string, unknown>>,
  createdRows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> => {
  const createdRowByClientId = new Map<string, Record<string, unknown>>()
  createdRows.forEach(row => {
    const clientRowId = viewerRowId(row)
    if (!clientRowId) return
    createdRowByClientId.set(clientRowId, row)
  })

  const replacedClientRowIds = new Set<string>()
  const nextRows = existingRows.map(row => {
    const clientRowId = viewerRowId(row)
    if (!clientRowId) return row
    const createdRow = createdRowByClientId.get(clientRowId)
    if (!createdRow) return row
    replacedClientRowIds.add(clientRowId)
    return createdRow
  })

  createdRows.forEach(row => {
    const clientRowId = viewerRowId(row)
    if (clientRowId && replacedClientRowIds.has(clientRowId)) return
    nextRows.push(row)
  })

  return nextRows
}

const persistReconcileCells = async (
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

/** Prefer row-derived cell values over stale Univer cellData when the snapshot disagrees with viewer rows. */
const overlaySnapshotIfRowsMismatch = (
  snapshot: Record<string, unknown> | null,
  sheetId: string,
  viewerRows: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): Record<string, unknown> | null => {
  if (!snapshot) return null
  if (!workbookSnapshotMismatchesViewerRows(snapshot, sheetId, viewerRows, columns)) return snapshot
  return mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheetId, viewerRows, columns)
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
  updatedAt: string | null
  cacheWrite?: ReturnType<typeof writeUniverSnapshotCache>
}> => {
  const cached = readUniverSnapshotCacheForBootstrap(appId, sheetId, minVersion)
  if (cached?.snapshot) {
    // Surface the cache's `savedAt` (epoch ms, written at
    // `writeUniverSnapshotCache` time right after the successful HTTP
    // save) as an ISO `updatedAt`. Downstream comparators
    // (`compareSnapshotCandidatesByRecency`) fall back to `version` when
    // `updatedAt` is null, and mixing "version-scaled numbers" on one
    // side with "epoch-ms-scaled timestamps" on the other always ranks
    // the timestamped side higher regardless of actual freshness. With
    // both sides expressing recency in the same millisecond clock, a
    // cached sheet-8 snapshot saved at 10:00 correctly beats a remote
    // sheet-1 snapshot written at 09:30 (and vice versa), letting the
    // sibling-probe loop pick the genuinely freshest blob.
    const cachedUpdatedAt = Number.isFinite(cached.savedAt) ? new Date(cached.savedAt).toISOString() : null
    return {
      snapshot: cached.snapshot,
      seed: `cache-v${cached.version}`,
      source: 'cache',
      version: cached.version,
      updatedAt: cachedUpdatedAt
    }
  }

  const remote = await fetchUniverSnapshotWithTimeout(appId, sheetId, SNAPSHOT_FETCH_TIMEOUT_MS)
  const remoteVersion = Number(remote?.version ?? 0)
  const remoteUpdatedAt = typeof remote?.updatedAt === 'string' ? remote.updatedAt : null
  // The remote Univer snapshot version tracks the last successful `saveUniverSnapshot`, which lags
  // behind the sheet version bumped by cell batches. Use the returned workbook whenever it exists so
  // formatting (`styles`, cell `s` refs) survives reload after an interrupted snapshot save. Row values
  // from the canonical `getSheetSnapshot` rows are already overlaid on top by the bootstrap caller.
  if (remote?.snapshot && typeof remote.snapshot === 'object') {
    const cacheWrite = writeUniverSnapshotCache(
      appId,
      sheetId,
      remoteVersion,
      remote.snapshot as Record<string, unknown>
    )
    return {
      snapshot: remote.snapshot as Record<string, unknown>,
      seed:
        remoteVersion >= minVersion
          ? `remote-v${remoteVersion}`
          : `remote-v${remoteVersion}-lagging-sheet-v${minVersion}`,
      source: 'remote',
      version: remoteVersion,
      updatedAt: remoteUpdatedAt,
      cacheWrite
    }
  }

  return {
    snapshot: null,
    seed: `rows-fallback-v${minVersion}`,
    source: 'rows_fallback',
    version: remoteVersion,
    updatedAt: remoteUpdatedAt
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

const normalizeCellValueForBatchPersistence = (value: unknown): unknown => {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.startsWith('=') ? { f: trimmed } : value
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const obj = value as Record<string, unknown>
  if (typeof obj.f === 'string') {
    const trimmed = obj.f.trim()
    return { ...obj, f: trimmed.startsWith('=') ? trimmed : `=${trimmed}` }
  }
  return value
}

const mergeRowsWithIndexUpdates = (
  currentRows: ViewerRow[],
  updatesByRowIndex: Map<number, Record<string, unknown>>
): ViewerRow[] =>
  currentRows.map((row, index) => {
    const updates = updatesByRowIndex.get(index)
    return updates ? { ...row, ...updates } : row
  })

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
  void visibleColumns
  void currentRows
  void persistedBaseline
  void isUuid
  return {
    hasCellData: Boolean(cellData && typeof cellData === 'object'),
    updatesByRowIndex: new Map<number, Record<string, unknown>>(),
    reconcileCells: []
  }
}

const mergeBootstrapSnapshotWithCanonicalRows = (
  snapshot: Record<string, unknown>,
  sheet: SpreadsheetSheet,
  rows: Record<string, unknown>[]
): Record<string, unknown> => {
  // IMPORTANT: Do not replace worksheet.cellData with buildWorkbookSnapshot(rows) — that drops
  // Univer style refs (`s`) and snapshot-only state while leaving workbook.styles orphaned.
  // Overlay row-authoritative values cell-by-cell instead (preserves formatting on reopen).
  return mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(snapshot, sheet.id, rows, sheet.columns)
}

/**
 * When the chosen bootstrap workbook is value-only or stale (e.g. bad remote payload) but an older
 * localStorage generation still has `styles` / cell `s` refs from a prior successful save, merge that
 * formatting in so reopen is not completely unstyled.
 */
const enrichBootstrapSnapshotFromOlderCacheFormatting = (
  appId: string,
  sheetId: string,
  mergedSnapshot: Record<string, unknown>
): Record<string, unknown> => {
  const primaryScore = workbookFormattingRichnessScore(mergedSnapshot, sheetId)
  const candidates = listValidUniverSnapshotCacheEntries(appId, sheetId)
  let bestDonor: Record<string, unknown> | null = null
  let bestScore = primaryScore
  for (const entry of candidates) {
    const s = workbookFormattingRichnessScore(entry.snapshot, sheetId)
    if (s > bestScore) {
      bestScore = s
      bestDonor = entry.snapshot
    }
  }
  if (!bestDonor) return mergedSnapshot
  return mergeWorkbookFormattingFromDonor(mergedSnapshot, bestDonor, sheetId)
}

const snapshotCellCoordinateKey = (row: number, col: number): string => `${row}:${col}`

const isExplicitSnapshotCellClearValue = (value: unknown): boolean => value === null

const collectSnapshotClearCoordinates = (
  cells: Array<{ value: unknown; univerRow?: number; univerCol?: number }>
): SnapshotCellCoordinate[] =>
  cells
    .filter(
      (cell): cell is { value: unknown; univerRow: number; univerCol: number } =>
        isExplicitSnapshotCellClearValue(cell.value) &&
        typeof cell.univerRow === 'number' &&
        Number.isFinite(cell.univerRow) &&
        typeof cell.univerCol === 'number' &&
        Number.isFinite(cell.univerCol)
    )
    .map(cell => ({ row: Math.trunc(cell.univerRow), col: Math.trunc(cell.univerCol) }))

const appendPendingSnapshotClearCoordinates = (
  pending: Map<string, Set<string>>,
  sheetId: string,
  cells: SnapshotCellCoordinate[]
): void => {
  if (!sheetId || cells.length === 0) return
  const current = pending.get(sheetId) ?? new Set<string>()
  for (const cell of cells) {
    current.add(snapshotCellCoordinateKey(cell.row, cell.col))
  }
  pending.set(sheetId, current)
}

const getPendingSnapshotClearCoordinates = (
  pending: Map<string, Set<string>>,
  sheetId: string
): SnapshotCellCoordinate[] => {
  const current = pending.get(sheetId)
  if (!current || current.size === 0) return []
  return Array.from(current)
    .map(entry => {
      const [rowRaw, colRaw] = entry.split(':')
      const row = Number(rowRaw)
      const col = Number(colRaw)
      return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : null
    })
    .filter((cell): cell is SnapshotCellCoordinate => cell != null)
}

const clearPendingSnapshotClearCoordinates = (pending: Map<string, Set<string>>, sheetId: string): void => {
  pending.delete(sheetId)
}

const clearSnapshotCellsByCoordinate = (
  workbookSnapshot: Record<string, unknown>,
  activeSheetId: string,
  cells: SnapshotCellCoordinate[]
): Record<string, unknown> => {
  if (cells.length === 0) return workbookSnapshot
  const worksheet = getWorksheetFromSnapshot(workbookSnapshot, activeSheetId)
  if (!worksheet) return workbookSnapshot
  const cellData = worksheet.cellData as Record<string, Record<string, unknown>> | undefined
  if (!cellData || typeof cellData !== 'object') return workbookSnapshot

  for (const cell of cells) {
    const rowKey = String(cell.row)
    const rowEntry = cellData[rowKey] ?? cellData[cell.row]
    if (!rowEntry || typeof rowEntry !== 'object') continue
    delete rowEntry[cell.col]
    delete rowEntry[String(cell.col)]
    if (Object.keys(rowEntry).length === 0) {
      delete cellData[cell.row]
      delete cellData[rowKey]
    }
  }

  worksheet.cellData = cellData
  return workbookSnapshot
}

const saveSnapshotWithRetry = async ({
  appId,
  activeSheetId,
  baseSnapshot,
  prepareSnapshotForSave,
  sheetVersionRef,
  snapshotSaveMetricsRef,
  recoverFromVersionConflict,
  spreadsheetGridRef,
  collaboration,
  maxSnapshotRetries,
  lastEmittedDimensionSignatureRef,
  useKeepaliveHttp = false
}: {
  appId: string
  activeSheetId: string
  baseSnapshot: unknown
  prepareSnapshotForSave?: (snapshot: unknown) => unknown
  sheetVersionRef: React.MutableRefObject<number>
  snapshotSaveMetricsRef: React.MutableRefObject<{
    attempts: number
    conflicts: number
    failures: number
    fallbackLoads: number
  }>
  recoverFromVersionConflict: () => Promise<boolean>
  spreadsheetGridRef: React.MutableRefObject<UniverSheetGridHandle | null>
  collaboration: {
    isCollaborationConnected: boolean
    emitOperation: (operation: { type: 'dimension_sync'; data: CellDimensionsPayload; broadcastOnly: true }) => void
  }
  maxSnapshotRetries: number
  lastEmittedDimensionSignatureRef: React.MutableRefObject<string | null>
  /** When true (tab unloading), use fetch keepalive for small snapshot payloads so the request may outlive the page. */
  useKeepaliveHttp?: boolean
}): Promise<{ savedSnapshot: unknown; cacheResult: { stored: boolean; reason: string | null } }> => {
  let lastError: unknown
  for (let attempt = 0; attempt < maxSnapshotRetries; attempt++) {
    try {
      const rawSnapshot =
        attempt === 0 ? baseSnapshot : (spreadsheetGridRef.current?.getWorkbookSnapshot?.() ?? baseSnapshot)
      const clonedSnapshot = cloneSnapshot(rawSnapshot)
      const snapshotToSave = prepareSnapshotForSave ? prepareSnapshotForSave(clonedSnapshot) : clonedSnapshot
      const versionForSave = sheetVersionRef.current
      await SpreadsheetApiService.saveUniverSnapshot(
        appId,
        activeSheetId,
        {
          version: versionForSave,
          snapshot: snapshotToSave as Record<string, unknown>
        },
        useKeepaliveHttp ? { keepalive: true } : undefined
      )
      const cacheWrite = writeUniverSnapshotCache(
        appId,
        activeSheetId,
        Number(versionForSave || 0),
        snapshotToSave as Record<string, unknown>
      )
      const cacheResult = {
        stored: cacheWrite.stored,
        reason: cacheWrite.reason ?? null
      }
      if (collaboration.isCollaborationConnected) {
        const dimensionPayload = buildDimensionPayloadFromSnapshot(
          snapshotToSave as Record<string, unknown>,
          activeSheetId
        )
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
        const recovered = await recoverFromVersionConflict()
        if (!recovered) {
          snapshotSaveMetricsRef.current.failures += 1
          throw error
        }
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
  onSheetAdd,
  onSheetDelete,
  onBack,
  onNavigateToSpreadsheetHub,
  onShare,
  onEdit,
  isEditing = true,
  isTrashedApp = false,
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
  const recoverFromVersionConflictRef = useRef<() => Promise<boolean>>(async () => false)
  const remoteStructuralResyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteVersionRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recentLocalCommittedVersionsRef = useRef<Map<number, number>>(new Map())
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
  const [snapshotDebugInfo, setSnapshotDebugInfo] = useState<{
    lastSuccessAt: number | null
    lastFailAt: number | null
    successCount: number
    failCount: number
  }>({
    lastSuccessAt: null,
    lastFailAt: null,
    successCount: 0,
    failCount: 0
  })
  const [socketDebugInfo, setSocketDebugInfo] = useState({
    connectCount: 0,
    disconnectCount: 0,
    reconnectCount: 0,
    lastConnectAt: null as number | null,
    lastDisconnectAt: null as number | null,
    lastDisconnectReason: '' as string,
    transport: '' as string,
    socketId: '' as string,
    connectErrorCount: 0
  })
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve())
  const pendingClientRowUpdatesRef = useRef<Map<string, Record<string, unknown>>>(new Map())
  const pendingCellChangesRef = useRef<CellChange[]>([])
  const pendingCellBatchesRef = useRef<PendingCellBatch[]>([])
  const pendingCellJournalRestoredKeyRef = useRef<string | null>(null)
  const pendingSnapshotClearCellsRef = useRef<Map<string, Set<string>>>(new Map())
  const pendingCellPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enqueueSnapshotCheckpointRef = useRef<(() => Promise<void>) | null>(null)
  const pendingSnapshotCheckpointBySheetRef = useRef<Map<string, { requestedAt: number }>>(new Map())
  const snapshotCheckpointDrainScheduledRef = useRef(false)
  const snapshotCheckpointDrainPromiseRef = useRef<Promise<void> | null>(null)
  /** True while Univer has scheduled a workbook snapshot that has not yet settled (HTTP + drain). */
  const workbookSnapshotThrottlePendingRef = useRef(false)
  const lastSuccessfulSnapshotCheckpointAtRef = useRef<number>(0)
  const latestUniverDataRef = useRef<{ data: Record<string, unknown>[]; sheetId: string } | null>(null)
  const univerDataChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProcessedLengthRef = useRef<number>(0)
  const lastPersistedSheetDataRef = useRef<Record<string, unknown>[]>([])
  const cellFlushSequenceRef = useRef<number>(0)
  const unloadKeepAlivePersistRef = useRef(false)
  const collaborationManagerRef = useRef<SpreadsheetCollaborationManager | null>(null)
  const socketPersistChainRef = useRef<Promise<unknown>>(Promise.resolve())
  const collaborationHealthRef = useRef<'connected' | 'reconnecting' | 'failed'>('reconnecting')
  const isCollaborationJoinedRef = useRef(false)
  const scheduleSheetVersionRefreshFromApiRef = useRef<() => void>(() => {})
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
  const appSheetsRef = useRef(app.sheets)
  appSheetsRef.current = app.sheets
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
  // Load one Univer workbook for the whole app (all worksheets at once) and rely
  // on Univer's native sheet-bar for switching/adding/removing/renaming. Tab
  // switches are then pure in-memory operations (no network, no white flash) —
  // matching how Excel feels. Insert/rename/remove on the native sheet-bar are
  // wired back to the backend via UniverSheetGrid's onUniverSheet* callbacks,
  // so ghost sheets are no longer possible.
  const preferUniverNativeSheetTabs = true

  const setActiveSheetIdWithPeerCache = useCallback(
    (nextId: string) => {
      if (!preferUniverNativeSheetTabs) {
        setActiveSheetId(nextId)
        return
      }
      if (activeSheetId === nextId) return
      peerSheetDataCacheRef.current.set(activeSheetId, [...localSheetDataRef.current])
      setActiveSheetId(nextId)
    },
    [activeSheetId, preferUniverNativeSheetTabs, setActiveSheetId, localSheetDataRef]
  )

  useEffect(() => {
    // Seed the peer cache with every sheet's server-provided rows on app load so
    // switching tabs in multi-sheet mode can swap `localSheetData` instantly
    // (no network round-trip, no brief empty state). Active-sheet mutations
    // will overwrite this entry via the existing persistence flow.
    peerSheetDataCacheRef.current.clear()
    for (const s of app.sheets) {
      peerSheetDataCacheRef.current.set(
        s.id,
        sortSpreadsheetRowsBySheetSettings(s.data ?? [], s) as Record<string, unknown>[]
      )
    }
  }, [app.id, app.sheets])

  // Tracks whether the initial bootstrap snapshot fetch has completed for the
  // current app in multi-sheet mode. The bootstrap effect reruns on every
  // activeSheetId change, but in multi-sheet mode Univer already holds all
  // worksheets in memory so re-fetching a single-sheet snapshot on each tab
  // switch only churns state and causes a visible flicker. Gating on this ref
  // keeps the initial bootstrap (rows + styling seed) while skipping every
  // subsequent per-tab fetch. Reset on app.id change.
  const hasBootstrappedForAppIdRef = useRef<{ appId: string | null; done: boolean }>({
    appId: null,
    done: false
  })
  useEffect(() => {
    hasBootstrappedForAppIdRef.current = { appId: app.id, done: false }
  }, [app.id])
  const prevActiveSheetIdForPeerRestoreRef = useRef(activeSheetId)
  useEffect(() => {
    const prev = prevActiveSheetIdForPeerRestoreRef.current
    prevActiveSheetIdForPeerRestoreRef.current = activeSheetId
    if (!preferUniverNativeSheetTabs) return
    if (prev === activeSheetId) return
    // Prefer the live peer cache (captures unsaved edits from other tabs); fall
    // back to the sheet's server-provided rows when the cache hasn't seen it
    // yet (first visit). We always call `setLocalSheetData` so the persistence
    // layer tracks the correct sheet's rows after a switch.
    const cached = peerSheetDataCacheRef.current.get(activeSheetId)
    const sourceRows = cached ?? activeSheet.data ?? []
    setLocalSheetData(sortSpreadsheetRowsBySheetSettings(sourceRows, activeSheet))
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

      // In multi-sheet mode the workbook + all sheet data are bootstrapped once
      // per app; subsequent tab switches must not retrigger a snapshot fetch
      // because Univer already has every worksheet in memory and a refetch
      // would swap `localSheetData` mid-switch and flicker the grid.
      if (
        preferUniverNativeSheetTabs &&
        hasBootstrappedForAppIdRef.current.appId === app.id &&
        hasBootstrappedForAppIdRef.current.done
      ) {
        setIsBootstrapSnapshotLoading(false)
        return
      }

      setIsBootstrapSnapshotLoading(true)
      let minVersion = Number(activeSheet.version ?? 0)

      const previewCache = readUniverSnapshotCacheForBootstrap(app.id, activeSheetId, minVersion)
      const previewPainted = false

      try {
        // The canonical row fetch and the Univer workbook bootstrap fetch are independent
        // (the latter only uses minVersion as a cache-selection hint), so run them in parallel
        // instead of awaiting sequentially.
        const [canonicalSnapshot, activeResult] = await Promise.all([
          SpreadsheetApiService.getSheetSnapshot(app.id, activeSheetId),
          loadBootstrapSnapshotData(app.id, activeSheetId, minVersion)
        ])
        if (cancelled) return
        // The `/univer-snapshot` endpoint is keyed per sheet, but each row carries the
        // *full* workbook blob (all worksheets' cellData + the shared workbook styles
        // map). Only the row matching the sheet that was active at checkpoint time is
        // rewritten on each save, so after the user styles cells on sheet 9 only sheet 9's
        // row is fresh — other sheets' rows still hold the pre-style blob. If the
        // reload restores a different sheet as active, the activeSheet row's blob is
        // stale and the sheet-9 styles appear lost. To self-heal, when we're in multi-
        // sheet mode probe sibling sheets in parallel and pick the snapshot with the
        // most recent `updatedAt` (falls back to version). This adds one extra GET per
        // sibling sheet, but happens only once per app bootstrap and is cheap vs. the
        // write-side alternative of mirroring every primary checkpoint to N sheets
        // (which fans out per-edit and trips the backend rate limiter). Capped at 20
        // siblings to avoid pathological fan-out on huge workbooks.
        let result = activeResult
        const siblingProbeCap = 20
        // Always probe siblings in multi-sheet mode, even when the active
        // sheet's blob was served from `readUniverSnapshotCacheForBootstrap`.
        // The local cache is keyed per-sheet — when the user styles cells on
        // sheet 8, only sheet 8's cache entry is refreshed. Sheet 1's cache
        // entry still points at a pre-style blob. If the reload lands on
        // sheet 1 and the cache hits, gating "probe siblings only when
        // network-sourced" means we happily hand back sheet 1's stale blob
        // and sheet 8's styles appear lost until the user edits sheet 8 again
        // and a fresh checkpoint overwrites the cache. Probing siblings here
        // (capped at 20) is ~N cheap GETs once per app open vs. the
        // write-side broadcast alternative (which fans out per edit and hits
        // rate limits). Remote freshness always wins over cached staleness
        // via `compareSnapshotCandidatesByRecency`.
        const siblingSheetIdsToProbe = preferUniverNativeSheetTabs
          ? app.sheets
              .map(s => s.id)
              .filter(id => id && id !== activeSheetId)
              .slice(0, siblingProbeCap)
          : []
        if (siblingSheetIdsToProbe.length > 0) {
          const siblingResults = await Promise.allSettled(
            siblingSheetIdsToProbe.map(async siblingSheetId => {
              const siblingMinVersion = Number(app.sheets.find(s => s.id === siblingSheetId)?.version ?? 0)
              const siblingResult = await loadBootstrapSnapshotData(app.id, siblingSheetId, siblingMinVersion)
              return { siblingSheetId, siblingResult }
            })
          )
          if (cancelled) return
          let freshestResult = activeResult
          let freshestSource: 'active' | 'sibling' = 'active'
          let freshestSheetId = activeSheetId
          for (const outcome of siblingResults) {
            if (outcome.status !== 'fulfilled') continue
            const { siblingSheetId, siblingResult } = outcome.value
            if (!siblingResult.snapshot) continue
            if (compareSnapshotCandidatesByRecency(siblingResult, freshestResult) > 0) {
              freshestResult = siblingResult
              freshestSource = 'sibling'
              freshestSheetId = siblingSheetId
            }
          }
          if (freshestSource === 'sibling') {
            debugLog('bootstrap: preferring sibling snapshot for freshest workbook blob', {
              appId: app.id,
              activeSheetId,
              freshestSheetId,
              freshestVersion: freshestResult.version,
              freshestUpdatedAt: freshestResult.updatedAt,
              activeVersion: activeResult.version,
              activeUpdatedAt: activeResult.updatedAt
            })
            result = freshestResult
          }
        }
        const canonicalSheetMeta = (canonicalSnapshot.sheet as unknown as SpreadsheetSheet | undefined) ?? activeSheet
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
        const singleSheetSnapshot =
          !preferUniverNativeSheetTabs && result.snapshot && typeof result.snapshot === 'object'
            ? (isolateWorkbookSnapshotToSingleSheet(
                result.snapshot as Record<string, unknown>,
                canonicalSheetMeta.id,
                canonicalSheetMeta.name
              ) ?? (result.snapshot as Record<string, unknown>))
            : result.snapshot
        const normalizedSnapshot =
          singleSheetSnapshot && typeof singleSheetSnapshot === 'object'
            ? mergeBootstrapSnapshotWithCanonicalRows(singleSheetSnapshot, canonicalSheetMeta, canonicalRows)
            : singleSheetSnapshot
        const snapshotForBootstrap =
          normalizedSnapshot && typeof normalizedSnapshot === 'object'
            ? enrichBootstrapSnapshotFromOlderCacheFormatting(
                app.id,
                activeSheetId,
                normalizedSnapshot as Record<string, unknown>
              )
            : normalizedSnapshot
        setBootstrapState(snapshotForBootstrap, result.seed)
        if (preferUniverNativeSheetTabs) {
          hasBootstrappedForAppIdRef.current = { appId: app.id, done: true }
        }
        const rowOverlayChanged = Boolean(
          normalizedSnapshot && result.snapshot && normalizedSnapshot !== result.snapshot
        )
        const formattingEnriched = Boolean(
          snapshotForBootstrap && normalizedSnapshot && snapshotForBootstrap !== normalizedSnapshot
        )
        if (
          snapshotForBootstrap &&
          typeof snapshotForBootstrap === 'object' &&
          (rowOverlayChanged || formattingEnriched)
        ) {
          writeUniverSnapshotCache(
            app.id,
            activeSheetId,
            result.version,
            snapshotForBootstrap as Record<string, unknown>
          )
          debugLog('bootstrap: merged Univer snapshot (rows and/or formatting fallback)', {
            appId: app.id,
            sheetId: activeSheetId,
            source: result.source,
            rowOverlayChanged,
            formattingEnriched
          })
        }
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
        if (previewCache?.snapshot) {
          setBootstrapState(
            previewCache.snapshot as Record<string, unknown>,
            `preview-fallback-v${previewCache.version}`
          )
        } else if (!previewPainted) {
          setBootstrapState(null, `rows-fallback-error-v${minVersion}`)
        } else {
          setIsBootstrapSnapshotLoading(false)
        }
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

  const prevActiveSheetIdForProcessedResetRef = useRef<string | null>(null)
  useEffect(() => {
    const prevActiveSheetId = prevActiveSheetIdForProcessedResetRef.current
    // Only reset the processing bookkeeping on a real sheet *transition*. This
    // effect used to depend on `app.sheets` to correctly seed the new sheet's
    // row count when the user switched into a brand-new empty sheet (so the
    // `if (newData.length <= lastProcessed) return` guard in
    // `processUniverDataChange` didn't skip the first `add_rows` batch). But
    // `commitLocalSheetData` calls `onDataChange` on every successful write,
    // which causes the parent to update `app.sheets` — re-running this effect
    // and resetting `lastProcessedLengthRef` to 0 (the parent's `sheet.data`
    // lags behind `localSheetData`). That made the very next Univer data
    // notification re-dispatch `add_rows` for rows already persisted,
    // producing duplicate rows in the grid. Gate everything on the sheet id
    // actually changing.
    if (prevActiveSheetId === activeSheetId) return
    prevActiveSheetIdForProcessedResetRef.current = activeSheetId

    // IMPORTANT: do NOT read from `localSheetDataRef` here. `localSheetData`
    // (and its ref) is only updated later in the render cycle, so at this
    // point it still holds the PREVIOUS sheet's rows. Resolve the new sheet's
    // rows directly from the authoritative sources: the peer cache (which
    // captures unsynced local edits made on that sheet) falls back to the
    // server-provided `sheet.data`, falls back to an empty array for a newly
    // inserted sheet.
    const cachedRowsForNewSheet = peerSheetDataCacheRef.current.get(activeSheetId)
    const newActiveSheet = app.sheets.find(s => s.id === activeSheetId)
    const rowsForNewSheet = cachedRowsForNewSheet ?? newActiveSheet?.data ?? []
    lastProcessedLengthRef.current = rowsForNewSheet.length
    lastPersistedSheetDataRef.current = rowsForNewSheet as Record<string, unknown>[]
    workbookSnapshotThrottlePendingRef.current = false
    latestUniverDataRef.current = null
    if (univerDataChangeTimeoutRef.current) {
      clearTimeout(univerDataChangeTimeoutRef.current)
      univerDataChangeTimeoutRef.current = null
    }
  }, [activeSheetId, app.sheets])

  const tableUniverSnapshot = useMemo((): Record<string, unknown> | null => {
    if (!preferUniverNativeSheetTabs) return null
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
    // In multi-sheet-workbook mode Univer holds every worksheet in one snapshot
    // and handles switching internally (native sheet bar). Including
    // `activeSheetId` here would rebuild the seed on every tab click and
    // re-run the Univer init effect in UniverSheetGrid (it depends on
    // `props.snapshotSeed`), which is what was causing the white flash on
    // sheet switch. Only the bootstrap payload changing (app reload) should
    // reinitialise Univer.
    return `merged:${bootstrapSnapshotSeed}`
  }, [preferUniverNativeSheetTabs, bootstrapSnapshotSeed])

  const tableWorkbookRemountKey = useMemo(() => {
    if (!preferUniverNativeSheetTabs) return undefined
    // Only remount the Univer workbook when the app itself changes. Adding /
    // removing / renaming sheets is handled natively by Univer's commands +
    // the React-side sync effect; including sheet ids here would remount on
    // every "+" click and cause a big flash while Univer rebuilds.
    return app.id
  }, [preferUniverNativeSheetTabs, app.id])

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
    let freshApp: SpreadsheetApp | null = null

    // 1. Fetch fresh app data (rows + columns) from the backend.
    try {
      freshApp = await SpreadsheetApiService.getApp(app.id)
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
        let snap = univerData.snapshot as Record<string, unknown>
        const freshSheet = freshApp?.sheets.find(s => s.id === activeSheetId)
        const rowsForOverlay =
          restoredRows && freshSheet ? sortSpreadsheetRowsBySheetSettings(restoredRows, freshSheet) : null
        if (rowsForOverlay && freshSheet) {
          const merged = overlaySnapshotIfRowsMismatch(snap, activeSheetId, rowsForOverlay, freshSheet.columns)
          if (merged && merged !== snap) {
            debugLog('version restore: merged Univer snapshot with row-authoritative overlay', {
              appId: app.id,
              sheetId: activeSheetId
            })
            snap = merged
          }
        }
        restoredUniverSnapshot = snap
        writeUniverSnapshotCache(app.id, activeSheetId, univerData.version, snap)
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

  /** Mirrors header “unsaved” / saving for synchronous beforeunload (React state is not readable there). */
  const leaveGuardVersioningUnsavedRef = useRef(false)
  const leaveGuardSheetDirtyRef = useRef(false)
  const leaveGuardSheetErrorRef = useRef<string | null>(null)
  const leaveGuardSheetSavingRef = useRef(false)
  useEffect(() => {
    leaveGuardVersioningUnsavedRef.current = versioning.hasUnsavedChanges
  }, [versioning.hasUnsavedChanges])
  useEffect(() => {
    leaveGuardSheetDirtyRef.current = sheetPersist.hasLocalDirty
    leaveGuardSheetErrorRef.current = sheetPersist.error
    leaveGuardSheetSavingRef.current = sheetPersist.isSaving
  }, [sheetPersist.hasLocalDirty, sheetPersist.error, sheetPersist.isSaving])

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

  useEffect(() => {
    if (SPREADSHEET_GRID_AUTO_REFRESH_MS <= 0) return
    const id = globalThis.setInterval(() => {
      requestGridRefresh()
    }, SPREADSHEET_GRID_AUTO_REFRESH_MS)
    return () => globalThis.clearInterval(id)
  }, [requestGridRefresh])

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
      queueMicrotask(() => collaborationManagerRef.current?.tryFlushDeferredCellEmits())
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
    onRowAdd: onRowAdd
      ? async (appId: string, sheetId: string, rowData: Record<string, unknown>) => {
          return (await onRowAdd(appId, sheetId, rowData)) ?? {}
        }
      : undefined,
    saveTimeoutRef,
    onRequestGridRefresh: requestGridRefresh
  })

  const collectionHeaderColumnSignature = useMemo(() => {
    const sheet = app.sheets.find(s => s.id === activeSheetId)
    return (
      sheet?.columns
        ?.filter(c => c.isVisible !== false)
        .map(c => `${c.id}\0${(c.label ?? '').trim()}\0${c.name}`)
        .join('|') ?? ''
    )
  }, [app.sheets, activeSheetId])

  /** Re-run header sync when row data hydrates (tracking header row appears), not only on mount. */
  const collectionTrackingHeaderSyncKey = useMemo(() => {
    const idx = localSheetData.findIndex(r => r._isTrackingHeader === true)
    return idx >= 0 ? `${idx}:${localSheetData.length}` : 'none'
  }, [localSheetData])

  // Collection sheets store human-readable titles in a synthetic header row; keep it in sync when column labels load/update.
  // Univer bootstraps from persisted snapshots and does not follow React `data` edits until snapshotSeed bumps — refresh when snapshot titles are stale.
  useEffect(() => {
    const sheet = app.sheets.find(s => s.id === activeSheetId)
    if (!sheet?.columns?.length) return
    const rows = localSheetDataRef.current
    if (!rows.some(r => r._isTrackingHeader === true)) return
    const synced = syncTrackingHeaderRowWithColumnLabels(rows, sheet.columns)
    const dataForGrid = synced === rows ? rows : synced
    if (synced !== rows) {
      localSheetDataRef.current = synced
      setLocalSheetData(synced)
      onDataChange?.(activeSheetId, synced)
    }
    if (entityEnabled || isBootstrapSnapshotLoading) return
    const snapshotForCompare = preferUniverNativeSheetTabs ? tableUniverSnapshot : bootstrapSnapshot
    if (!snapshotForCompare || typeof snapshotForCompare !== 'object') return
    if (
      snapshotTrackingHeaderMatchesColumnLabels(
        snapshotForCompare as Record<string, unknown>,
        activeSheetId,
        dataForGrid,
        sheet.columns
      )
    ) {
      return
    }
    requestGridRefresh()
  }, [
    activeSheetId,
    app.sheets,
    bootstrapSnapshot,
    collectionHeaderColumnSignature,
    collectionTrackingHeaderSyncKey,
    entityEnabled,
    isBootstrapSnapshotLoading,
    localSheetDataRef,
    onDataChange,
    preferUniverNativeSheetTabs,
    requestGridRefresh,
    setLocalSheetData,
    tableUniverSnapshot
  ])

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

  const hasEnabledSheetCollectionAutomation = useMemo(
    () =>
      (activeSheet.automations ?? []).some(
        a => (a.type === 'bulk_collection' || a.type === 'excel_collection') && a.isEnabled
      ),
    [activeSheet.automations]
  )

  const handleCheckCollectionResponses = useCallback(() => {
    void automations.fetchBulkCollectionResponses()
  }, [automations.fetchBulkCollectionResponses])

  const [hasTaskForCollectionCopy, setHasTaskForCollectionCopy] = useState(false)
  const appSettings = (app.settings ?? {}) as unknown as Record<string, unknown>
  const fromCollectionLink =
    typeof globalThis !== 'undefined' && new URLSearchParams(globalThis.location.search).get('excel_collection') === '1'
  const isCollectionCopy = Boolean(appSettings.excel_collection_copy || hasTaskForCollectionCopy || fromCollectionLink)
  const isCopyOwner = Boolean(userId && app.createdBy && app.createdBy === userId)
  const canSubmitCollection = Boolean(
    ((appSettings.excel_collection_copy as boolean | undefined) && isCopyOwner) || hasTaskForCollectionCopy
  )
  const collectionSubmittedAt = (appSettings.excel_collection_submitted_at || null) as string | null
  const collectionCopyFlagPersistedRef = useRef(false)

  useEffect(() => {
    if (collectionCopyFlagPersistedRef.current) return
    if (!fromCollectionLink) return
    if (appSettings.excel_collection_copy === true) return

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
    if (appSettings.excel_collection_copy || !userId || !app.id || !automations.hasExcelCollectionTaskForApp) {
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

  useEffect(() => {
    if (!isAutomationsOpen || !accessToken) return
    void automations.refreshAutomationsFromDocumentService()
  }, [isAutomationsOpen, activeSheetId, accessToken, automations.refreshAutomationsFromDocumentService])

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

  const trackSnapshotCellClears = useCallback((sheetId: string, cells: SnapshotCellCoordinate[]) => {
    appendPendingSnapshotClearCoordinates(pendingSnapshotClearCellsRef.current, sheetId, cells)
  }, [])

  /** Remote ops can arrive before Univer attaches gridRef; retry so tab-to-tab sync is not dropped. */
  const applyRemoteCellUpdateWithRetry = useCallback(
    (rowIndex: number, colIndex: number, value: unknown, rowId?: string, options?: ApplyRemoteCellUpdateOptions) => {
      if (isExplicitSnapshotCellClearValue(value)) {
        trackSnapshotCellClears(activeSheetIdRef.current, [{ row: rowIndex, col: colIndex }])
      }
      const maxAttempts = 12
      const delayMs = 75
      const tryApply = (attempt: number) => {
        const grid = spreadsheetGridRef.current
        if (grid) {
          grid.applyRemoteCellUpdate(rowIndex, colIndex, value, rowId, options)
          return
        }
        if (attempt + 1 >= maxAttempts) return
        globalThis.setTimeout(() => tryApply(attempt + 1), delayMs)
      }
      tryApply(0)
    },
    [trackSnapshotCellClears]
  )

  const handleOpenCommentRequest = useCallback(() => {
    setShowComments(true)
  }, [])

  const scheduleSheetVersionRefreshFromApi = useCallback(() => {
    scheduleCoalescedTimeout(remoteVersionRefreshTimeoutRef, 250, () => {
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
    })
  }, [app.id, activeSheetId])

  const reloadSheetFromCanonicalSnapshot = useCallback(
    async (seedPrefix: string): Promise<boolean> => {
      try {
        const snapshot = await SpreadsheetApiService.getSheetSnapshot(app.id, activeSheetId)
        const recoveredSheetMeta = (snapshot.sheet as unknown as SpreadsheetSheet | undefined) ?? activeSheet
        const rows = sortSpreadsheetRowsBySheetSettings(
          mapSnapshotRowsToViewerRows(snapshot.rows || []),
          recoveredSheetMeta
        )
        const sheetMeta = snapshot.sheet as Record<string, unknown> | undefined

        clearUniverSnapshotCache(app.id, activeSheetId)
        let restoredUniverSnapshot: Record<string, unknown> | null = null
        try {
          const univerData = await SpreadsheetApiService.getUniverSnapshot(app.id, activeSheetId)
          if (univerData?.snapshot && typeof univerData.snapshot === 'object') {
            let snap = univerData.snapshot as Record<string, unknown>
            const columnsForMerge =
              (Array.isArray(sheetMeta?.columns) ? (sheetMeta.columns as SpreadsheetColumn[]) : null) ??
              app.sheets.find(s => s.id === activeSheetId)?.columns ??
              []
            if (rows.length > 0 && columnsForMerge.length > 0) {
              const merged = overlaySnapshotIfRowsMismatch(snap, activeSheetId, rows, columnsForMerge)
              if (merged && merged !== snap) {
                debugLog('snapshot reload: merged Univer snapshot with row-authoritative overlay', {
                  appId: app.id,
                  sheetId: activeSheetId,
                  seedPrefix
                })
                snap = merged
              }
            }
            restoredUniverSnapshot = snap
            writeUniverSnapshotCache(app.id, activeSheetId, univerData.version, snap)
          }
        } catch (e) {
          console.warn('[SpreadsheetAppViewer] Could not fetch Univer snapshot during sheet reload:', e)
        }

        sheetVersionRef.current = Number(snapshot.version || 0)
        commitLocalSheetData(rows, { persisted: true, syncGrid: true })
        if (onSheetUpdate && sheetMeta && Array.isArray(sheetMeta.columns)) {
          void onSheetUpdate(app.id, activeSheetId, {
            columns: sheetMeta.columns as SpreadsheetColumn[]
          })
        }
        setBootstrapSnapshot(restoredUniverSnapshot)
        setBootstrapSnapshotSeed(`${seedPrefix}-${Date.now()}`)
        requestGridRefresh()
        return true
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to reload sheet snapshot:', error)
        scheduleSheetVersionRefreshFromApi()
        return false
      }
    },
    [
      activeSheet,
      activeSheetId,
      app.id,
      app.sheets,
      commitLocalSheetData,
      onSheetUpdate,
      requestGridRefresh,
      scheduleSheetVersionRefreshFromApi
    ]
  )

  const scheduleRemoteStructuralResync = useCallback(() => {
    scheduleCoalescedTimeout(remoteStructuralResyncTimeoutRef, 500, () => {
      remoteStructuralResyncTimeoutRef.current = null
      void reloadSheetFromCanonicalSnapshot('remote-structural-resync')
    })
  }, [reloadSheetFromCanonicalSnapshot])

  const rememberLocalCommittedVersion = useCallback((version: number | undefined) => {
    if (typeof version !== 'number' || !Number.isFinite(version) || version < 0) return
    const expiresAt = Date.now() + 15000
    const next = new Map(recentLocalCommittedVersionsRef.current)
    next.set(Math.trunc(version), expiresAt)
    for (const [candidateVersion, candidateExpiresAt] of next) {
      if (candidateExpiresAt <= Date.now()) next.delete(candidateVersion)
    }
    recentLocalCommittedVersionsRef.current = next
  }, [])

  const shouldIgnoreRecentlyCommittedOperation = useCallback((operation: CollaborationOperation): boolean => {
    const version =
      typeof operation.version === 'number'
        ? Math.trunc(operation.version)
        : typeof operation.operation?.version === 'number'
          ? Math.trunc(operation.operation.version)
          : null
    if (version == null || !Number.isFinite(version) || version < 0) {
      return false
    }

    const now = Date.now()
    const next = new Map(recentLocalCommittedVersionsRef.current)
    for (const [candidateVersion, candidateExpiresAt] of next) {
      if (candidateExpiresAt <= now) next.delete(candidateVersion)
    }
    recentLocalCommittedVersionsRef.current = next
    return next.has(version)
  }, [])
  scheduleSheetVersionRefreshFromApiRef.current = scheduleSheetVersionRefreshFromApi

  // --- Collaboration (header presence + Univer grid operations/cursors) ---
  // Column update handler — kept in the viewer because it needs access to viewer-specific
  // state (pendingColumnWidthOverrides, recentLocalColumnResizeRef, applyRemoteColumnUpdate).
  const handleRemoteColumnUpdate = useCallback(
    (data: Record<string, unknown>) => {
      const d = data as {
        sheetId?: string
        columnId?: string
        columnPatch?: Partial<SpreadsheetColumn>
        label?: string
        columns?: SpreadsheetColumn[]
      }
      if (d?.sheetId !== activeSheetId) return
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
    },
    [activeSheetId, activeSheet.columns, app, onAppUpdate, pendingColumnWidthOverrides]
  )

  // Ref for getBackendRowIdForUiRowId — defined later, but the manager reads it lazily via
  // the callbacks ref, so the actual function is always current by the time an operation fires.
  const getBackendRowIdForUiRowIdRef = useRef<(uiRowId: string, univerRow?: number) => string | undefined>(
    () => undefined
  )

  // Collaboration callbacks wired from the viewer into SpreadsheetCollaborationManager
  const collaborationCallbacks = useMemo(
    (): CollaborationCallbacks => ({
      getActiveSheetId: () => activeSheetId,
      getColumns: () => activeSheet.columns,
      getLocalSheetData: () => localSheetDataRef.current,
      getBackendRowIdForUiRowId: (uiRowId, univerRow) => getBackendRowIdForUiRowIdRef.current(uiRowId, univerRow),
      commitLocalSheetData,
      applyRemoteCellUpdate: applyRemoteCellUpdateWithRetry,
      applyRemoteDimensions: d => {
        spreadsheetGridRef.current?.applyRemoteDimensions?.(d)
      },
      onVersionUpdate: version => {
        sheetVersionRef.current = Math.max(sheetVersionRef.current, Math.trunc(version))
      },
      scheduleSheetVersionRefreshFromApi,
      scheduleRemoteStructuralResync,
      onRemoteColumnUpdate: handleRemoteColumnUpdate,
      fetchChangesSince: async (sheetId, sinceVersion) => {
        const raw = await SpreadsheetApiService.getSheetChangesSince(app.id, sheetId, sinceVersion)
        return {
          currentVersion: raw.currentVersion,
          requiresSnapshot: raw.requiresSnapshot,
          changes: raw.changes as unknown as Array<{
            operationType: string
            payload: Record<string, unknown>
            appliedVersion: number
          }>
        }
      },
      isCollabDiagEnabled: isSpreadsheetAppsDebugEnabled,
      onCollabDiagnostic: (event, meta) => {
        debugLog('collab-diagnostic', { event, meta })
      },
      onPendingQueueTrimmed: dropped => {
        if (dropped > 0) {
          toast.warning(sheetT('collab-queue-trimmed-warn'), { duration: 8000 })
        }
      }
    }),
    [
      activeSheetId,
      activeSheet.columns,
      app.id,
      applyRemoteCellUpdateWithRetry,
      commitLocalSheetData,
      handleRemoteColumnUpdate,
      scheduleRemoteStructuralResync,
      scheduleSheetVersionRefreshFromApi,
      sheetT
    ]
  )

  const collaboration = useSpreadsheetCollaboration({
    appId: app.id,
    accessToken,
    disabled: isTrashedApp,
    callbacks: collaborationCallbacks,
    shouldIgnoreReceivedOperation: shouldIgnoreRecentlyCommittedOperation
  })

  collaborationManagerRef.current = collaboration.manager
  collaborationHealthRef.current = collaboration.collaborationHealth
  isCollaborationJoinedRef.current = collaboration.isCollaborationJoined

  // Seed the manager's version tracker so delta reconciliation has a baseline
  useEffect(() => {
    collaboration.manager.setLastKnownVersion(sheetVersionRef.current)
  }, [collaboration.manager, activeSheetId])

  useEffect(() => {
    const sock = collaboration.socket
    if (!sock) return
    const onConnect = () => {
      setSocketDebugInfo(prev => ({
        ...prev,
        connectCount: prev.connectCount + 1,
        lastConnectAt: Date.now(),
        transport: (sock as any).io?.engine?.transport?.name ?? '',
        socketId: sock.id ?? ''
      }))
    }
    const onDisconnect = (reason: string) => {
      setSocketDebugInfo(prev => ({
        ...prev,
        disconnectCount: prev.disconnectCount + 1,
        lastDisconnectAt: Date.now(),
        lastDisconnectReason: reason
      }))
    }
    const onReconnect = () => {
      setSocketDebugInfo(prev => ({
        ...prev,
        reconnectCount: prev.reconnectCount + 1,
        lastConnectAt: Date.now(),
        transport: (sock as any).io?.engine?.transport?.name ?? '',
        socketId: sock.id ?? ''
      }))
    }
    const onConnectError = () => {
      setSocketDebugInfo(prev => ({
        ...prev,
        connectErrorCount: prev.connectErrorCount + 1
      }))
    }
    sock.on('connect', onConnect)
    sock.on('disconnect', onDisconnect)
    sock.on('connect_error', onConnectError)
    sock.io?.on('reconnect', onReconnect)
    if (sock.connected) {
      setSocketDebugInfo(prev => ({
        ...prev,
        connectCount: prev.connectCount > 0 ? prev.connectCount : 1,
        lastConnectAt: prev.lastConnectAt ?? Date.now(),
        transport: (sock as any).io?.engine?.transport?.name ?? '',
        socketId: sock.id ?? ''
      }))
    }
    return () => {
      sock.off('connect', onConnect)
      sock.off('disconnect', onDisconnect)
      sock.off('connect_error', onConnectError)
      sock.io?.off('reconnect', onReconnect)
    }
  }, [collaboration.socket])

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

  /**
   * Synchronous write of the live Univer workbook to localStorage so a fast close/reload can still
   * restore styles from cache while the async HTTP snapshot is in flight or aborted.
   */
  const cacheLiveUniverSnapshotRef = useRef<() => void>(() => {})
  const cacheLiveUniverSnapshotToLocalStorageBestEffort = useCallback(() => {
    if (entityEnabledRef.current || !canEditWithLockRef.current) return
    const sheetId = activeSheetIdRef.current
    if (!sheetId) return
    try {
      const raw = spreadsheetGridRef.current?.getWorkbookSnapshot?.()
      if (!raw || typeof raw !== 'object') return
      const version = Math.max(0, Math.trunc(Number(sheetVersionRef.current ?? 0)))
      writeUniverSnapshotCache(app.id, sheetId, version, cloneSnapshot(raw) as Record<string, unknown>)
    } catch (err) {
      console.warn('[SpreadsheetAppViewer] Emergency snapshot localStorage cache failed:', err)
    }
  }, [app.id])
  cacheLiveUniverSnapshotRef.current = cacheLiveUniverSnapshotToLocalStorageBestEffort

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

        void chainOnOperationQueue(operationQueueRef, async () => {
          try {
            const updated = await onSheetUpdate(app.id, activeSheetId, { columns: columnsToPersist })
            if (updated?.version != null) {
              sheetVersionRef.current = Math.max(sheetVersionRef.current, Number(updated.version))
              rememberLocalCommittedVersion(Number(updated.version))
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
        }).catch(() => undefined)
        // Width changes must also land in the durable Univer snapshot used on page reload.
        // Enqueue separately so it runs after the dimension persist completes on the queue.
        const enqueueSnapshotCheckpoint = enqueueSnapshotCheckpointRef.current
        if (enqueueSnapshotCheckpoint) {
          void enqueueSnapshotCheckpoint()
        }
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
  const handleCellChangeRef = useRef<(rowId: string, columnName: string, value: unknown, sheetId?: string) => void>(
    () => {}
  )

  const columnsState = useSpreadsheetColumns({
    app,
    activeSheet,
    localSheetDataRef,
    setLocalSheetData,
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

  const isUuid = useCallback((value: string): boolean => isUuidString(value), [])

  const getBackendRowIdForUiRowId = useCallback(
    (uiRowId: string, univerRow?: number): string | undefined => {
      const rows = localSheetDataRef.current

      const row = rows.find(r => viewerRowId(r) === uiRowId)
      if (row) return resolveBackendRowIdForViewerRow(row, isUuid)

      const byBackend = rows.find(r => resolveBackendRowIdForViewerRow(r, isUuid) === uiRowId)
      if (byBackend) return resolveBackendRowIdForViewerRow(byBackend, isUuid)

      if (univerRow != null && univerRow >= 0 && univerRow < rows.length) {
        const rowByIndex = rows[univerRow]
        if (rowByIndex) {
          return resolveBackendRowIdForViewerRow(rowByIndex, isUuid)
        }
      }
      return undefined
    },
    [isUuid, localSheetDataRef]
  )
  getBackendRowIdForUiRowIdRef.current = getBackendRowIdForUiRowId

  const pendingCellJournalStorageKey = useMemo(() => `${PENDING_CELL_JOURNAL_STORAGE_PREFIX}${app.id}`, [app.id])

  const persistPendingCellJournal = useCallback(() => {
    if (entityEnabled || typeof globalThis === 'undefined') return
    try {
      const storage = globalThis.sessionStorage
      if (!storage) return
      if (pendingCellChangesRef.current.length === 0 && pendingCellBatchesRef.current.length === 0) {
        storage.removeItem(pendingCellJournalStorageKey)
        return
      }
      storage.setItem(
        pendingCellJournalStorageKey,
        JSON.stringify({
          draftCells: pendingCellChangesRef.current,
          pendingBatches: pendingCellBatchesRef.current
        } satisfies PendingCellJournal)
      )
    } catch {
      // Best-effort persistence only.
    }
  }, [entityEnabled, pendingCellJournalStorageKey])

  const hasPendingCellPersistence = useCallback(
    () => pendingCellChangesRef.current.length > 0 || pendingCellBatchesRef.current.length > 0,
    []
  )

  /** True while a snapshot drain is scheduled/running on the op queue, or sheet ids are queued for it. */
  const hasPendingSnapshotCheckpointForCellFlush = useCallback(
    () => pendingSnapshotCheckpointBySheetRef.current.size > 0 || snapshotCheckpointDrainScheduledRef.current,
    []
  )

  const handleWorkbookSnapshotLifecycle = useCallback(
    (event: WorkbookSnapshotLifecycleEvent) => {
      if (event.phase === 'checkpoint_scheduled') {
        workbookSnapshotThrottlePendingRef.current = true
        sheetPersist.markDirty()
        versioning.markAsChanged()
        return
      }
      if (event.ok) {
        workbookSnapshotThrottlePendingRef.current = false
        return
      }
      workbookSnapshotThrottlePendingRef.current = true
      sheetPersist.markDirty()
      versioning.markAsChanged()
    },
    [sheetPersist.markDirty, versioning.markAsChanged]
  )

  const recoverFromVersionConflict = useCallback(async (): Promise<boolean> => {
    try {
      const sinceVersion = sheetVersionRef.current
      const delta = await SpreadsheetApiService.getSheetChangesSince(app.id, activeSheetId, sinceVersion)
      if (!sheetDeltaRequiresFullSnapshot(sinceVersion, delta)) {
        const next = applyDeltaChangesToRows(localSheetDataRef.current, delta.changes, activeSheet.columns)
        sheetVersionRef.current = Number(delta.currentVersion || sheetVersionRef.current)
        commitLocalSheetData(next, { persisted: true, syncGrid: true })
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
        return true
      }

      snapshotSaveMetricsRef.current.fallbackLoads += 1
      const reloaded = await reloadSheetFromCanonicalSnapshot('conflict-recovery')
      if (!reloaded) return false

      debugLog('version conflict fallback snapshot loaded', {
        appId: app.id,
        sheetId: activeSheetId,
        fallbackLoads: snapshotSaveMetricsRef.current.fallbackLoads
      })
      sheetPersist.recordSuccess(true)
      versioning.markAsSaved()
      return true
    } catch (error) {
      console.error('[SpreadsheetAppViewer] Failed to recover from version conflict:', error)
      sheetPersist.recordError(sheetT('persist-recovery-failed'))
      scheduleSheetVersionRefreshFromApi()
      return false
    }
  }, [
    activeSheet.columns,
    activeSheetId,
    app.id,
    commitLocalSheetData,
    localSheetDataRef,
    reloadSheetFromCanonicalSnapshot,
    scheduleSheetVersionRefreshFromApi,
    sheetPersist.recordError,
    sheetPersist.recordSuccess,
    sheetT,
    versioning.markAsSaved
  ])

  useEffect(() => {
    recoverFromVersionConflictRef.current = recoverFromVersionConflict
  }, [recoverFromVersionConflict])

  const buildPendingCellBatches = useCallback(
    (queuedCells: CellChange[]): PendingCellBatch[] => {
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

      const workItems: PendingCellBatch[] = []
      for (const [targetSheetId, sheetCells] of groupedCells) {
        const uiToBackendRowId = buildUiToBackendRowIdMap(resolveRowsForCellFlush(targetSheetId), isUuid)
        const { setUpdatesByBackendRowId, clearCells } = partitionCellUpdatesByBackendRowId(
          sheetCells,
          uiToBackendRowId,
          pendingClientRowUpdatesRef.current,
          isUuid
        )
        const setCellsToPersist = flattenUpdatesToCells(setUpdatesByBackendRowId).map(cell => ({
          ...cell,
          value: normalizeCellValueForBatchPersistence(cell.value)
        }))
        const shouldCollapseClearCellsIntoSetRange = clearCells.length > MAX_INDIVIDUAL_CLEAR_CELL_OPS
        const collapsedClearCells = shouldCollapseClearCellsIntoSetRange
          ? clearCells.map(cell => ({
              ...cell,
              value: null as unknown
            }))
          : []
        const setRangeCells = [...setCellsToPersist, ...collapsedClearCells]
        const operations: SpreadsheetBatchOperation[] = []
        if (setRangeCells.length > 0) {
          operations.push({
            operationId: createOperationId('set_range'),
            type: 'set_range',
            data: { cells: setRangeCells }
          })
        }
        if (!shouldCollapseClearCellsIntoSetRange) {
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
        }
        if (operations.length === 0) continue
        workItems.push({
          batchId: createOperationId(`cell_ops_${targetSheetId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`),
          targetSheetId,
          operations
        })
      }
      return workItems
    },
    [app.sheets, createOperationId, isUuid, localSheetDataRef]
  )

  useEffect(() => {
    return () => {
      if (remoteStructuralResyncTimeoutRef.current) clearTimeout(remoteStructuralResyncTimeoutRef.current)
      if (remoteVersionRefreshTimeoutRef.current) clearTimeout(remoteVersionRefreshTimeoutRef.current)
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
      batchIdPrefix = 'batch',
      batchIdOverride?: string
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
        const batchId = batchIdOverride ?? createOperationId(batchIdPrefix)
        const response = await SpreadsheetApiService.applyOperationBatch(
          app.id,
          targetSheetId,
          {
            baseVersion,
            operations,
            batchId
          },
          {
            keepalive: unloadKeepAlivePersistRef.current
          }
        )
        if (isActiveTarget()) {
          sheetVersionRef.current = response.newVersion
          rememberLocalCommittedVersion(response.newVersion)
          lastPersistedSheetDataRef.current = localSheetDataRef.current
        } else if (onSheetUpdate) {
          void onSheetUpdate(app.id, targetSheetId, { version: response.newVersion })
        }
        return response
      } catch (error) {
        if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
          const serverVer = getSpreadsheetBatchConflictServerVersion(error.details)
          if (serverVer != null && isActiveTarget()) {
            sheetVersionRef.current = Math.max(sheetVersionRef.current, serverVer)
            try {
              const quickRetry = await SpreadsheetApiService.applyOperationBatch(app.id, targetSheetId, {
                baseVersion: sheetVersionRef.current,
                operations,
                batchId: createOperationId(`${batchIdPrefix}_cv_retry`)
              })
              sheetVersionRef.current = quickRetry.newVersion
              lastPersistedSheetDataRef.current = localSheetDataRef.current
              scheduleSnapshotCheckpointFromPersistence()
              return quickRetry
            } catch {
              /* fall through to full conflict recovery */
            }
          }
          if (isActiveTarget()) {
            snapshotSaveMetricsRef.current.conflicts += 1
            const recovered = await recoverFromVersionConflict()
            if (!recovered) throw error
            const retryBatchId = createOperationId(
              batchIdOverride ? `${batchIdPrefix}_retry_after_restore` : `${batchIdPrefix}_retry`
            )
            const retry = await SpreadsheetApiService.applyOperationBatch(
              app.id,
              targetSheetId,
              {
                baseVersion: sheetVersionRef.current,
                operations,
                batchId: retryBatchId
              },
              {
                keepalive: unloadKeepAlivePersistRef.current
              }
            )
            sheetVersionRef.current = retry.newVersion
            rememberLocalCommittedVersion(retry.newVersion)
            lastPersistedSheetDataRef.current = localSheetDataRef.current
            return retry
          }
          try {
            const sheet = await SpreadsheetApiService.getSheet(app.id, targetSheetId)
            const retryBatchId = createOperationId(
              batchIdOverride ? `${batchIdPrefix}_retry_after_restore` : `${batchIdPrefix}_retry`
            )
            const retry = await SpreadsheetApiService.applyOperationBatch(
              app.id,
              targetSheetId,
              {
                baseVersion: Number(sheet?.version ?? 0),
                operations,
                batchId: retryBatchId
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
      rememberLocalCommittedVersion,
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

  const persistSnapshotCheckpointForSheet = useCallback(
    async (targetSheetId: string) => {
      if (entityEnabled) return
      // Wait for any pending socket persists to complete before reading the version.
      // This prevents a race condition where the snapshot save uses a stale version
      // because cell persists are still in flight.
      try {
        await socketPersistChainRef.current
      } catch {
        // Ignore errors - we just need to wait for completion
      }
      snapshotSaveMetricsRef.current.attempts += 1

      const rawSnapshot = spreadsheetGridRef.current?.getWorkbookSnapshot?.()
      if (!rawSnapshot) {
        snapshotSaveMetricsRef.current.failures += 1
        setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
        debugLog('snapshot checkpoint skipped: snapshot unavailable', {
          appId: app.id,
          sheetId: targetSheetId
        })
        return
      }

      const snapshot = cloneSnapshot(rawSnapshot)
      const snapshotSizeBytes = getSnapshotSizeBytes(snapshot)
      if (snapshotSizeBytes == null) {
        snapshotSaveMetricsRef.current.failures += 1
        setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
        debugLog('snapshot checkpoint skipped: serialization failed', {
          appId: app.id,
          sheetId: targetSheetId
        })
        return
      }

      if (snapshotSizeBytes > 8_500_000) {
        snapshotSaveMetricsRef.current.failures += 1
        setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
        debugLog('snapshot checkpoint skipped: payload too large', {
          appId: app.id,
          sheetId: targetSheetId,
          sizeBytes: snapshotSizeBytes
        })
        sheetPersist.recordError(sheetT('persist-snapshot-too-large'))
        return
      }

      const targetSheetVersionRef = {
        current:
          targetSheetId === activeSheetIdRef.current
            ? sheetVersionRef.current
            : Number(app.sheets.find(sheet => sheet.id === targetSheetId)?.version ?? 0)
      }
      const isTargetActiveSheet = targetSheetId === activeSheetIdRef.current
      const targetSheetMeta = app.sheets.find(sheet => sheet.id === targetSheetId)
      if (!targetSheetMeta) {
        snapshotSaveMetricsRef.current.failures += 1
        setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
        debugLog('snapshot checkpoint skipped: target sheet missing', {
          appId: app.id,
          sheetId: targetSheetId
        })
        return
      }
      const fallbackTargetRows = sortSpreadsheetRowsBySheetSettings(targetSheetMeta.data ?? [], targetSheetMeta)
      const currentRows = isTargetActiveSheet
        ? localSheetDataRef.current
        : (peerSheetDataCacheRef.current.get(targetSheetId) ?? fallbackTargetRows)
      const persistedBaselineRows = isTargetActiveSheet ? lastPersistedSheetDataRef.current : fallbackTargetRows

      const recoverSnapshotConflict = async (): Promise<boolean> => {
        if (isTargetActiveSheet) {
          const recovered = await recoverFromVersionConflict()
          targetSheetVersionRef.current = sheetVersionRef.current
          return recovered
        }

        try {
          const sheet = await SpreadsheetApiService.getSheet(app.id, targetSheetId)
          targetSheetVersionRef.current = Number(sheet?.version ?? targetSheetVersionRef.current)
          return true
        } catch {
          return false
        }
      }

      try {
        let versionRefForSave = targetSheetVersionRef
        let sizeBytesForSave: number | null = snapshotSizeBytes
        let cacheResult: { stored: boolean; reason: string | null } = { stored: false, reason: null }

        const worksheet = getWorksheetFromSnapshot(snapshot, targetSheetId)
        const wsRowCount =
          typeof (worksheet as { rowCount?: number })?.rowCount === 'number'
            ? (worksheet as { rowCount: number }).rowCount
            : 1000
        const wsColCount =
          typeof (worksheet as { columnCount?: number })?.columnCount === 'number'
            ? (worksheet as { columnCount: number }).columnCount
            : 32

        const visibleColumns = targetSheetMeta.columns.filter(c => c.isVisible !== false)
        const cellDataFromSnapshot = (worksheet as Record<string, unknown> | undefined)?.cellData as
          | Record<string, Record<string, unknown>>
          | undefined
        const cellDataFromGrid = isTargetActiveSheet
          ? spreadsheetGridRef.current?.getVisibleRangeValues?.(
              Math.min(currentRows.length, wsRowCount),
              Math.min(visibleColumns.length, wsColCount)
            )
          : null
        const cellData =
          cellDataFromGrid && typeof cellDataFromGrid === 'object' ? cellDataFromGrid : cellDataFromSnapshot
        const { hasCellData, updatesByRowIndex, reconcileCells } = buildSnapshotReconcilePlan({
          cellData,
          visibleColumns,
          currentRows,
          persistedBaseline: persistedBaselineRows,
          isUuid
        })
        if (!hasCellData) {
          debugLog('snapshot checkpoint: missing worksheet cellData, saving snapshot-only fallback')
        }

        if (isTargetActiveSheet && updatesByRowIndex.size > 0) {
          const nextLocal = mergeRowsWithIndexUpdates(currentRows, updatesByRowIndex)
          // Snapshot-checkpoint reconcile: `updatesByRowIndex` was derived from
          // Univer's own `cellData` (via `getVisibleRangeValues` a few lines
          // above) — Univer already renders these values correctly. We need to
          // update the React row mirror so persistence tracks the new values,
          // but we must NOT bump `authoritativeDataSyncToken`, otherwise the
          // authoritative re-apply effect in `UniverSheetGrid` re-dispatches
          // `SetRangeValuesMutation` for every reconciled cell on the next
          // render, which Univer tears down and repaints — the whole-grid
          // blink observed on drag-fill and fast typing on sheets 2+ (sheet 1
          // happens to win the signature-cache race because its active-sheet
          // bootstrap seed matches the viewer rows exactly).
          commitLocalSheetData(nextLocal, { syncGrid: false })
        }

        let reconcileCellsToPersist = reconcileCells
        if (reconcileCellsToPersist.length > 0) {
          try {
            const remoteRows = await SpreadsheetApiService.getAllRows(app.id, targetSheetId)
            const allowedBackendIds = new Set<string>()
            for (const remoteRow of remoteRows) {
              const backendId = resolveBackendRowIdForViewerRow(remoteRow as ViewerRow, isUuid)
              if (backendId) allowedBackendIds.add(backendId)
            }
            reconcileCellsToPersist = reconcileCells.filter(cell => allowedBackendIds.has(String(cell.rowId || '')))
          } catch {
            /* keep local reconcile set if server rows cannot be loaded */
          }
        }

        if (reconcileCellsToPersist.length > 0) {
          if (isOpsV2Enabled) {
            const op: SpreadsheetBatchOperation = {
              operationId: createOperationId('reconcile_set_range'),
              type: 'set_range',
              data: { cells: reconcileCellsToPersist }
            }
            await applyBatchDirectForSheet(targetSheetId, [op], 'checkpoint_reconcile')
          } else {
            await persistReconcileCells(reconcileCellsToPersist, app.id, targetSheetId, onRowUpdate)
          }
          if (isTargetActiveSheet) {
            lastPersistedSheetDataRef.current = localSheetDataRef.current
          }
        } else if (reconcileCells.length > 0) {
          if (isTargetActiveSheet) {
            lastPersistedSheetDataRef.current = localSheetDataRef.current
          }
        }

        const rowsForAuthoritativeSnapshot =
          updatesByRowIndex.size > 0 ? mergeRowsWithIndexUpdates(currentRows, updatesByRowIndex) : currentRows
        const pendingSnapshotClearCells = getPendingSnapshotClearCoordinates(
          pendingSnapshotClearCellsRef.current,
          targetSheetId
        )
        const snapshotToPersistBase = mergeAuthoritativeViewerRowsIntoWorkbookSnapshot(
          snapshot as Record<string, unknown>,
          targetSheetId,
          rowsForAuthoritativeSnapshot,
          targetSheetMeta.columns
        )
        const snapshotToPersist = clearSnapshotCellsByCoordinate(
          snapshotToPersistBase,
          targetSheetId,
          pendingSnapshotClearCells
        )
        sizeBytesForSave = getSnapshotSizeBytes(snapshotToPersist)
        if (sizeBytesForSave == null || sizeBytesForSave > 8_500_000) {
          snapshotSaveMetricsRef.current.failures += 1
          setSnapshotDebugInfo(prev => ({ ...prev, lastFailAt: Date.now(), failCount: prev.failCount + 1 }))
          debugLog('snapshot checkpoint skipped: merged snapshot invalid or too large', {
            appId: app.id,
            sheetId: targetSheetId,
            sizeBytes: sizeBytesForSave
          })
          if (sizeBytesForSave != null && sizeBytesForSave > 8_500_000) {
            sheetPersist.recordError(sheetT('persist-snapshot-too-large'))
          }
          return
        }

        versionRefForSave = isTargetActiveSheet ? sheetVersionRef : targetSheetVersionRef

        const saved = await saveSnapshotWithRetry({
          appId: app.id,
          activeSheetId: targetSheetId,
          baseSnapshot: snapshotToPersist,
          prepareSnapshotForSave: currentSnapshot =>
            clearSnapshotCellsByCoordinate(
              currentSnapshot as Record<string, unknown>,
              targetSheetId,
              getPendingSnapshotClearCoordinates(pendingSnapshotClearCellsRef.current, targetSheetId)
            ),
          sheetVersionRef: versionRefForSave,
          snapshotSaveMetricsRef,
          recoverFromVersionConflict: recoverSnapshotConflict,
          spreadsheetGridRef,
          collaboration,
          maxSnapshotRetries: 3,
          lastEmittedDimensionSignatureRef,
          useKeepaliveHttp: unloadKeepAlivePersistRef.current
        })
        cacheResult = saved.cacheResult
        debugLog('snapshot checkpoint saved', {
          appId: app.id,
          sheetId: targetSheetId,
          version: isTargetActiveSheet ? sheetVersionRef.current : targetSheetVersionRef.current,
          sizeBytes: sizeBytesForSave,
          cacheStored: cacheResult.stored,
          cacheReason: cacheResult.reason,
          metrics: snapshotSaveMetricsRef.current
        })
        if (isTargetActiveSheet) {
          sheetVersionRef.current = Math.max(sheetVersionRef.current, targetSheetVersionRef.current)
        } else {
          peerSheetDataCacheRef.current.set(targetSheetId, [...rowsForAuthoritativeSnapshot])
        }

        // NOTE: we do NOT mirror the just-saved workbook blob to sibling sheets here.
        // Each `/sheets/${sheetId}/univer-snapshot` row carries the *full* workbook
        // blob (all worksheets' cellData, styles, merges, etc.), so writing to the
        // active sheet's key is sufficient to persist cross-sheet state. The
        // bootstrap loader (see `loadBootstrapSnapshot` effect) is responsible for
        // picking up the freshest sibling snapshot if the reload restores a sheet
        // that hasn't been checkpointed recently — doing it on read is O(N) GETs
        // once per app open, versus O(N) POSTs per edit session which quickly
        // trips the backend rate limiter for workbooks with many sheets.
        lastSuccessfulSnapshotCheckpointAtRef.current = Date.now()
        setSnapshotDebugInfo(prev => ({
          ...prev,
          lastSuccessAt: Date.now(),
          successCount: prev.successCount + 1
        }))
        clearPendingSnapshotClearCoordinates(pendingSnapshotClearCellsRef.current, targetSheetId)
        const persistenceQuiet =
          !hasPendingCellPersistence() &&
          pendingCellPersistTimeoutRef.current == null &&
          pendingSnapshotCheckpointBySheetRef.current.size === 0
        sheetPersist.recordSuccess(persistenceQuiet)
        if (persistenceQuiet) {
          versioning.markAsSaved()
        }
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Snapshot checkpoint failed:', error)
        setSnapshotDebugInfo(prev => ({
          ...prev,
          lastFailAt: Date.now(),
          failCount: prev.failCount + 1
        }))
        sheetPersist.recordError(sheetT('persist-snapshot-failed'))
      }
    },
    [
      app.id,
      app.sheets,
      collaboration,
      entityEnabled,
      hasPendingCellPersistence,
      recoverFromVersionConflict,
      sheetPersist.recordError,
      sheetPersist.recordSuccess,
      sheetT,
      versioning.markAsSaved
    ]
  )

  const persistSnapshotCheckpointForSheetRef = useRef(persistSnapshotCheckpointForSheet)
  persistSnapshotCheckpointForSheetRef.current = persistSnapshotCheckpointForSheet

  const scheduleSnapshotCheckpointDrain = useCallback(() => {
    if (snapshotCheckpointDrainScheduledRef.current) {
      return snapshotCheckpointDrainPromiseRef.current ?? Promise.resolve()
    }

    snapshotCheckpointDrainScheduledRef.current = true
    const promise = chainOnOperationQueue(operationQueueRef, async () => {
      sheetPersist.beginPersist()
      try {
        while (pendingSnapshotCheckpointBySheetRef.current.size > 0) {
          const pendingSheetIds = Array.from(pendingSnapshotCheckpointBySheetRef.current.keys())
          pendingSnapshotCheckpointBySheetRef.current.clear()

          for (const targetSheetId of pendingSheetIds) {
            await persistSnapshotCheckpointForSheet(targetSheetId)
          }
        }
      } finally {
        sheetPersist.endPersist()
      }
    }).finally(() => {
      snapshotCheckpointDrainScheduledRef.current = false
      snapshotCheckpointDrainPromiseRef.current = null
      if (pendingSnapshotCheckpointBySheetRef.current.size > 0) {
        void scheduleSnapshotCheckpointDrain()
      }
    })

    snapshotCheckpointDrainPromiseRef.current = promise
    return promise
  }, [persistSnapshotCheckpointForSheet, sheetPersist.beginPersist, sheetPersist.endPersist])

  const enqueueUniverSnapshotCheckpoint = useCallback((): Promise<void> => {
    sheetPersist.markDirty()
    pendingSnapshotCheckpointBySheetRef.current.set(activeSheetId, { requestedAt: Date.now() })
    return scheduleSnapshotCheckpointDrain()
  }, [activeSheetId, scheduleSnapshotCheckpointDrain, sheetPersist.markDirty])

  useEffect(() => {
    enqueueSnapshotCheckpointRef.current = enqueueUniverSnapshotCheckpoint
  }, [enqueueUniverSnapshotCheckpoint])

  const flushPendingCellChanges = useCallback(async () => {
    if (entityEnabled) return
    if (!hasPendingCellPersistence()) return

    cellFlushSequenceRef.current += 1

    sheetPersist.beginPersist()
    try {
      let didPersistAnyBatch = false
      while (true) {
        if (pendingCellBatchesRef.current.length === 0) {
          const draftCells = pendingCellChangesRef.current
          if (draftCells.length === 0) break
          pendingCellChangesRef.current = []
          pendingCellBatchesRef.current = buildPendingCellBatches(draftCells)
          persistPendingCellJournal()
          if (pendingCellBatchesRef.current.length === 0) break
        }

        const [nextBatch, ...remainingBatches] = pendingCellBatchesRef.current
        if (!nextBatch) break
        const response = await applyBatchDirectForSheet(
          nextBatch.targetSheetId,
          nextBatch.operations,
          'persisted_cell_batch',
          nextBatch.batchId
        )
        pendingCellBatchesRef.current = remainingBatches
        persistPendingCellJournal()
        didPersistAnyBatch = true
        sheetVersionRef.current = Math.max(sheetVersionRef.current, Number(response.newVersion || 0))
      }

      if (!didPersistAnyBatch) return
      const persistenceQuiet =
        !hasPendingCellPersistence() &&
        pendingCellPersistTimeoutRef.current == null &&
        !hasPendingSnapshotCheckpointForCellFlush() &&
        !workbookSnapshotThrottlePendingRef.current
      sheetPersist.recordSuccess(persistenceQuiet)
      if (persistenceQuiet) {
        versioning.markAsSaved()
      }
    } catch (error) {
      persistPendingCellJournal()
      console.error('[SpreadsheetAppViewer] Failed to persist cell changes:', error)
      sheetPersist.recordError(sheetT('persist-cell-failed'))
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        await recoverFromVersionConflict()
      }
    } finally {
      sheetPersist.endPersist()
    }
  }, [
    applyBatchDirectForSheet,
    buildPendingCellBatches,
    entityEnabled,
    hasPendingCellPersistence,
    hasPendingSnapshotCheckpointForCellFlush,
    persistPendingCellJournal,
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

  const scheduleSnapshotCheckpointFromPersistence = useCallback(() => {
    void enqueueSnapshotCheckpointRef.current?.()
  }, [])

  const schedulePendingCellPersist = useCallback(
    (delayMs = CELL_PERSIST_DEBOUNCE_MS) => {
      if (pendingCellPersistTimeoutRef.current) {
        clearTimeout(pendingCellPersistTimeoutRef.current)
      }
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
    },
    [collaboration]
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
      try {
        await socketPersistChainRef.current.catch(() => {})
        await chainOnOperationQueue(operationQueueRef, () => flushPendingCellChangesRef.current())
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Checkpoint flush failed; aborting checkpoint', error)
        toast.error(sheetT('toast-checkpoint-flush-warning'))
        return null
      }

      // Step 2: grab the live Univer snapshot and pass it directly to createVersion.
      // univerSnapshots is keyed by sheetId so multi-sheet apps work correctly.
      const liveSnapshot = spreadsheetGridRef.current?.getWorkbookSnapshot?.() ?? null
      const univerSnapshots: Record<string, Record<string, unknown> | null> = {
        [activeSheetId]: liveSnapshot
      }

      return versioning.createCheckpoint(description, { univerSnapshots })
    },
    [activeSheetId, versioning]
  )

  const handleCellsChange = useCallback(
    (
      cells: Array<{
        rowId: string
        columnName: string
        value: unknown
        univerRow?: number
        univerCol?: number
        sheetId?: string
      }>
    ) => {
      if (!canEditWithLock) return
      if (entityEnabled) return
      if (cells.length === 0) return
      const targetSheetId = cells[0]?.sheetId || activeSheetId

      const snapshotClearCells = collectSnapshotClearCoordinates(cells)
      if (snapshotClearCells.length > 0) {
        trackSnapshotCellClears(targetSheetId, snapshotClearCells)
      }

      sheetPersist.markDirty()
      versioning.markAsChanged()
      pendingCellChangesRef.current.push(
        ...cells.map(cell => ({
          ...cell,
          value: normalizeCellValueForBatchPersistence(cell.value),
          sheetId: cell.sheetId || targetSheetId
        }))
      )
      persistPendingCellJournal()
      debugLog('cells queued for http batch', {
        addedCells: cells.length,
        queuedCells: pendingCellChangesRef.current.length
      })

      if (targetSheetId !== activeSheetId) {
        schedulePendingCellPersist(
          collaboration.isCollaborationConnected && collaboration.headerParticipants.length > 1
            ? CELL_PERSIST_COLLAB_DEBOUNCE_MS
            : CELL_PERSIST_DEBOUNCE_MS
        )
        return
      }

      const current = localSheetDataRef.current
      const updatesByUiRowId = new Map<string, Record<string, unknown>>()
      for (const cell of cells) {
        const uiRowId = String(cell.rowId)
        const uiUpdates = updatesByUiRowId.get(uiRowId) ?? {}
        uiUpdates[cell.columnName] = normalizeCellValueForBatchPersistence(cell.value)
        updatesByUiRowId.set(uiRowId, uiUpdates)
      }

      let mutatedAnyRow = false
      const next = current.map(row => {
        const updates = collectViewerRowUpdates(row, updatesByUiRowId)
        if (!updates) return row
        mutatedAnyRow = true
        return {
          ...applyColumnUpdatesToViewerRow(row, updates, activeSheet.columns),
          _updatedAt: new Date().toISOString()
        }
      })
      // Only publish a new localSheetData when an existing row actually
      // changed. When every incoming cell targets a brand-new row
      // (clientRowId that doesn't exist in `current` yet — typical for the
      // first edit on a fresh sheet or a drag-fill that extends the data
      // range), `next` is a shallow-cloned array containing the exact same
      // row objects as `current` and publishing it is just churn.
      //
      // Use `syncGrid: false`: this is a LOCAL origin commit (the user just
      // typed/dragged/pasted, Univer already rendered the new value from
      // that direct interaction, and `handleDetectedCellMutation` already
      // wrote the post-edit signatures into `lastSyncedGridCellSignaturesRef`).
      // Bumping `authoritativeDataSyncToken` here would trigger the re-apply
      // effect in `UniverSheetGrid`, which would then try to diff the new
      // `data` against the signature baseline — any subtle mismatch between
      // the baseline that `handleDetectedCellMutation` seeded and the row
      // values that `collectViewerRowUpdates` writes through
      // `applyColumnUpdatesToViewerRow` (different column-key casing, the
      // `_updatedAt` stamp changing the row reference, backend value
      // normalization on round-trip) surfaces as `applyRemoteCellUpdate`
      // calls and the whole-grid blink users see on edits after a tab
      // switch. Univer doesn't need us to re-push these values; keep the
      // React state in sync for persistence/other-views consumers but leave
      // the grid alone.
      if (mutatedAnyRow) {
        commitLocalSheetData(next, { syncGrid: false })
      }
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
      collaboration.isCollaborationConnected,
      collaboration.headerParticipants.length,
      entityEnabled,
      localSheetDataRef,
      onDataChange,
      CELL_PERSIST_DEBOUNCE_MS,
      CELL_PERSIST_COLLAB_DEBOUNCE_MS,
      persistPendingCellJournal,
      schedulePendingCellPersist,
      setLocalSheetData,
      sheetPersist.markDirty,
      trackSnapshotCellClears,
      versioning.markAsChanged
    ]
  )

  const handleCellChange = useCallback(
    (rowId: string, columnName: string, value: unknown, sheetId?: string) => {
      handleCellsChange([{ rowId, columnName, value, sheetId }])
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
        value: normalizeCellValueForBatchPersistence(value)
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
      const { createdRows, flushCells, persistedIdByClientRowId } = buildCreatedRowsFromBatch(
        rowPayloads,
        returnedRows,
        pendingClientRowUpdatesRef.current
      )
      updateLocalRowsAfterCreate(createdRows)
      pendingCellChangesRef.current = reconcileQueuedDraftCellsForCreatedRows(
        pendingCellChangesRef.current,
        createdRows as ViewerRow[],
        persistedIdByClientRowId
      )
      persistPendingCellJournal()
      collaborationManagerRef.current?.tryFlushDeferredCellEmits()

      if (flushCells.length === 0) return

      const flushOp: SpreadsheetBatchOperation = {
        operationId: createOperationId('set_range'),
        type: 'set_range',
        data: {
          cells: flushCells.map(cell => ({
            ...cell,
            value: normalizeCellValueForBatchPersistence(cell.value)
          }))
        }
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
      const persistedId =
        ((saved as Record<string, unknown> | null) &&
          resolveBackendRowIdForViewerRow((saved as Record<string, unknown>) ?? {}, isUuid)) ||
        ''
      const pending = singleClientRowId ? pendingClientRowUpdatesRef.current.get(singleClientRowId) : undefined
      if (singleClientRowId && pending) {
        pendingClientRowUpdatesRef.current.delete(singleClientRowId)
      }
      const mergedPayload = pending ? { ...singlePayload, ...pending } : singlePayload
      const createdRows: Record<string, unknown>[] = [{ ...mergedPayload, ...(saved || {}) }]
      updateLocalRowsAfterCreate(createdRows)
      if (singleClientRowId && persistedId) {
        collaborationManagerRef.current?.tryFlushDeferredCellEmits()
      }

      // If we had pending pasted cell updates for this just-created row, persist them now.
      if (pending && persistedId) {
        await flushPendingCellsForPersistedRow(persistedId, pending)
      }

      if (!onRowAdd) {
        const sheet = await SpreadsheetApiService.getSheet(app.id, activeSheetId)
        if (sheet?.version != null) sheetVersionRef.current = Number(sheet.version)
      }
    },
    [activeSheetId, app.id, flushPendingCellsForPersistedRow, isUuid, onRowAdd]
  )

  const processUniverDataChange = useCallback(async () => {
    const latest = latestUniverDataRef.current
    // Refs: debounced work and the op queue often run a stale processUniverDataChange closure
    // (e.g. lock still false when scheduled, true when run) — reading latest flags avoids stuck "Unsaved".
    if (!latest || entityEnabledRef.current || !canEditWithLockRef.current) return
    if (latest.sheetId !== activeSheetIdRef.current) return

    const newData = latest.data

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
      const next = replaceClientRowsWithCreatedRows(prev, createdRows)
      lastProcessedLengthRef.current = newData.length
      // LOCAL-origin commit: the rows were just typed/dragged/pasted in by
      // the user, so Univer already renders the correct values. The only
      // thing changing here is the React-side row identity (clientRowId →
      // backend row id) which Univer does not care about — it addresses
      // cells by (row, column) indices. Bumping `authoritativeDataSyncToken`
      // would trigger the grid re-apply effect and surface as the
      // whole-grid blink after drag-fill on sheets other than the first one.
      commitLocalSheetData(next, { syncGrid: false })
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

  const handleUniverDataChange = useCallback(
    (newData: Record<string, unknown>[], sourceSheetId?: string) => {
      const effectiveSheetId = sourceSheetId || activeSheetIdRef.current
      latestUniverDataRef.current = { data: newData, sheetId: effectiveSheetId }
      if (effectiveSheetId !== activeSheetIdRef.current) {
        return
      }
      const hasAddedRows = newData.length > lastProcessedLengthRef.current
      if (hasAddedRows && univerDataChangeTimeoutRef.current) {
        clearTimeout(univerDataChangeTimeoutRef.current)
        univerDataChangeTimeoutRef.current = null
      }
      scheduleCoalescedTimeout(univerDataChangeTimeoutRef, hasAddedRows ? 0 : UNIVER_DATA_CHANGE_DEBOUNCE_MS, () => {
        univerDataChangeTimeoutRef.current = null
        void chainOnOperationQueue(operationQueueRef, () => processUniverDataChangeRef.current())
      })
    },
    [UNIVER_DATA_CHANGE_DEBOUNCE_MS]
  )

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
      // Runs synchronously for the localStorage part so a racing tab teardown still has a cache hit on reload.
      cacheLiveUniverSnapshotRef.current()
      await processUniverDataChangeRef.current()
      await flushPendingCellChangesRef.current()
      // Row batches were flushing here, but the Univer workbook snapshot (styles, fills, etc.)
      // only ran on a separate debounced path — tabs closed during "Not saved" never persisted
      // formatting to the API, so reopen loaded row values without cell `s` refs / styles map.
      if (entityEnabledRef.current || !canEditWithLockRef.current) return
      const sheetId = activeSheetIdRef.current
      if (!sheetId) return
      try {
        sheetPersist.beginPersist()
        try {
          await persistSnapshotCheckpointForSheetRef.current(sheetId)
        } finally {
          sheetPersist.endPersist()
        }
      } catch (err) {
        console.warn('[SpreadsheetAppViewer] Best-effort Univer snapshot on tab hide/flush failed:', err)
      }
    }

    void chainOnOperationQueue(operationQueueRef, run).catch(err => {
      console.error('[SpreadsheetAppViewer] Flush on visibility/pagehide failed:', err)
      sheetPersist.recordError(sheetT('persist-cell-failed'))
    })
  }, [entityEnabled, sheetPersist.beginPersist, sheetPersist.endPersist, sheetPersist.recordError, sheetT])

  useEffect(() => {
    if (entityEnabled || typeof globalThis === 'undefined') return
    if (pendingCellJournalRestoredKeyRef.current === pendingCellJournalStorageKey) return
    pendingCellJournalRestoredKeyRef.current = pendingCellJournalStorageKey

    const journal = readPendingCellJournal(pendingCellJournalStorageKey)
    if (!journal) return

    pendingCellChangesRef.current = journal.draftCells
    pendingCellBatchesRef.current = journal.pendingBatches
    persistPendingCellJournal()

    if (journal.draftCells.length > 0 || journal.pendingBatches.length > 0) {
      flushPendingPersistenceNow()
    }
  }, [entityEnabled, flushPendingPersistenceNow, pendingCellJournalStorageKey, persistPendingCellJournal])

  /**
   * Returns true when any persistence work is still in flight. Mirrors exactly the predicates used by
   * the `beforeunload` handler so the SPA-navigation guard (Back button, Hub home, etc.) and the page
   * reload/close guard stay consistent.
   */
  const hasUnpersistedWork = useCallback((): boolean => {
    if (entityEnabledRef.current || !canEditWithLockRef.current) return false
    const matchesHeaderUnsaved =
      leaveGuardVersioningUnsavedRef.current ||
      leaveGuardSheetDirtyRef.current ||
      Boolean(leaveGuardSheetErrorRef.current) ||
      leaveGuardSheetSavingRef.current
    const hasPendingCells = pendingCellChangesRef.current.length > 0
    const hasPendingDebounce = pendingCellPersistTimeoutRef.current != null
    const hasPendingUniverChange = univerDataChangeTimeoutRef.current != null
    const hasPendingSnapshotWork =
      workbookSnapshotThrottlePendingRef.current ||
      pendingSnapshotCheckpointBySheetRef.current.size > 0 ||
      snapshotCheckpointDrainScheduledRef.current
    return (
      matchesHeaderUnsaved || hasPendingCells || hasPendingDebounce || hasPendingUniverChange || hasPendingSnapshotWork
    )
  }, [])

  /**
   * Shows a synchronous confirm dialog when there is unsaved work. Returns true if the caller may
   * proceed with navigation, false if the user cancelled. Wraps SPA navigation callbacks (Back, Hub
   * home) so in-app navigation honors the same unsaved-changes guarantee as `beforeunload` page reload.
   */
  const confirmLeaveIfUnsaved = useCallback((): boolean => {
    if (!hasUnpersistedWork()) return true
    // Nudge any queued work out the door before asking, so a fast server may finish while the dialog is up.
    try {
      flushPendingPersistenceNow()
    } catch {
      // Non-fatal: the prompt still surfaces regardless of flush outcome.
    }
    return globalThis.confirm(sheetT('unsaved-leave-confirm'))
  }, [flushPendingPersistenceNow, hasUnpersistedWork, sheetT])

  const handleGuardedBack = useMemo(() => {
    if (!onBack) return undefined
    return () => {
      if (!confirmLeaveIfUnsaved()) return
      onBack()
    }
  }, [confirmLeaveIfUnsaved, onBack])

  const handleGuardedNavigateToSpreadsheetHub = useMemo(() => {
    if (!onNavigateToSpreadsheetHub) return undefined
    return () => {
      if (!confirmLeaveIfUnsaved()) return
      onNavigateToSpreadsheetHub()
    }
  }, [confirmLeaveIfUnsaved, onNavigateToSpreadsheetHub])

  /**
   * Platform-level SPA navigation (sidebar menu, internal links, host router) can leave the sheet
   * without firing `beforeunload`. We intercept every realistic choke-point so unsaved style /
   * snapshot / cell work is not dropped silently:
   *   - `window.nwNavigate` (host helper) and a Proxy-like setter trap so a late host reassignment
   *     does not overwrite our wrapper.
   *   - `history.pushState` / `history.replaceState` (any SPA router: React Router, host router, our
   *     own `navigateTo`). We compare old vs new path so internal URL updates for the same sheet
   *     (e.g. appId / sheetId query params) still work without prompting.
   *   - Capture-phase click on `<a>` elements with cross-path hrefs, for plain anchor navigation.
   *   - `popstate` for browser back/forward — we restore the previous URL on cancel.
   */
  useEffect(() => {
    if (typeof globalThis === 'undefined' || typeof window === 'undefined') return

    const toPathAndSearch = (href: string): string => {
      try {
        const u = new URL(href, window.location.origin)
        return `${u.pathname}${u.search}${u.hash}`
      } catch {
        return href
      }
    }
    const samePath = (a: string, b: string): boolean => {
      try {
        const ua = new URL(a, window.location.origin)
        const ub = new URL(b, window.location.origin)
        // Same sheet context = same pathname AND same appId/sheetId query (other params like
        // `section` are intentionally ignored so section toggles do not trigger the prompt).
        const aAppId = ua.searchParams.get('appId')
        const bAppId = ub.searchParams.get('appId')
        const aSheetId = ua.searchParams.get('sheetId')
        const bSheetId = ub.searchParams.get('sheetId')
        return ua.pathname === ub.pathname && aAppId === bAppId && aSheetId === bSheetId
      } catch {
        return a === b
      }
    }

    let lastKnownUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`

    // --- nwNavigate wrapper with setter trap (host may reassign after we mount) ---
    type NwNavigateFn = (path: string, options?: { replace?: boolean; scroll?: boolean }) => void
    const w = window as unknown as { nwNavigate?: NwNavigateFn }
    let realNwNavigate: NwNavigateFn | undefined = typeof w.nwNavigate === 'function' ? w.nwNavigate : undefined
    const guardedNwNavigate: NwNavigateFn = (path, options) => {
      if (!samePath(path, lastKnownUrl) && !confirmLeaveIfUnsaved()) return
      lastKnownUrl = toPathAndSearch(path)
      realNwNavigate?.(path, options)
    }
    try {
      Object.defineProperty(window, 'nwNavigate', {
        configurable: true,
        get: () => guardedNwNavigate,
        set: (next: NwNavigateFn) => {
          realNwNavigate = typeof next === 'function' ? next : undefined
        }
      })
    } catch {
      w.nwNavigate = guardedNwNavigate
    }

    // --- history.pushState / replaceState patching (covers React Router + any SPA router) ---
    const originalPushState = window.history.pushState.bind(window.history)
    const originalReplaceState = window.history.replaceState.bind(window.history)
    const patchedPushState: typeof window.history.pushState = (data, unused, url) => {
      if (url != null) {
        const target = typeof url === 'string' ? url : url.toString()
        if (!samePath(target, lastKnownUrl)) {
          if (!confirmLeaveIfUnsaved()) return
          lastKnownUrl = toPathAndSearch(target)
        }
      }
      return originalPushState(data, unused, url as string | URL | null | undefined)
    }
    const patchedReplaceState: typeof window.history.replaceState = (data, unused, url) => {
      if (url != null) {
        const target = typeof url === 'string' ? url : url.toString()
        if (!samePath(target, lastKnownUrl)) {
          if (!confirmLeaveIfUnsaved()) return
          lastKnownUrl = toPathAndSearch(target)
        }
      }
      return originalReplaceState(data, unused, url as string | URL | null | undefined)
    }
    window.history.pushState = patchedPushState
    window.history.replaceState = patchedReplaceState

    // --- Capture-phase link click interception (plain `<a href>` menu items) ---
    const handleDocumentClickCapture = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target as Element | null
      if (!target) return
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      try {
        const resolved = new URL(href, window.location.origin)
        if (resolved.origin !== window.location.origin) return
        const targetPath = `${resolved.pathname}${resolved.search}${resolved.hash}`
        if (samePath(targetPath, lastKnownUrl)) return
        if (!confirmLeaveIfUnsaved()) {
          event.preventDefault()
          event.stopPropagation()
        }
      } catch {
        // Malformed href — let the default handler deal with it.
      }
    }
    document.addEventListener('click', handleDocumentClickCapture, true)

    // --- popstate (back/forward) — undo the pop on cancel ---
    const handlePopState = () => {
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (samePath(currentUrl, lastKnownUrl)) {
        lastKnownUrl = currentUrl
        return
      }
      if (!hasUnpersistedWork()) {
        lastKnownUrl = currentUrl
        return
      }
      try {
        flushPendingPersistenceNow()
      } catch {
        // Non-fatal: still show prompt.
      }
      const proceed = globalThis.confirm(sheetT('unsaved-leave-confirm'))
      if (proceed) {
        lastKnownUrl = currentUrl
        return
      }
      originalPushState(null, '', lastKnownUrl)
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('click', handleDocumentClickCapture, true)
      if (window.history.pushState === patchedPushState) window.history.pushState = originalPushState
      if (window.history.replaceState === patchedReplaceState) window.history.replaceState = originalReplaceState
      try {
        Object.defineProperty(window, 'nwNavigate', {
          configurable: true,
          writable: true,
          value: realNwNavigate
        })
      } catch {
        w.nwNavigate = realNwNavigate
      }
    }
  }, [confirmLeaveIfUnsaved, flushPendingPersistenceNow, hasUnpersistedWork, sheetT])

  useEffect(() => {
    if (typeof globalThis === 'undefined' || typeof document === 'undefined') return

    let resumeFlushTimeout: ReturnType<typeof setTimeout> | null = null
    const scheduleResumeFlush = () => {
      if (resumeFlushTimeout) clearTimeout(resumeFlushTimeout)
      resumeFlushTimeout = setTimeout(() => {
        resumeFlushTimeout = null
        flushPendingPersistenceNow()
      }, 300)
    }

    const handlePageHide = () => {
      unloadKeepAlivePersistRef.current = true
      cacheLiveUniverSnapshotRef.current()
      flushPendingPersistenceNow()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        unloadKeepAlivePersistRef.current = true
        cacheLiveUniverSnapshotRef.current()
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
        if (collaborationHealthRef.current !== 'connected') {
          scheduleSheetVersionRefreshFromApiRef.current()
        }
        // Brief defer so tab-focus and persistence flush do not race the same tick.
        scheduleResumeFlush()
      }
    }
    const handleWindowFocus = () => {
      unloadKeepAlivePersistRef.current = false
      scheduleResumeFlush()
    }
    const handleOnline = () => {
      unloadKeepAlivePersistRef.current = false
      scheduleResumeFlush()
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (entityEnabledRef.current || !canEditWithLockRef.current) return
      // Style-only / snapshot-throttled edits often match the header “unsaved” pill but never hit the cell queue.
      cacheLiveUniverSnapshotRef.current()
      const matchesHeaderUnsaved =
        leaveGuardVersioningUnsavedRef.current ||
        leaveGuardSheetDirtyRef.current ||
        Boolean(leaveGuardSheetErrorRef.current) ||
        leaveGuardSheetSavingRef.current
      const hasPendingCells = pendingCellChangesRef.current.length > 0
      const hasPendingDebounce = pendingCellPersistTimeoutRef.current != null
      const hasPendingUniverChange = univerDataChangeTimeoutRef.current != null
      const hasPendingSnapshotWork =
        workbookSnapshotThrottlePendingRef.current ||
        pendingSnapshotCheckpointBySheetRef.current.size > 0 ||
        snapshotCheckpointDrainScheduledRef.current
      const shouldPrompt =
        matchesHeaderUnsaved ||
        hasPendingCells ||
        hasPendingDebounce ||
        hasPendingUniverChange ||
        hasPendingSnapshotWork
      if (shouldPrompt) {
        unloadKeepAlivePersistRef.current = true
        flushPendingPersistenceNow()
        e.preventDefault()
        e.returnValue = ''
      }
    }

    globalThis.addEventListener('pagehide', handlePageHide)
    globalThis.addEventListener('focus', handleWindowFocus)
    globalThis.addEventListener('online', handleOnline)
    globalThis.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      unloadKeepAlivePersistRef.current = false
      if (resumeFlushTimeout) clearTimeout(resumeFlushTimeout)
      globalThis.removeEventListener('pagehide', handlePageHide)
      globalThis.removeEventListener('focus', handleWindowFocus)
      globalThis.removeEventListener('online', handleOnline)
      globalThis.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [flushPendingPersistenceNow])

  useEffect(() => {
    if (!collaboration.isCollaborationConnected || !hasPendingCellPersistence()) return
    const timeout = globalThis.setTimeout(() => {
      flushPendingPersistenceNow()
    }, 150)
    return () => clearTimeout(timeout)
  }, [collaboration.isCollaborationConnected, flushPendingPersistenceNow, hasPendingCellPersistence])

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
      commitLocalSheetData(next, { syncGrid: true })
      setEditingRow(null)

      sheetPersist.beginPersist()
      try {
        const updatedRow = onRowUpdate
          ? await onRowUpdate(app.id, activeSheetId, rowId, values)
          : await SpreadsheetApiService.updateRow(app.id, activeSheetId, rowId, values)
        const updatedSheetVersion =
          (updatedRow as Record<string, unknown> | null)?.sheetVersion != null
            ? Number((updatedRow as Record<string, unknown>).sheetVersion)
            : undefined
        if (updatedSheetVersion != null && Number.isFinite(updatedSheetVersion)) {
          sheetVersionRef.current = Math.max(sheetVersionRef.current, updatedSheetVersion)
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
      const prev = localSheetDataRef.current
      const deletedRow = prev.find(r => viewerRowId(r) === String(rowId))
      const backendRowId = deletedRow ? resolveBackendRowIdForViewerRow(deletedRow as ViewerRow, isUuid) : undefined
      const next = prev.filter(r => viewerRowId(r) !== String(rowId))
      commitLocalSheetData(next, { syncGrid: true })
      sheetPersist.beginPersist()
      try {
        if (backendRowId) {
          if (isOpsV2Enabled) {
            await applyBatchDirectForSheet(
              activeSheetId,
              [
                {
                  operationId: createOperationId('delete_rows'),
                  type: 'delete_rows',
                  data: { rowIds: [backendRowId] }
                }
              ],
              'delete_row'
            )
          } else {
            await SpreadsheetApiService.deleteRow(app.id, activeSheetId, backendRowId)
          }
        }
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
      applyBatchDirectForSheet,
      canEditWithLock,
      createOperationId,
      isOpsV2Enabled,
      isUuid,
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

  /** When saving bulk collection automations, sync form field titles onto sheet column labels (wizard awaits this before onSave). */
  const onBulkCollectionColumnLabelsUpdate = useCallback(
    async (updates: Array<{ columnId: string; newLabel: string }>) => {
      if (!canEditWithLock || updates.length === 0) return
      const byId = new Map(updates.map(u => [u.columnId, u.newLabel]))
      const nextColumns = activeSheet.columns.map(col => {
        const label = byId.get(col.id)
        if (label === undefined) return col
        return { ...col, label }
      })
      // Await so column PATCH finishes before the next sheet PATCH (automations); otherwise the second response can overwrite new labels with stale columns.
      if (onSheetUpdate) {
        await onSheetUpdate(app.id, activeSheetId, { columns: nextColumns })
        return
      }
      if (onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheetId ? { ...sheet, columns: nextColumns, data: localSheetDataRef.current } : sheet
        )
        await Promise.resolve(onAppUpdate({ ...app, sheets: updatedSheets }) as unknown as Promise<unknown>)
      }
    },
    [activeSheet.columns, activeSheetId, app, app.id, canEditWithLock, localSheetDataRef, onAppUpdate, onSheetUpdate]
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
        (app.name || activeSheet.name || 'spreadsheet').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'spreadsheet'
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
        commitLocalSheetData(next, { syncGrid: true })
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
          return {
            rowId,
            columnName,
            value: normalizeCellValueForBatchPersistence({ f: normalizedFormula })
          }
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

  // Multi-sheet context resolver: when Univer reports a mutation on a sheet
  // other than the active-in-React one, the grid asks us for that sheet's
  // columns + current rows so it can build a correct rowIndex→rowId mapping
  // and emit the delta targeted at the right backend sheet. Live edits from
  // peer tabs live in `peerSheetDataCacheRef`; the active sheet uses the live
  // React `localSheetDataRef`.
  const resolveSheetContextForGrid = useCallback(
    (sheetId: string): { columns: SpreadsheetColumn[]; data: Record<string, unknown>[] } | null => {
      const targetSheet = app.sheets.find(s => s.id === sheetId)
      if (!targetSheet) return null
      const rows =
        sheetId === activeSheetIdRef.current
          ? localSheetDataRef.current
          : (peerSheetDataCacheRef.current.get(sheetId) ??
            (sortSpreadsheetRowsBySheetSettings(targetSheet.data ?? [], targetSheet) as Record<string, unknown>[]))
      return {
        columns: targetSheet.columns,
        data: rows as Record<string, unknown>[]
      }
    },
    [app.sheets]
  )

  // Univer fired its native InsertSheetMutation after the user clicked "+" in the
  // sheet-bar. Persist a real backend sheet with the same id so cell edits / the
  // /operations/batch pipeline / snapshots on this worksheet have a home.
  //
  // We also:
  //   1. Optimistically pre-seed the new sheet into `app.sheets` via `onAppUpdate`
  //      so `useSpreadsheetViewerState` can resolve it immediately. `addSheet` in
  //      useSpreadsheetApps detects the pre-seeded entry and replaces it (not
  //      appends) with the backend-confirmed sheet once `POST /sheets` returns.
  //   2. Flip `activeSheetId` to the new sheet so React's state matches Univer's
  //      native auto-selection and the UniverSheetGrid sync effect doesn't kick
  //      the user back to the old tab while the POST is in flight.
  const handleUniverSheetInserted = useCallback(
    (payload: { sheetId: string; sheetName: string; index: number }) => {
      if (!onSheetAdd) return
      const already = app.sheets.some(s => s.id === payload.sheetId)
      if (already) return

      const templateColumns = activeSheet.columns.map(col => ({ ...col }))
      if (onAppUpdate) {
        const placeholderSheet: SpreadsheetSheet = {
          id: payload.sheetId,
          name: payload.sheetName,
          viewType: activeSheet.viewType,
          columns: templateColumns,
          views: [],
          data: [],
          settings: { ...(activeSheet.settings ?? {}) }
        }
        onAppUpdate({ ...app, sheets: [...app.sheets, placeholderSheet] })
      }
      setActiveSheetId(payload.sheetId)

      void onSheetAdd(app.id, {
        id: payload.sheetId,
        name: payload.sheetName,
        columns: templateColumns
      })
    },
    [onSheetAdd, onAppUpdate, app, activeSheet.columns, activeSheet.viewType, activeSheet.settings, setActiveSheetId]
  )

  const handleUniverSheetRemoved = useCallback(
    (payload: { sheetId: string }) => {
      if (!onSheetDelete) return
      // Keep at least one sheet locally; Univer guards this too but be defensive.
      if (app.sheets.length <= 1) return
      void onSheetDelete(app.id, payload.sheetId)
    },
    [onSheetDelete, app.id, app.sheets.length]
  )

  const handleUniverSheetRenamed = useCallback(
    (payload: { sheetId: string; sheetName: string }) => {
      if (!onSheetUpdate) return
      const current = app.sheets.find(s => s.id === payload.sheetId)
      if (!current || current.name === payload.sheetName) return
      void onSheetUpdate(app.id, payload.sheetId, { name: payload.sheetName })
    },
    [onSheetUpdate, app.id, app.sheets]
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
          onUniverSheetInserted={handleUniverSheetInserted}
          onUniverSheetRemoved={handleUniverSheetRemoved}
          onUniverSheetRenamed={handleUniverSheetRenamed}
          getSheetContext={resolveSheetContextForGrid}
          columns={[]}
          spreadsheetColumns={spreadsheetColumnsForGrid}
          testId={`${testId}-table-view`}
          onCellChange={handleCellChange}
          onCellsChange={handleCellsChange}
          onSnapshotRequested={enqueueUniverSnapshotCheckpoint}
          onWorkbookSnapshotLifecycle={handleWorkbookSnapshotLifecycle}
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
    handleWorkbookSnapshotLifecycle,
    handleOpenCommentRequest,
    commentedCells,
    handleUniverDataChange,
    handleUniverActiveWorksheetChange,
    handleUniverSheetInserted,
    handleUniverSheetRemoved,
    handleUniverSheetRenamed,
    resolveSheetContextForGrid,
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
    <div className="gba:flex gba:flex-col gba:w-full gba:h-full gba:min-h-0 gba:overflow-hidden" data-testid={testId}>
      <SpreadsheetHeader
        app={app}
        activeSheet={activeSheet}
        onBack={handleGuardedBack}
        onNavigateToSpreadsheetHub={handleGuardedNavigateToSpreadsheetHub}
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
        showCheckCollectionResponses={hasEnabledSheetCollectionAutomation}
        onCheckCollectionResponses={handleCheckCollectionResponses}
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
        onRefreshAutomations={() => void automations.refreshAutomationsFromDocumentService()}
        onCheckCollectionResponses={handleCheckCollectionResponses}
        onColumnLabelsUpdate={onBulkCollectionColumnLabelsUpdate}
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

      {collaboration.collaborationHealth === 'failed' && (
        <div
          className="gba:fixed gba:top-0 gba:left-0 gba:right-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:bg-red-600 gba:px-4 gba:py-2 gba:text-sm gba:font-medium gba:text-white"
          data-testid={`${testId}-collab-health-banner`}
        >
          <span>Collaboration connection lost. Changes may not sync until you reload.</span>
        </div>
      )}

      {isSpreadsheetAppsDebugEnabled() && (
        <div
          className="gba:fixed gba:bottom-0 gba:left-0 gba:right-0 gba:z-50 gba:flex gba:flex-col gba:gap-0 gba:bg-zinc-900 gba:px-3 gba:py-1 gba:text-[11px] gba:font-mono gba:text-zinc-300"
          data-testid={`${testId}-snapshot-debug-bar`}
        >
          <div className="gba:flex gba:items-center gba:gap-4">
            <span className="gba:font-semibold gba:text-amber-400">Snapshot</span>
            <span>
              OK: <span className="gba:text-emerald-400">{snapshotDebugInfo.successCount}</span>
            </span>
            <span>
              FAIL:{' '}
              <span className={snapshotDebugInfo.failCount > 0 ? 'gba:text-red-400' : 'gba:text-zinc-500'}>
                {snapshotDebugInfo.failCount}
              </span>
            </span>
            <span>
              Last OK:{' '}
              {snapshotDebugInfo.lastSuccessAt ? new Date(snapshotDebugInfo.lastSuccessAt).toLocaleTimeString() : '—'}
            </span>
            <span>
              Last FAIL:{' '}
              {snapshotDebugInfo.lastFailAt ? new Date(snapshotDebugInfo.lastFailAt).toLocaleTimeString() : '—'}
            </span>
            <span className="gba:text-zinc-600">|</span>
            <span>Conflicts: {snapshotSaveMetricsRef.current.conflicts}</span>
            <span>Attempts: {snapshotSaveMetricsRef.current.attempts}</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-4">
            <span className="gba:font-semibold gba:text-blue-400">Socket.IO</span>
            <span>
              Status:{' '}
              <span
                className={
                  collaboration.collaborationHealth === 'connected'
                    ? 'gba:text-emerald-400'
                    : collaboration.collaborationHealth === 'failed'
                      ? 'gba:text-red-400'
                      : 'gba:text-yellow-400'
                }
              >
                {collaboration.collaborationHealth === 'connected'
                  ? 'Connected'
                  : collaboration.collaborationHealth === 'failed'
                    ? 'Failed'
                    : 'Reconnecting'}
              </span>
            </span>
            <span>Transport: {socketDebugInfo.transport || '—'}</span>
            <span>ID: {socketDebugInfo.socketId || '—'}</span>
            <span className="gba:text-zinc-600">|</span>
            <span>
              Connects: <span className="gba:text-emerald-400">{socketDebugInfo.connectCount}</span>
            </span>
            <span>
              Disconnects:{' '}
              <span className={socketDebugInfo.disconnectCount > 0 ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
                {socketDebugInfo.disconnectCount}
              </span>
            </span>
            <span>
              Reconnects:{' '}
              <span className={socketDebugInfo.reconnectCount > 0 ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
                {socketDebugInfo.reconnectCount}
              </span>
            </span>
            <span>
              Errors:{' '}
              <span className={socketDebugInfo.connectErrorCount > 0 ? 'gba:text-red-400' : 'gba:text-zinc-500'}>
                {socketDebugInfo.connectErrorCount}
              </span>
            </span>
            {socketDebugInfo.lastDisconnectReason && <span>Last DC: {socketDebugInfo.lastDisconnectReason}</span>}
          </div>
          <div className="gba:flex gba:items-center gba:gap-4">
            <span className="gba:font-semibold gba:text-purple-400">Persist</span>
            <span>
              Saving:{' '}
              <span className={sheetPersist.isSaving ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
                {sheetPersist.isSaving ? 'Yes' : 'No'}
              </span>
            </span>
            <span>
              Dirty:{' '}
              <span className={sheetPersist.hasLocalDirty ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
                {sheetPersist.hasLocalDirty ? 'Yes' : 'No'}
              </span>
            </span>
            <span>
              Last Save:{' '}
              {sheetPersist.lastPersistedAt ? new Date(sheetPersist.lastPersistedAt).toLocaleTimeString() : '—'}
            </span>
            {sheetPersist.error && <span className="gba:text-red-400">Err: {sheetPersist.error}</span>}
            <span className="gba:text-zinc-600">|</span>
            <span className="gba:font-semibold gba:text-teal-400">Version</span>
            <span>
              Saving:{' '}
              <span className={versioning.isSaving ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
                {versioning.isSaving ? 'Yes' : 'No'}
              </span>
            </span>
            <span>
              Unsaved:{' '}
              <span className={versioning.hasUnsavedChanges ? 'gba:text-yellow-400' : 'gba:text-zinc-500'}>
                {versioning.hasUnsavedChanges ? 'Yes' : 'No'}
              </span>
            </span>
            <span className="gba:text-zinc-600">|</span>
            <span className="gba:font-semibold gba:text-orange-400">Lock</span>
            <span>
              canEdit:{' '}
              <span className={fileLock.canEdit ? 'gba:text-emerald-400' : 'gba:text-red-400'}>
                {fileLock.canEdit ? 'Yes' : 'No'}
              </span>
            </span>
            <span>Participants: {collaboration.headerParticipants.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
