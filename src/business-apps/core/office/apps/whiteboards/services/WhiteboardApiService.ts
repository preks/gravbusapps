import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type { WhiteboardSummary, Whiteboard } from '../types'

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function parseJsonSafely<T>(rawText: string): T | null {
  const text = rawText.trim()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    // Defensive: avoid crashing screen bootstrap on malformed backend payloads.
    return null
  }
}

async function request<T>(path: string, accessToken: string, options?: RequestInit): Promise<T> {
  const baseUrl = getDocumentServiceApiUrl()
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options?.headers || {})
    }
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }
  const text = await response.text()
  return parseJsonSafely<T>(text) as T
}

export const WhiteboardApiService = {
  async list(
    accessToken: string,
    params?: {
      search?: string
      includeShared?: boolean
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: string
    }
  ): Promise<PaginatedResponse<WhiteboardSummary>> {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.includeShared !== undefined) searchParams.set('includeShared', String(params.includeShared))
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder)
    const qs = searchParams.toString()
    return request(`/whiteboards${qs ? `?${qs}` : ''}`, accessToken)
  },

  async get(accessToken: string, id: string): Promise<WhiteboardSummary> {
    return request(`/whiteboards/${id}`, accessToken)
  },

  async create(
    accessToken: string,
    data: { title: string; description?: string; spaceId?: string }
  ): Promise<Whiteboard> {
    return request('/whiteboards', accessToken, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async update(accessToken: string, id: string, data: Partial<Whiteboard>): Promise<WhiteboardSummary> {
    return request(`/whiteboards/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  },

  async remove(accessToken: string, id: string): Promise<void> {
    await request(`/whiteboards/${id}`, accessToken, { method: 'DELETE' })
  },

  async duplicate(accessToken: string, id: string): Promise<Whiteboard> {
    return request(`/whiteboards/${id}/duplicate`, accessToken, { method: 'POST' })
  },

  async share(
    accessToken: string,
    id: string,
    data: { userId: string; permission: string; message?: string }
  ): Promise<unknown> {
    return request('/sharing', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        entityType: 'whiteboard',
        entityId: id,
        recipients: [{ userId: data.userId, permission: data.permission }],
        ...(data.message ? { message: data.message } : {})
      })
    })
  },

  /** Share with multiple users (same contract as slide/note sharing). */
  async shareMany(
    accessToken: string,
    whiteboardId: string,
    userIds: string[],
    permission: 'view' | 'edit' | 'comment',
    message?: string
  ): Promise<boolean> {
    try {
      if (userIds.length === 0) return true

      await request('/sharing', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'whiteboard',
          entityId: whiteboardId,
          recipients: userIds.map(userId => ({ userId, permission })),
          ...(message ? { message } : {})
        })
      })
      return true
    } catch {
      return false
    }
  },

  async getSharedUsers(accessToken: string, id: string): Promise<unknown[]> {
    return request(`/sharing/whiteboard/${id}`, accessToken)
  }
}
