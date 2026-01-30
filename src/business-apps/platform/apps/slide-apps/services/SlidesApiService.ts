/**
 * SlidesApiService
 *
 * Connects to the document-service backend API for slide deck management.
 * Follows the same pattern as DocumentApiService.
 */

import type { Slide, SlideSummary, SlidePermission, SlideStatus } from '../types'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

const getAuthToken = (): string | null => {
  try {
    const ideToken = localStorage.getItem('business-app-ide-access-token')
    if (ideToken) return ideToken
    const authData = localStorage.getItem('keycloak-token')
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        return parsed.token || parsed.access_token || null
      } catch {
        return authData
      }
    }
    const sessionToken = sessionStorage.getItem('auth_token')
    if (sessionToken) return sessionToken
    if (typeof window !== 'undefined' && (window as unknown as { authToken?: string }).authToken) {
      return (window as unknown as { authToken: string }).authToken
    }
    return null
  } catch {
    return null
  }
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
  return text ? JSON.parse(text) : null
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function mapPermission(apiPermission: string): SlidePermission {
  if (apiPermission === 'admin') return 'owner'
  return apiPermission as SlidePermission
}

function mapApiSlideToSlide(api: Record<string, unknown>): Slide {
  return {
    id: api.id as string,
    title: api.title as string,
    description: api.description as string | undefined,
    content: (api.content as string) || '',
    contentJson: api.contentJson as Record<string, unknown> | undefined,
    settings: api.settings as Record<string, unknown> | undefined,
    createdAt: api.createdAt as string,
    updatedAt: api.updatedAt as string,
    createdBy: api.ownerId as string,
    currentVersion: (api.currentVersion as number) || 1,
    status: api.status as SlideStatus | undefined,
    permission: mapPermission((api.permission as string) || 'view'),
    isShared: api.isShared as boolean | undefined,
    sharedBy: api.sharedBy as string | undefined
  }
}

export const SlidesApiService = {
  async listSlides(options?: {
    search?: string
    page?: number
    limit?: number
    includeShared?: boolean
  }): Promise<SlideSummary[]> {
    const params = new URLSearchParams()
    if (options?.search) params.set('search', options.search)
    if (options?.page) params.set('page', options.page.toString())
    if (options?.limit) params.set('limit', options.limit.toString())
    params.set('includeShared', options?.includeShared !== false ? 'true' : 'false')
    const queryString = params.toString()
    const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(
      `/slides${queryString ? `?${queryString}` : ''}`
    )
    return response.items.map(item => ({
      id: item.id as string,
      title: item.title as string,
      description: item.description as string | undefined,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
      createdBy: item.ownerId as string,
      currentVersion: (item.currentVersion as number) || 1,
      status: item.status as SlideStatus | undefined,
      isShared: item.isShared as boolean | undefined,
      sharedBy: item.sharedBy as string | undefined,
      permission: mapPermission((item.permission as string) || 'view'),
      isOwner: item.isOwner as boolean | undefined
    }))
  },

  async getSlide(id: string): Promise<Slide | null> {
    try {
      const api = await apiRequest<Record<string, unknown>>(`/slides/${id}`)
      return mapApiSlideToSlide(api)
    } catch {
      return null
    }
  },

  async createSlide(payload: { title: string; description?: string; content?: string; spaceId?: string }): Promise<Slide> {
    const created = await apiRequest<Record<string, unknown>>('/slides', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title || 'Untitled presentation',
        description: payload.description,
        content: payload.content || '',
        spaceId: payload.spaceId
      })
    })
    return mapApiSlideToSlide(created)
  },

  async updateSlide(
    id: string,
    updates: Partial<Pick<Slide, 'title' | 'description' | 'content' | 'contentJson'>>,
    options?: { createVersion?: boolean }
  ): Promise<Slide> {
    const payload: Record<string, unknown> = { ...updates, createVersion: options?.createVersion ?? false }
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) delete payload[key]
    })
    const updated = await apiRequest<Record<string, unknown>>(`/slides/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
    return mapApiSlideToSlide(updated)
  },

  async deleteSlide(id: string): Promise<boolean> {
    try {
      await apiRequest(`/slides/${id}`, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  },

  async duplicateSlide(id: string): Promise<Slide | null> {
    try {
      const duplicated = await apiRequest<Record<string, unknown>>(`/slides/${id}/duplicate`, { method: 'POST' })
      return mapApiSlideToSlide(duplicated)
    } catch {
      return null
    }
  },

  async shareSlide(slideId: string, shares: Array<{ userId: string; permission: string }>): Promise<boolean> {
    try {
      await apiRequest('/sharing', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'slide',
          entityId: slideId,
          recipients: shares.map(s => ({ userId: s.userId, permission: s.permission }))
        })
      })
      return true
    } catch {
      return false
    }
  },

  async getSharedUsers(slideId: string): Promise<Array<{ id: string; userId: string; permission: string; sharedAt: string; sharedBy: string }>> {
    try {
      const shares = await apiRequest<Array<Record<string, unknown>>>(`/sharing/slide/${slideId}`)
      return (shares || []).map(s => ({
        id: s.id as string,
        userId: s.userId as string,
        permission: s.permission as string,
        sharedAt: s.createdAt as string,
        sharedBy: s.sharedBy as string
      }))
    } catch {
      return []
    }
  },

  async updateSharePermission(slideId: string, shareId: string, permission: string): Promise<boolean> {
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

  async revokeShareById(slideId: string, shareId: string): Promise<boolean> {
    try {
      await apiRequest(`/sharing/${shareId}`, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  }
}

export default SlidesApiService
