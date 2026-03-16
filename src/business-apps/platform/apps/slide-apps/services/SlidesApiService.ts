/**
 * SlidesApiService
 *
 * Connects to the document-service backend API for slide deck management.
 * Follows the same pattern as DocumentApiService.
 */

import type {
  Slide,
  SlideSummary,
  SlidePermission,
  SlideStatus,
  SlideTemplate,
  SlideTemplateSummary,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateFilters,
  BrandIdentity,
  SlideTemplateMeta,
  TemplateHints
} from '../types'
import { migrateLegacyTemplate } from './SlideMetadataService'
import type { Version, FileLock, LockFileInput } from '../../shared/types/versioning'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

/** In-memory access token – set once by the hub/hook, read on every request. */
let currentAccessToken: string | null = null

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = currentAccessToken
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
  /** Store the access token in memory for all subsequent API requests. */
  setAccessToken(token: string | null) {
    currentAccessToken = token
  },

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
  },

  // ============ Templates ============
  // Templates are stored as regular slides with contentJson._templateMeta containing metadata
  // This allows us to use the existing slides API without requiring backend changes

  async listTemplates(filters?: TemplateFilters): Promise<SlideTemplateSummary[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.search) params.set('search', filters.search)
      params.set('includeShared', 'true')

      const queryString = params.toString()
      const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(
        `/slides${queryString ? `?${queryString}` : ''}`
      )

      // Filter to only templates (identified by _templateMeta in contentJson)
      return response.items
        .filter(item => {
          const contentJson = item.contentJson as Record<string, unknown> | undefined
          const meta = contentJson?._templateMeta as Record<string, unknown> | undefined
          if (!meta?.isTemplate) return false

          // Apply category filter
          if (filters?.category && meta.category !== filters.category) return false

          // Apply isPublic filter
          if (filters?.isPublic !== undefined && meta.isPublic !== filters.isPublic) return false

          // Apply createdBy filter (my templates)
          if (filters?.createdBy === 'me' && !item.isOwner) return false

          // Apply isBranded filter
          if (filters?.isBranded !== undefined) {
            const hasBranding = meta.branding && (meta.branding as Record<string, unknown>).keywords
            if (filters.isBranded && !hasBranding) return false
            if (!filters.isBranded && hasBranding) return false
          }

          return true
        })
        .map(item => {
          const contentJson = (item.contentJson as Record<string, unknown>) || {}
          const meta = (contentJson._templateMeta as Record<string, unknown>) || {}
          const branding = meta.branding as BrandIdentity | undefined
          return {
            id: item.id as string,
            name: item.title as string,
            description: item.description as string | undefined,
            category: (meta.category as SlideTemplateSummary['category']) || 'custom',
            thumbnailUrl: meta.thumbnailUrl as string | undefined,
            slideCount: (contentJson.slides as unknown[])?.length || 1,
            createdAt: item.createdAt as string,
            updatedAt: item.updatedAt as string,
            createdBy: item.ownerId as string,
            isPublic: (meta.isPublic as boolean) || false,
            isOwner: item.isOwner as boolean | undefined,
            isBranded: meta.isBranded as boolean | undefined,
            branding,
            hasStructuredMeta: Array.isArray(meta.slideMeta) && (meta.slideMeta as unknown[]).length > 0
          }
        })
    } catch (error) {
      console.error('[SlidesApiService] Failed to list templates:', error)
      return []
    }
  },

  async getTemplate(id: string): Promise<SlideTemplate | null> {
    try {
      const api = await apiRequest<Record<string, unknown>>(`/slides/${id}`)
      const contentJson = (api.contentJson as Record<string, unknown>) || {}
      const meta = (contentJson._templateMeta as Record<string, unknown>) || {}

      // Verify it's actually a template
      if (!meta.isTemplate) {
        console.warn('[SlidesApiService] Requested slide is not a template:', id)
        return null
      }

      const branding = meta.branding as BrandIdentity | undefined
      const slideMeta = meta.slideMeta as SlideTemplateMeta[] | undefined
      const templateHints = meta.templateHints as TemplateHints | undefined

      let template: SlideTemplate = {
        id: api.id as string,
        name: api.title as string,
        description: api.description as string | undefined,
        category: (meta.category as SlideTemplate['category']) || 'custom',
        thumbnailUrl: meta.thumbnailUrl as string | undefined,
        contentJson: {
          slides: contentJson.slides as SlideTemplate['contentJson']['slides'],
          themeId: contentJson.themeId as string,
          _templateMeta: meta as SlideTemplate['contentJson']['_templateMeta']
        },
        createdAt: api.createdAt as string,
        updatedAt: api.updatedAt as string,
        createdBy: api.ownerId as string,
        isPublic: (meta.isPublic as boolean) || false,
        isOwner: api.isOwner as boolean | undefined,
        isBranded: meta.isBranded as boolean | undefined,
        branding,
        slideMeta,
        templateHints
      }

      // Migrate legacy templates without slideMeta
      if (!slideMeta || slideMeta.length === 0) {
        template = migrateLegacyTemplate(template)
        console.log('[SlidesApiService] Migrated legacy template:', id)
      }

      return template
    } catch (error) {
      console.error('[SlidesApiService] Failed to get template:', error)
      return null
    }
  },

  async createTemplate(payload: CreateTemplateRequest): Promise<SlideTemplate | null> {
    try {
      // Store template metadata inside contentJson._templateMeta
      const contentJsonWithMeta = {
        ...payload.contentJson,
        _templateMeta: {
          isTemplate: true,
          category: payload.category,
          isPublic: payload.isPublic,
          isBranded: !!payload.branding,
          branding: payload.branding,
          slideMeta: payload.slideMeta,
          templateHints: payload.templateHints
        }
      }

      const created = await apiRequest<Record<string, unknown>>('/slides', {
        method: 'POST',
        body: JSON.stringify({
          title: payload.name,
          description: payload.description,
          contentJson: contentJsonWithMeta
        })
      })

      const contentJson = (created.contentJson as Record<string, unknown>) || {}
      const meta = (contentJson._templateMeta as Record<string, unknown>) || {}

      return {
        id: created.id as string,
        name: created.title as string,
        description: created.description as string | undefined,
        category: (meta.category as SlideTemplate['category']) || 'custom',
        thumbnailUrl: meta.thumbnailUrl as string | undefined,
        contentJson: {
          slides: contentJson.slides as SlideTemplate['contentJson']['slides'],
          themeId: contentJson.themeId as string
        },
        createdAt: created.createdAt as string,
        updatedAt: created.updatedAt as string,
        createdBy: created.ownerId as string,
        isPublic: (meta.isPublic as boolean) || false,
        isOwner: true,
        slideMeta: meta.slideMeta as SlideTemplateMeta[] | undefined,
        templateHints: meta.templateHints as TemplateHints | undefined
      }
    } catch (error) {
      console.error('[SlidesApiService] Failed to create template:', error)
      return null
    }
  },

  async updateTemplate(id: string, updates: UpdateTemplateRequest): Promise<SlideTemplate | null> {
    try {
      const current = await this.getTemplate(id)
      if (!current) return null

      const payload: Record<string, unknown> = {}
      if (updates.name !== undefined) payload.title = updates.name
      if (updates.description !== undefined) payload.description = updates.description

      // Update contentJson with metadata preserved
      const newContentJson = updates.contentJson ?? current.contentJson
      payload.contentJson = {
        ...newContentJson,
        _templateMeta: {
          isTemplate: true,
          category: updates.category ?? current.category,
          isPublic: updates.isPublic ?? current.isPublic,
          isBranded: updates.branding ? true : current.isBranded,
          branding: updates.branding ?? current.branding
        }
      }

      const updated = await apiRequest<Record<string, unknown>>(`/slides/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })

      const contentJson = (updated.contentJson as Record<string, unknown>) || {}
      const meta = (contentJson._templateMeta as Record<string, unknown>) || {}

      return {
        id: updated.id as string,
        name: updated.title as string,
        description: updated.description as string | undefined,
        category: (meta.category as SlideTemplate['category']) || 'custom',
        thumbnailUrl: meta.thumbnailUrl as string | undefined,
        contentJson: {
          slides: contentJson.slides as SlideTemplate['contentJson']['slides'],
          themeId: contentJson.themeId as string
        },
        createdAt: updated.createdAt as string,
        updatedAt: updated.updatedAt as string,
        createdBy: updated.ownerId as string,
        isPublic: (meta.isPublic as boolean) || false,
        isOwner: updated.isOwner as boolean | undefined
      }
    } catch (error) {
      console.error('[SlidesApiService] Failed to update template:', error)
      return null
    }
  },

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await apiRequest(`/slides/${id}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('[SlidesApiService] Failed to delete template:', error)
      return false
    }
  },

  /**
   * List only branded templates (templates with branding configuration)
   */
  async listBrandedTemplates(): Promise<SlideTemplate[]> {
    const templates = await this.listTemplates({ isBranded: true, includeShared: true } as TemplateFilters & {
      includeShared?: boolean
    })
    const fullTemplates: SlideTemplate[] = []

    for (const summary of templates) {
      const full = await this.getTemplate(summary.id)
      if (full) {
        fullTemplates.push(full)
      }
    }

    return fullTemplates
  }
}

export default SlidesApiService
