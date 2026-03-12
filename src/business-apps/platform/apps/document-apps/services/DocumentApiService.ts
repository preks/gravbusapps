/**
 * DocumentApiService
 *
 * Connects to the document-service backend API for document management.
 */

import type {
  Document,
  DocumentSummary,
  DocumentStatus,
  DocumentTemplate,
  TemplateSummary,
  DocumentShare,
  DocumentApprovalRequest,
  Version,
  Comment,
  FileLock,
  PublishMetadata
} from '../types'
import type {
  CreateCommentInput,
  CommentQueryOptions,
  LockFileInput,
  PublishInput
} from '../../shared/types/versioning'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

let currentAccessToken: string | null = null

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessTokenOverride?: string | null
): Promise<T> {
  const token = accessTokenOverride ?? currentAccessToken

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

  // Handle empty responses
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Map API document to frontend Document type
function mapApiDocumentToDocument(apiDoc: Record<string, unknown>): Document {
  // Map backend permission 'admin' to frontend 'owner'
  let permission = apiDoc.permission as Document['permission']
  if (permission === 'admin') {
    permission = 'owner'
  }

  // Map sourceFileInfo from backend to sourceFile
  const sourceFileInfo = apiDoc.sourceFileInfo as Record<string, unknown> | undefined
  const sourceFile = sourceFileInfo
    ? {
        originalName: sourceFileInfo.originalName as string,
        fileSize: sourceFileInfo.fileSize as number,
        mimeType: sourceFileInfo.mimeType as string,
        uploadedAt: sourceFileInfo.uploadedAt as string,
        path: sourceFileInfo.path as string | undefined,
        fileId: sourceFileInfo.fileId as string | undefined,
        accessScope: sourceFileInfo.accessScope as string | undefined,
        appName: sourceFileInfo.appName as string | undefined,
        folderPath: sourceFileInfo.folderPath as string | undefined,
        pageCount: sourceFileInfo.pageCount as number | undefined
      }
    : undefined

  return {
    id: apiDoc.id as string,
    title: apiDoc.title as string,
    description: apiDoc.description as string | undefined,
    content: (apiDoc.content as string) || '',
    status: apiDoc.status as DocumentStatus,
    category: apiDoc.category as string | undefined,
    tags: apiDoc.tags as string[] | undefined,
    createdAt: apiDoc.createdAt as string,
    updatedAt: apiDoc.updatedAt as string,
    createdBy: apiDoc.ownerId as string,
    version: (apiDoc.currentVersion as number) || 1,
    versionHistory: [],
    wordCount: (apiDoc.wordCount as number) || 0,
    formatting: apiDoc.formatting as Document['formatting'],
    sharedWith: [],
    approvalRequest: apiDoc.approvalRequest as DocumentApprovalRequest | undefined,
    // Permission info from backend
    permission,
    isShared: apiDoc.isShared as boolean | undefined,
    sharedBy: apiDoc.sharedBy as string | undefined,
    // Source file info for PDFs
    sourceFile,
    settings: apiDoc.settings as Document['settings']
  }
}

function mapApiTemplateToTemplate(apiTemplate: Record<string, unknown>): DocumentTemplate {
  return {
    id: apiTemplate.id as string,
    name: apiTemplate.name as string,
    description: apiTemplate.description as string | undefined,
    content: apiTemplate.content as string,
    category: (apiTemplate.category as string) || 'other',
    context: apiTemplate.context as string | undefined,
    tags: (apiTemplate.tags as string[]) || [],
    createdAt: apiTemplate.createdAt as string,
    updatedAt: apiTemplate.updatedAt as string,
    createdBy: apiTemplate.ownerId as string,
    isPublic: (apiTemplate.isPublic as boolean) || false,
    usageCount: (apiTemplate.usageCount as number) || 0,
    formatting: apiTemplate.formatting as DocumentTemplate['formatting'],
    placeholders: (apiTemplate.placeholders as DocumentTemplate['placeholders']) || []
  }
}

function mapApiDocToSummary(doc: Record<string, unknown>): DocumentSummary {
  const sourceFileInfo = doc.sourceFileInfo as Record<string, unknown> | undefined
  const sourceFile = sourceFileInfo
    ? {
        originalName: sourceFileInfo.originalName as string,
        fileSize: sourceFileInfo.fileSize as number,
        mimeType: sourceFileInfo.mimeType as string,
        uploadedAt: sourceFileInfo.uploadedAt as string,
        path: sourceFileInfo.path as string | undefined,
        fileId: sourceFileInfo.fileId as string | undefined,
        accessScope: sourceFileInfo.accessScope as string | undefined,
        appName: sourceFileInfo.appName as string | undefined,
        folderPath: sourceFileInfo.folderPath as string | undefined,
        pageCount: sourceFileInfo.pageCount as number | undefined
      }
    : undefined
  const isPdf = sourceFile?.mimeType === 'application/pdf'

  return {
    id: doc.id as string,
    title: doc.title as string,
    description: doc.description as string | undefined,
    status: doc.status as DocumentStatus,
    category: doc.category as string | undefined,
    tags: doc.tags as string[] | undefined,
    createdAt: doc.createdAt as string,
    updatedAt: doc.updatedAt as string,
    createdBy: doc.ownerId as string,
    wordCount: (doc.wordCount as number) || 0,
    approvalStatus: (doc.status === 'pending_approval'
      ? 'pending'
      : doc.status === 'approved'
        ? 'approved'
        : doc.status === 'rejected'
          ? 'rejected'
          : undefined) as DocumentSummary['approvalStatus'],
    isShared: doc.isShared as boolean | undefined,
    sharedBy: doc.sharedBy as string | undefined,
    permission: (doc.permission === 'admin' ? 'owner' : doc.permission) as DocumentSummary['permission'],
    sharedCount: (doc.sharedCount as number) ?? 0,
    sharedPreviewUserIds: (doc.sharedPreviewUserIds as string[]) ?? [],
    sourceFile,
    isPdf,
    settings: doc.settings as DocumentSummary['settings']
  }
}

/**
 * Document API Service
 */
export const DocumentApiService = {
  setAccessToken(token: string | null) {
    currentAccessToken = token
  },
  // ============ Documents ============

  /**
   * Get a single page of documents for the current user (server-driven pagination).
   */
  async listDocuments(options?: {
    section?: string
    favoriteIds?: string
    status?: DocumentStatus
    category?: string
    tags?: string[]
    search?: string
    page?: number
    limit?: number
    includeShared?: boolean
    sortBy?: 'createdAt' | 'updatedAt' | 'title'
    sortOrder?: 'ASC' | 'DESC'
  }): Promise<PaginatedResponse<DocumentSummary>> {
    const requestedPage = options?.page ?? 1
    const requestedLimit = options?.limit ?? 20

    const buildParams = (useSection: boolean) => {
      const params = new URLSearchParams()
      const section = options?.section

      if (useSection && section) {
        params.set('section', section)
      } else if (section) {
        if (section === 'archived') params.set('status', 'archived')
        else if (section === 'shared') params.set('includeShared', 'true')
        else if (section === 'my-documents') params.set('includeShared', 'false')
        else params.set('includeShared', options?.includeShared !== false ? 'true' : 'false')
      } else {
        params.set('includeShared', options?.includeShared !== false ? 'true' : 'false')
      }

      if (options?.favoriteIds) params.set('favoriteIds', options.favoriteIds)
      if (options?.status && !(section === 'archived' && !useSection)) params.set('status', options.status)
      if (options?.category) params.set('category', options.category)
      if (options?.tags?.length) params.set('tags', options.tags.join(','))
      if (options?.search) params.set('search', options.search)
      if (options?.page) params.set('page', options.page.toString())
      if (options?.limit) params.set('limit', options.limit.toString())
      if (options?.sortBy) params.set('sortBy', options.sortBy)
      if (options?.sortOrder) params.set('sortOrder', options.sortOrder)
      return params
    }

    const fetchDocs = async (useSection: boolean, overrides?: { page?: number; limit?: number }) => {
      const params = buildParams(useSection)
      if (overrides?.page) params.set('page', overrides.page.toString())
      if (overrides?.limit) params.set('limit', overrides.limit.toString())
      const qs = params.toString()
      return apiRequest<PaginatedResponse<Record<string, unknown>>>(`/documents${qs ? `?${qs}` : ''}`)
    }

    let response: PaginatedResponse<Record<string, unknown>>
    try {
      response = await fetchDocs(true)
    } catch (err) {
      if (err instanceof Error && err.message.includes('section should not exist')) {
        if (options?.section === 'shared') {
          const fallbackLimit = 100
          const firstPage = await fetchDocs(false, { page: 1, limit: fallbackLimit })
          const remainingPages = Array.from({ length: Math.max(firstPage.totalPages - 1, 0) }, (_, index) =>
            fetchDocs(false, { page: index + 2, limit: fallbackLimit })
          )
          const allPages = [firstPage, ...(await Promise.all(remainingPages))]
          const sharedItems = allPages
            .flatMap(page => page.items)
            .map(doc => mapApiDocToSummary(doc))
            .filter(doc => doc.isShared || !!doc.sharedBy || (doc.permission && doc.permission !== 'owner'))
          const startIndex = (requestedPage - 1) * requestedLimit
          const pagedItems = sharedItems.slice(startIndex, startIndex + requestedLimit)

          return {
            items: pagedItems,
            total: sharedItems.length,
            page: requestedPage,
            limit: requestedLimit,
            totalPages: Math.max(1, Math.ceil(sharedItems.length / requestedLimit))
          }
        }

        response = await fetchDocs(false)
      } else {
        throw err
      }
    }

    const items = response.items.map(doc => mapApiDocToSummary(doc))

    return {
      items,
      total: response.total,
      page: response.page,
      limit: response.limit,
      totalPages: response.totalPages
    }
  },

  /**
   * Get a single document by ID
   */
  async getDocument(id: string, optionsOrAccessToken?: { fresh?: boolean } | string | null): Promise<Document | null> {
    try {
      const fresh = typeof optionsOrAccessToken === 'object' && optionsOrAccessToken?.fresh === true
      const accessToken = typeof optionsOrAccessToken === 'string' ? optionsOrAccessToken : undefined
      const endpoint = fresh ? `/documents/${id}?_ts=${Date.now()}` : `/documents/${id}`
      const doc = await apiRequest<Record<string, unknown>>(endpoint, fresh ? { cache: 'no-store' } : {}, accessToken)
      return mapApiDocumentToDocument(doc)
    } catch (error) {
      console.error('Failed to get document:', error)
      return null
    }
  },

  /**
   * Create a new document
   */
  async createDocument(document: Partial<Document>): Promise<Document> {
    const payload = {
      title: document.title || 'Untitled Document',
      description: document.description,
      content: document.content || '',
      status: document.status || 'draft',
      category: document.category,
      tags: document.tags,
      formatting: document.formatting,
      templateId: undefined // Can be set if creating from template
    }

    const created = await apiRequest<Record<string, unknown>>('/documents', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    return mapApiDocumentToDocument(created)
  },

  /**
   * Import a PDF document
   * Uploads the PDF to file service and creates a document record with extracted text
   */
  async importPdf(
    file: File,
    options?: {
      title?: string
      description?: string
      category?: string
      tags?: string[]
    }
  ): Promise<Document> {
    const formData = new FormData()
    formData.append('file', file)
    if (options?.title) formData.append('title', options.title)
    if (options?.description) formData.append('description', options.description)
    if (options?.category) formData.append('category', options.category)
    if (options?.tags?.length) formData.append('tags', options.tags.join(','))

    const token = currentAccessToken

    const response = await fetch(`${API_URL}/documents/import/pdf`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(error.message || `API Error: ${response.status}`)
    }

    const created = await response.json()
    return mapApiDocumentToDocument(created)
  },

  /**
   * Update an existing document
   */
  async updateDocument(
    id: string,
    updates: Partial<Document>,
    options?: { createVersion?: boolean },
    accessToken?: string | null
  ): Promise<Document> {
    const payload: Record<string, unknown> = {
      title: updates.title,
      description: updates.description,
      content: updates.content,
      status: updates.status,
      category: updates.category,
      tags: updates.tags,
      formatting: updates.formatting,
      createVersion: options?.createVersion ?? true
    }
    // When content is set (e.g. resolved placeholders or restore), clear contentJson so editor re-inits from content
    const contentJson = (updates as Record<string, unknown>).contentJson
    if (contentJson !== undefined) payload.contentJson = contentJson

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload]
      }
    })

    const updated = await apiRequest<Record<string, unknown>>(
      `/documents/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload)
      },
      accessToken
    )

    return mapApiDocumentToDocument(updated)
  },

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<boolean> {
    try {
      await apiRequest(`/documents/${id}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to delete document:', error)
      return false
    }
  },

  /**
   * Duplicate a document
   */
  async duplicateDocument(id: string): Promise<Document | null> {
    try {
      const duplicated = await apiRequest<Record<string, unknown>>(`/documents/${id}/duplicate`, {
        method: 'POST'
      })
      return mapApiDocumentToDocument(duplicated)
    } catch (error) {
      console.error('Failed to duplicate document:', error)
      return null
    }
  },

  /**
   * Update document status
   */
  async updateDocumentStatus(id: string, status: DocumentStatus): Promise<Document | null> {
    try {
      const updated = await apiRequest<Record<string, unknown>>(`/documents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
      return mapApiDocumentToDocument(updated)
    } catch (error) {
      console.error('Failed to update document status:', error)
      return null
    }
  },

  // ============ Sharing ============

  /**
   * Share a document with users
   */
  async shareDocument(documentId: string, shares: Array<{ userId: string; permission: string }>): Promise<boolean> {
    try {
      const payload = {
        entityType: 'document',
        entityId: documentId,
        recipients: shares.map(s => ({
          userId: s.userId,
          permission: s.permission
        }))
      }
      await apiRequest('/sharing', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      return true
    } catch (error) {
      console.error('Failed to share document:', error)
      return false
    }
  },

  /**
   * Get users a document is shared with
   */
  async getSharedUsers(documentId: string): Promise<Array<DocumentShare & { id: string }>> {
    try {
      const shares = await apiRequest<Array<Record<string, unknown>>>(`/sharing/document/${documentId}`)
      const mapped = (shares || []).map(s => ({
        id: s.id as string,
        userId: s.userId as string,
        permission: s.permission as 'view' | 'edit' | 'comment',
        sharedAt: s.createdAt as string,
        sharedBy: s.sharedBy as string
      }))
      return mapped
    } catch (error) {
      console.error('[DocumentApiService] Failed to get shared users:', error)
      return []
    }
  },

  /**
   * Update a share's permission
   */
  async updateSharePermission(shareId: string, permission: 'view' | 'edit' | 'comment'): Promise<boolean> {
    try {
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
   * Revoke a share by share ID
   */
  async revokeShareById(shareId: string): Promise<boolean> {
    try {
      await apiRequest(`/sharing/${shareId}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to revoke share:', error)
      return false
    }
  },

  /**
   * Revoke access for a user (legacy - finds share first)
   */
  async revokeAccess(documentId: string, userId: string): Promise<boolean> {
    try {
      // Get the share ID first
      const shares = await apiRequest<Array<{ id: string; userId: string }>>(`/sharing/document/${documentId}`)
      const share = shares.find(s => s.userId === userId)
      if (share) {
        await apiRequest(`/sharing/${share.id}`, { method: 'DELETE' })
      }
      return true
    } catch (error) {
      console.error('Failed to revoke access:', error)
      return false
    }
  },

  // ============ Templates ============

  /**
   * Get all templates
   */
  async listTemplates(
    options?: { category?: string; includePublic?: boolean },
    accessToken?: string | null
  ): Promise<TemplateSummary[]> {
    const params = new URLSearchParams()
    if (options?.category) params.set('category', options.category)
    if (options?.includePublic !== undefined) params.set('includePublic', options.includePublic.toString())

    const queryString = params.toString()
    const endpoint = `/templates${queryString ? `?${queryString}` : ''}`

    const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(endpoint, {}, accessToken)

    return response.items.map(t => ({
      id: t.id as string,
      name: t.name as string,
      description: t.description as string | undefined,
      category: (t.category as string) || 'other',
      context: t.context as string | undefined,
      tags: (t.tags as string[]) || [],
      createdAt: t.createdAt as string,
      updatedAt: t.updatedAt as string,
      createdBy: t.ownerId as string,
      isPublic: (t.isPublic as boolean) || false,
      usageCount: (t.usageCount as number) || 0
    }))
  },

  /**
   * Get a single template
   */
  async getTemplate(id: string, accessToken?: string | null): Promise<DocumentTemplate | null> {
    try {
      const template = await apiRequest<Record<string, unknown>>(`/templates/${id}`, {}, accessToken)
      return mapApiTemplateToTemplate(template)
    } catch (error) {
      console.error('Failed to get template:', error)
      return null
    }
  },

  /**
   * Get mappable fields for a template entity (from BE – BE knows GraphQL schema / mapping).
   * Endpoint: GET /templates/entities/:entityKey/fields
   * Returns [] if endpoint not implemented or 404.
   */
  async getTemplateEntityFields(entityKey: string): Promise<Array<{ key: string; displayName: string }>> {
    try {
      const response = await apiRequest<{ fields?: Array<{ key: string; displayName?: string }> }>(
        `/templates/entities/${encodeURIComponent(entityKey)}/fields`
      )
      const fields = response?.fields ?? []
      return fields.map(f => ({ key: f.key, displayName: f.displayName ?? f.key }))
    } catch {
      return []
    }
  },

  /**
   * Create a template
   */
  async createTemplate(template: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const payload = {
      name: template.name || 'Untitled Template',
      description: template.description,
      content: template.content || '',
      category: template.category || 'other',
      tags: template.tags,
      isPublic: template.isPublic || false,
      formatting: template.formatting,
      placeholders: template.placeholders
    }

    const created = await apiRequest<Record<string, unknown>>('/templates', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    return mapApiTemplateToTemplate(created)
  },

  /**
   * Update a template
   */
  async updateTemplate(id: string, updates: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const payload = {
      name: updates.name,
      description: updates.description,
      content: updates.content,
      category: updates.category,
      tags: updates.tags,
      isPublic: updates.isPublic,
      formatting: updates.formatting,
      placeholders: updates.placeholders
    }

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload]
      }
    })

    const updated = await apiRequest<Record<string, unknown>>(`/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })

    return mapApiTemplateToTemplate(updated)
  },

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      await apiRequest(`/templates/${id}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to delete template:', error)
      return false
    }
  },

  /**
   * Create document from template
   */
  async createDocumentFromTemplate(templateId: string, title: string, accessToken?: string | null): Promise<Document> {
    const payload = {
      title,
      templateId
    }

    const created = await apiRequest<Record<string, unknown>>(
      '/documents',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      },
      accessToken
    )

    return mapApiDocumentToDocument(created)
  },

  // ============ Approvals ============

  /**
   * Send document for approval
   */
  async sendForApproval(documentId: string, approvers: string[], message?: string): Promise<boolean> {
    try {
      await apiRequest('/approvals', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'document',
          entityId: documentId,
          title: 'Document Approval',
          message,
          approvers: approvers.map(userId => ({ userId }))
        })
      })

      return true
    } catch (error) {
      console.error('Failed to send for approval:', error)
      return false
    }
  },

  /**
   * Get approval status for a document
   */
  async getApprovalStatus(documentId: string): Promise<DocumentApprovalRequest | null> {
    try {
      const approvals = await apiRequest<Array<Record<string, unknown>>>(`/approvals/entity/document/${documentId}`)
      if (approvals.length === 0) return null

      const latest = approvals[0]
      return {
        id: latest.id as string,
        documentId,
        requestedBy: latest.requestedBy as string,
        requestedAt: latest.createdAt as string,
        status: latest.status as 'pending' | 'approved' | 'rejected',
        approvers: ((latest.steps as Array<Record<string, unknown>>) || []).map(step => ({
          userId: step.approverId as string,
          status: step.status as 'pending' | 'approved' | 'rejected',
          respondedAt: step.respondedAt as string | undefined,
          comments: step.comments as string | undefined
        })),
        message: latest.message as string | undefined
      }
    } catch (error) {
      console.error('Failed to get approval status:', error)
      return null
    }
  },

  /**
   * Cancel approval request
   */
  async cancelApproval(documentId: string): Promise<boolean> {
    try {
      const approvals = await apiRequest<Array<{ id: string }>>(`/approvals/entity/document/${documentId}`)
      if (approvals.length > 0) {
        await apiRequest(`/approvals/${approvals[0].id}`, { method: 'DELETE' })
      }
      return true
    } catch (error) {
      console.error('Failed to cancel approval:', error)
      return false
    }
  },

  // ============ Versions ============

  /**
   * Create a new version snapshot
   */
  async createVersion(
    documentId: string,
    options: {
      content?: string
      changeDescription?: string
      isCheckpoint?: boolean
    }
  ): Promise<Version | null> {
    try {
      // Get the current document if content not provided
      let contentSnapshot: Record<string, unknown>
      if (options.content) {
        contentSnapshot = { content: options.content }
      } else {
        const doc = await this.getDocument(documentId)
        if (!doc) throw new Error('Document not found')
        contentSnapshot = {
          title: doc.title,
          content: doc.content,
          description: doc.description,
          tags: doc.tags,
          category: doc.category
        }
      }

      const versionData = await apiRequest<Record<string, unknown>>('/versions', {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'document',
          entityId: documentId,
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
   * Get version history for a document
   */
  async listVersions(documentId: string, page = 1, limit = 20): Promise<Version[]> {
    try {
      const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(
        `/versions/document/${documentId}?page=${page}&limit=${limit}`
      )
      return response.items.map(v => ({
        id: v.id as string,
        version: v.versionNumber as number,
        content: JSON.stringify(v.contentSnapshot || {}),
        createdAt: v.createdAt as string,
        createdBy: v.changedBy as string,
        createdByName: (v as Record<string, unknown>).changedByName as string | undefined,
        createdByAvatar: (v as Record<string, unknown>).changedByAvatar as string | undefined,
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
  async getVersion(documentId: string, versionNumber: number): Promise<Document | null> {
    try {
      const versionData = await apiRequest<Record<string, unknown>>(`/versions/document/${documentId}/${versionNumber}`)
      const snapshot = versionData.contentSnapshot as Record<string, unknown>
      if (snapshot) {
        return mapApiDocumentToDocument(snapshot)
      }
      return null
    } catch (error) {
      console.error('Failed to get version:', error)
      return null
    }
  },

  /**
   * Restore a document to a previous version (creates a new version)
   */
  async restoreVersion(documentId: string, versionNumber: number): Promise<boolean> {
    try {
      // Get the version content
      const versionData = await apiRequest<Record<string, unknown>>(`/versions/document/${documentId}/${versionNumber}`)

      const snapshot = versionData.contentSnapshot as Record<string, unknown>

      if (!snapshot) {
        console.error('[DocumentApiService] No snapshot found')
        return false
      }

      // Update the document with the old content and clear Yjs state
      await this.updateDocument(documentId, {
        title: snapshot.title as string,
        content: snapshot.content as string,
        description: snapshot.description as string | undefined,
        tags: snapshot.tags as string[] | undefined,
        category: snapshot.category as string | undefined,
        contentJson: {} // Clear Yjs state to force re-initialization with restored content
      })

      // Create a new version marking it as a restore
      await this.createVersion(documentId, {
        changeDescription: `Restored from version ${versionNumber}`,
        isCheckpoint: true
      })

      return true
    } catch (error) {
      console.error('[DocumentApiService] Failed to restore version:', error)
      return false
    }
  },

  /**
   * Compare two versions
   */
  async compareVersions(
    documentId: string,
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
        `/versions/document/${documentId}/compare?versionA=${versionA}&versionB=${versionB}`
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
  async deleteVersion(documentId: string, versionNumber: number): Promise<boolean> {
    try {
      await apiRequest(`/versions/document/${documentId}/${versionNumber}`, {
        method: 'DELETE'
      })
      return true
    } catch (error) {
      console.error('Failed to delete version:', error)
      return false
    }
  },

  /**
   * Legacy method - kept for backward compatibility
   * @deprecated Use listVersions instead
   */
  async getVersionHistory(documentId: string): Promise<
    Array<{
      version: number
      createdAt: string
      changedBy: string
      changeSummary?: string
    }>
  > {
    const versions = await this.listVersions(documentId)
    return versions.map(v => ({
      version: v.version,
      createdAt: v.createdAt,
      changedBy: v.createdBy,
      changeSummary: v.changeDescription
    }))
  },

  // ============ Comments ============

  /**
   * Create a comment on a document
   */
  async createComment(documentId: string, input: CreateCommentInput): Promise<Comment | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/comments/document/${documentId}`, {
        method: 'POST',
        body: JSON.stringify(input)
      })

      return {
        id: response.id as string,
        entityId: documentId,
        entityType: 'document',
        type: response.type as Comment['type'],
        content: response.content as string,
        createdBy: response.createdBy as string,
        createdByName: response.createdByName as string | undefined,
        createdByAvatar: response.createdByAvatar as string | undefined,
        createdAt: response.createdAt as string,
        updatedAt: response.updatedAt as string | undefined,
        resolvedAt: response.resolvedAt as string | undefined,
        resolvedBy: response.resolvedBy as string | undefined,
        selectionStart: response.selectionStart as number | undefined,
        selectionEnd: response.selectionEnd as number | undefined,
        selectedText: response.selectedText as string | undefined,
        anchorPath: response.anchorPath as string | undefined,
        parentId: response.parentId as string | undefined
      }
    } catch (error) {
      console.error('Failed to create comment:', error)
      return null
    }
  },

  /**
   * List comments for a document
   */
  async listComments(documentId: string, options?: CommentQueryOptions): Promise<Comment[]> {
    try {
      const params = new URLSearchParams()
      if (options?.includeResolved) params.set('includeResolved', 'true')
      if (options?.includeReplies) params.set('includeReplies', 'true')
      if (options?.type) params.set('type', options.type)

      const queryString = params.toString()
      const response = await apiRequest<Record<string, unknown>[]>(
        `/comments/document/${documentId}${queryString ? `?${queryString}` : ''}`
      )

      return response.map(c => ({
        id: c.id as string,
        entityId: documentId,
        entityType: 'document',
        type: c.type as Comment['type'],
        content: c.content as string,
        createdBy: c.createdBy as string,
        createdByName: c.createdByName as string | undefined,
        createdByAvatar: c.createdByAvatar as string | undefined,
        createdAt: c.createdAt as string,
        updatedAt: c.updatedAt as string | undefined,
        resolvedAt: c.resolvedAt as string | undefined,
        resolvedBy: c.resolvedBy as string | undefined,
        selectionStart: c.selectionStart as number | undefined,
        selectionEnd: c.selectionEnd as number | undefined,
        selectedText: c.selectedText as string | undefined,
        anchorPath: c.anchorPath as string | undefined,
        parentId: c.parentId as string | undefined,
        replies: (c.replies as Record<string, unknown>[] | undefined)?.map(r => ({
          id: r.id as string,
          entityId: documentId,
          entityType: 'document' as const,
          type: r.type as Comment['type'],
          content: r.content as string,
          createdBy: r.createdBy as string,
          createdByName: r.createdByName as string | undefined,
          createdByAvatar: r.createdByAvatar as string | undefined,
          createdAt: r.createdAt as string,
          parentId: c.id as string
        }))
      }))
    } catch (error) {
      console.error('Failed to list comments:', error)
      return []
    }
  },

  /**
   * Update a comment
   */
  async updateComment(commentId: string, updates: Partial<Comment>): Promise<Comment | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: updates.content })
      })

      return {
        id: response.id as string,
        entityId: response.entityId as string,
        entityType: 'document',
        type: response.type as Comment['type'],
        content: response.content as string,
        createdBy: response.createdBy as string,
        createdAt: response.createdAt as string,
        updatedAt: response.updatedAt as string | undefined
      }
    } catch (error) {
      console.error('Failed to update comment:', error)
      return null
    }
  },

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string): Promise<boolean> {
    try {
      await apiRequest(`/comments/${commentId}/resolve`, {
        method: 'PATCH'
      })
      return true
    } catch (error) {
      console.error('Failed to resolve comment:', error)
      return false
    }
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<boolean> {
    try {
      await apiRequest(`/comments/${commentId}`, {
        method: 'DELETE'
      })
      return true
    } catch (error) {
      console.error('Failed to delete comment:', error)
      return false
    }
  },

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, reply: string): Promise<Comment | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/comments/${commentId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content: reply })
      })

      return {
        id: response.id as string,
        entityId: response.entityId as string,
        entityType: 'document',
        type: response.type as Comment['type'],
        content: response.content as string,
        createdBy: response.createdBy as string,
        createdByName: response.createdByName as string | undefined,
        createdAt: response.createdAt as string,
        parentId: response.parentId as string | undefined
      }
    } catch (error) {
      console.error('Failed to reply to comment:', error)
      return null
    }
  },

  // ============ Locks ============

  /**
   * Acquire a lock on a document
   */
  async lockFile(documentId: string, input?: LockFileInput): Promise<FileLock | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/locks/document/${documentId}`, {
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
      console.error('Failed to lock file:', error)
      return null
    }
  },

  /**
   * Release a lock
   */
  async unlockFile(documentId: string): Promise<boolean> {
    try {
      await apiRequest(`/locks/document/${documentId}`, {
        method: 'DELETE'
      })
      return true
    } catch (error) {
      console.error('Failed to unlock file:', error)
      return false
    }
  },

  /**
   * Get lock status
   */
  async getLockStatus(documentId: string): Promise<FileLock | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/locks/document/${documentId}`)

      if (!response.isLocked) {
        return null
      }

      return {
        isLocked: response.isLocked as boolean,
        lockedBy: response.lockedBy as string | undefined,
        lockedByName: response.lockedByName as string | undefined,
        lockedByAvatar: response.lockedByAvatar as string | undefined,
        lockedAt: response.lockedAt as string | undefined,
        lockExpiry: response.lockExpiry as string | undefined,
        lockReason: response.lockReason as string | undefined
      }
    } catch {
      // Silently return null if lock endpoint doesn't exist (404) or fails
      // Lock feature may not be implemented on backend yet
      return null
    }
  },

  /**
   * Force unlock (admin only)
   */
  async forceUnlock(documentId: string): Promise<boolean> {
    try {
      await apiRequest(`/locks/document/${documentId}/force`, {
        method: 'DELETE'
      })
      return true
    } catch (error) {
      console.error('Failed to force unlock:', error)
      return false
    }
  },

  // ============ Publishing ============

  /**
   * Publish a document
   */
  async publish(documentId: string, input?: PublishInput): Promise<PublishMetadata | null> {
    try {
      const response = await apiRequest<Record<string, unknown>>(`/documents/${documentId}/publish`, {
        method: 'POST',
        body: JSON.stringify(input || {})
      })

      return {
        status: 'published',
        publishedAt: response.publishedAt as string,
        publishedBy: response.publishedBy as string,
        publishVersion: response.publishVersion as number,
        publishNotes: response.publishNotes as string | undefined
      }
    } catch (error) {
      console.error('Failed to publish document:', error)
      return null
    }
  },

  /**
   * Unpublish a document
   */
  async unpublish(documentId: string): Promise<boolean> {
    try {
      await apiRequest(`/documents/${documentId}/unpublish`, {
        method: 'POST'
      })
      return true
    } catch (error) {
      console.error('Failed to unpublish document:', error)
      return false
    }
  },

  /**
   * Update publish status
   */
  async updateStatus(documentId: string, status: string): Promise<PublishMetadata | null> {
    try {
      await apiRequest<Record<string, unknown>>(`/documents/${documentId}/status`, {
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
  },

  /**
   * AI Edit - Apply AI-powered edits to a document (whole document or selection)
   */
  async aiEdit(
    documentId: string,
    payload: {
      instruction: string
      llmProvider?: 'openai' | 'groq'
      documentHtml: string
      documentPlainText: string
      mode: 'selection' | 'document'
      title?: string
      selection?: {
        start?: number
        end?: number
        selectedPlainText?: string
        selectionHtml?: string
      }
    }
  ): Promise<{
    mode: 'selection' | 'document'
    updatedHtml?: string
    replacementHtml?: string
    changeSummary: string
  }> {
    return apiRequest(`/documents/${documentId}/ai/edit`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}

export default DocumentApiService
