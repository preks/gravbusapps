/**
 * Board API Service
 *
 * Connects to the document-service /boards endpoints for board management.
 * Boards use the same storage as spreadsheets (nw_docs schema) but are
 * isolated by app_kind='board' and served by a dedicated controller.
 */

import type {
  Board,
  BoardSummary,
  BoardSheet,
  BoardRow,
  BoardStatus,
  BoardStatsResponse,
  MyWorkResponse,
  BoardShare,
  BoardPermission
} from '../types'
import type { BoardColumn, BoardColumnType } from '../types/columns'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import {
  getEntityDef,
  flattenEntityRecord,
  buildEntityDefaultWhere,
  type EntityFieldDef
} from '../queries/entityQueries'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { resilientGraphQLRequest } from '../queries/resilientQuery'
import { smartSyncRows } from './smartSync'

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
  'jobTitle',
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

const SEMANTIC_COLOR_MAP: Array<{ pattern: RegExp; token: string }> = [
  { pattern: /^(active|approved|won|completed|resolved|done|hired|accepted|published|signed)$/i, token: 'success' },
  { pattern: /^(open|started|enabled|running|in_?service)$/i, token: 'success' },
  {
    pattern: /^(closed|lost|rejected|cancelled|failed|terminated|fired|deleted|declined|archived)$/i,
    token: 'destructive'
  },
  { pattern: /^(pending|in.?progress|review|draft|on.?hold|waiting|submitted|processing)$/i, token: 'warning' },
  { pattern: /^(new|prospect|qualified|screening|applied|initial|lead|inquiry)$/i, token: 'info' }
]
const ROTATION_TOKENS = ['primary', 'info', 'success', 'warning', 'muted']

function assignColorTokens(options: Array<{ value: string; label: string; colorToken?: string }>): typeof options {
  let rotationIdx = 0
  return options.map(opt => {
    if (opt.colorToken) return opt
    const semantic = SEMANTIC_COLOR_MAP.find(m => m.pattern.test(opt.value))
    if (semantic) return { ...opt, colorToken: semantic.token }
    const token = ROTATION_TOKENS[rotationIdx % ROTATION_TOKENS.length]
    rotationIdx++
    return { ...opt, colorToken: token }
  })
}

const HIDDEN_DATA_COLUMNS = new Set(['initiatedById'])

function inferColumnsFromRecords(records: Record<string, unknown>[], primaryKey?: string): BoardColumn[] {
  const seen = new Map<string, { type: BoardColumnType; order: number }>()
  const valueSets = new Map<string, Set<string>>()
  let order = 0

  for (const rec of records) {
    for (const [key, val] of Object.entries(rec)) {
      if (HIDDEN_DATA_COLUMNS.has(key)) continue
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
            selectOptions: assignColorTokens(
              [...uniqueValues!].sort().map(v => ({ value: v, label: v, colorToken: undefined }))
            )
          }
        : {})
    }
  })

  const primary = primaryKey
    ? columns.find(c => c.name === primaryKey) || columns[0]
    : columns.find(c => PRIMARY_COLUMN_NAMES.includes(c.name)) || columns.find(c => c.type === 'text') || columns[0]
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
        rowCount: (app.rowCount as number) ?? 0,
        spaceId: app.spaceId as string | undefined,
        createdAt: app.createdAt as string,
        updatedAt: app.updatedAt as string,
        permission: mapPermission(app.permission as string | undefined),
        isShared: app.isShared as boolean | undefined,
        sharedBy: app.sharedBy as string | undefined
      }
    })
  },

  async getBoardStats(): Promise<BoardStatsResponse> {
    try {
      return await apiRequest<BoardStatsResponse>('/boards/stats')
    } catch {
      return {
        totalBoards: 0,
        totalRows: 0,
        sharedBoards: 0,
        activeThisWeek: 0,
        overdueItems: 0,
        boardsByStatus: { draft: 0, promoted: 0, archived: 0 }
      }
    }
  },

  async getMyWork(options?: { scope?: 'all' | 'assigned' }): Promise<MyWorkResponse> {
    try {
      const params = new URLSearchParams()
      if (options?.scope) params.set('scope', options.scope)
      const qs = params.toString()
      return await apiRequest<MyWorkResponse>(`/boards/my-work${qs ? `?${qs}` : ''}`)
    } catch {
      return {
        overdue: [],
        dueToday: [],
        dueThisWeek: [],
        upcoming: [],
        blocked: [],
        recentlyCompleted: [],
        totalAssigned: 0
      }
    }
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
    options?: {
      page?: number
      limit?: number
      sort?: string
      sortOrder?: 'ASC' | 'DESC'
      filters?: string
      filterConnector?: 'and' | 'or'
      sorts?: string
      search?: string
      groupBy?: string
    }
  ): Promise<{ items: BoardRow[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', String(options.page))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.sort) params.set('sort', options.sort)
    if (options?.sortOrder) params.set('sortOrder', options.sortOrder)
    if (options?.filters) params.set('filters', options.filters)
    if (options?.filterConnector) params.set('filterConnector', options.filterConnector)
    if (options?.sorts) params.set('sorts', options.sorts)
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

  async reorderRow(
    boardId: string,
    sheetId: string,
    rowId: string,
    afterRowId: string | null,
    beforeRowId: string | null
  ): Promise<void> {
    await apiRequest(`/boards/${boardId}/sheets/${sheetId}/rows/reorder`, {
      method: 'POST',
      body: JSON.stringify({ rowId, afterRowId, beforeRowId })
    })
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

      const structureId = getCurrentActiveStructureId()
      const defaultWhere = buildEntityDefaultWhere(entityType, structureId)

      const result = await resilientGraphQLRequest<Record<string, unknown>>(
        def.query,
        { where: defaultWhere, limit: limit > 0 ? limit : undefined, offset: 0 },
        fieldDefs ?? def.fields
      )
      const rawEntities = (result.data[def.entityKey] ?? []) as Record<string, unknown>[]
      const records = rawEntities.map(rec => flattenEntityRecord(rec, result.fields))

      const uniqueValues = [...new Set(records.map(r => String(r[sourceField] ?? '')).filter(v => v.length > 0))].sort()

      if (uniqueValues.length === 0) return { optionCount: 0 }

      const currentSheet = await BoardApiService.getSheet(boardId, sheetId)
      if (!currentSheet) return null

      const targetCol = currentSheet.columns.find(c => c.name === targetColumnName)
      if (!targetCol) return null

      const existingValues = new Set((targetCol.selectOptions ?? []).map(o => o.value))
      const newOptions = uniqueValues.filter(v => !existingValues.has(v))

      const mergedOptions = [
        ...(targetCol.selectOptions ?? []),
        ...newOptions.map(v => ({ value: v, label: v, colorToken: undefined as string | undefined }))
      ]
      const updatedColumn = {
        ...targetCol,
        type: targetCol.type === 'text' ? ('select' as const) : targetCol.type,
        selectOptions: assignColorTokens(mergedOptions)
      }

      const updatedColumns = currentSheet.columns.map(c => (c.name === targetColumnName ? updatedColumn : c))
      await BoardApiService.updateSheet(boardId, sheetId, { columns: updatedColumns })

      return { optionCount: newOptions.length }
    } catch {
      return null
    }
  },

  async getColumnTags(
    boardId: string,
    sheetId: string,
    columnName: string,
    options?: { search?: string; limit?: number }
  ): Promise<string[]> {
    try {
      const params = new URLSearchParams()
      if (options?.search) params.set('search', options.search)
      if (options?.limit) params.set('limit', String(options.limit))
      const qs = params.toString()
      const result = await apiRequest<{ tags: string[] }>(
        `/boards/${boardId}/sheets/${sheetId}/columns/${encodeURIComponent(columnName)}/tags${qs ? `?${qs}` : ''}`
      )
      return result.tags ?? []
    } catch {
      return []
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
      const records = dto.records ?? []

      if (records.length === 0) {
        const def = getEntityDef(dto.entity)
        if (!def) throw new Error(`Unknown entity: ${dto.entity}`)

        const token = getAuthToken()
        if (token) graphQLClient.setAccessToken(token)

        const structureId = getCurrentActiveStructureId()
        const defaultWhere = buildEntityDefaultWhere(dto.entity, structureId)
        let currentFields = dto.fieldDefs ?? def.fields

        console.log(`[BoardSync] Fetching entity=${dto.entity}, limit=${dto.limit ?? 'ALL'}, where=`, defaultWhere)

        const PAGE_SIZE = 200
        const requestedLimit = dto.limit && dto.limit > 0 ? dto.limit : 0
        let totalFetched = 0
        let offset = 0
        let hasMore = true

        while (hasMore) {
          const remaining = requestedLimit > 0 ? requestedLimit - totalFetched : PAGE_SIZE
          const pageLimit = Math.min(PAGE_SIZE, remaining)

          const variables: Record<string, unknown> = {
            where: defaultWhere,
            limit: pageLimit,
            offset
          }

          const result = await resilientGraphQLRequest<Record<string, unknown>>(def.query, variables, currentFields)
          currentFields = result.fields
          const rawEntities = (result.data[def.entityKey] ?? []) as Record<string, unknown>[]
          const pageRecords = rawEntities.map(rec => flattenEntityRecord(rec, result.fields))
          records.push(...pageRecords)
          totalFetched += pageRecords.length
          offset += pageRecords.length

          console.log(
            `[BoardSync] Page fetched: ${pageRecords.length} records (total so far: ${totalFetched}, offset: ${offset})`
          )

          hasMore = pageRecords.length === pageLimit && (requestedLimit === 0 || totalFetched < requestedLimit)
        }

        console.log(`[BoardSync] Fetch complete: ${records.length} total records for ${dto.entity}`)
      }

      if (records.length === 0) return { synced: 0, deleted: 0, fetched: 0 }

      if (dto.autoColumns) {
        const newColumns = inferColumnsFromRecords(records)
        if (newColumns.length > 0) {
          const currentSheet = await BoardApiService.getSheet(boardId, sheetId)
          const existingNames = new Set((currentSheet?.columns ?? []).map(c => c.name))
          const merged = [...(currentSheet?.columns ?? []), ...newColumns.filter(c => !existingNames.has(c.name))]
          if (merged.length > (currentSheet?.columns ?? []).length || dto.mode === 'replace') {
            await BoardApiService.updateSheet(boardId, sheetId, { columns: merged.length > 0 ? merged : newColumns })
          }
        }
      }

      const flat = records.map(flattenRecord)

      if (dto.mode === 'replace') {
        const result = await smartSyncRows(BoardApiService, boardId, sheetId, flat)
        console.log(`[BoardSync] Done: synced=${result.synced}, deleted=${result.deleted}, fetched=${records.length}`)
        return { synced: result.synced, deleted: result.deleted, fetched: records.length }
      }

      let synced = 0
      const deleted = 0

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

        const BATCH = 5
        for (let i = 0; i < unmatchedRows.length; i += BATCH) {
          const results = await Promise.all(
            unmatchedRows
              .slice(i, i + BATCH)
              .map(rowData => BoardApiService.createRow(boardId, sheetId, rowData).catch(() => null))
          )
          synced += results.filter(Boolean).length
        }
      } else {
        const BATCH = 5
        for (let i = 0; i < flat.length; i += BATCH) {
          const results = await Promise.all(
            flat
              .slice(i, i + BATCH)
              .map(rowData => BoardApiService.createRow(boardId, sheetId, rowData).catch(() => null))
          )
          synced += results.filter(Boolean).length
        }
      }

      console.log(`[BoardSync] Done: synced=${synced}, deleted=${deleted}, fetched=${records.length}`)
      return { synced, deleted, fetched: records.length }
    } catch (err) {
      console.error(`[BoardSync] FAILED for entity=${dto.entity}:`, err instanceof Error ? err.message : err)
      return null
    }
  },

  async syncFromFlowEngine(
    boardId: string,
    sheetId: string,
    dto: {
      flowEntity: 'flows' | 'tasks'
      templateIds?: string[]
      tags?: Array<{ key: string; value: string }>
      scope?: 'all' | 'byUser'
      userId?: string
      participationType?: 'initiated' | 'participated'
      includeAssigned?: boolean
      includeClaimable?: boolean
      status?: string
      customStatus?: string
      priority?: string
      search?: string
      limit?: number
      mode: 'replace' | 'append' | 'merge'
      mergeKey?: string
      autoColumns?: boolean
      selectedFields?: string[]
      dryRun?: boolean
    }
  ): Promise<{ synced: number; deleted: number; fetched: number; previewRecords?: Record<string, unknown>[] } | null> {
    const humanizeFlowName = (raw: string) =>
      raw
        .replace(/^flow_/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())

    try {
      const { listFlows, listTasks } = await import('./flowEngine/flowEngineClient')
      const requestedLimit = dto.limit && dto.limit > 0 ? dto.limit : 500
      let records: Record<string, unknown>[] = []

      if (dto.flowEntity === 'flows') {
        const { flows } = await listFlows({
          status: dto.status,
          search: dto.search,
          limit: requestedLimit,
          tags: dto.tags,
          participationType: dto.participationType,
          userId: dto.scope === 'byUser' ? dto.userId : undefined,
          templateIds: dto.templateIds
        })
        records = flows.map(f => ({
          id: f.flowId,
          flowId: f.flowId,
          name: humanizeFlowName(f.flowName),
          status: f.status,
          progress: f.totalSteps > 0 ? `${f.currentStep}/${f.totalSteps} (${f.progressPercentage}%)` : '',
          initiatedBy: f.initiatedBy,
          initiatedById: f.initiatedById ?? '',
          startTime: f.startTime,
          updateTime: f.updateTime,
          endTime: f.endTime ?? '',
          priority: f.priority ?? '',
          isOverdue: f.isOverdue ? 'Yes' : 'No',
          templateId: f.templateId
        }))
      } else {
        const templateIds = dto.templateIds ?? []
        if (templateIds.length > 0) {
          for (const tid of templateIds) {
            const { tasks } = await listTasks({
              templateId: tid,
              userId: dto.scope === 'byUser' ? dto.userId : undefined,
              includeAssigned: dto.includeAssigned,
              includeClaimable: dto.includeClaimable,
              search: dto.search,
              customStatus: dto.customStatus,
              priority: dto.priority,
              limit: requestedLimit,
              tags: dto.tags
            })
            records.push(
              ...tasks.map(t => ({
                id: t.id,
                taskId: t.id,
                flowId: t.flowId,
                flowName: t.flowName ?? '',
                title: t.title,
                name: t.name,
                status: t.status,
                priority: t.priority ?? '',
                customStatus: t.customStatus ?? '',
                dueDate: t.dueDate ?? '',
                scheduledAt: t.scheduledAt ?? '',
                completedAt: t.completedAt ?? '',
                stepIndex: t.stepIndex ?? '',
                assignedTo: t.assignedTo ?? '',
                claimedBy: t.claimedBy ?? '',
                assignmentStatus: t.assignmentStatus ?? '',
                templateId: t.templateId ?? tid,
                templateName: t.templateName ?? ''
              }))
            )
          }
        } else {
          const { tasks } = await listTasks({
            userId: dto.scope === 'byUser' ? dto.userId : undefined,
            includeAssigned: dto.includeAssigned,
            includeClaimable: dto.includeClaimable,
            search: dto.search,
            customStatus: dto.customStatus,
            priority: dto.priority,
            limit: requestedLimit,
            tags: dto.tags
          })
          records = tasks.map(t => ({
            id: t.id,
            taskId: t.id,
            flowId: t.flowId,
            flowName: t.flowName ?? '',
            title: t.title,
            name: t.name,
            status: t.status,
            priority: t.priority ?? '',
            customStatus: t.customStatus ?? '',
            dueDate: t.dueDate ?? '',
            scheduledAt: t.scheduledAt ?? '',
            completedAt: t.completedAt ?? '',
            stepIndex: t.stepIndex ?? '',
            assignedTo: t.assignedTo ?? '',
            claimedBy: t.claimedBy ?? '',
            assignmentStatus: t.assignmentStatus ?? '',
            templateId: t.templateId ?? '',
            templateName: t.templateName ?? ''
          }))
        }
      }

      if (requestedLimit > 0 && records.length > requestedLimit) {
        records = records.slice(0, requestedLimit)
      }

      if (dto.selectedFields?.length) {
        const keep = new Set(dto.selectedFields)
        const pk = dto.flowEntity === 'flows' ? 'flowId' : 'taskId'
        keep.add('id')
        keep.add(pk)
        records = records.map(rec => {
          const filtered: Record<string, unknown> = {}
          for (const k of Object.keys(rec)) {
            if (keep.has(k)) filtered[k] = rec[k]
          }
          return filtered
        })
      }

      console.log(`[BoardSync:FlowEngine] Fetched ${records.length} ${dto.flowEntity} records`)

      if (records.length === 0) return { synced: 0, deleted: 0, fetched: 0 }

      if (dto.dryRun) {
        return { synced: 0, deleted: 0, fetched: records.length, previewRecords: records.slice(0, 20) }
      }

      const primaryKey = dto.flowEntity === 'flows' ? 'flowId' : 'taskId'

      if (dto.autoColumns) {
        const newColumns = inferColumnsFromRecords(records, primaryKey)
        if (newColumns.length > 0) {
          const currentSheet = await BoardApiService.getSheet(boardId, sheetId)
          const existingNames = new Set((currentSheet?.columns ?? []).map(c => c.name))
          const merged = [...(currentSheet?.columns ?? []), ...newColumns.filter(c => !existingNames.has(c.name))]
          if (merged.length > (currentSheet?.columns ?? []).length || dto.mode === 'replace') {
            await BoardApiService.updateSheet(boardId, sheetId, { columns: merged.length > 0 ? merged : newColumns })
          }
        }
      }

      const flat = records.map(flattenRecord)

      if (dto.mode === 'replace') {
        const result = await smartSyncRows(BoardApiService, boardId, sheetId, flat)
        console.log(
          `[BoardSync:FlowEngine] Done: synced=${result.synced}, deleted=${result.deleted}, fetched=${records.length}`
        )
        return { synced: result.synced, deleted: result.deleted, fetched: records.length }
      }

      let synced = 0
      const BATCH = 5
      for (let i = 0; i < flat.length; i += BATCH) {
        const results = await Promise.all(
          flat
            .slice(i, i + BATCH)
            .map(rowData => BoardApiService.createRow(boardId, sheetId, rowData).catch(() => null))
        )
        synced += results.filter(Boolean).length
      }

      console.log(`[BoardSync:FlowEngine] Done: synced=${synced}, fetched=${records.length}`)
      return { synced, deleted: 0, fetched: records.length }
    } catch (err) {
      console.error('[BoardSync:FlowEngine] FAILED:', err instanceof Error ? err.message : err)
      return null
    }
  },

  async shareBoard(boardId: string, shares: Array<{ userId: string; permission: BoardPermission }>): Promise<boolean> {
    try {
      await apiRequest('/sharing', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'spreadsheet_app',
          entityId: boardId,
          recipients: shares.map(s => ({ userId: s.userId, permission: s.permission }))
        })
      })
      return true
    } catch (error) {
      console.error('Failed to share board:', error instanceof Error ? error.message : error)
      return false
    }
  },

  async getBoardSharedUsers(boardId: string): Promise<BoardShare[]> {
    try {
      const shares = await apiRequest<Array<Record<string, unknown>>>(`/sharing/spreadsheet_app/${boardId}`)
      return (shares || []).map(s => ({
        id: s.id as string,
        userId: s.userId as string,
        permission: s.permission as BoardPermission,
        sharedAt: s.createdAt as string,
        sharedBy: s.sharedBy as string
      }))
    } catch {
      return []
    }
  },

  async updateBoardSharePermission(shareId: string, permission: BoardPermission): Promise<boolean> {
    try {
      await apiRequest(`/sharing/${shareId}`, {
        method: 'PATCH',
        body: JSON.stringify({ permission })
      })
      return true
    } catch {
      return false
    }
  },

  async serverAnalyticsQuery(
    boardId: string,
    sheetId: string,
    query: { type: string; query?: Record<string, unknown> }
  ): Promise<{ data: Array<Record<string, unknown>>; totalRows: number; isSampled: boolean } | null> {
    try {
      return await apiRequest(`/boards/${boardId}/sheets/${sheetId}/analytics/query`, {
        method: 'POST',
        body: JSON.stringify(query)
      })
    } catch (err) {
      console.error('Server analytics query failed:', err instanceof Error ? err.message : err)
      return null
    }
  },

  async revokeBoardShare(shareId: string): Promise<boolean> {
    try {
      await apiRequest(`/sharing/${shareId}`, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  },

  // ── External data source methods ──────────────────────────────────

  async listExternalConnectors(boardId: string, sheetId: string): Promise<Array<Record<string, unknown>>> {
    try {
      return await apiRequest<Array<Record<string, unknown>>>(
        `/boards/${boardId}/sheets/${sheetId}/external-sources/connectors`
      )
    } catch (err) {
      console.error('Failed to list connectors:', err instanceof Error ? err.message : err)
      return []
    }
  },

  async externalPreview(
    boardId: string,
    sheetId: string,
    connectorId: string,
    connectionId?: string,
    query?: Record<string, unknown>,
    limit?: number
  ): Promise<{
    records: Array<Record<string, unknown>>
    schema: Array<{ name: string; label?: string; type?: string }>
    estimatedTotal?: number
  } | null> {
    try {
      return await apiRequest(`/boards/${boardId}/sheets/${sheetId}/external-sources/preview`, {
        method: 'POST',
        body: JSON.stringify({ connectorId, connectionId, query, limit })
      })
    } catch (err) {
      console.error('External preview failed:', err instanceof Error ? err.message : err)
      return null
    }
  },

  async startExternalSync(
    boardId: string,
    sheetId: string,
    params: {
      connectorId: string
      connectorName: string
      connectorDescription?: string
      connectionId?: string
      query?: Record<string, unknown>
      selectedFields?: string[]
      limit?: number
      mode: 'replace' | 'append' | 'merge'
      mergeKey?: string
      autoColumns?: boolean
      keepConnected?: boolean
      refreshMode?: string
      refreshInterval?: number
    }
  ): Promise<{ runId: string } | null> {
    try {
      return await apiRequest(`/boards/${boardId}/sheets/${sheetId}/external-sources/start-sync`, {
        method: 'POST',
        body: JSON.stringify(params)
      })
    } catch (err) {
      console.error('Start external sync failed:', err instanceof Error ? err.message : err)
      return null
    }
  },

  async getExternalSyncRunStatus(
    boardId: string,
    sheetId: string,
    runId: string
  ): Promise<{
    runId: string
    status: string
    totalFetched: number
    totalSynced: number
    estimatedTotal?: number | null
    lastMessage?: string | null
    startedAt?: string
    completedAt?: string
    error?: string | null
  } | null> {
    try {
      return await apiRequest(`/boards/${boardId}/sheets/${sheetId}/external-sources/runs/${runId}`)
    } catch {
      return null
    }
  },

  async cancelExternalSyncRun(boardId: string, sheetId: string, runId: string): Promise<boolean> {
    try {
      await apiRequest(`/boards/${boardId}/sheets/${sheetId}/external-sources/runs/${runId}/cancel`, { method: 'POST' })
      return true
    } catch {
      return false
    }
  }
}

export default BoardApiService
