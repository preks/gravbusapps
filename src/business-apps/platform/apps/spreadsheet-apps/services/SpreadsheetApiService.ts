/**
 * SpreadsheetApiService
 *
 * Connects to the document-service backend API for spreadsheet app management.
 * This replaces the file-based storage with proper REST API calls.
 *
 * Backend: http://localhost:3002/api/v1
 */

import type { SpreadsheetApp, SpreadsheetAppSummary, SpreadsheetSheet, AppStatus } from '../types/spreadsheet'

// Get the API URL from environment or default to localhost
const getApiUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DOCUMENT_SERVICE_URL) {
    return import.meta.env.VITE_DOCUMENT_SERVICE_URL
  }
  return 'http://localhost:3002/api/v1'
}

const API_URL = getApiUrl()

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

// Get auth token - check multiple storage locations
const getAuthToken = (): string | null => {
  try {
    // First check the IDE's storage key (Business App IDE)
    const ideToken = localStorage.getItem('business-app-ide-access-token')
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'SpreadsheetApiService.ts:getAuthToken',
        message: 'Getting auth token',
        data: { hasIdeToken: !!ideToken, ideTokenLength: ideToken?.length, ideTokenPrefix: ideToken?.substring(0, 20) },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'D'
      })
    }).catch(() => {})
    // #endregion
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

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'SpreadsheetApiService.ts:apiRequest',
      message: 'Making API request',
      data: { endpoint, hasToken: !!token, tokenLength: token?.length, method: options.method || 'GET' },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      hypothesisId: 'F'
    })
  }).catch(() => {})
  // #endregion

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  })

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'SpreadsheetApiService.ts:apiRequest:response',
      message: 'API response received',
      data: { endpoint, status: response.status, ok: response.ok },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      hypothesisId: 'F'
    })
  }).catch(() => {})
  // #endregion

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
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
    sheets: sheets.map(sheet => ({
      id: sheet.id as string,
      name: sheet.name as string,
      description: sheet.description as string | undefined,
      columns: (sheet.columns as SpreadsheetSheet['columns']) || [],
      views: (sheet.views as SpreadsheetSheet['views']) || [],
      settings: (sheet.settings as SpreadsheetSheet['settings']) || {},
      entityDataSource: sheet.entityDataSource as SpreadsheetSheet['entityDataSource'],
      chartConfigs: sheet.chartConfigs as SpreadsheetSheet['chartConfigs'],
      data: [], // Data loaded separately
      automations: [],
      workflowLinks: []
    })),
    sharedWith: []
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

    return response.items.map(app => ({
      id: app.id as string,
      name: app.name as string,
      description: app.description as string | undefined,
      icon: app.icon as string | undefined,
      status: app.status as AppStatus,
      createdAt: app.createdAt as string,
      updatedAt: app.updatedAt as string,
      createdBy: app.ownerId as string,
      sheetCount: ((app.sheets as unknown[]) || []).length
    }))
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
   * Update an app
   */
  async updateApp(id: string, updates: Partial<SpreadsheetApp>): Promise<SpreadsheetApp> {
    debugLog('updateApp', id, updates)

    const payload = {
      name: updates.name,
      description: updates.description,
      icon: updates.icon,
      status: updates.status,
      settings: updates.settings
    }

    // Remove undefined
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload]
      }
    })

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
      return response.items.map(row => ({
        _id: row.id,
        ...(row.data as Record<string, unknown>)
      }))
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

    return {
      _id: created.id,
      ...(created.data as Record<string, unknown>)
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

    return {
      _id: updated.id,
      ...(updated.data as Record<string, unknown>)
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
      sheets: analysis.sheets.map(sheet => ({
        name: sheet.name,
        columns: sheet.columns.map((col, idx) => ({
          id: `col_${idx}`,
          name: col.name,
          label: col.label,
          type: col.type as SpreadsheetSheet['columns'][0]['type'],
          order: idx
        })),
        views: [
          {
            id: 'default',
            name: 'Default Table',
            type: 'table' as const,
            isDefault: true,
            config: {}
          }
        ],
        settings: {},
        data: []
      }))
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
      userId: string
      permission: string
      sharedAt: string
    }>
  > {
    try {
      debugLog('getSharedUsers', appId)
      const shares = await apiRequest<Array<Record<string, unknown>>>(`/sharing/spreadsheet_app/${appId}`)
      return shares.map(s => ({
        userId: s.userId as string,
        permission: s.permission as string,
        sharedAt: s.createdAt as string
      }))
    } catch (error) {
      console.error('Failed to get shared users:', error)
      return []
    }
  }
}

export default SpreadsheetApiService
