/**
 * SpreadsheetApiService
 *
 * Connects to the spreadsheet-service backend API for spreadsheet app management.
 */

import type {
  SpreadsheetApp,
  SpreadsheetAppSummary,
  SpreadsheetSheet,
  AppStatus,
  Version,
  Comment,
  FileLock,
  PublishMetadata
} from '../types/spreadsheet'
import type {
  CreateCommentInput,
  CommentQueryOptions,
  LockFileInput,
  PublishInput
} from '../../../../../platform/apps/shared/types/versioning'
import {
  getSpreadsheetApiBasePath,
  getSpreadsheetServiceApiUrl
} from '@/business-apps/platform/apps/shared/utils/spreadsheetServiceUrl'
import { normalizeSpreadsheetColumnsForDisplay } from '../utils/normalizeSpreadsheetColumnsForDisplay'
import type { SpreadsheetRowRef } from '../utils/spreadsheetRowIdentity'
import type { SpreadsheetDirtyRegion } from '../utils/spreadsheetDirtyRegions'
import type {
  SpreadsheetTraceEvent,
  SpreadsheetTraceEventInput,
  SpreadsheetTraceFinding,
  SpreadsheetTraceScope,
  SpreadsheetTraceSession
} from './spreadsheetDiagnostics'

const API_URL = getSpreadsheetServiceApiUrl()
const SPREADSHEET_CORE_API_URL = getSpreadsheetServiceApiUrl()

const spreadsheetEndpoint = (suffix = ''): string => `${getSpreadsheetApiBasePath()}${suffix}`

const isSpreadsheetAppsDebugEnabled = (): boolean => {
  try {
    return globalThis.localStorage?.getItem('debug:spreadsheet-apps') === '1'
  } catch {
    return false
  }
}

const debugLog = (...args: unknown[]) => {
  if (isSpreadsheetAppsDebugEnabled()) {
    console.debug('[SpreadsheetApiService]', ...args)
  }
}

export class SpreadsheetApiRequestError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'SpreadsheetApiRequestError'
    this.status = status
    this.details = details
  }
}

const getSpreadsheetBatchErrorPayloadRecord = (details: unknown): Record<string, unknown> | undefined => {
  if (!details || typeof details !== 'object') return undefined
  const record = details as Record<string, unknown>
  if (typeof record.code === 'string' || typeof record.retryable === 'boolean') {
    return record
  }
  if (record.message && typeof record.message === 'object') {
    return getSpreadsheetBatchErrorPayloadRecord(record.message)
  }
  return undefined
}

/** Structured batch error payload from operations/batch failures (Nest exception body). */
export function getSpreadsheetBatchErrorPayload(details: unknown): Record<string, unknown> | undefined {
  return getSpreadsheetBatchErrorPayloadRecord(details)
}

export function getSpreadsheetBatchErrorCode(details: unknown): string | undefined {
  const payload = getSpreadsheetBatchErrorPayload(details)
  const code = payload?.code
  return typeof code === 'string' ? code : undefined
}

export function isSpreadsheetBatchErrorExplicitlyNonRetryable(details: unknown): boolean {
  const payload = getSpreadsheetBatchErrorPayload(details)
  return payload?.retryable === false
}

export function getSpreadsheetBatchRequestedGridRowIndex(details: unknown): number | undefined {
  const payload = getSpreadsheetBatchErrorPayload(details)
  const raw = payload?.requestedGridRowIndex
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw)
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw)
  return undefined
}

/** Server sheet version from operations/batch 409 (Nest ConflictException body). */
export function getSpreadsheetBatchConflictServerVersion(details: unknown): number | undefined {
  if (!details || typeof details !== 'object') return undefined
  const o = details as Record<string, unknown>
  const raw = o.currentVersion
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw)
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw)
  if (o.message && typeof o.message === 'object') {
    return getSpreadsheetBatchConflictServerVersion(o.message)
  }
  return undefined
}

/**
 * Optional external auth token provider.
 * This is required for published screens where the access token may not be in localStorage,
 * but is available via BusinessAppContext / props.
 */
let externalAuthTokenProvider: (() => string | null) | null = null

export function setSpreadsheetApiAuthTokenProvider(provider: (() => string | null) | null) {
  externalAuthTokenProvider = provider
}

// Get auth token - check multiple storage locations
const getAuthToken = (): string | null => {
  try {
    const externalToken = externalAuthTokenProvider?.()
    if (externalToken) return externalToken

    const ideToken = globalThis.localStorage?.getItem('business-app-ide-access-token')
    if (ideToken) return ideToken

    const authData = globalThis.localStorage?.getItem('keycloak-token')
    if (authData) {
      try {
        const parsed = JSON.parse(authData) as { token?: unknown; access_token?: unknown }
        if (parsed && typeof parsed === 'object') {
          const value = parsed.token ?? parsed.access_token
          if (typeof value === 'string') return value
        }
        return authData
      } catch {
        return authData
      }
    }

    const sessionToken = globalThis.sessionStorage?.getItem('auth_token')
    if (sessionToken) return sessionToken

    const windowAuthToken = (globalThis as unknown as { authToken?: string }).authToken
    if (windowAuthToken) return windowAuthToken

    return null
  } catch {
    return null
  }
}

// API request helper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return apiRequestToBase<T>(API_URL, endpoint, options)
}

async function apiRequestToBase<T>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const shouldUseKeepAlive = options.keepalive === true

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    ...(shouldUseKeepAlive ? { keepalive: true } : {}),
    headers
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new SpreadsheetApiRequestError(
      (error as { message?: string }).message || `API Error: ${response.status}`,
      response.status,
      error
    )
  }

  const text = await response.text()
  // Some endpoints return no body (204/empty). Avoid returning `null` for generic `T`.
  if (!text) return undefined as unknown as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new SpreadsheetApiRequestError('Invalid JSON response', response.status, { raw: text })
  }
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

type SpreadsheetRowData = Record<string, unknown> & {
  _clientRowId?: string
}

function mapApiRowToFrontendRow(row: Record<string, unknown>): Record<string, unknown> {
  const rowData = ((row.data as Record<string, unknown>) ?? {}) as SpreadsheetRowData
  const clientRowId = rowData._clientRowId
  const backendId = String(row.id ?? '')

  if (clientRowId) {
    return {
      ...rowData,
      _id: clientRowId,
      _rowUuid: backendId
    }
  }

  return {
    ...rowData,
    _id: backendId
  }
}

const cloneSnapshot = <T>(value: T): T => {
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

export type SpreadsheetBatchOperationType =
  | 'set_cell'
  | 'set_range'
  | 'add_rows'
  | 'insert_rows_at'
  | 'insert_row_slots'
  | 'delete_rows'
  | 'delete_row_slots'
  | 'move_row_slots'
  | 'move_cell_range'
  | 'clear_cell'
  | 'clear_all'
  | 'clear_format'
  | 'set_style'
  | 'set_row_height'
  | 'set_col_width'
  | 'column_add'
  | 'column_update'
  | 'column_delete'
  | 'columns_reorder'
  | 'column_reorder'
  | 'merge_ranges'
  | 'unmerge_ranges'
  | 'freeze_panes'
  | 'filter_update'
  | 'filter_clear'
  | 'visibility_update'
  | 'protect_ranges_update'
  | 'sheet_protection_update'

export interface SpreadsheetBatchOperation {
  operationId: string
  type: SpreadsheetBatchOperationType
  data: Record<string, unknown>
}

export interface SpreadsheetBatchRowMapping {
  clientRowId: string
  rowUuid: string
  gridRowIndex?: number
}

export interface SpreadsheetBatchOperationResponse {
  sheetId: string
  newVersion: number
  appliedOperations: Array<{
    operationId: string
    type: SpreadsheetBatchOperation['type']
  }>
  operationResults: Array<{
    operationId: string
    type: SpreadsheetBatchOperation['type']
    result: Record<string, unknown>
    dirtyRegions?: SpreadsheetDirtyRegion[]
  }>
  dirtyRegions?: SpreadsheetDirtyRegion[]
  idempotentReplay: boolean
  rowMappings?: SpreadsheetBatchRowMapping[]
  gridRowIndexByRowUuid?: Record<string, number>
  removedRowUuids?: string[]
  committedBatch?: Record<string, unknown> | null
  /**
   * Tier 1 per-op resolution (per-(rowId, columnName) backend conflict
   * resolution). One entry per submitted operation, in submission order.
   *
   * - `accepted` ops were applied at `newVersion`.
   * - `rejected_conflict` ops were skipped because another writer changed the
   *   same cell field between the client's `baseVersion` and the server's
   *   current version. The client should paint each `serverState` entry
   *   into the local session (last-writer-wins convergence).
   *
   * Older backends (pre-Tier-1) omit this field; clients should treat
   * `undefined` as "everything accepted, no painting needed".
   */
  results?: Array<
    | { operationId: string; status: 'accepted' }
    | {
        operationId: string
        status: 'rejected_conflict'
        serverState: Array<{
          rowId: string
          columnName: string
          field: 'value'
          value: unknown
        }>
      }
  >
}

export interface SpreadsheetBatchRowCellInput {
  rowId?: string
  rowRef?: SpreadsheetRowRef
  columnName: string
  value?: unknown
}

// Cache whether the backend supports Univer snapshot persistence endpoints.
// null => unknown, true => available, false => unavailable (skip snapshot API calls).
let supportsUniverSnapshotEndpoint: boolean | null = null

/**
 * If we previously cached "univer-snapshot API unavailable" (404/501), clear that so the next save probes again.
 * A transient failure or deploy mismatch otherwise disables snapshot uploads for the entire session (no network calls).
 */
export function revalidateSpreadsheetUniverSnapshotAfterIdleTab(): void {
  if (supportsUniverSnapshotEndpoint === false) {
    supportsUniverSnapshotEndpoint = null
  }
}

// Map backend permission to frontend permission
function mapPermission(backendPermission: string | undefined): SpreadsheetApp['permission'] {
  if (!backendPermission) return undefined
  if (backendPermission === 'admin') return 'owner'
  return backendPermission as SpreadsheetApp['permission']
}

function mapApiRowsToSheetData(rows: unknown): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return []
  return rows.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return {}
    const rowRecord = row as { id?: unknown; data?: unknown }
    const rowData =
      rowRecord.data && typeof rowRecord.data === 'object' && !Array.isArray(rowRecord.data)
        ? (rowRecord.data as SpreadsheetRowData)
        : {}
    if (rowData._clientRowId) {
      return { ...rowData, _id: rowData._clientRowId, _rowUuid: rowRecord.id }
    }
    return { ...rowData, _id: rowRecord.id }
  })
}

function mapApiBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return undefined
}

function mapApiWorksheetSnapshotHidden(sheet: Record<string, unknown>): boolean | undefined {
  const snapshot = sheet.worksheetSnapshot
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return undefined
  const snapshotRecord = snapshot as Record<string, unknown>
  const directHidden = mapApiBoolean(snapshotRecord.hidden)
  if (directHidden !== undefined) return directHidden

  const sheetId = typeof sheet.id === 'string' ? sheet.id : ''
  const sheets = snapshotRecord.sheets
  if (!sheetId || !sheets || typeof sheets !== 'object' || Array.isArray(sheets)) return undefined
  const worksheet = (sheets as Record<string, unknown>)[sheetId]
  if (!worksheet || typeof worksheet !== 'object' || Array.isArray(worksheet)) return undefined
  return mapApiBoolean((worksheet as Record<string, unknown>).hidden)
}

function mapApiSettingsHidden(sheet: Record<string, unknown>): boolean | undefined {
  const settings = sheet.settings
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return undefined
  return mapApiBoolean((settings as Record<string, unknown>).univerSheetHidden)
}

function mapApiResponseToSheet(sheet: Record<string, unknown>): SpreadsheetSheet {
  const directData = Array.isArray(sheet.data) ? (sheet.data as Record<string, unknown>[]) : []
  const rowData = mapApiRowsToSheetData(sheet.rows)
  const rawHidden = mapApiBoolean(sheet.hidden)
  const snapshotHidden = mapApiWorksheetSnapshotHidden(sheet)
  const hidden = rawHidden ?? mapApiSettingsHidden(sheet) ?? snapshotHidden
  return {
    id: sheet.id as string,
    name: sheet.name as string,
    description: sheet.description as string | undefined,
    version: (sheet.version as number | undefined) ?? 0,
    ...(hidden !== undefined ? { hidden } : {}),
    ...(sheet.worksheetSnapshot &&
    typeof sheet.worksheetSnapshot === 'object' &&
    !Array.isArray(sheet.worksheetSnapshot)
      ? { worksheetSnapshot: sheet.worksheetSnapshot as Record<string, unknown> }
      : {}),
    viewType:
      (sheet.viewType as SpreadsheetSheet['viewType'] | undefined) ||
      ((sheet.views as Array<Record<string, unknown>> | undefined)?.[0]?.type as
        | SpreadsheetSheet['viewType']
        | undefined) ||
      'table',
    columns: normalizeSpreadsheetColumnsForDisplay((sheet.columns as SpreadsheetSheet['columns']) || []),
    views: (sheet.views as SpreadsheetSheet['views']) || [],
    settings: (sheet.settings as SpreadsheetSheet['settings']) || {},
    entityDataSource: sheet.entityDataSource as SpreadsheetSheet['entityDataSource'],
    chartConfigs: sheet.chartConfigs as SpreadsheetSheet['chartConfigs'],
    data: rowData.length > 0 ? rowData : directData,
    automations: [],
    workflowLinks: []
  }
}

function mapApiAppToSpreadsheetApp(apiApp: Record<string, unknown>): SpreadsheetApp {
  const sheets = (apiApp.sheets as Array<Record<string, unknown>>) || []

  return {
    id: apiApp.id as string,
    name: apiApp.name as string,
    description: apiApp.description as string | undefined,
    icon: apiApp.icon as string | undefined,
    status: apiApp.status as AppStatus,
    trashedAt: (apiApp.trashedAt as string | undefined) ?? null,
    createdAt: apiApp.createdAt as string,
    updatedAt: apiApp.updatedAt as string,
    createdBy: apiApp.ownerId as string,
    sourceFile: apiApp.sourceFileInfo as SpreadsheetApp['sourceFile'],
    settings: (apiApp.settings as SpreadsheetApp['settings']) || {},
    relationships: apiApp.relationships as SpreadsheetApp['relationships'],
    sheets: sheets.map(sheet => {
      const rows = (sheet.rows as Array<{ id: string; data: Record<string, unknown> }>) || []
      const data = rows.map(row => {
        const rowData = (row.data ?? {}) as SpreadsheetRowData
        if (rowData._clientRowId) {
          return { ...rowData, _id: rowData._clientRowId, _rowUuid: row.id }
        }
        return { ...rowData, _id: row.id }
      })

      return { ...mapApiResponseToSheet(sheet), data }
    }),
    sharedWith: [],
    // Permission info from backend
    permission: mapPermission(apiApp.permission as string | undefined),
    isShared: apiApp.isShared as boolean | undefined,
    sharedBy: apiApp.sharedBy as string | undefined,
    isFavorite: apiApp.isFavorite as boolean | undefined
  }
}

function mapCommentResponse(
  response: Record<string, unknown>,
  fallbackId: string,
  fallbackParentId?: string
): Comment | null {
  const entityId = (response.entityId as string | undefined) || (response.appId as string | undefined)
  const type = response.type as Comment['type'] | undefined
  const content = response.content as string | undefined
  const createdBy = response.createdBy as string | undefined
  const createdAt = response.createdAt as string | undefined

  if (!entityId || !type || content === undefined || !createdBy || !createdAt) {
    return null
  }

  return {
    id: (response.id as string | undefined) || fallbackId,
    entityId,
    entityType: 'spreadsheet_app',
    type,
    content,
    createdBy,
    createdByName: response.createdByName as string | undefined,
    createdByAvatar: response.createdByAvatar as string | undefined,
    createdAt,
    updatedAt: response.updatedAt as string | undefined,
    resolvedAt: response.resolvedAt as string | undefined,
    resolvedBy: response.resolvedBy as string | undefined,
    cellReference: response.cellReference as string | undefined,
    sheetId: response.sheetId as string | undefined,
    parentId: (response.parentId as string | undefined) || fallbackParentId
  }
}

export const SpreadsheetApiService = {
  // ============ Apps ============

  /**
   * Get all spreadsheet apps
   */
  async listApps(options?: {
    status?: AppStatus
    search?: string
    page?: number
    limit?: number
    section?: 'favorites'
  }): Promise<SpreadsheetAppSummary[]> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    if (options?.search) params.set('search', options.search)
    if (options?.page) params.set('page', options.page.toString())
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.section) params.set('section', options.section)

    const queryString = params.toString()
    const endpoint = `${spreadsheetEndpoint()}${queryString ? `?${queryString}` : ''}`

    debugLog('listApps', endpoint)

    const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(endpoint)

    return response.items.map(app => {
      const sheets = (app.sheets as Array<{ id?: string; rows?: unknown[]; data?: unknown[] }>) || []
      const sheetCount = sheets.length
      // Try to get rowCount from rows (backend) or data (legacy), default to 0
      const rowCount = sheets.reduce((sum, sheet) => sum + (sheet.rows?.length || sheet.data?.length || 0), 0)
      const firstSheet = sheets[0]

      return {
        id: app.id as string,
        name: app.name as string,
        description: app.description as string | undefined,
        icon: app.icon as string | undefined,
        status: app.status as AppStatus,
        trashedAt: (app.trashedAt as string | undefined) ?? null,
        createdAt: app.createdAt as string,
        updatedAt: app.updatedAt as string,
        createdBy: app.ownerId as string,
        sheetCount,
        rowCount,
        firstSheetId: firstSheet?.id as string | undefined,
        // Permission info from backend
        permission: mapPermission(app.permission as string | undefined),
        isShared: app.isShared as boolean | undefined,
        isOwner: !app.isShared,
        sharedBy: app.sharedBy as string | undefined,
        sharedWithCount: (app.sharedCount as number | undefined) ?? (app.sharedWithCount as number | undefined),
        sharedPreviewUserIds: (app.sharedPreviewUserIds as string[] | undefined) ?? []
      }
    })
  },

  /**
   * Get a single app by ID
   */
  async getApp(id: string): Promise<SpreadsheetApp | null> {
    try {
      debugLog('getApp', id)
      const app = await apiRequest<Record<string, unknown>>(spreadsheetEndpoint(`/${id}`))
      return mapApiAppToSpreadsheetApp(app)
    } catch (error) {
      console.error('Failed to get app:', error)
      return null
    }
  },

  async getTrashedPreview(id: string): Promise<SpreadsheetApp | null> {
    try {
      debugLog('getTrashedPreview', id)
      const app = await apiRequest<Record<string, unknown>>(spreadsheetEndpoint(`/${id}/trashed-preview`))
      return mapApiAppToSpreadsheetApp(app)
    } catch (error) {
      console.error('Failed to get trashed spreadsheet preview:', error)
      return null
    }
  },

  /**
   * Create a new app
   */
  async createApp(app: Partial<SpreadsheetApp>): Promise<SpreadsheetApp> {
    debugLog('createApp', app)

    const payload = {
      name: app.name || 'Untitled App',
      description: app.description,
      icon: app.icon,
      status: app.status || 'draft',
      settings: app.settings,
      sheets: app.sheets?.map(sheet => ({
        name: sheet.name,
        description: sheet.description,
        columns: sheet.columns,
        views: sheet.views,
        settings: sheet.settings,
        data: sheet.data
      }))
    }

    const created = await apiRequest<Record<string, unknown>>(spreadsheetEndpoint(), {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    return mapApiAppToSpreadsheetApp(created)
  },

  /**
   * Update an app (app-level properties only, not sheets/rows)
   */
  async updateApp(id: string, updates: Partial<SpreadsheetApp>): Promise<SpreadsheetApp> {
    debugLog('updateApp', id, updates)

    const payload: Record<string, unknown> = {
      name: updates.name,
      description: updates.description,
      icon: updates.icon,
      status: updates.status,
      settings: updates.settings
    }

    // CRITICAL: Do NOT include sheets/relationships in updateApp - backend rejects it!
    // Use updateSheet() and updateRow() methods instead for sheet-level changes.
    // The backend API separates app metadata from sheet/row data.

    // Remove undefined and forbidden properties
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload]
      }
    })

    // Explicitly remove sheets/relationships if they somehow got included
    delete payload.sheets
    delete payload.relationships
    delete payload.sharedWith

    const updated = await apiRequest<Record<string, unknown>>(spreadsheetEndpoint(`/${id}`), {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })

    return mapApiAppToSpreadsheetApp(updated)
  },

  /**
   * Delete an app
   */
  async deleteApp(id: string): Promise<boolean> {
    try {
      debugLog('deleteApp', id)
      await apiRequest(spreadsheetEndpoint(`/${id}`), { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to delete app:', error)
      return false
    }
  },

  /**
   * Duplicate an app
   */
  async duplicateApp(id: string): Promise<SpreadsheetApp | null> {
    try {
      debugLog('duplicateApp', id)
      const duplicated = await apiRequest<Record<string, unknown>>(spreadsheetEndpoint(`/${id}/duplicate`), {
        method: 'POST'
      })
      return mapApiAppToSpreadsheetApp(duplicated)
    } catch (error) {
      console.error('Failed to duplicate app:', error)
      return null
    }
  },

  // ============ Sheets ============

  /**
   * Get a specific sheet
   */
  async getSheet(appId: string, sheetId: string): Promise<SpreadsheetSheet | null> {
    try {
      debugLog('getSheet', appId, sheetId)
      const sheet = await apiRequestToBase<Record<string, unknown>>(
        SPREADSHEET_CORE_API_URL,
        spreadsheetEndpoint(`/${appId}/sheets/${sheetId}`)
      )
      return mapApiResponseToSheet(sheet)
    } catch (error) {
      if (error instanceof SpreadsheetApiRequestError && error.status === 404) {
        debugLog('getSheet: sheet not found', appId, sheetId)
      } else {
        console.error('Failed to get sheet:', error)
      }
      return null
    }
  },

  /**
   * Create a new sheet
   */
  async createSheet(
    appId: string,
    sheet: Partial<SpreadsheetSheet> & { worksheetSnapshot?: Record<string, unknown> }
  ): Promise<SpreadsheetSheet> {
    debugLog('createSheet', appId, sheet)

    const payload = {
      ...(sheet.id ? { id: sheet.id } : {}),
      name: sheet.name || 'New Sheet',
      description: sheet.description,
      columns: sheet.columns || [],
      views: sheet.views,
      settings: sheet.settings,
      data: sheet.data,
      hidden: sheet.hidden,
      worksheetSnapshot: sheet.worksheetSnapshot
    }

    const created = await apiRequest<Record<string, unknown>>(spreadsheetEndpoint(`/${appId}/sheets`), {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    return mapApiResponseToSheet(created)
  },

  async duplicateSheet(
    appId: string,
    sourceSheetId: string,
    sheet: {
      id?: string
      name: string
      visualWorksheetSnapshot?: Record<string, unknown>
    }
  ): Promise<SpreadsheetSheet> {
    debugLog('duplicateSheet', appId, sourceSheetId, sheet)

    const payload = {
      ...(sheet.id ? { id: sheet.id } : {}),
      name: sheet.name,
      visualWorksheetSnapshot: sheet.visualWorksheetSnapshot
    }

    const created = await apiRequest<Record<string, unknown>>(
      spreadsheetEndpoint(`/${appId}/sheets/${sourceSheetId}/duplicate`),
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    )

    return mapApiResponseToSheet(created)
  },

  /**
   * Update a sheet
   */
  async updateSheet(appId: string, sheetId: string, updates: Partial<SpreadsheetSheet>): Promise<SpreadsheetSheet> {
    debugLog('updateSheet', appId, sheetId, updates)

    const payload = {
      name: updates.name,
      description: updates.description,
      columns: updates.columns,
      views: updates.views,
      settings: updates.settings,
      hidden: updates.hidden
    }

    // Remove undefined
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload]
      }
    })

    const updated = await apiRequest<Record<string, unknown>>(spreadsheetEndpoint(`/${appId}/sheets/${sheetId}`), {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })

    return mapApiResponseToSheet(updated)
  },

  /**
   * Delete a sheet
   */
  async deleteSheet(appId: string, sheetId: string): Promise<boolean> {
    try {
      debugLog('deleteSheet', appId, sheetId)
      await apiRequest(spreadsheetEndpoint(`/${appId}/sheets/${sheetId}`), { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to delete sheet:', error)
      return false
    }
  },

  // ============ Rows ============

  /**
   * Get rows for a sheet
   */
  async getRows(
    appId: string,
    sheetId: string,
    options?: { page?: number; limit?: number }
  ): Promise<Array<Record<string, unknown>>> {
    try {
      const params = new URLSearchParams()
      if (options?.page) params.set('page', options.page.toString())
      if (options?.limit) params.set('limit', options.limit.toString())

      const queryString = params.toString()
      const endpoint = `${spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/rows`)}${queryString ? `?${queryString}` : ''}`

      debugLog('getRows', endpoint)

      const response = await apiRequestToBase<PaginatedResponse<Record<string, unknown>>>(
        SPREADSHEET_CORE_API_URL,
        endpoint
      )
      return response.items.map(mapApiRowToFrontendRow)
    } catch (error) {
      console.error('Failed to get rows:', error)
      return []
    }
  },

  /**
   * Fetch ALL rows for a sheet (auto-paginates).
   *
   * Use this when you need a complete dataset (e.g. Univer snapshot bootstrap),
   * not just the default first page (backend default limit is 100).
   */
  async getAllRows(
    appId: string,
    sheetId: string,
    options?: {
      pageSize?: number
      maxPages?: number
    }
  ): Promise<Array<Record<string, unknown>>> {
    const pageSize = Math.max(1, Math.min(options?.pageSize ?? 1000, 5000))
    const maxPages = Math.max(1, options?.maxPages ?? 250)
    const all: Array<Record<string, unknown>> = []

    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', pageSize.toString())

      const endpoint = `${spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/rows`)}?${params.toString()}`
      debugLog('getAllRows', endpoint)

      const response = await apiRequestToBase<PaginatedResponse<Record<string, unknown>>>(
        SPREADSHEET_CORE_API_URL,
        endpoint
      )
      all.push(...response.items.map(mapApiRowToFrontendRow))

      if (response.items.length === 0) break
      if (response.items.length < pageSize) break
      if (response.totalPages && page >= response.totalPages) break
    }

    return all
  },

  /**
   * Add a row
   */
  async addRow(appId: string, sheetId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    debugLog('addRow', appId, sheetId, data)

    const created = await apiRequestToBase<Record<string, unknown>>(
      SPREADSHEET_CORE_API_URL,
      spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/rows`),
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    )

    const createdData = ((created.data as Record<string, unknown>) ?? {}) as SpreadsheetRowData
    const clientRowId = (data as SpreadsheetRowData)._clientRowId

    if (clientRowId) {
      return {
        ...createdData,
        _id: clientRowId,
        _rowUuid: created.id as string,
        _clientRowId: clientRowId,
        ...(created.sheetVersion != null ? { sheetVersion: created.sheetVersion } : {})
      }
    }

    return {
      ...createdData,
      _id: created.id as string,
      ...(created.sheetVersion != null ? { sheetVersion: created.sheetVersion } : {})
    }
  },

  /**
   * Update a row
   */
  async updateRow(
    appId: string,
    sheetId: string,
    rowId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    debugLog('updateRow', appId, sheetId, rowId, data)

    const updated = await apiRequestToBase<Record<string, unknown>>(
      SPREADSHEET_CORE_API_URL,
      spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/rows/${rowId}`),
      {
        method: 'PATCH',
        body: JSON.stringify(data)
      }
    )

    const updatedData = ((updated.data as Record<string, unknown>) ?? {}) as SpreadsheetRowData
    const clientRowId = updatedData._clientRowId
    if (clientRowId) {
      return {
        ...updatedData,
        _id: clientRowId,
        _rowUuid: updated.id as string,
        ...(updated.sheetVersion != null ? { sheetVersion: updated.sheetVersion } : {})
      }
    }

    return {
      ...updatedData,
      _id: updated.id as string,
      ...(updated.sheetVersion != null ? { sheetVersion: updated.sheetVersion } : {})
    }
  },

  /**
   * Delete a row
   */
  async deleteRow(appId: string, sheetId: string, rowId: string): Promise<boolean> {
    try {
      debugLog('deleteRow', appId, sheetId, rowId)
      await apiRequestToBase(
        SPREADSHEET_CORE_API_URL,
        spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/rows/${rowId}`),
        {
          method: 'DELETE'
        }
      )
      return true
    } catch (error) {
      console.error('Failed to delete row:', error)
      return false
    }
  },

  /**
   * Bulk add rows
   */
  async bulkAddRows(
    appId: string,
    sheetId: string,
    rows: Array<Record<string, unknown>>
  ): Promise<Array<Record<string, unknown>>> {
    debugLog('bulkAddRows', appId, sheetId, rows.length)

    const created = await apiRequestToBase<Array<Record<string, unknown>>>(
      SPREADSHEET_CORE_API_URL,
      spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/rows/bulk`),
      {
        method: 'POST',
        body: JSON.stringify(rows)
      }
    )

    return created.map(row => ({
      _id: row.id,
      ...(row.data as Record<string, unknown>)
    }))
  },

  async applyOperationBatch(
    appId: string,
    sheetId: string,
    payload: {
      baseVersion: number
      operations: SpreadsheetBatchOperation[]
      batchId?: string
      clientMutationId?: string
      traceSessionId?: string
      traceId?: string
      sessionId?: string
      tabId?: string
    },
    options?: {
      keepalive?: boolean
    }
  ): Promise<SpreadsheetBatchOperationResponse> {
    debugLog('applyOperationBatch', appId, sheetId, {
      baseVersion: payload.baseVersion,
      operationCount: payload.operations.length
    })
    return apiRequestToBase<SpreadsheetBatchOperationResponse>(
      SPREADSHEET_CORE_API_URL,
      spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/operations/batch`),
      {
        method: 'POST',
        body: JSON.stringify(payload),
        ...(options?.keepalive ? { keepalive: true } : {})
      }
    )
  },

  async getSheetSnapshot(
    appId: string,
    sheetId: string
  ): Promise<{
    sheet: SpreadsheetSheet
    rows: Array<Record<string, unknown>>
    version: number
  }> {
    const snapshot = await apiRequestToBase<{
      sheet: Record<string, unknown>
      rows: Array<Record<string, unknown>>
      version: number
    }>(SPREADSHEET_CORE_API_URL, spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/snapshot`))

    return {
      ...snapshot,
      sheet: mapApiResponseToSheet(snapshot.sheet)
    }
  },

  async getSheetChangesSince(
    appId: string,
    sheetId: string,
    sinceVersion: number,
    options?: {
      traceSessionId?: string
      sessionId?: string
      tabId?: string
    }
  ): Promise<{
    sheetId: string
    currentVersion: number
    changes: Array<Record<string, unknown>>
    requiresSnapshot: boolean
  }> {
    return apiRequestToBase(
      SPREADSHEET_CORE_API_URL,
      `${spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/changes`)}?${new URLSearchParams({
        sinceVersion: String(sinceVersion),
        ...(options?.traceSessionId ? { traceSessionId: options.traceSessionId } : {}),
        ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
        ...(options?.tabId ? { tabId: options.tabId } : {})
      }).toString()}`
    )
  },

  async startDiagnosticsTraceSession(
    appId: string,
    sheetId: string,
    payload: {
      scope: SpreadsheetTraceScope
      ttlMinutes: number
      sessionId?: string
      tabId?: string
    }
  ): Promise<SpreadsheetTraceSession> {
    return apiRequestToBase<SpreadsheetTraceSession>(
      SPREADSHEET_CORE_API_URL,
      spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/diagnostics/trace-sessions`),
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    )
  },

  async getActiveDiagnosticsTraceSession(
    appId: string,
    sheetId: string,
    payload?: {
      sessionId?: string
      tabId?: string
    }
  ): Promise<SpreadsheetTraceSession | null> {
    const query = new URLSearchParams({
      ...(payload?.sessionId ? { sessionId: payload.sessionId } : {}),
      ...(payload?.tabId ? { tabId: payload.tabId } : {})
    }).toString()
    return apiRequestToBase<SpreadsheetTraceSession | null>(
      SPREADSHEET_CORE_API_URL,
      `${spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/diagnostics/trace-sessions/active`)}${query ? `?${query}` : ''}`
    )
  },

  async getDiagnosticsTraceSessions(
    appId: string,
    sheetId: string,
    payload?: {
      visibilitySessionId?: string
      visibilityTabId?: string
      limit?: number
    }
  ): Promise<{ sessions: SpreadsheetTraceSession[] }> {
    const query = new URLSearchParams({
      ...(payload?.visibilitySessionId ? { visibilitySessionId: payload.visibilitySessionId } : {}),
      ...(payload?.visibilityTabId ? { visibilityTabId: payload.visibilityTabId } : {}),
      ...(payload?.limit != null ? { limit: String(payload.limit) } : {})
    }).toString()
    return apiRequestToBase<{ sessions: SpreadsheetTraceSession[] }>(
      SPREADSHEET_CORE_API_URL,
      `${spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/diagnostics/trace-sessions`)}${query ? `?${query}` : ''}`
    )
  },

  async stopDiagnosticsTraceSession(
    appId: string,
    sheetId: string,
    traceSessionId: string
  ): Promise<{ stopped: boolean }> {
    return apiRequestToBase<{ stopped: boolean }>(
      SPREADSHEET_CORE_API_URL,
      spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/diagnostics/trace-sessions/${traceSessionId}`),
      {
        method: 'DELETE'
      }
    )
  },

  async appendDiagnosticsTraceEvents(
    appId: string,
    sheetId: string,
    traceSessionId: string,
    payload: {
      sessionId?: string
      tabId?: string
      events: SpreadsheetTraceEventInput[]
    }
  ): Promise<{ appended: number }> {
    return apiRequestToBase<{ appended: number }>(
      SPREADSHEET_CORE_API_URL,
      spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/diagnostics/trace-sessions/${traceSessionId}/events`),
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    )
  },

  async getDiagnosticsTraceEvents(
    appId: string,
    sheetId: string,
    payload: {
      traceSessionId?: string
      sheetId?: string
      batchId?: string
      traceId?: string
      stage?: string
      operationType?: string
      userId?: string
      browserSessionId?: string
      tabId?: string
      visibilitySessionId?: string
      visibilityTabId?: string
      limit?: number
    }
  ): Promise<{ session: SpreadsheetTraceSession | null; events: SpreadsheetTraceEvent[] }> {
    const params = new URLSearchParams({
      ...(payload.traceSessionId ? { traceSessionId: payload.traceSessionId } : {}),
      ...(payload.sheetId ? { sheetId: payload.sheetId } : {}),
      ...(payload.batchId ? { batchId: payload.batchId } : {}),
      ...(payload.traceId ? { traceId: payload.traceId } : {}),
      ...(payload.stage ? { stage: payload.stage } : {}),
      ...(payload.operationType ? { operationType: payload.operationType } : {}),
      ...(payload.userId ? { userId: payload.userId } : {}),
      ...(payload.browserSessionId ? { browserSessionId: payload.browserSessionId } : {}),
      ...(payload.tabId ? { tabId: payload.tabId } : {}),
      ...(payload.visibilitySessionId ? { visibilitySessionId: payload.visibilitySessionId } : {}),
      ...(payload.visibilityTabId ? { visibilityTabId: payload.visibilityTabId } : {}),
      ...(payload.limit != null ? { limit: String(payload.limit) } : {})
    })
    return apiRequestToBase<{ session: SpreadsheetTraceSession | null; events: SpreadsheetTraceEvent[] }>(
      SPREADSHEET_CORE_API_URL,
      `${spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/diagnostics/traces`)}?${params.toString()}`
    )
  },

  async getDiagnosticsTraceFindings(
    appId: string,
    sheetId: string,
    traceSessionId: string,
    payload?: {
      visibilitySessionId?: string
      visibilityTabId?: string
    }
  ): Promise<{ session: SpreadsheetTraceSession; findings: SpreadsheetTraceFinding[] }> {
    const params = new URLSearchParams({
      ...(payload?.visibilitySessionId ? { visibilitySessionId: payload.visibilitySessionId } : {}),
      ...(payload?.visibilityTabId ? { visibilityTabId: payload.visibilityTabId } : {})
    })
    return apiRequestToBase<{ session: SpreadsheetTraceSession; findings: SpreadsheetTraceFinding[] }>(
      SPREADSHEET_CORE_API_URL,
      `${spreadsheetEndpoint(`/${appId}/sheets/${sheetId}/diagnostics/traces/${traceSessionId}/findings`)}?${params.toString()}`
    )
  },

  async saveUniverSnapshot(
    appId: string,
    payload: {
      version: number
      snapshot: Record<string, unknown>
    },
    requestOptions?: { keepalive?: boolean }
  ): Promise<{ appId: string; version: number; saved: boolean }> {
    debugLog('saveUniverSnapshot', appId, { version: payload.version, scope: 'app' })
    if (supportsUniverSnapshotEndpoint === false) {
      return { appId, version: payload.version, saved: false }
    }

    try {
      const body = JSON.stringify({
        ...payload,
        snapshot: cloneSnapshot(payload.snapshot)
      })
      // Browsers only allow fetch keepalive with small bodies (~64 KiB); larger snapshots must use a normal request.
      const bodyBytes = new Blob([body]).size
      const useKeepalive = requestOptions?.keepalive === true && bodyBytes > 0 && bodyBytes <= 60_000

      const response = await apiRequestToBase<{ appId: string; version: number; saved: boolean }>(
        SPREADSHEET_CORE_API_URL,
        spreadsheetEndpoint(`/${appId}/univer-snapshot`),
        {
          method: 'POST',
          body,
          ...(useKeepalive ? { keepalive: true } : {})
        }
      )
      supportsUniverSnapshotEndpoint = true
      return { appId, version: response.version, saved: response.saved }
    } catch (error) {
      if (error instanceof SpreadsheetApiRequestError && (error.status === 404 || error.status === 501)) {
        supportsUniverSnapshotEndpoint = false
        console.warn('[SpreadsheetApiService] univer-snapshot endpoint unavailable; snapshot persistence is disabled')
        return { appId, version: payload.version, saved: false }
      }
      throw error
    }
  },

  async getUniverSnapshot(appId: string): Promise<{
    appId: string
    version: number
    updatedAt: string | null
    snapshot: Record<string, unknown> | null
    coversVersions: Record<string, number>
  }> {
    if (supportsUniverSnapshotEndpoint === false) {
      return { appId, version: 0, updatedAt: null, snapshot: null, coversVersions: {} }
    }

    try {
      const response = await apiRequestToBase<{
        appId: string
        version: number
        updatedAt: string | null
        snapshot: Record<string, unknown> | null
        coversVersions?: Record<string, number>
      }>(SPREADSHEET_CORE_API_URL, spreadsheetEndpoint(`/${appId}/univer-snapshot`))
      supportsUniverSnapshotEndpoint = true
      return {
        appId,
        version: response.version,
        updatedAt: response.updatedAt,
        snapshot: response.snapshot,
        coversVersions:
          response.coversVersions && typeof response.coversVersions === 'object' ? response.coversVersions : {}
      }
    } catch (error) {
      if (error instanceof SpreadsheetApiRequestError && (error.status === 404 || error.status === 501)) {
        supportsUniverSnapshotEndpoint = false
        console.warn('[SpreadsheetApiService] univer-snapshot endpoint unavailable; using row-data-only initialization')
        return { appId, version: 0, updatedAt: null, snapshot: null, coversVersions: {} }
      }
      throw error
    }
  },

  // ============ File Parsing ============

  /**
   * Parse Excel file and get analysis
   */
  async analyzeExcelFile(file: File): Promise<{
    fileName: string
    suggestedAppName: string
    sheets: Array<{
      name: string
      rowCount: number
      columns: Array<{
        name: string
        label: string
        type: string
        sampleValues: unknown[]
      }>
      suggestedView: string
    }>
  }> {
    debugLog('analyzeExcelFile', file.name)

    const token = getAuthToken()
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/files/analyze/excel`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    })

    if (!response.ok) {
      throw new Error('Failed to analyze Excel file')
    }

    return response.json()
  },

  /**
   * Create app from Excel file
   */
  async createAppFromExcel(file: File, options?: { name?: string }): Promise<SpreadsheetApp> {
    debugLog('createAppFromExcel', file.name)

    // First analyze the file
    const analysis = await this.analyzeExcelFile(file)

    // Create the app with analyzed data
    const app = await this.createApp({
      name: options?.name || analysis.suggestedAppName,
      status: 'file_based',
      sheets: analysis.sheets.map((sheet, sheetIndex) => {
        const columns: SpreadsheetSheet['columns'] = sheet.columns.map((col, idx) => ({
          id: `col_${idx}`,
          name: col.name,
          label: col.label,
          type: col.type as SpreadsheetSheet['columns'][0]['type'],
          width: undefined,
          isVisible: true,
          isEditable: true,
          isRequired: false,
          isUnique: false,
          defaultValue: undefined,
          selectOptions: undefined,
          validation: undefined,
          formula: undefined,
          referenceTo: undefined,
          order: idx
        }))

        return {
          id: `sheet_${sheetIndex}`,
          name: sheet.name,
          description: undefined,
          viewType: 'table',
          columns,
          views: [
            {
              id: 'default',
              name: 'Default Table',
              type: 'table' as const,
              isDefault: true,
              config: { type: 'table', columns: columns.map(c => c.id) }
            }
          ],
          settings: {
            allowAdd: true,
            allowEdit: true,
            allowDelete: true,
            allowExport: true,
            allowImport: true,
            rowsPerPage: 25,
            showRowNumbers: true
          },
          data: [],
          automations: [],
          workflowLinks: []
        }
      })
    })

    return app
  },

  // ============ Sharing ============

  /**
   * Share an app
   */
  async shareApp(appId: string, shares: Array<{ userId: string; permission: string }>): Promise<boolean> {
    try {
      debugLog('shareApp', appId, shares)
      await apiRequest('/sharing', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'spreadsheet_app',
          entityId: appId,
          recipients: shares
        })
      })
      return true
    } catch (error) {
      console.error('Failed to share app:', error)
      return false
    }
  },

  /**
   * Get shared users
   */
  async getSharedUsers(appId: string): Promise<
    Array<{
      id: string
      userId: string
      permission: string
      sharedAt: string
      sharedBy: string
    }>
  > {
    try {
      debugLog('getSharedUsers', appId)
      const shares = await apiRequest<Array<Record<string, unknown>>>(`/sharing/spreadsheet_app/${appId}`)
      return shares.map(s => ({
        id: s.id as string,
        userId: s.userId as string,
        permission: s.permission as string,
        sharedAt: s.createdAt as string,
        sharedBy: s.sharedBy as string
      }))
    } catch (error) {
      console.error('Failed to get shared users:', error)
      return []
    }
  },

  /**
   * Update share permission
   */
  async updateSharePermission(shareId: string, permission: string): Promise<boolean> {
    try {
      debugLog('updateSharePermission', shareId, permission)
      await apiRequest(`/sharing/${shareId}`, {
        method: 'PATCH',
        body: JSON.stringify({ permission })
      })
      return true
    } catch (error) {
      console.error('Failed to update share permission:', error)
      return false
    }
  },

  /**
   * Revoke a share
   */
  async revokeShare(shareId: string): Promise<boolean> {
    try {
      debugLog('revokeShare', shareId)
      await apiRequest(`/sharing/${shareId}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to revoke share:', error)
      return false
    }
  },

  // ============ Versions ============

  /**
   * Create a new version snapshot
   */
  async createVersion(
    appId: string,
    options: {
      content?: string
      changeDescription?: string
      isCheckpoint?: boolean
      // When provided, the caller passes the live Univer snapshot directly so we
      // skip the saveUniverSnapshot → DB → getUniverSnapshot round-trip entirely.
      // When absent we fall back to fetching from DB (e.g. auto-restore checkpoints).
      univerSnapshots?: Record<string, Record<string, unknown> | null>
    }
  ): Promise<Version | null> {
    try {
      debugLog('createVersion', appId, options)

      // Get the current app if content not provided
      let contentSnapshot: Record<string, unknown>
      if (options.content) {
        contentSnapshot = { content: options.content }
      } else {
        const app = await this.getApp(appId)
        if (!app) throw new Error('Spreadsheet app not found')

        const directWorkbookSnapshot =
          options.univerSnapshots !== undefined
            ? (Object.values(options.univerSnapshots).find(
                snapshot => snapshot != null && typeof snapshot === 'object'
              ) ?? null)
            : null
        let workbookSnapshot = directWorkbookSnapshot
        let workbookSnapshotVersion = 0
        if (!workbookSnapshot && app.sheets[0]) {
          try {
            const univerData = await this.getUniverSnapshot(appId)
            workbookSnapshot = univerData.snapshot ?? null
            workbookSnapshotVersion = univerData.version ?? 0
          } catch {
            workbookSnapshot = null
          }
        }
        const sheetsWithSnapshots = app.sheets.map(sheet => ({
          ...sheet,
          _univerSnapshot: workbookSnapshot,
          _univerSnapshotVersion: workbookSnapshotVersion
        }))

        contentSnapshot = {
          name: app.name,
          description: app.description,
          _univerSnapshot: workbookSnapshot,
          _univerSnapshotVersion: workbookSnapshotVersion,
          sheets: sheetsWithSnapshots,
          relationships: app.relationships,
          settings: app.settings
        }
      }

      const versionData = await apiRequest<Record<string, unknown>>('/versions', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'spreadsheet_app',
          entityId: appId,
          contentSnapshot,
          changeSummary: options.changeDescription,
          isAutoSave: !options.isCheckpoint
        })
      })

      return {
        id: versionData.id as string,
        version: versionData.versionNumber as number,
        content: JSON.stringify(versionData.contentSnapshot),
        createdAt: versionData.createdAt as string,
        createdBy: versionData.changedBy as string,
        createdByName:
          (versionData.changedByName as string | undefined) || (versionData.createdByName as string | undefined),
        createdByAvatar:
          (versionData.changedByAvatar as string | undefined) || (versionData.createdByAvatar as string | undefined),
        changeDescription: versionData.changeSummary as string | undefined,
        isCheckpoint: !versionData.isAutoSave,
        isAutoSave: versionData.isAutoSave as boolean,
        fileSize: versionData.fileSize as number
      }
    } catch (error) {
      console.error('Failed to create version:', error)
      return null
    }
  },

  /**
   * Get version history for a spreadsheet app
   */
  async listVersions(appId: string, page = 1, limit = 20): Promise<Version[]> {
    try {
      debugLog('listVersions', appId)
      const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(
        `/versions/spreadsheet_app/${appId}?page=${page}&limit=${limit}`
      )
      return response.items.map(v => ({
        id: v.id as string,
        version: v.versionNumber as number,
        content: JSON.stringify(v.contentSnapshot || {}),
        createdAt: v.createdAt as string,
        createdBy: v.changedBy as string,
        createdByName: (v.changedByName as string | undefined) || (v.createdByName as string | undefined),
        createdByAvatar: (v.changedByAvatar as string | undefined) || (v.createdByAvatar as string | undefined),
        changeDescription: v.changeSummary as string | undefined,
        isCheckpoint: !v.isAutoSave,
        isAutoSave: v.isAutoSave as boolean,
        fileSize: (v.fileSize as number) || 0
      }))
    } catch (error) {
      console.error('Failed to list versions:', error)
      return []
    }
  },

  /**
   * Get a specific version
   */
  async getVersion(appId: string, versionNumber: number): Promise<SpreadsheetApp | null> {
    try {
      debugLog('getVersion', appId, versionNumber)
      const versionData = await apiRequest<Record<string, unknown>>(
        `/versions/spreadsheet_app/${appId}/${versionNumber}`
      )
      const snapshot = versionData.contentSnapshot as Record<string, unknown>
      if (snapshot) {
        return mapApiAppToSpreadsheetApp(snapshot)
      }
      return null
    } catch (error) {
      console.error('Failed to get version:', error)
      return null
    }
  },

  /**
   * Restore a spreadsheet app to a previous version.
   * The backend now owns the restore checkpoint on the v2 endpoints.
   */
  async restoreVersion(appId: string, versionNumber: number): Promise<boolean> {
    try {
      // Call dedicated backend restore endpoint that handles everything (metadata + sheets + rows)
      const result = await apiRequest<{ success: boolean; message: string; restoredRows: number }>(
        spreadsheetEndpoint(`/${appId}/restore/${versionNumber}`),
        {
          method: 'POST'
        }
      )

      return result.success
    } catch (error) {
      console.error('[SpreadsheetApiService] Failed to restore version:', error)
      if (error instanceof SpreadsheetApiRequestError) {
        throw error
      }
      throw new Error('Failed to restore version')
    }
  },

  /**
   * Compare two versions
   */
  async compareVersions(
    appId: string,
    versionA: number,
    versionB: number
  ): Promise<{
    versionA: Version
    versionB: Version
    diff: Array<{
      path: string
      type: 'added' | 'removed' | 'modified'
      oldValue?: unknown
      newValue?: unknown
    }>
  } | null> {
    try {
      debugLog('compareVersions', appId, versionA, versionB)
      const response = await apiRequest<Record<string, unknown>>(
        `/versions/spreadsheet_app/${appId}/compare?versionA=${versionA}&versionB=${versionB}`
      )

      const vA = response.versionA as Record<string, unknown>
      const vB = response.versionB as Record<string, unknown>
      const mapVersion = (v: Record<string, unknown>): Version => ({
        id: v.id as string,
        version: v.versionNumber as number,
        content: JSON.stringify(v.contentSnapshot),
        createdAt: v.createdAt as string,
        createdBy: v.changedBy as string,
        createdByName: (v.changedByName as string | undefined) || (v.createdByName as string | undefined),
        createdByAvatar: (v.changedByAvatar as string | undefined) || (v.createdByAvatar as string | undefined),
        changeDescription: v.changeSummary as string | undefined,
        isCheckpoint: !v.isAutoSave,
        isAutoSave: v.isAutoSave as boolean,
        fileSize: (v.fileSize as number) || 0
      })

      return {
        versionA: mapVersion(vA),
        versionB: mapVersion(vB),
        diff: response.diff as Array<{
          path: string
          type: 'added' | 'removed' | 'modified'
          oldValue?: unknown
          newValue?: unknown
        }>
      }
    } catch (error) {
      console.error('Failed to compare versions:', error)
      return null
    }
  },

  /**
   * Delete a version (admin only, use with caution)
   */
  async deleteVersion(appId: string, versionNumber: number): Promise<boolean> {
    try {
      debugLog('deleteVersion', appId, versionNumber)
      await apiRequest(`/versions/spreadsheet_app/${appId}/${versionNumber}`, {
        method: 'DELETE'
      })
      return true
    } catch (error) {
      console.error('Failed to delete version:', error)
      return false
    }
  },

  // ============ Comments ============

  async createComment(appId: string, input: CreateCommentInput): Promise<Comment | null> {
    try {
      debugLog('createComment', appId, input)
      const response = await apiRequest<Record<string, unknown>>(`/comments/spreadsheet_app/${appId}`, {
        method: 'POST',
        body: JSON.stringify(input)
      })

      return {
        id: response.id as string,
        entityId: appId,
        entityType: 'spreadsheet_app',
        type: response.type as Comment['type'],
        content: response.content as string,
        createdBy: response.createdBy as string,
        createdByName: response.createdByName as string | undefined,
        createdByAvatar: response.createdByAvatar as string | undefined,
        createdAt: response.createdAt as string,
        cellReference: response.cellReference as string | undefined,
        sheetId: response.sheetId as string | undefined,
        parentId: response.parentId as string | undefined
      }
    } catch (error) {
      console.error('Failed to create comment:', error)
      return null
    }
  },

  async listComments(appId: string, options?: CommentQueryOptions): Promise<Comment[]> {
    try {
      debugLog('listComments', appId, options)
      const params = new URLSearchParams()
      if (options?.includeResolved) params.set('includeResolved', 'true')
      if (options?.includeReplies) params.set('includeReplies', 'true')
      if (options?.type) params.set('type', options.type)
      if (options?.sheetId) params.set('sheetId', options.sheetId)

      const queryString = params.toString()
      const response = await apiRequest<Record<string, unknown>[]>(
        `/comments/spreadsheet_app/${appId}${queryString ? `?${queryString}` : ''}`
      )

      return response.map(c => ({
        id: c.id as string,
        entityId: appId,
        entityType: 'spreadsheet_app',
        type: c.type as Comment['type'],
        content: c.content as string,
        createdBy: c.createdBy as string,
        createdByName: c.createdByName as string | undefined,
        createdByAvatar: c.createdByAvatar as string | undefined,
        createdAt: c.createdAt as string,
        resolvedAt: c.resolvedAt as string | undefined,
        cellReference: c.cellReference as string | undefined,
        sheetId: c.sheetId as string | undefined,
        parentId: c.parentId as string | undefined,
        replies: (c.replies as Record<string, unknown>[] | undefined)?.map(r => ({
          id: r.id as string,
          entityId: appId,
          entityType: 'spreadsheet_app' as const,
          type: r.type as Comment['type'],
          content: r.content as string,
          createdBy: r.createdBy as string,
          createdByName: r.createdByName as string | undefined,
          createdByAvatar: r.createdByAvatar as string | undefined,
          createdAt: r.createdAt as string,
          cellReference: r.cellReference as string | undefined,
          sheetId: r.sheetId as string | undefined,
          parentId: c.id as string
        }))
      }))
    } catch (error) {
      console.error('Failed to list comments:', error)
      return []
    }
  },

  async updateComment(commentId: string, updates: Partial<Comment>): Promise<Comment | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: updates.content })
      })
      return mapCommentResponse(response, commentId)
    } catch (error) {
      console.error('Failed to update comment:', error)
      return null
    }
  },

  async resolveComment(commentId: string): Promise<boolean> {
    try {
      await apiRequest(`/comments/${commentId}/resolve`, { method: 'PATCH' })
      return true
    } catch (error) {
      console.error('Failed to resolve comment:', error)
      return false
    }
  },

  async unresolveComment(commentId: string): Promise<boolean> {
    try {
      await apiRequest(`/comments/${commentId}/unresolve`, { method: 'PATCH' })
      return true
    } catch (error) {
      console.error('Failed to unresolve comment:', error)
      return false
    }
  },

  async deleteComment(commentId: string): Promise<boolean> {
    try {
      await apiRequest(`/comments/${commentId}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to delete comment:', error)
      return false
    }
  },

  async replyToComment(commentId: string, reply: string): Promise<Comment | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/comments/${commentId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content: reply })
      })
      return mapCommentResponse(response, response.id as string, commentId)
    } catch (error) {
      console.error('Failed to reply to comment:', error)
      return null
    }
  },

  // ============ Locks ============

  async lockFile(appId: string, input?: LockFileInput): Promise<FileLock | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/locks/spreadsheet_app/${appId}`, {
        method: 'POST',
        body: JSON.stringify(input || {})
      })

      return {
        isLocked: true,
        lockedBy: response.lockedBy as string,
        lockedByName: response.lockedByName as string | undefined,
        lockedAt: response.lockedAt as string,
        lockExpiry: response.lockExpiry as string | undefined,
        lockReason: response.lockReason as string | undefined
      }
    } catch (error) {
      console.error('Failed to lock file:', error)
      return null
    }
  },

  async unlockFile(appId: string): Promise<boolean> {
    try {
      await apiRequest(`/locks/spreadsheet_app/${appId}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to unlock file:', error)
      return false
    }
  },

  async getLockStatus(appId: string): Promise<FileLock | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/locks/spreadsheet_app/${appId}`)

      if (response.isLocked) {
        return {
          isLocked: true,
          lockedBy: response.lockedBy as string | undefined,
          lockedByName: response.lockedByName as string | undefined,
          lockedByAvatar: response.lockedByAvatar as string | undefined,
          lockedAt: response.lockedAt as string | undefined,
          lockReason: response.lockReason as string | undefined,
          lockExpiry: response.lockExpiry as string | undefined
        }
      }

      return null
    } catch (error) {
      console.error('Failed to get lock status:', error)
      return null
    }
  },

  async forceUnlock(appId: string): Promise<boolean> {
    try {
      await apiRequest(`/locks/spreadsheet_app/${appId}/force`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to force unlock:', error)
      return false
    }
  },

  // ============ Publishing ============

  async publish(appId: string, input?: PublishInput): Promise<PublishMetadata | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(spreadsheetEndpoint(`/${appId}/publish`), {
        method: 'POST',
        body: JSON.stringify(input || {})
      })

      return {
        status: 'published',
        publishedAt: response.publishedAt as string,
        publishedBy: response.publishedBy as string,
        publishVersion: response.publishVersion as number
      }
    } catch (error) {
      console.error('Failed to publish spreadsheet app:', error)
      return null
    }
  },

  async unpublish(appId: string): Promise<boolean> {
    try {
      await apiRequest(spreadsheetEndpoint(`/${appId}/unpublish`), { method: 'POST' })
      return true
    } catch (error) {
      console.error('Failed to unpublish spreadsheet app:', error)
      return false
    }
  },

  async updateStatus(appId: string, status: string): Promise<PublishMetadata | null> {
    try {
      await apiRequest<Record<string, unknown>>(spreadsheetEndpoint(`/${appId}/publish-status`), {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })

      return {
        status: status as PublishMetadata['status']
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      return null
    }
  }
}

export default SpreadsheetApiService
