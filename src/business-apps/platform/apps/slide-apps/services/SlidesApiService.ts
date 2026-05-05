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
import type {
  Comment,
  CommentQueryOptions,
  CreateCommentInput,
  FileLock,
  LockFileInput,
  Version
} from '../../shared/types/versioning'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { parseSlideCommentAnchor, serializeSlideCommentAnchor } from '../utils/slideCommentAnchors'

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
  const url = `${API_URL}${endpoint}`
  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    console.warn(`[SlidesApi] Endpoint returned HTML instead of JSON: ${endpoint}`)
    throw new Error(`API endpoint not available: ${endpoint}`)
  }
  const text = await response.text()
  if (!text) return null as T
  try {
    return JSON.parse(text)
  } catch {
    console.warn(`[SlidesApi] Invalid JSON from ${endpoint}:`, text.slice(0, 200))
    throw new Error(`Invalid response from API: ${endpoint}`)
  }
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SlideImportJob {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  diagnostics: Record<string, unknown>
  createdAt: string
  updatedAt: string
  slideId?: string
  error?: string
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
    sharedBy: api.sharedBy as string | undefined,
    isOwner: api.isOwner as boolean | undefined,
    spaceId: (api.spaceId as string | null | undefined) ?? null,
    trashedAt: (api.trashedAt as string | null | undefined) ?? null
  }
}

function mapApiSlideToSummary(api: Record<string, unknown>): SlideSummary {
  return {
    id: api.id as string,
    title: api.title as string,
    description: api.description as string | undefined,
    createdAt: api.createdAt as string,
    updatedAt: api.updatedAt as string,
    createdBy: api.ownerId as string,
    currentVersion: (api.currentVersion as number) || 1,
    status: api.status as SlideStatus | undefined,
    isShared: api.isShared as boolean | undefined,
    sharedBy: api.sharedBy as string | undefined,
    permission: mapPermission((api.permission as string) || 'view'),
    isOwner: api.isOwner as boolean | undefined,
    spaceId: (api.spaceId as string | null | undefined) ?? null,
    trashedAt: (api.trashedAt as string | null | undefined) ?? null
  }
}

function mapApiVersionToVersion(versionData: Record<string, unknown>): Version {
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
}

function mapApiComment(rawComment: Record<string, unknown>, slideId: string): Comment {
  const anchorPath = rawComment.anchorPath as string | undefined
  return {
    id: rawComment.id as string,
    entityId: slideId,
    entityType: 'slide',
    type: rawComment.type as Comment['type'],
    content: rawComment.content as string,
    createdBy: rawComment.createdBy as string,
    createdByName: rawComment.createdByName as string | undefined,
    createdByAvatar: rawComment.createdByAvatar as string | undefined,
    createdAt: rawComment.createdAt as string,
    updatedAt: rawComment.updatedAt as string | undefined,
    resolvedAt: rawComment.resolvedAt as string | undefined,
    resolvedBy: rawComment.resolvedBy as string | undefined,
    selectionStart: rawComment.selectionStart as number | undefined,
    selectionEnd: rawComment.selectionEnd as number | undefined,
    selectedText: rawComment.selectedText as string | undefined,
    anchorPath,
    slideAnchorData: parseSlideCommentAnchor(anchorPath),
    cellReference: rawComment.cellReference as string | undefined,
    sheetId: rawComment.sheetId as string | undefined,
    parentId: rawComment.parentId as string | undefined,
    replies: (rawComment.replies as Record<string, unknown>[] | undefined)?.map(reply =>
      mapApiComment({ ...reply, parentId: reply.parentId ?? rawComment.id }, slideId)
    )
  }
}

export const SlidesApiService = {
  /** Store the access token in memory for all subsequent API requests. */
  setAccessToken(token: string | null) {
    currentAccessToken = token
  },

  getDriveFileIdFromUrl(url: string | undefined): string | null {
    if (!url) return null

    try {
      const origin = typeof window === 'undefined' ? API_URL : window.location.origin
      const parsed = new URL(url, origin)
      const match = parsed.pathname.match(/\/drive\/files\/([^/]+)\/download$/)
      return match?.[1] ?? null
    } catch {
      return null
    }
  },

  isProtectedDriveMediaUrl(url: string | undefined): boolean {
    return this.getDriveFileIdFromUrl(url) !== null
  },

  async fetchProtectedMediaBlob(url: string): Promise<Blob | null> {
    const fileId = this.getDriveFileIdFromUrl(url)
    if (!fileId) return null

    const token = currentAccessToken
    const origin = typeof window === 'undefined' ? API_URL : window.location.origin
    const normalizedUrl = new URL(url, origin).toString()
    const response = await fetch(normalizedUrl, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    })

    if (!response.ok) {
      throw new Error(`Protected media fetch failed: ${response.status}`)
    }

    return response.blob()
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
    return response.items.map(mapApiSlideToSummary)
  },

  async getSlide(id: string): Promise<Slide | null> {
    try {
      const api = await apiRequest<Record<string, unknown>>(`/slides/${id}`)
      return mapApiSlideToSlide(api)
    } catch {
      return null
    }
  },

  async getTrashedPreview(id: string): Promise<Slide | null> {
    try {
      const api = await apiRequest<Record<string, unknown>>(`/slides/${id}/trashed-preview`)
      return mapApiSlideToSlide(api)
    } catch {
      return null
    }
  },

  async createSlide(payload: {
    title: string
    description?: string
    content?: string
    contentJson?: Record<string, unknown>
    spaceId?: string
  }): Promise<Slide> {
    const body: Record<string, unknown> = {
      title: payload.title || 'Untitled presentation',
      description: payload.description,
      content: payload.content || '',
      spaceId: payload.spaceId
    }
    if (payload.contentJson) body.contentJson = payload.contentJson
    const created = await apiRequest<Record<string, unknown>>('/slides', {
      method: 'POST',
      body: JSON.stringify(body)
    })
    return mapApiSlideToSlide(created)
  },

  async importSlide(payload: {
    title: string
    description?: string
    contentJson: Record<string, unknown>
    spaceId?: string
  }): Promise<Slide> {
    const imported = await apiRequest<Record<string, unknown>>('/slides/import', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    return mapApiSlideToSlide(imported)
  },

  async createImportJob(payload: {
    title: string
    description?: string
    contentJson: Record<string, unknown>
    spaceId?: string
    sourceFileName?: string
    sourceType?: string
  }): Promise<SlideImportJob> {
    return apiRequest<SlideImportJob>('/slides/import-jobs', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },

  async getImportJob(jobId: string): Promise<SlideImportJob> {
    return apiRequest<SlideImportJob>(`/slides/import-jobs/${jobId}`)
  },

  async updateSlide(
    id: string,
    updates: Partial<Pick<Slide, 'title' | 'description' | 'content'>>,
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

  async resetSlideYjsState(id: string, contentJson: Record<string, unknown>): Promise<Slide> {
    const updated = await apiRequest<Record<string, unknown>>(`/slides/${id}/yjs-reset`, {
      method: 'POST',
      body: JSON.stringify({ contentJson })
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

  async updateSharePermission(_slideId: string, shareId: string, permission: string): Promise<boolean> {
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

  async revokeShareById(_slideId: string, shareId: string): Promise<boolean> {
    try {
      await apiRequest(`/sharing/${shareId}`, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  },

  async createComment(slideId: string, input: CreateCommentInput): Promise<Comment | null> {
    try {
      const { slideAnchorData, ...restInput } = input
      const response = await apiRequest<Record<string, unknown>>(`/comments/slide/${slideId}`, {
        method: 'POST',
        body: JSON.stringify({
          ...restInput,
          ...(slideAnchorData ? { anchorPath: serializeSlideCommentAnchor(slideAnchorData) } : {})
        })
      })

      return mapApiComment(response, slideId)
    } catch {
      return null
    }
  },

  async listComments(slideId: string, options?: CommentQueryOptions): Promise<Comment[]> {
    try {
      const params = new URLSearchParams()
      if (options?.includeResolved) params.set('includeResolved', 'true')
      if (options?.includeReplies) params.set('includeReplies', 'true')
      if (options?.type) params.set('type', options.type)

      const queryString = params.toString()
      const response = await apiRequest<Record<string, unknown>[]>(
        `/comments/slide/${slideId}${queryString ? `?${queryString}` : ''}`
      )

      return (response || []).map(comment => mapApiComment(comment, slideId))
    } catch {
      return []
    }
  },

  async updateComment(commentId: string, updates: Partial<Comment>): Promise<Comment | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          content: updates.content
        })
      })

      const slideId = (response.entityId as string | undefined) ?? updates.entityId
      if (!slideId) {
        return null
      }

      return mapApiComment(response, slideId)
    } catch {
      return null
    }
  },

  async resolveComment(commentId: string): Promise<boolean> {
    try {
      await apiRequest(`/comments/${commentId}/resolve`, {
        method: 'PATCH'
      })
      return true
    } catch {
      return false
    }
  },

  async unresolveComment(commentId: string): Promise<boolean> {
    try {
      await apiRequest(`/comments/${commentId}/unresolve`, {
        method: 'PATCH'
      })
      return true
    } catch {
      return false
    }
  },

  async deleteComment(commentId: string): Promise<boolean> {
    try {
      await apiRequest(`/comments/${commentId}`, {
        method: 'DELETE'
      })
      return true
    } catch {
      return false
    }
  },

  async replyToComment(
    commentId: string,
    reply: string,
    userName?: string,
    userAvatar?: string
  ): Promise<Comment | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/comments/${commentId}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          content: reply,
          createdByName: userName,
          createdByAvatar: userAvatar
        })
      })

      const slideId = response.entityId as string | undefined
      if (!slideId) {
        return null
      }

      return mapApiComment(response, slideId)
    } catch {
      return null
    }
  },
  // ============ Versions ============

  async createCheckpoint(slideId: string, changeDescription?: string): Promise<Version | null> {
    try {
      const versionData = await apiRequest<Record<string, unknown>>(`/slides/${slideId}/checkpoint`, {
        method: 'POST',
        body: JSON.stringify({ changeDescription })
      })

      return mapApiVersionToVersion(versionData)
    } catch (error) {
      console.error('[SlidesApiService] Failed to create slide checkpoint:', error)
      return null
    }
  },

  async createVersion(
    slideId: string,
    options: {
      content?: string
      changeDescription?: string
      isCheckpoint?: boolean
    }
  ): Promise<Version | null> {
    try {
      if (options.isCheckpoint) {
        return await this.createCheckpoint(slideId, options.changeDescription)
      }

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

      return mapApiVersionToVersion(versionData)
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
          _templateMeta: meta as unknown as SlideTemplate['contentJson']['_templateMeta']
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
  },

  async uploadImageFromBase64(base64DataUrl: string, filename: string): Promise<string> {
    return this.uploadDataUrl(base64DataUrl, filename, 'image/png')
  },

  async uploadDataUrl(dataUrl: string, filename: string, fallbackMime = 'application/octet-stream'): Promise<string> {
    const mimeMatch = dataUrl.match(/^data:([^;]+);/)
    const mime = mimeMatch?.[1] || fallbackMime
    const raw = atob(dataUrl.split(',')[1])
    const bytes = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    const file = new File([blob], filename, { type: mime })

    return this.uploadFile(file)
  },

  async uploadFile(file: File): Promise<string> {
    const token = currentAccessToken

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_URL}/drive/files/upload`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData
    })
    if (!response.ok) throw new Error(`File upload failed: ${response.status}`)
    const result: { id: string } = await response.json()
    return `${API_URL}/drive/files/${result.id}/download`
  }
}

export default SlidesApiService
