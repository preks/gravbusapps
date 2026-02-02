/**
 * SpreadsheetApiService
 *
 * Connects to the document-service backend API for spreadsheet app management.
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
} from '../../shared/types/versioning'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

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
    console.debug('[SpreadsheetApiService]', ...args)
  }
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
    // Prefer external token provider (e.g., BusinessAppContext accessToken)
    const externalToken = externalAuthTokenProvider?.()
    if (externalToken) return externalToken

    // First check the IDE's storage key (Business App IDE)
    const ideToken = localStorage.getItem('business-app-ide-access-token')
    if (ideToken) return ideToken

    // Check keycloak token format
    const authData = localStorage.getItem('keycloak-token')
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        return parsed.token || parsed.access_token || null
      } catch {
        return authData // Return as-is if not JSON
      }
    }

    // Check session storage
    const sessionToken = sessionStorage.getItem('auth_token')
    if (sessionToken) return sessionToken

    // Check window global
    if (typeof window !== 'undefined' && (window as unknown as { authToken?: string }).authToken) {
      return (window as unknown as { authToken: string }).authToken
    }

    return null
  } catch {
    return null
  }
}

// API request helper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  const text = await response.text()
  // Some endpoints return no body (204/empty). Avoid returning `null` for generic `T`.
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T)
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

// Map backend permission to frontend permission
function mapPermission(backendPermission: string | undefined): SpreadsheetApp['permission'] {
  if (!backendPermission) return undefined
  if (backendPermission === 'admin') return 'owner'
  return backendPermission as SpreadsheetApp['permission']
}

// Map API response to frontend types
function mapApiAppToSpreadsheetApp(apiApp: Record<string, unknown>): SpreadsheetApp {
  const sheets = (apiApp.sheets as Array<Record<string, unknown>>) || []

  return {
    id: apiApp.id as string,
    name: apiApp.name as string,
    description: apiApp.description as string | undefined,
    icon: apiApp.icon as string | undefined,
    status: apiApp.status as AppStatus,
    createdAt: apiApp.createdAt as string,
    updatedAt: apiApp.updatedAt as string,
    createdBy: apiApp.ownerId as string,
    sourceFile: apiApp.sourceFileInfo as SpreadsheetApp['sourceFile'],
    settings: (apiApp.settings as SpreadsheetApp['settings']) || {},
    relationships: apiApp.relationships as SpreadsheetApp['relationships'],
    sheets: sheets.map(sheet => {
      // Map rows from backend to data array for frontend
      const rows = (sheet.rows as Array<{ id: string; data: Record<string, unknown> }>) || []
      const data = rows.map(row => {
        const rowData = (row.data || {}) as SpreadsheetRowData
        // If a client row id is present (entity-data-source mode), use it as the UI row key
        // and preserve the backend UUID separately for PATCH calls.
        if (rowData._clientRowId) {
          return {
            ...rowData,
            _id: rowData._clientRowId,
            _rowUuid: row.id
          }
        }
        return {
          ...rowData,
          _id: row.id
        }
      })

      return {
        id: sheet.id as string,
        name: sheet.name as string,
        description: sheet.description as string | undefined,
        viewType:
          (sheet.viewType as SpreadsheetSheet['viewType'] | undefined) ||
          ((sheet.views as Array<Record<string, unknown>> | undefined)?.[0]?.type as
            | SpreadsheetSheet['viewType']
            | undefined) ||
          'table',
        columns: (sheet.columns as SpreadsheetSheet['columns']) || [],
        views: (sheet.views as SpreadsheetSheet['views']) || [],
        settings: (sheet.settings as SpreadsheetSheet['settings']) || {},
        entityDataSource: sheet.entityDataSource as SpreadsheetSheet['entityDataSource'],
        chartConfigs: sheet.chartConfigs as SpreadsheetSheet['chartConfigs'],
        data,
        automations: [],
        workflowLinks: []
      }
    }),
    sharedWith: [],
    // Permission info from backend
    permission: mapPermission(apiApp.permission as string | undefined),
    isShared: apiApp.isShared as boolean | undefined,
    sharedBy: apiApp.sharedBy as string | undefined
  }
}

/**
 * Spreadsheet API Service
 */
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
  }): Promise<SpreadsheetAppSummary[]> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    if (options?.search) params.set('search', options.search)
    if (options?.page) params.set('page', options.page.toString())
    if (options?.limit) params.set('limit', options.limit.toString())

    const queryString = params.toString()
    const endpoint = `/spreadsheets${queryString ? `?${queryString}` : ''}`

    debugLog('listApps', endpoint)

    const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(endpoint)

    return response.items.map(app => {
      const sheets = (app.sheets as Array<{ rows?: unknown[]; data?: unknown[] }>) || []
      const sheetCount = sheets.length
      // Try to get rowCount from rows (backend) or data (legacy), default to 0
      const rowCount = sheets.reduce((sum, sheet) => sum + (sheet.rows?.length || sheet.data?.length || 0), 0)

      return {
        id: app.id as string,
        name: app.name as string,
        description: app.description as string | undefined,
        icon: app.icon as string | undefined,
        status: app.status as AppStatus,
        createdAt: app.createdAt as string,
        updatedAt: app.updatedAt as string,
        createdBy: app.ownerId as string,
        sheetCount,
        rowCount,
        // Permission info from backend
        permission: mapPermission(app.permission as string | undefined),
        isShared: app.isShared as boolean | undefined,
        isOwner: !app.isShared,
        sharedBy: app.sharedBy as string | undefined
      }
    })
  },

  /**
   * Get a single app by ID
   */
  async getApp(id: string): Promise<SpreadsheetApp | null> {
    try {
      debugLog('getApp', id)
      const app = await apiRequest<Record<string, unknown>>(`/spreadsheets/${id}`)
      return mapApiAppToSpreadsheetApp(app)
    } catch (error) {
      console.error('Failed to get app:', error)
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

    const created = await apiRequest<Record<string, unknown>>('/spreadsheets', {
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

    const updated = await apiRequest<Record<string, unknown>>(`/spreadsheets/${id}`, {
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
      await apiRequest(`/spreadsheets/${id}`, { method: 'DELETE' })
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
      const duplicated = await apiRequest<Record<string, unknown>>(`/spreadsheets/${id}/duplicate`, {
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
      const sheet = await apiRequest<Record<string, unknown>>(`/spreadsheets/${appId}/sheets/${sheetId}`)
      return {
        id: sheet.id as string,
        name: sheet.name as string,
        description: sheet.description as string | undefined,
        viewType:
          (sheet.viewType as SpreadsheetSheet['viewType'] | undefined) ||
          ((sheet.views as Array<Record<string, unknown>> | undefined)?.[0]?.type as
            | SpreadsheetSheet['viewType']
            | undefined) ||
          'table',
        columns: (sheet.columns as SpreadsheetSheet['columns']) || [],
        views: (sheet.views as SpreadsheetSheet['views']) || [],
        settings: (sheet.settings as SpreadsheetSheet['settings']) || {},
        entityDataSource: sheet.entityDataSource as SpreadsheetSheet['entityDataSource'],
        chartConfigs: sheet.chartConfigs as SpreadsheetSheet['chartConfigs'],
        data: [],
        automations: [],
        workflowLinks: []
      }
    } catch (error) {
      console.error('Failed to get sheet:', error)
      return null
    }
  },

  /**
   * Create a new sheet
   */
  async createSheet(appId: string, sheet: Partial<SpreadsheetSheet>): Promise<SpreadsheetSheet> {
    debugLog('createSheet', appId, sheet)

    const payload = {
      name: sheet.name || 'New Sheet',
      description: sheet.description,
      columns: sheet.columns || [],
      views: sheet.views,
      settings: sheet.settings,
      data: sheet.data
    }

    const created = await apiRequest<Record<string, unknown>>(`/spreadsheets/${appId}/sheets`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    return {
      id: created.id as string,
      name: created.name as string,
      description: created.description as string | undefined,
      viewType:
        (created.viewType as SpreadsheetSheet['viewType'] | undefined) ||
        ((created.views as Array<Record<string, unknown>> | undefined)?.[0]?.type as
          | SpreadsheetSheet['viewType']
          | undefined) ||
        'table',
      columns: (created.columns as SpreadsheetSheet['columns']) || [],
      views: (created.views as SpreadsheetSheet['views']) || [],
      settings: (created.settings as SpreadsheetSheet['settings']) || {},
      data: [],
      automations: [],
      workflowLinks: []
    }
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
      settings: updates.settings
    }

    // Remove undefined
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload]
      }
    })

    const updated = await apiRequest<Record<string, unknown>>(`/spreadsheets/${appId}/sheets/${sheetId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })

    return {
      id: updated.id as string,
      name: updated.name as string,
      description: updated.description as string | undefined,
      viewType:
        (updated.viewType as SpreadsheetSheet['viewType'] | undefined) ||
        ((updated.views as Array<Record<string, unknown>> | undefined)?.[0]?.type as
          | SpreadsheetSheet['viewType']
          | undefined) ||
        'table',
      columns: (updated.columns as SpreadsheetSheet['columns']) || [],
      views: (updated.views as SpreadsheetSheet['views']) || [],
      settings: (updated.settings as SpreadsheetSheet['settings']) || {},
      data: [],
      automations: [],
      workflowLinks: []
    }
  },

  /**
   * Delete a sheet
   */
  async deleteSheet(appId: string, sheetId: string): Promise<boolean> {
    try {
      debugLog('deleteSheet', appId, sheetId)
      await apiRequest(`/spreadsheets/${appId}/sheets/${sheetId}`, { method: 'DELETE' })
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
      const endpoint = `/spreadsheets/${appId}/sheets/${sheetId}/rows${queryString ? `?${queryString}` : ''}`

      debugLog('getRows', endpoint)

      const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(endpoint)
      return response.items.map(row => {
        const rowData = (((row as Record<string, unknown>).data as Record<string, unknown>) || {}) as SpreadsheetRowData
        const clientRowId = rowData._clientRowId
        if (clientRowId) {
          return {
            ...rowData,
            _id: clientRowId,
            _rowUuid: (row as Record<string, unknown>).id as string
          }
        }
        return {
          ...rowData,
          _id: (row as Record<string, unknown>).id as string
        }
      })
    } catch (error) {
      console.error('Failed to get rows:', error)
      return []
    }
  },

  /**
   * Add a row
   */
  async addRow(appId: string, sheetId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    debugLog('addRow', appId, sheetId, data)

    const created = await apiRequest<Record<string, unknown>>(`/spreadsheets/${appId}/sheets/${sheetId}/rows`, {
      method: 'POST',
      body: JSON.stringify(data)
    })

    const createdData = (((created as Record<string, unknown>).data as Record<string, unknown>) ||
      {}) as SpreadsheetRowData
    const clientRowId = (data as SpreadsheetRowData)._clientRowId

    // If we created a row for a client row id (entity-data-source), keep the UI key stable
    // and store the backend UUID separately.
    if (clientRowId) {
      return {
        ...createdData,
        _id: clientRowId,
        _rowUuid: (created as Record<string, unknown>).id as string,
        _clientRowId: clientRowId
      }
    }

    return {
      ...createdData,
      _id: (created as Record<string, unknown>).id as string
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

    const updated = await apiRequest<Record<string, unknown>>(
      `/spreadsheets/${appId}/sheets/${sheetId}/rows/${rowId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data)
      }
    )

    const updatedData = (((updated as Record<string, unknown>).data as Record<string, unknown>) ||
      {}) as SpreadsheetRowData
    const clientRowId = updatedData._clientRowId
    if (clientRowId) {
      return {
        ...updatedData,
        _id: clientRowId,
        _rowUuid: (updated as Record<string, unknown>).id as string
      }
    }

    return {
      ...updatedData,
      _id: (updated as Record<string, unknown>).id as string
    }
  },

  /**
   * Delete a row
   */
  async deleteRow(appId: string, sheetId: string, rowId: string): Promise<boolean> {
    try {
      debugLog('deleteRow', appId, sheetId, rowId)
      await apiRequest(`/spreadsheets/${appId}/sheets/${sheetId}/rows/${rowId}`, { method: 'DELETE' })
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

    const created = await apiRequest<Array<Record<string, unknown>>>(
      `/spreadsheets/${appId}/sheets/${sheetId}/rows/bulk`,
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

    // TODO: Import row data from analysis
    // This would require parsing the actual Excel content

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
        contentSnapshot = {
          name: app.name,
          description: app.description,
          sheets: app.sheets,
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
   * Restore a spreadsheet app to a previous version (creates a new version)
   */
  async restoreVersion(appId: string, versionNumber: number): Promise<boolean> {
    try {
      console.log('[SpreadsheetApiService] Restoring version:', appId, versionNumber)

      // Call dedicated backend restore endpoint that handles everything (metadata + sheets + rows)
      const result = await apiRequest<{ success: boolean; message: string; restoredRows: number }>(
        `/spreadsheets/${appId}/restore/${versionNumber}`,
        {
          method: 'POST'
        }
      )

      console.log('[SpreadsheetApiService] Backend restore complete!')
      console.log('[SpreadsheetApiService] Message:', result.message)
      console.log('[SpreadsheetApiService] Restored rows:', result.restoredRows)

      if (result.success) {
        // Create a new version marking it as a restore (like documents do)
        console.log('[SpreadsheetApiService] Creating restore checkpoint...')
        await this.createVersion(appId, {
          changeDescription: `Restored from version ${versionNumber}`,
          isCheckpoint: true
        })
        console.log('[SpreadsheetApiService] Restore checkpoint created!')
      }

      return result.success
    } catch (error) {
      console.error('[SpreadsheetApiService] Failed to restore version:', error)
      return false
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

      return {
        versionA: {
          id: (response.versionA as Record<string, unknown>).id as string,
          version: (response.versionA as Record<string, unknown>).versionNumber as number,
          content: JSON.stringify((response.versionA as Record<string, unknown>).contentSnapshot),
          createdAt: (response.versionA as Record<string, unknown>).createdAt as string,
          createdBy: (response.versionA as Record<string, unknown>).changedBy as string,
          changeDescription: (response.versionA as Record<string, unknown>).changeSummary as string | undefined,
          isCheckpoint: !(response.versionA as Record<string, unknown>).isAutoSave,
          isAutoSave: (response.versionA as Record<string, unknown>).isAutoSave as boolean,
          fileSize: ((response.versionA as Record<string, unknown>).fileSize as number) || 0
        },
        versionB: {
          id: (response.versionB as Record<string, unknown>).id as string,
          version: (response.versionB as Record<string, unknown>).versionNumber as number,
          content: JSON.stringify((response.versionB as Record<string, unknown>).contentSnapshot),
          createdAt: (response.versionB as Record<string, unknown>).createdAt as string,
          createdBy: (response.versionB as Record<string, unknown>).changedBy as string,
          changeDescription: (response.versionB as Record<string, unknown>).changeSummary as string | undefined,
          isCheckpoint: !(response.versionB as Record<string, unknown>).isAutoSave,
          isAutoSave: (response.versionB as Record<string, unknown>).isAutoSave as boolean,
          fileSize: ((response.versionB as Record<string, unknown>).fileSize as number) || 0
        },
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

      const entityId = (response.entityId as string | undefined) || (response.appId as string | undefined)
      const type = response.type as Comment['type'] | undefined
      const content = response.content as string | undefined
      const createdBy = response.createdBy as string | undefined
      const createdAt = response.createdAt as string | undefined

      if (!entityId || !type || content === undefined || !createdBy || !createdAt) {
        return null
      }

      return {
        id: (response.id as string | undefined) || commentId,
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
        parentId: response.parentId as string | undefined
      }
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

      const entityId = (response.entityId as string | undefined) || (response.appId as string | undefined)
      const type = response.type as Comment['type'] | undefined
      const content = response.content as string | undefined
      const createdBy = response.createdBy as string | undefined
      const createdAt = response.createdAt as string | undefined

      if (!entityId || !type || content === undefined || !createdBy || !createdAt) {
        return null
      }

      return {
        id: response.id as string,
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
        parentId: (response.parentId as string | undefined) || commentId
      }
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

      if (!response.isLocked) {
        return null
      }

      return {
        isLocked: Boolean(response.isLocked),
        lockedBy: response.lockedBy as string | undefined,
        lockedByName: response.lockedByName as string | undefined,
        lockedByAvatar: response.lockedByAvatar as string | undefined,
        lockedAt: response.lockedAt as string | undefined,
        lockReason: response.lockReason as string | undefined,
        lockExpiry: response.lockExpiry as string | undefined
      }
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
      const response = await apiRequest<Record<string, unknown>>(`/spreadsheets/${appId}/publish`, {
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
      await apiRequest(`/spreadsheets/${appId}/unpublish`, { method: 'POST' })
      return true
    } catch (error) {
      console.error('Failed to unpublish spreadsheet app:', error)
      return false
    }
  },

  async updateStatus(appId: string, status: string): Promise<PublishMetadata | null> {
    try {
      await apiRequest<Record<string, unknown>>(`/spreadsheets/${appId}/publish-status`, {
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
