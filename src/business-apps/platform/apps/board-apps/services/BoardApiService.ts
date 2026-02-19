/**
 * Board API Service
 *
 * Connects to the document-service /boards endpoints for board management.
 * Boards use the same storage as spreadsheets (nw_docs schema) but are
 * isolated by app_kind='board' and served by a dedicated controller.
 */

import type { Board, BoardSummary, BoardSheet, BoardRow, BoardStatus } from '../types'
import type { BoardColumn, BoardColumnType } from '../types/columns'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import { getEntityDef, flattenEntityRecord, type EntityFieldDef } from '../queries/entityQueries'

const API_URL = getDocumentServiceApiUrl()

let externalAuthTokenProvider: (() => string | null) | null = null

export function setBoardApiAuthTokenProvider(provider: (() => string | null) | null) {
  externalAuthTokenProvider = provider
}

const getAuthToken = (): string | null => {
  try {
    return externalAuthTokenProvider?.() || null
  } catch {
    return null
  }
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T)
}

function mapApiBoard(api: Record<string, unknown>): Board {
  const sheets = (api.sheets as Array<Record<string, unknown>>) || []

  return {
    id: api.id as string,
    name: api.name as string,
    description: api.description as string | undefined,
    icon: api.icon as string | undefined,
    status: api.status as BoardStatus,
    settings: (api.settings as Board['settings']) || {},
    relationships: (api.relationships as Board['relationships']) || [],
    ownerId: api.ownerId as string,
    spaceId: api.spaceId as string | undefined,
    folderId: api.folderId as string | null | undefined,
    permission: mapPermission(api.permission as string | undefined),
    isShared: api.isShared as boolean | undefined,
    sharedBy: api.sharedBy as string | undefined,
    createdAt: api.createdAt as string,
    updatedAt: api.updatedAt as string,
    sheets: sheets.map(mapApiSheet)
  }
}

function mapApiSheet(api: Record<string, unknown>): BoardSheet {
  const rawSettings = (api.settings || {}) as Record<string, unknown>
  const { entityDataSource: settingsEds, ...cleanSettings } = rawSettings
  const eds = api.entityDataSource ?? settingsEds

  return {
    id: api.id as string,
    name: api.name as string,
    description: api.description as string | undefined,
    columns: (api.columns as BoardSheet['columns']) || [],
    views: (api.views as BoardSheet['views']) || [],
    groups: (api.groups as BoardSheet['groups']) || [],
    settings: (cleanSettings as BoardSheet['settings']) || {
      allowAdd: true,
      allowEdit: true,
      allowDelete: true,
      allowExport: true,
      allowImport: true,
      rowsPerPage: 50,
      showRowNumbers: true
    },
    entityDataSource: eds as BoardSheet['entityDataSource'],
    chartConfigs: api.chartConfigs as BoardSheet['chartConfigs'],
    position: (api.position as number) || 0
  }
}

function mapPermission(p: string | undefined): Board['permission'] {
  if (!p) return undefined
  return p === 'admin' ? 'owner' : (p as Board['permission'])
}

function inferColumnType(value: unknown): BoardColumnType {
  if (value === null || value === undefined) return 'text'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return 'datetime'
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
    if (/^https?:\/\//.test(value)) return 'url'
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email'
  }
  return 'text'
}

const PRIMARY_COLUMN_NAMES = ['name', 'title', 'displayName', 'label', 'subject']

const STATUS_HINT_NAMES = [
  'status',
  'state',
  'stage',
  'priority',
  'type',
  'category',
  'department',
  'jobPosition',
  'activityType',
  'requestType',
  'rating',
  'source',
  'pipeline',
  'forecast',
  'assetStatus',
  'absenceType',
  'contractType',
  'employmentType',
  'contentGroup',
  'contentType',
  'gender',
  'nationality',
  'legalForm'
]

const MAX_SELECT_UNIQUE = 20

function inferColumnsFromRecords(records: Record<string, unknown>[]): BoardColumn[] {
  const seen = new Map<string, { type: BoardColumnType; order: number }>()
  const valueSets = new Map<string, Set<string>>()
  let order = 0

  for (const rec of records) {
    for (const [key, val] of Object.entries(rec)) {
      if (val != null && typeof val !== 'object') {
        if (!seen.has(key)) {
          seen.set(key, { type: inferColumnType(val), order: order++ })
          valueSets.set(key, new Set())
        }
        if (typeof val === 'string' && val.length > 0) {
          const set = valueSets.get(key)!
          if (set.size <= MAX_SELECT_UNIQUE) set.add(val)
        }
      }
    }
  }

  const columns = Array.from(seen.entries()).map(([key, info]) => {
    const uniqueValues = valueSets.get(key)
    const isSelectCandidate =
      info.type === 'text' &&
      uniqueValues &&
      uniqueValues.size >= 2 &&
      uniqueValues.size <= MAX_SELECT_UNIQUE &&
      uniqueValues.size < records.length * 0.5
    const isStatusHint = STATUS_HINT_NAMES.includes(key)

    const useSelect = isSelectCandidate && (isStatusHint || uniqueValues!.size <= 10)

    return {
      id: key,
      name: key,
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
        .trim(),
      type: useSelect ? ('status' as BoardColumnType) : info.type,
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: key === 'id',
      order: info.order,
      ...(useSelect
        ? {
            selectOptions: [...uniqueValues!].sort().map(v => ({
              value: v,
              label: v,
              colorToken: undefined
            }))
          }
        : {})
    }
  })

  const primary =
    columns.find(c => PRIMARY_COLUMN_NAMES.includes(c.name)) || columns.find(c => c.type === 'text') || columns[0]
  if (primary) {
    const oldOrder = primary.order
    primary.isPrimary = true
    primary.order = 0
    for (const col of columns) {
      if (col !== primary && col.order <= oldOrder) col.order += 1
    }
  }

  return columns
}

function flattenRecord(record: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    flat[key] = typeof value === 'object' && value !== null ? JSON.stringify(value) : value
  }
  return flat
}

const API_PAGE_LIMIT = 500

async function deleteAllRows(boardId: string, sheetId: string): Promise<number> {
  let deleted = 0
  let hasMore = true
  while (hasMore) {
    const page = await BoardApiService.getRows(boardId, sheetId, { limit: API_PAGE_LIMIT })
    if (page.items.length === 0) break
    await Promise.all(
      page.items.map(row =>
        BoardApiService.deleteRow(boardId, sheetId, row.id).then(ok => {
          if (ok) deleted++
        })
      )
    )
    hasMore = page.items.length === API_PAGE_LIMIT
  }
  return deleted
}

export const BoardApiService = {
  async listBoards(options?: {
    status?: BoardStatus
    search?: string
    page?: number
    limit?: number
  }): Promise<BoardSummary[]> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    if (options?.search) params.set('search', options.search)
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))

    const qs = params.toString()
    const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(`/boards${qs ? `?${qs}` : ''}`)

    return response.items.map(app => {
      const sheets = (app.sheets as Array<Record<string, unknown>>) || []
      return {
        id: app.id as string,
        name: app.name as string,
        description: app.description as string | undefined,
        icon: app.icon as string | undefined,
        status: app.status as BoardStatus,
        sheetCount: sheets.length,
        rowCount: (app.rowCount as number) || 0,
        createdAt: app.createdAt as string,
        updatedAt: app.updatedAt as string,
        permission: mapPermission(app.permission as string | undefined),
        isShared: app.isShared as boolean | undefined,
        sharedBy: app.sharedBy as string | undefined
      }
    })
  },

  async getBoard(id: string): Promise<Board | null> {
    try {
      const data = await apiRequest<Record<string, unknown>>(`/boards/${id}`)
      return mapApiBoard(data)
    } catch {
      return null
    }
  },

  async createBoard(board: Partial<Board>): Promise<Board> {
    const payload = {
      name: board.name || 'Untitled Board',
      description: board.description,
      icon: board.icon,
      status: board.status || 'draft',
      settings: board.settings,
      sheets: board.sheets?.map(s => ({
        name: s.name,
        description: s.description,
        columns: s.columns,
        views: s.views,
        groups: s.groups,
        settings: s.settings
      }))
    }
    const created = await apiRequest<Record<string, unknown>>('/boards', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return mapApiBoard(created)
  },

  async updateBoard(id: string, updates: Partial<Board>): Promise<Board> {
    const payload: Record<string, unknown> = {
      name: updates.name,
      description: updates.description,
      icon: updates.icon,
      status: updates.status,
      settings: updates.settings
    }
    Object.keys(payload).forEach(k => {
      if (payload[k] === undefined) delete payload[k]
    })

    const updated = await apiRequest<Record<string, unknown>>(`/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
    return mapApiBoard(updated)
  },

  async deleteBoard(id: string): Promise<boolean> {
    try {
      await apiRequest(`/boards/${id}`, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  },

  async duplicateBoard(id: string): Promise<Board | null> {
    try {
      const data = await apiRequest<Record<string, unknown>>(`/boards/${id}/duplicate`, { method: 'POST' })
      return mapApiBoard(data)
    } catch {
      return null
    }
  },

  async getRows(
    boardId: string,
    sheetId: string,
    options?: { page?: number; limit?: number; sort?: string; filters?: string; search?: string; groupBy?: string }
  ): Promise<{ items: BoardRow[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.sort) params.set('sort', options.sort)
    if (options?.filters) params.set('filters', options.filters)
    if (options?.search) params.set('search', options.search)
    if (options?.groupBy) params.set('groupBy', options.groupBy)

    const qs = params.toString()
    const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(
      `/boards/${boardId}/sheets/${sheetId}/rows${qs ? `?${qs}` : ''}`
    )

    return {
      items: response.items.map(r => ({
        id: r.id as string,
        data: (r.data as Record<string, unknown>) || {},
        groupId: r.groupId as string | null | undefined,
        parentRowId: r.parentRowId as string | null | undefined,
        createdBy: r.createdBy as string | undefined,
        updatedBy: r.updatedBy as string | undefined,
        createdAt: r.createdAt as string | undefined,
        updatedAt: r.updatedAt as string | undefined
      })),
      total: response.total,
      page: response.page,
      totalPages: response.totalPages
    }
  },

  async locateRow(boardId: string, sheetId: string, rowId: string): Promise<{ rowIndex: number } | null> {
    try {
      const result = await apiRequest<{ rowIndex: number }>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}/locate`)
      if (typeof result?.rowIndex !== 'number') return null
      return { rowIndex: result.rowIndex }
    } catch {
      return null
    }
  },

  async createRow(boardId: string, sheetId: string, data: Record<string, unknown>): Promise<BoardRow> {
    const result = await apiRequest<Record<string, unknown>>(`/boards/${boardId}/sheets/${sheetId}/rows`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return { id: result.id as string, data: (result.data as Record<string, unknown>) || {} }
  },

  async updateRow(boardId: string, sheetId: string, rowId: string, data: Record<string, unknown>): Promise<BoardRow> {
    const result = await apiRequest<Record<string, unknown>>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
    return { id: result.id as string, data: (result.data as Record<string, unknown>) || {} }
  },

  async deleteRow(boardId: string, sheetId: string, rowId: string): Promise<boolean> {
    try {
      await apiRequest(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}`, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  },

  async getRowPage(
    boardId: string,
    sheetId: string,
    rowId: string
  ): Promise<{ noteId: string | null; title?: string; content?: string }> {
    try {
      return await apiRequest<{ noteId: string | null; title?: string; content?: string }>(
        `/boards/${boardId}/sheets/${sheetId}/rows/${rowId}/page`
      )
    } catch {
      return { noteId: null }
    }
  },

  async createRowPage(
    boardId: string,
    sheetId: string,
    rowId: string,
    dto: { title?: string; content?: string }
  ): Promise<{ noteId: string; title?: string }> {
    return apiRequest<{ noteId: string; title?: string }>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}/page`, {
      method: 'POST',
      body: JSON.stringify(dto)
    })
  },

  async updateRowPage(
    boardId: string,
    sheetId: string,
    rowId: string,
    dto: { title?: string; content?: string }
  ): Promise<{ noteId: string; title?: string }> {
    return apiRequest<{ noteId: string; title?: string }>(`/boards/${boardId}/sheets/${sheetId}/rows/${rowId}/page`, {
      method: 'PATCH',
      body: JSON.stringify(dto)
    })
  },

  async updateSheet(boardId: string, sheetId: string, updates: Partial<BoardSheet>): Promise<BoardSheet> {
    const payload: Record<string, unknown> = {
      name: updates.name,
      description: updates.description,
      columns: updates.columns,
      views: updates.views,
      groups: updates.groups,
      settings: updates.settings
    }

    if (updates.entityDataSource !== undefined) {
      const currentSheet = await BoardApiService.getSheet(boardId, sheetId)
      const currentSettings = currentSheet?.settings || {
        allowAdd: true,
        allowEdit: true,
        allowDelete: true,
        allowExport: true,
        allowImport: true,
        rowsPerPage: 50,
        showRowNumbers: true
      }
      payload.settings = {
        ...currentSettings,
        ...(updates.settings || {}),
        entityDataSource: updates.entityDataSource
      }
    }

    Object.keys(payload).forEach(k => {
      if (payload[k] === undefined) delete payload[k]
    })

    const result = await apiRequest<Record<string, unknown>>(`/boards/${boardId}/sheets/${sheetId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
    return mapApiSheet(result)
  },

  // ── Missing endpoints (search, import, export, sync, getSheet) ──

  async getSheet(boardId: string, sheetId: string): Promise<BoardSheet | null> {
    try {
      const result = await apiRequest<Record<string, unknown>>(`/boards/${boardId}/sheets/${sheetId}`)
      return mapApiSheet(result)
    } catch {
      return null
    }
  },

  async searchRows(
    boardId: string,
    query: string,
    options?: { sheetId?: string; limit?: number }
  ): Promise<
    Array<{ rowId: string; sheetId: string; sheetName: string; matchSnippet: string; data: Record<string, unknown> }>
  > {
    const params = new URLSearchParams({ q: query })
    if (options?.sheetId) params.set('sheetId', options.sheetId)
    if (options?.limit) params.set('limit', String(options.limit))
    try {
      return await apiRequest<
        Array<{
          rowId: string
          sheetId: string
          sheetName: string
          matchSnippet: string
          data: Record<string, unknown>
        }>
      >(`/boards/${boardId}/search?${params}`)
    } catch {
      return []
    }
  },

  async importRows(
    boardId: string,
    sheetId: string,
    rows: Array<Record<string, unknown>>,
    mode: 'append' | 'replace' = 'append'
  ): Promise<{ imported: number; deleted: number } | null> {
    try {
      return await apiRequest<{ imported: number; deleted: number }>(`/boards/${boardId}/sheets/${sheetId}/import`, {
        method: 'POST',
        body: JSON.stringify({ rows, mode })
      })
    } catch {
      return null
    }
  },

  async exportRows(
    boardId: string,
    sheetId: string
  ): Promise<{ rows: Array<Record<string, unknown>>; total: number } | null> {
    try {
      return await apiRequest<{ rows: Array<Record<string, unknown>>; total: number }>(
        `/boards/${boardId}/sheets/${sheetId}/export`
      )
    } catch {
      return null
    }
  },

  async populateColumnOptions(
    boardId: string,
    sheetId: string,
    entityType: string,
    sourceField: string,
    targetColumnName: string,
    limit: number,
    fieldDefs?: EntityFieldDef[]
  ): Promise<{ optionCount: number } | null> {
    try {
      const def = getEntityDef(entityType)
      if (!def) return null

      const token = getAuthToken()
      if (token) graphQLClient.setAccessToken(token)

      const data = await graphQLClient.request<Record<string, unknown>>(def.query, {
        where: {},
        limit: limit > 0 ? limit : undefined,
        offset: 0
      })
      const rawEntities = (data[def.entityKey] ?? []) as Record<string, unknown>[]
      const fieldsToUse = fieldDefs ?? def.fields
      const records = rawEntities.map(rec => flattenEntityRecord(rec, fieldsToUse))

      const uniqueValues = [...new Set(records.map(r => String(r[sourceField] ?? '')).filter(v => v.length > 0))].sort()

      if (uniqueValues.length === 0) return { optionCount: 0 }

      const currentSheet = await BoardApiService.getSheet(boardId, sheetId)
      if (!currentSheet) return null

      const targetCol = currentSheet.columns.find(c => c.name === targetColumnName)
      if (!targetCol) return null

      const existingValues = new Set((targetCol.selectOptions ?? []).map(o => o.value))
      const newOptions = uniqueValues.filter(v => !existingValues.has(v))

      const updatedColumn = {
        ...targetCol,
        type: targetCol.type === 'text' ? ('select' as const) : targetCol.type,
        selectOptions: [
          ...(targetCol.selectOptions ?? []),
          ...newOptions.map(v => ({ value: v, label: v, colorToken: undefined }))
        ]
      }

      const updatedColumns = currentSheet.columns.map(c => (c.name === targetColumnName ? updatedColumn : c))
      await BoardApiService.updateSheet(boardId, sheetId, { columns: updatedColumns })

      return { optionCount: newOptions.length }
    } catch {
      return null
    }
  },

  async syncFromEntity(
    boardId: string,
    sheetId: string,
    records: Array<Record<string, unknown>>,
    mode: 'replace' | 'append' | 'merge',
    mergeKey?: string
  ): Promise<{ synced: number; deleted: number } | null> {
    try {
      const flat = records.map(flattenRecord)
      return await apiRequest<{ synced: number; deleted: number }>(
        `/boards/${boardId}/sheets/${sheetId}/sync-from-entity`,
        { method: 'POST', body: JSON.stringify({ records: flat, mode, mergeKey }) }
      )
    } catch {
      return null
    }
  },

  async syncFromGraphQL(
    boardId: string,
    sheetId: string,
    dto: {
      entity: string
      limit?: number
      mode: 'replace' | 'append' | 'merge'
      mergeKey?: string
      autoColumns?: boolean
      records?: Record<string, unknown>[]
      fieldDefs?: EntityFieldDef[]
      mergeStrategy?: 'addRows' | 'addColumns' | 'hybrid'
      joinKey?: { existingColumn: string; newColumn: string }
    }
  ): Promise<{ synced: number; deleted: number; fetched: number } | null> {
    try {
      let records = dto.records ?? []

      if (records.length === 0) {
        const def = getEntityDef(dto.entity)
        if (!def) throw new Error(`Unknown entity: ${dto.entity}`)

        const token = getAuthToken()
        if (token) graphQLClient.setAccessToken(token)

        const variables: Record<string, unknown> = {
          where: {},
          limit: dto.limit && dto.limit > 0 ? dto.limit : undefined,
          offset: 0
        }

        const data = await graphQLClient.request<Record<string, unknown>>(def.query, variables)
        const rawEntities = (data[def.entityKey] ?? []) as Record<string, unknown>[]
        const fieldsToUse = dto.fieldDefs ?? def.fields
        records = rawEntities.map(rec => flattenEntityRecord(rec, fieldsToUse))
      }

      if (records.length === 0) return { synced: 0, deleted: 0, fetched: 0 }

      if (dto.autoColumns) {
        const newColumns = inferColumnsFromRecords(records)
        if (newColumns.length > 0) {
          if (dto.mode === 'replace') {
            await BoardApiService.updateSheet(boardId, sheetId, { columns: newColumns })
          } else {
            const currentSheet = await BoardApiService.getSheet(boardId, sheetId)
            const existingNames = new Set((currentSheet?.columns ?? []).map(c => c.name))
            const merged = [...(currentSheet?.columns ?? []), ...newColumns.filter(c => !existingNames.has(c.name))]
            await BoardApiService.updateSheet(boardId, sheetId, { columns: merged })
          }
        }
      }

      let deleted = 0
      if (dto.mode === 'replace') {
        deleted = await deleteAllRows(boardId, sheetId)
      }

      const flat = records.map(flattenRecord)
      let synced = 0

      if ((dto.mergeStrategy === 'addColumns' || dto.mergeStrategy === 'hybrid') && dto.joinKey) {
        const existingPage = await BoardApiService.getRows(boardId, sheetId, { limit: API_PAGE_LIMIT })
        const existingRows = existingPage.items
        const { existingColumn, newColumn } = dto.joinKey
        const existingMap = new Map(existingRows.map(r => [String(r.data[existingColumn] ?? ''), r]))

        const unmatchedRows: Record<string, unknown>[] = []
        for (const incoming of flat) {
          const key = String(incoming[newColumn] ?? '')
          const matched = existingMap.get(key)
          if (matched) {
            const mergedData = { ...matched.data, ...incoming }
            await BoardApiService.updateRow(boardId, sheetId, matched.id, mergedData).catch(() => null)
            synced++
          } else {
            unmatchedRows.push(incoming)
          }
        }

        const BATCH = 10
        for (let i = 0; i < unmatchedRows.length; i += BATCH) {
          const results = await Promise.all(
            unmatchedRows
              .slice(i, i + BATCH)
              .map(rowData => BoardApiService.createRow(boardId, sheetId, rowData).catch(() => null))
          )
          synced += results.filter(Boolean).length
        }
      } else {
        const BATCH = 10
        for (let i = 0; i < flat.length; i += BATCH) {
          const results = await Promise.all(
            flat
              .slice(i, i + BATCH)
              .map(rowData => BoardApiService.createRow(boardId, sheetId, rowData).catch(() => null))
          )
          synced += results.filter(Boolean).length
        }
      }

      return { synced, deleted, fetched: records.length }
    } catch {
      return null
    }
  }
}

export default BoardApiService
