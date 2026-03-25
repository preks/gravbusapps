import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

/**
 * Minimal board REST client for use outside the board-apps bundle.
 *
 * Intentionally thin: only the 7 operations needed by project-setup,
 * no shared module state, no GraphQL, no smartSync.
 * The API base URL is resolved lazily (inside request()) so no
 * module-level side effects are introduced.
 */

export type BoardMin = {
  id: string
  name: string
  sheets?: Array<{ id: string }>
}

export type BoardSummaryMin = {
  id: string
  name: string
  settings?: Record<string, unknown>
}

export type BoardShareMin = {
  id: string
  userId: string
  permission: string
}

type CreateBoardInput = {
  name?: string
  description?: string
  icon?: string
  status?: string
  settings?: Record<string, unknown>
  sheets?: Array<{
    name: string
    description?: string
    columns?: unknown[]
    views?: unknown[]
    groups?: unknown[]
    settings?: unknown
  }>
}

async function request<T>(accessToken: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!accessToken) {
    throw new Error('Access token missing')
  }
  const baseUrl = getDocumentServiceApiUrl()
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${accessToken}`
    }
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(err.message || `API Error: ${response.status}`)
  }
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T)
}

function mapBoard(data: Record<string, unknown>): BoardMin {
  return {
    id: data.id as string,
    name: data.name as string,
    sheets: ((data.sheets as Array<Record<string, unknown>>) || []).map(s => ({ id: s.id as string }))
  }
}

export const boardApiClient = {
  async listBoards(accessToken: string, options?: { limit?: number; projectId?: string }): Promise<BoardSummaryMin[]> {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.projectId) params.set('projectId', options.projectId)
    const qs = params.toString()
    const res = await request<{ items: Array<Record<string, unknown>> }>(accessToken, `/boards${qs ? `?${qs}` : ''}`)
    return res.items.map(app => ({
      id: app.id as string,
      name: app.name as string,
      settings: (app.settings as Record<string, unknown>) || {}
    }))
  },

  async getBoard(accessToken: string, id: string): Promise<BoardMin | null> {
    try {
      const data = await request<Record<string, unknown>>(accessToken, `/boards/${id}`)
      return mapBoard(data)
    } catch {
      return null
    }
  },

  async createBoard(accessToken: string, board: CreateBoardInput): Promise<BoardMin> {
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
    const created = await request<Record<string, unknown>>(accessToken, '/boards', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return mapBoard(created)
  },

  async updateBoard(accessToken: string, id: string, updates: { name?: string }): Promise<void> {
    const payload: Record<string, unknown> = { name: updates.name }
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])
    await request<unknown>(accessToken, `/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
  },

  async createRow(
    accessToken: string,
    boardId: string,
    sheetId: string,
    data: Record<string, unknown>
  ): Promise<{ id: string }> {
    const result = await request<Record<string, unknown>>(accessToken, `/boards/${boardId}/sheets/${sheetId}/rows`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
    return { id: result.id as string }
  },

  async shareBoard(
    accessToken: string,
    boardId: string,
    shares: Array<{ userId: string; permission: string }>
  ): Promise<void> {
    try {
      await request<unknown>(accessToken, '/sharing', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'spreadsheet_app',
          entityId: boardId,
          recipients: shares
        })
      })
    } catch (error) {
      console.error('Failed to share board:', error instanceof Error ? error.message : error)
    }
  },

  async getBoardSharedUsers(accessToken: string, boardId: string): Promise<BoardShareMin[]> {
    try {
      const shares = await request<Array<Record<string, unknown>>>(accessToken, `/sharing/spreadsheet_app/${boardId}`)
      return (shares || []).map(s => ({
        id: s.id as string,
        userId: s.userId as string,
        permission: s.permission as string
      }))
    } catch {
      return []
    }
  }
}
