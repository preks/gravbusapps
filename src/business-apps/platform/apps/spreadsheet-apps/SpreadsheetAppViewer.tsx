/**
 * SpreadsheetAppViewer
 *
 * Runtime viewer for a generated spreadsheet app.
 * Standardized on the top-level `components/`, `hooks/`, `views/` structure (no `viewer/` directory).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { SpreadsheetAppViewerProps, SpreadsheetColumn, SpreadsheetSheet } from './types'
import { columnToFormField } from './types'
import {
  SpreadsheetApiService,
  SpreadsheetApiRequestError,
  type SpreadsheetBatchOperation,
  type SpreadsheetBatchOperationResponse
} from './services/SpreadsheetApiService'

import { useSpreadsheetViewerState } from './hooks/useSpreadsheetViewerState'
import { useSpreadsheetViewerCollaboration } from './hooks/useSpreadsheetViewerCollaboration'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { useSpreadsheetBulkRows } from './hooks/useSpreadsheetBulkRows'
import { useSpreadsheetColumns } from './hooks/useSpreadsheetColumns'

import { useVersioning } from '../shared/hooks/useVersioning'
import { useComments } from '../shared/hooks/useComments'
import { useFileLock } from '../shared/hooks/useFileLock'
import { usePublishing } from '../shared/hooks/usePublishing'

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
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage.getItem('debug:spreadsheet-apps') === '1'
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

type ViewerRow = Record<string, unknown>
type CellChange = { rowId: string; columnName: string; value: unknown }

const SNAPSHOT_FETCH_TIMEOUT_MS = 15000

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const backendRowIdOf = (row: ViewerRow): string =>
  String((row as { _rowUuid?: unknown })._rowUuid || row._id || row.id || '')

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

const applyDeltaChangesToRows = (baseRows: ViewerRow[], changes: unknown[] | undefined): ViewerRow[] => {
  let next = [...baseRows]
  for (const change of changes || []) {
    const changeRecord = change as Record<string, unknown>
    const opType = String(changeRecord.operationType || '')
    const payload = (changeRecord.payload || {}) as Record<string, unknown>
    const result = (changeRecord.result || {}) as Record<string, unknown>

    if (opType === 'set_cell') {
      const rowId = String(payload.rowId || '')
      const columnName = String(payload.columnName || '')
      const value = payload.value
      next = next.map(row => (backendRowIdOf(row) === rowId ? { ...row, [columnName]: value } : row))
      continue
    }

    if (opType === 'set_range') {
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
      next = next.map(row => {
        const updates = updatesByRowId.get(backendRowIdOf(row))
        if (!updates) return row
        return { ...row, ...updates }
      })
      continue
    }

    if (opType === 'clear_cell') {
      const rowId = String(payload.rowId || '')
      const columnName = String(payload.columnName || '')
      next = next.map(row => {
        if (backendRowIdOf(row) !== rowId) return row
        const rowCopy = { ...row }
        delete rowCopy[columnName]
        return rowCopy
      })
      continue
    }

    if (opType === 'add_rows') {
      const rows = Array.isArray(result.rows) ? (result.rows as Array<Record<string, unknown>>) : []
      const mapped = rows.map(entry => {
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
      next = [...next, ...mapped]
      continue
    }

    if (opType === 'delete_rows') {
      const rowIds = Array.isArray(payload.rowIds) ? (payload.rowIds as Array<unknown>).map(String) : []
      next = next.filter(row => !rowIds.includes(backendRowIdOf(row)))
    }
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
    const uiRowId = String(row._id ?? row.id ?? '')
    if (!uiRowId) return
    const backendCandidate = String((row as { _rowUuid?: unknown })._rowUuid || '')
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
    const clientRowId = String((row as { _id?: unknown })._id || '')
    if (clientRowId) payload._clientRowId = clientRowId
    columns.forEach(col => {
      const value = row[col.name]
      if (value !== undefined) payload[col.name] = value
    })
    return payload
  })

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
  const rowUuid = String((row as { _rowUuid?: unknown })._rowUuid || '')
  if (isUuid(rowUuid)) return rowUuid
  const uiId = String(row._id ?? row.id ?? '')
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

  for (const rowKey of Object.keys(cellData)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex) || rowIndex < 0) continue
    const row = currentRows[rowIndex]
    if (!row) continue

    const rowCells = cellData[rowKey]
    if (!rowCells || typeof rowCells !== 'object') continue

    const backendRowId = getValidatedBackendRowId(row, isUuid)
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex) || colIndex < 0) continue
      const columnName = visibleColumns[colIndex]?.name
      if (!columnName) continue

      const nextValue = (rowCells as Record<string, unknown>)[colKey]
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

  return { hasCellData, updatesByRowIndex, reconcileCells }
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
  onEdit,
  isEditing = true,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  type AnalyticsPanelTab = 'charts' | 'insights' | 'summary' | 'pivot'
  type SheetsAITab = 'formula' | 'analyze' | 'chat' | 'review'
  type AICapability = AnalyticsPanelTab | SheetsAITab

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
  const isApplyingRemoteRef = useRef(false)
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
      return typeof window === 'undefined' ? true : window.localStorage.getItem('spreadsheetOpsV2') !== '0'
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

  // --- Entity data source (optional per-sheet) ---
  const {
    state: entityState,
    loadData: loadEntityData,
    refresh: refreshEntityData
  } = useEntityDataSource({ accessToken, userId })
  const entityEnabled = Boolean(activeSheet.entityDataSource?.enabled)

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
  }, [activeSheetId, app.id, onAppUpdate, setLocalSheetData])

  const versioning = useVersioning({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService,
    autoSaveEnabled: true,
    autoSaveInterval: 30000,
    onVersionRestored: handleVersionRestored
  })

  const comments = useComments({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService
  })

  const fileLock = useFileLock({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    currentUserId: userId,
    apiService: SpreadsheetApiService,
    autoRefreshInterval: 1000,
    blockEditingUntilLockResolved: true
  })
  const canEditWithLock = isEditing && !entityEnabled && fileLock.canEdit

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
    saveTimeoutRef
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
    pollInterval: 10000
  })

  const [hasTaskForCollectionCopy, setHasTaskForCollectionCopy] = useState(false)
  const fromCollectionLink =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('excel_collection') === '1'
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
    const retryTimer = window.setTimeout(() => {
      runCheck()
    }, 1500)
    return () => {
      isUnmounted = true
      window.clearTimeout(retryTimer)
    }
  }, [app.id, app.settings, userId, automations.hasExcelCollectionTaskForApp])

  const handleSubmitCollection = useCallback(async () => {
    if (!userId || !automations.completeExcelCollectionTask) return
    const result = await automations.completeExcelCollectionTask(app.id)
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
  }, [app, automations.completeExcelCollectionTask, onAppUpdate, onBack, userId])

  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false)
  const handleOpenAICapability = useCallback((capability: AICapability) => {
    const analyticsTabs = new Set<AnalyticsPanelTab>(['charts', 'pivot', 'insights', 'summary'])
    if (analyticsTabs.has(capability as AnalyticsPanelTab)) {
      setAnalyticsInitialTab(capability as AnalyticsPanelTab)
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
      const incomingVersion = Number(payload.version)
      if (Number.isFinite(incomingVersion) && incomingVersion > sheetVersionRef.current) {
        sheetVersionRef.current = incomingVersion
      }
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
        isApplyingRemoteRef.current = true
        spreadsheetGridRef.current?.applyRemoteCellUpdate(rowIndex, colIndex, d.value)
        setTimeout(() => {
          isApplyingRemoteRef.current = false
        }, 75)
      }
    },
    [activeSheetId, localSheetDataRef, onDataChange, resolveRemoteCellCoordinates, setLocalSheetData]
  )

  const collaboration = useSpreadsheetViewerCollaboration({
    appId: app.id,
    accessToken,
    onOperationReceived: handleCollaborationOperation
  })

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
    emitOperation: op => collaboration.emitOperation(op as any)
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
      const row = localSheetDataRef.current.find(r => String(r._id ?? r.id ?? '') === uiRowId)
      if (!row) return undefined
      const rowUuid = String((row as any)._rowUuid || '')
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
    } catch (error) {
      console.error('[SpreadsheetAppViewer] Failed to recover from version conflict:', error)
    }
  }, [activeSheetId, app.id, localSheetDataRef, onDataChange, setLocalSheetData])

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

      const workbook = snapshot as Record<string, unknown>
      const sheetKey =
        (workbook.sheets as Record<string, unknown> | undefined)?.[activeSheetId] != null
          ? activeSheetId
          : Array.isArray(workbook.sheetOrder)
            ? (workbook.sheetOrder[0] as string | undefined)
            : undefined

      const worksheet =
        (sheetKey && (workbook.sheets as Record<string, unknown> | undefined)?.[sheetKey]) ||
        (workbook.sheets ? Object.values(workbook.sheets as Record<string, unknown>)[0] : undefined)

      const visibleColumns = activeSheet.columns.filter(c => c.isVisible !== false)
      const current = localSheetDataRef.current
      const cellDataFromSnapshot = (worksheet as any)?.cellData as Record<string, Record<string, unknown>> | undefined
      const cellDataFromGrid = spreadsheetGridRef.current?.getVisibleRangeValues?.(
        current.length,
        visibleColumns.length
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
        const nextLocal = current.map((row, idx) => {
          const updates = updatesByRowIndex.get(idx)
          if (!updates) return row
          return { ...row, ...updates, _updatedAt: new Date().toISOString() }
        })
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
          lastPersistedSheetDataRef.current = localSheetDataRef.current
        } else {
          for (const cell of reconcileCells) {
            if (onRowUpdate) {
              await onRowUpdate(app.id, activeSheetId, cell.rowId, { [cell.columnName]: cell.value })
            } else {
              await SpreadsheetApiService.updateRow(app.id, activeSheetId, cell.rowId, {
                [cell.columnName]: cell.value
              })
            }
          }
          lastPersistedSheetDataRef.current = localSheetDataRef.current
        }
      }

      const maxSnapshotRetries = 3
      let lastError: unknown
      for (let attempt = 0; attempt < maxSnapshotRetries; attempt++) {
        try {
          const snapshotToSave =
            attempt === 0 ? snapshot : (spreadsheetGridRef.current?.getWorkbookSnapshot?.() ?? snapshot)
          const cacheResult = writeUniverSnapshotCache(
            app.id,
            activeSheetId,
            Number(sheetVersionRef.current || 0),
            snapshotToSave
          )
          await SpreadsheetApiService.saveUniverSnapshot(app.id, activeSheetId, {
            version: sheetVersionRef.current,
            snapshot: snapshotToSave
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
          // Broadcast dimension sync to collaborators so their grids and cursor overlays stay in sync
          if (collaboration.isCollaborationConnected) {
            try {
              const snap = snapshotToSave as Record<string, unknown>
              const sheetOrder = snap?.sheetOrder as string[] | undefined
              const sheets = snap?.sheets as Record<string, Record<string, unknown>> | undefined
              const firstSheetId = sheetOrder?.[0]
              const sheetSnap = (
                firstSheetId && sheets ? sheets[firstSheetId] : sheets ? Object.values(sheets)[0] : undefined
              ) as Record<string, unknown> | undefined
              if (sheetSnap) {
                const rowHeader = sheetSnap.rowHeader as { width?: number } | undefined
                const columnHeader = sheetSnap.columnHeader as { height?: number } | undefined
                const dimensionPayload: CellDimensionsPayload = {
                  sheetId: activeSheetId,
                  defaultColWidth: (sheetSnap.defaultColumnWidth as number | undefined) ?? 73,
                  defaultRowHeight: (sheetSnap.defaultRowHeight as number | undefined) ?? 23,
                  columnData: (sheetSnap.columnData as Record<string | number, { w?: number }>) ?? {},
                  rowData: (sheetSnap.rowData as Record<string | number, { h?: number }>) ?? {},
                  rowHeaderWidth: rowHeader?.width ?? 48,
                  columnHeaderHeight: columnHeader?.height ?? 28,
                  zoomRatio: (sheetSnap.zoomRatio as number | undefined) ?? 1
                }
                collaboration.emitOperation({
                  type: 'dimension_sync',
                  data: dimensionPayload,
                  broadcastOnly: true
                })
              }
            } catch {
              // Non-fatal
            }
          }
          return
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

    const nextRun = operationQueueRef.current.then(run, run)
    operationQueueRef.current = nextRun.then(
      () => undefined,
      () => undefined
    )
    return nextRun
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
    setLocalSheetData
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
    } catch (error) {
      pendingCellChangesRef.current = [...queuedCells, ...pendingCellChangesRef.current]
      console.error('[SpreadsheetAppViewer] Failed to persist cell changes:', error)
      debugLog('cell-flush failed', {
        flushId,
        queuedCells: queuedCells.length,
        dedupedCells: cellsToPersist.length
      })
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        await recoverFromVersionConflict()
      }
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
    scheduleSnapshotCheckpointFromPersistence
  ])

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
      const nextRun = operationQueueRef.current.then(flushPendingCellChanges, flushPendingCellChanges)
      operationQueueRef.current = nextRun.then(
        () => undefined,
        () => undefined
      )
    }, CELL_PERSIST_DEBOUNCE_MS)
  }, [flushPendingCellChanges, CELL_PERSIST_DEBOUNCE_MS])

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
      await new Promise<void>(resolve => {
        const nextRun = operationQueueRef.current.then(flushPendingCellChanges, flushPendingCellChanges)
        operationQueueRef.current = nextRun.then(
          () => undefined,
          () => undefined
        )
        nextRun.then(
          () => resolve(),
          () => resolve()
        )
      })

      // Step 2: grab the live Univer snapshot and pass it directly to createVersion.
      // univerSnapshots is keyed by sheetId so multi-sheet apps work correctly.
      const liveSnapshot = spreadsheetGridRef.current?.getWorkbookSnapshot?.() ?? null
      const univerSnapshots: Record<string, Record<string, unknown> | null> = {
        [activeSheetId]: liveSnapshot
      }

      return versioning.createCheckpoint(description, { univerSnapshots })
    },
    [activeSheetId, flushPendingCellChanges, versioning]
  )

  const handleCellsChange = useCallback(
    (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => {
      if (!canEditWithLock) return
      if (entityEnabled) return
      if (cells.length === 0) return

      pendingCellChangesRef.current.push(...cells)
      if (!isApplyingRemoteRef.current) {
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
      }
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
        const uiRowId = String(row._id ?? row.id ?? '')
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
      setLocalSheetData
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

  const processUniverDataChange = useCallback(async () => {
    const newData = latestUniverDataRef.current
    if (!newData || entityEnabled || !canEditWithLock) return

    const lastProcessed = lastProcessedLengthRef.current
    if (newData.length <= lastProcessed) return

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

    try {
      if (useBatchAddRows) {
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
        const flushCells: Array<{ rowId: string; columnName: string; value: unknown }> = []
        const createdRows = rowPayloads.map((rowPayload, index) => {
          const persisted = returnedRows[index] || {}
          const persistedId = persisted.id as string | undefined
          const clientRowId = String((rowPayload as any)._clientRowId || '')
          const pending = clientRowId ? pendingClientRowUpdatesRef.current.get(clientRowId) : undefined
          if (clientRowId && pending) {
            pendingClientRowUpdatesRef.current.delete(clientRowId)
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
        updateLocalRowsAfterCreate(createdRows)

        if (flushCells.length > 0) {
          const flushOp: SpreadsheetBatchOperation = {
            operationId: createOperationId('set_range'),
            type: 'set_range',
            data: { cells: flushCells }
          }
          await applyBatchDirect([flushOp], 'set_range_flush')
        }
        return
      }

      const singlePayload = rowPayloads[0]
      const singleClientRowId = String((singlePayload as any)._clientRowId || '')
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
        } else {
          await SpreadsheetApiService.updateRow(app.id, activeSheetId, persistedId, pending)
        }
      }

      if (!onRowAdd) {
        const sheet = await SpreadsheetApiService.getSheet(app.id, activeSheetId)
        if (sheet?.version != null) sheetVersionRef.current = Number(sheet.version)
      }
    } catch (error) {
      console.error('[SpreadsheetAppViewer] Failed to persist added rows:', error)
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        await recoverFromVersionConflict()
      }
    }
  }, [
    activeSheet.columns,
    activeSheetId,
    app.id,
    applyBatchDirect,
    createOperationId,
    canEditWithLock,
    entityEnabled,
    isOpsV2Enabled,
    localSheetDataRef,
    onDataChange,
    onRowAdd,
    recoverFromVersionConflict,
    setLocalSheetData
  ])

  const handleUniverDataChange = useCallback(
    (newData: Record<string, unknown>[]) => {
      latestUniverDataRef.current = newData
      if (univerDataChangeTimeoutRef.current) {
        clearTimeout(univerDataChangeTimeoutRef.current)
      }
      univerDataChangeTimeoutRef.current = setTimeout(() => {
        univerDataChangeTimeoutRef.current = null
        const nextRun = operationQueueRef.current.then(processUniverDataChange, processUniverDataChange)
        operationQueueRef.current = nextRun.then(
          () => undefined,
          () => undefined
        )
      }, UNIVER_DATA_CHANGE_DEBOUNCE_MS)
    },
    [processUniverDataChange]
  )

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
      await processUniverDataChange()
      await flushPendingCellChanges()
      const enqueue = enqueueSnapshotCheckpointRef.current
      if (enqueue) {
        await enqueue()
      }
    }

    const nextRun = operationQueueRef.current.then(run, run)
    operationQueueRef.current = nextRun.then(
      () => undefined,
      () => undefined
    )
    void nextRun.catch(() => undefined)
  }, [entityEnabled, flushPendingCellChanges, processUniverDataChange])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const handlePageHide = () => {
      flushPendingPersistenceNow()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingPersistenceNow()
      }
    }

    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', handlePageHide)
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
      const rowId = String(editingRow._id ?? editingRow.id ?? '')
      if (!rowId) return

      const next = localSheetDataRef.current.map(r => (String(r._id ?? r.id ?? '') === rowId ? { ...r, ...values } : r))
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
      setEditingRow(null)

      try {
        if (onRowUpdate) {
          await onRowUpdate(app.id, activeSheetId, rowId, values)
        } else {
          await SpreadsheetApiService.updateRow(app.id, activeSheetId, rowId, values)
        }
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to update row:', error)
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
      setLocalSheetData
    ]
  )

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      if (!canEditWithLock) return
      const next = localSheetDataRef.current.filter(r => String(r._id ?? r.id ?? '') !== String(rowId))
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
      try {
        await SpreadsheetApiService.deleteRow(app.id, activeSheetId, rowId)
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to delete row:', error)
      }
    },
    [canEditWithLock, activeSheetId, app.id, localSheetDataRef, onDataChange, setLocalSheetData]
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
        toast.error('No matching columns found to insert pivot result.')
        return false
      }

      try {
        const createdRows: Array<Record<string, unknown>> = []
        if (onRowAdd) {
          for (const payload of payloads) {
            const created = await onRowAdd(app.id, activeSheetId, payload)
            if (created) {
              createdRows.push({ ...payload, ...created })
            }
          }
        } else {
          try {
            const created = await SpreadsheetApiService.bulkAddRows(app.id, activeSheetId, payloads)
            createdRows.push(...created)
          } catch (error) {
            if (error instanceof SpreadsheetApiRequestError && (error.status === 404 || error.status === 405)) {
              for (const payload of payloads) {
                const created = await SpreadsheetApiService.addRow(app.id, activeSheetId, payload)
                createdRows.push({ ...payload, ...created })
              }
            } else {
              throw error
            }
          }
        }

        if (createdRows.length === 0) {
          toast.error('No rows were inserted into the sheet.')
          return false
        }

        const next = [...localSheetDataRef.current, ...createdRows]
        setLocalSheetData(next)
        onDataChange?.(activeSheetId, next)
        toast.success(`Inserted ${createdRows.length} analytics row${createdRows.length > 1 ? 's' : ''}.`)
        return true
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to insert analytics rows:', error)
        toast.error('Failed to insert analytics result into sheet.')
        return false
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
      setLocalSheetData
    ]
  )

  const handleApplyFormulaToColumn = useCallback(
    async (columnName: string, formula: string): Promise<boolean> => {
      if (!canEditWithLock) return false
      if (!columnName || !formula) return false
      const normalizedFormula = formula.trim().startsWith('=') ? formula.trim() : `=${formula.trim()}`
      const cells = localSheetDataRef.current
        .map(row => {
          const rowId = String(row._id ?? row.id ?? '')
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
        versioning={{
          isSaving: versioning.isSaving,
          lastSaveTime: versioning.lastSaveTime,
          hasUnsavedChanges: versioning.hasUnsavedChanges
        }}
        onShowCheckpointDialog={() => setShowCheckpointDialog(true)}
        onShowVersionHistory={() => setShowVersionHistory(true)}
        publishingStatus={app.publishMetadata?.status || 'draft'}
        showComments={showComments}
        setShowComments={setShowComments}
        unresolvedCommentCount={comments.unresolvedCount}
        fileLock={{
          lock: fileLock.lock,
          isLockedByMe: fileLock.isLockedByMe,
          acquireLock: fileLock.acquireLock,
          releaseLock: fileLock.releaseLock
        }}
        onShowPublishDialog={() => setShowPublishDialog(true)}
        onOpenAICapability={handleOpenAICapability}
        onAddColumn={() => {
          if (!canEditWithLock) return
          columnsState.handleAddColumn()
        }}
        onManageColumns={() => {
          if (!canEditWithLock) return
          columnsState.setIsManageColumnsDialogOpen(true)
        }}
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
        {viewType === 'table' &&
          (isBootstrapSnapshotLoading ? (
            <div className="gba:flex gba:h-full gba:w-full gba:items-center gba:justify-center">
              <div className="gba:text-sm gba:text-muted-foreground">Loading spreadsheet snapshot...</div>
            </div>
          ) : (
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
          ))}

        {viewType === 'form' && (
          <FormView
            sheet={activeSheet}
            data={sheetData}
            onEdit={row => setEditingRow(row)}
            onDelete={handleDeleteRow}
            canEdit={canEditWithLock}
            testId={`${testId}-form-view`}
          />
        )}

        {viewType === 'dashboard' && (
          <DashboardView sheet={activeSheet} data={sheetData} testId={`${testId}-dashboard-view`} />
        )}

        {viewType === 'kanban' && (
          <KanbanView
            sheet={activeSheet}
            data={sheetData}
            view={activeView!}
            onEdit={row => setEditingRow(row)}
            canEdit={canEditWithLock}
            testId={`${testId}-kanban-view`}
          />
        )}
      </div>

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
