/**
 * SlidesApiService
 *
 * Connects to the document-service backend API for slide deck management.
 * Follows the same pattern as DocumentApiService.
 */

import type { Slide, SlideSummary, SlidePermission, SlideStatus } from '../types'
import type { Version, FileLock, LockFileInput } from '../../shared/types/versioning'
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

  async createSlide(payload: {
    title: string
    description?: string
    content?: string
    spaceId?: string
  }): Promise<Slide> {
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

  async getSharedUsers(
    slideId: string
  ): Promise<Array<{ id: string; userId: string; permission: string; sharedAt: string; sharedBy: string }>> {
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
  },
  // ============ Versions ============

  async createVersion(
    slideId: string,
    options: {
      content?: string
      changeDescription?: string
      isCheckpoint?: boolean
    }
  ): Promise<Version | null> {
    try {
      // Get the current slide if content not provided
      let contentSnapshot: Record<string, unknown>
      if (options.content) {
        // Allow passing a JSON string representing contentJson
        try {
          const parsed = JSON.parse(options.content) as unknown
          if (parsed && typeof parsed === 'object') {
            contentSnapshot = { contentJson: parsed }
          } else {
            contentSnapshot = { content: options.content }
          }
        } catch {
          contentSnapshot = { content: options.content }
        }
      } else {
        const slide = await this.getSlide(slideId)
        if (!slide) throw new Error('Slide not found')
        contentSnapshot = {
          title: slide.title,
          description: slide.description,
          content: slide.content,
          contentJson: slide.contentJson,
          settings: slide.settings
        }
      }

      const versionData = await apiRequest<Record<string, unknown>>('/versions', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'slide',
          entityId: slideId,
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
        isCheckpoint: !(versionData.isAutoSave as boolean),
        isAutoSave: versionData.isAutoSave as boolean,
        fileSize: (versionData.fileSize as number) || 0
      }
    } catch (error) {
      console.error('[SlidesApiService] Failed to create version:', error)
      return null
    }
  },

  async listVersions(slideId: string, page = 1, limit = 20): Promise<Version[]> {
    try {
      const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(
        `/versions/slide/${slideId}?page=${page}&limit=${limit}`
      )
      return response.items.map(v => ({
        id: v.id as string,
        version: v.versionNumber as number,
        content: JSON.stringify(v.contentSnapshot || {}),
        createdAt: v.createdAt as string,
        createdBy: v.changedBy as string,
        changeDescription: v.changeSummary as string | undefined,
        isCheckpoint: !(v.isAutoSave as boolean),
        isAutoSave: v.isAutoSave as boolean,
        fileSize: (v.fileSize as number) || 0
      }))
    } catch (error) {
      console.error('[SlidesApiService] Failed to list versions:', error)
      return []
    }
  },

  async getVersion(slideId: string, versionNumber: number): Promise<Partial<Slide> | null> {
    try {
      const versionData = await apiRequest<Record<string, unknown>>(`/versions/slide/${slideId}/${versionNumber}`)
      const snapshot = versionData.contentSnapshot as Record<string, unknown> | undefined
      if (!snapshot) return null
      // Snapshot is stored as a generic object; expose the fields we care about.
      return {
        title: snapshot.title as string | undefined,
        description: snapshot.description as string | undefined,
        content: snapshot.content as string | undefined,
        contentJson: snapshot.contentJson as Record<string, unknown> | undefined,
        settings: snapshot.settings as Record<string, unknown> | undefined
      }
    } catch (error) {
      console.error('[SlidesApiService] Failed to get version:', error)
      return null
    }
  },

  async compareVersions(
    slideId: string,
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
      const response = await apiRequest<Record<string, unknown>>(
        `/versions/slide/${slideId}/compare?versionA=${versionA}&versionB=${versionB}`
      )

      return {
        versionA: {
          id: (response.versionA as Record<string, unknown>).id as string,
          version: (response.versionA as Record<string, unknown>).versionNumber as number,
          content: JSON.stringify((response.versionA as Record<string, unknown>).contentSnapshot),
          createdAt: (response.versionA as Record<string, unknown>).createdAt as string,
          createdBy: (response.versionA as Record<string, unknown>).changedBy as string,
          changeDescription: (response.versionA as Record<string, unknown>).changeSummary as string | undefined,
          isCheckpoint: !((response.versionA as Record<string, unknown>).isAutoSave as boolean),
          isAutoSave: (response.versionA as Record<string, unknown>).isAutoSave as boolean,
          fileSize: (((response.versionA as Record<string, unknown>).fileSize as number) || 0) as number
        },
        versionB: {
          id: (response.versionB as Record<string, unknown>).id as string,
          version: (response.versionB as Record<string, unknown>).versionNumber as number,
          content: JSON.stringify((response.versionB as Record<string, unknown>).contentSnapshot),
          createdAt: (response.versionB as Record<string, unknown>).createdAt as string,
          createdBy: (response.versionB as Record<string, unknown>).changedBy as string,
          changeDescription: (response.versionB as Record<string, unknown>).changeSummary as string | undefined,
          isCheckpoint: !((response.versionB as Record<string, unknown>).isAutoSave as boolean),
          isAutoSave: (response.versionB as Record<string, unknown>).isAutoSave as boolean,
          fileSize: (((response.versionB as Record<string, unknown>).fileSize as number) || 0) as number
        },
        diff: (response.diff as Array<any>) || []
      }
    } catch (error) {
      console.error('[SlidesApiService] Failed to compare versions:', error)
      return null
    }
  },

  // ============ Locks ============

  async lockFile(slideId: string, input?: LockFileInput): Promise<FileLock | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/locks/slide/${slideId}`, {
        method: 'POST',
        body: JSON.stringify(input || {})
      })

      return {
        isLocked: true,
        lockedBy: response.lockedBy as string,
        lockedByName: response.lockedByName as string | undefined,
        lockedByAvatar: response.lockedByAvatar as string | undefined,
        lockedAt: response.lockedAt as string,
        lockExpiry: response.lockExpiry as string | undefined,
        lockReason: response.lockReason as string | undefined
      }
    } catch (error) {
      console.error('[SlidesApiService] Failed to lock file:', error)
      return null
    }
  },

  async unlockFile(slideId: string): Promise<boolean> {
    try {
      await apiRequest(`/locks/slide/${slideId}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('[SlidesApiService] Failed to unlock file:', error)
      return false
    }
  },

  async getLockStatus(slideId: string): Promise<FileLock | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/locks/slide/${slideId}`)
      if (!response.isLocked) return null
      return {
        isLocked: response.isLocked as boolean,
        lockedBy: response.lockedBy as string | undefined,
        lockedByName: response.lockedByName as string | undefined,
        lockedByAvatar: response.lockedByAvatar as string | undefined,
        lockedAt: response.lockedAt as string | undefined,
        lockExpiry: response.lockExpiry as string | undefined,
        lockReason: response.lockReason as string | undefined
      }
    } catch (error) {
      console.error('[SlidesApiService] Failed to get lock status:', error)
      return null
    }
  },

  async forceUnlock(slideId: string): Promise<boolean> {
    try {
      await apiRequest(`/locks/slide/${slideId}/force`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('[SlidesApiService] Failed to force unlock:', error)
      return false
    }
  }
}

export default SlidesApiService
