/**
 * DocumentApiService
 *
 * Connects to the document-service backend API for document management.
 * This replaces the file-based storage with proper REST API calls.
 *
 * Backend: https://newwork-dev.newwork.com/document-service/api/v1 (dev)
 *          http://localhost:3002/api/v1 (local, if VITE_DOCUMENT_SERVICE_URL is set)
 */

import type {
  Document,
  DocumentSummary,
  DocumentStatus,
  DocumentTemplate,
  TemplateSummary,
  DocumentShare,
  DocumentApprovalRequest
} from '../types'
import { env } from '@/common/env/EnvUtils'

// Get the API URL from environment or default to dev environment
const getApiUrl = (): string => {
  // Check for explicit environment variable first (Vite env var)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DOCUMENT_SERVICE_URL) {
    return import.meta.env.VITE_DOCUMENT_SERVICE_URL
  }

  // If platform is running on localhost, connect to DEV environment
  // This handles the case where UI is loaded from CDN but platform is running locally
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1'
    if (isLocalHost) {
      return 'https://newwork-dev.newwork.com/document-service/api/v1'
    }
  }

  // Try to get base URL from environment and construct document-service URL
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  if (baseUrl) {
    const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${trimmed}/document-service/api/v1`
  }

  // Default to dev environment
  return 'https://newwork-dev.newwork.com/document-service/api/v1'
}

const API_URL = getApiUrl()

const isDocumentAppsDebugEnabled = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage.getItem('debug:document-apps') === '1'
    )
  } catch {
    return false
  }
}

const debugLog = (...args: unknown[]) => {
  if (isDocumentAppsDebugEnabled()) {
    console.debug('[DocumentApiService]', ...args)
  }
}

// Get auth token - check multiple storage locations
const getAuthToken = (): string | null => {
  try {
    // First check the IDE's storage key (Business App IDE)
    const ideToken = localStorage.getItem('business-app-ide-access-token')
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
  return text ? JSON.parse(text) : null
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
    sharedBy: apiDoc.sharedBy as string | undefined
  }
}

function mapApiTemplateToTemplate(apiTemplate: Record<string, unknown>): DocumentTemplate {
  return {
    id: apiTemplate.id as string,
    name: apiTemplate.name as string,
    description: apiTemplate.description as string | undefined,
    content: apiTemplate.content as string,
    category: (apiTemplate.category as string) || 'other',
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

/**
 * Document API Service
 */
export const DocumentApiService = {
  // ============ Documents ============

  /**
   * Get all documents for the current user
   */
  async listDocuments(options?: {
    status?: DocumentStatus
    category?: string
    tags?: string[]
    search?: string
    page?: number
    limit?: number
    includeShared?: boolean
  }): Promise<DocumentSummary[]> {
    const params = new URLSearchParams()
    if (options?.status) params.set('status', options.status)
    if (options?.category) params.set('category', options.category)
    if (options?.tags?.length) params.set('tags', options.tags.join(','))
    if (options?.search) params.set('search', options.search)
    if (options?.page) params.set('page', options.page.toString())
    if (options?.limit) params.set('limit', options.limit.toString())
    // Include shared documents by default
    params.set('includeShared', options?.includeShared !== false ? 'true' : 'false')

    const queryString = params.toString()
    const endpoint = `/documents${queryString ? `?${queryString}` : ''}`

    debugLog('listDocuments', endpoint)

    const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(endpoint)

    console.log(
      '[DocumentApiService] listDocuments raw response:',
      response.items.map(d => ({
        id: d.id,
        title: d.title,
        ownerId: d.ownerId,
        isShared: d.isShared,
        sharedBy: d.sharedBy,
        permission: d.permission,
        rawPermission: d.permission // Log the exact value
      }))
    )

    return response.items.map(doc => ({
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
      // Sharing information from backend
      isShared: doc.isShared as boolean | undefined,
      sharedBy: doc.sharedBy as string | undefined,
      // Map backend 'admin' permission to frontend 'owner'
      permission: (doc.permission === 'admin' ? 'owner' : doc.permission) as DocumentSummary['permission']
    }))
  },

  /**
   * Get a single document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      debugLog('getDocument', id)
      const doc = await apiRequest<Record<string, unknown>>(`/documents/${id}`)
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
    debugLog('createDocument', document)

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
   * Update an existing document
   */
  async updateDocument(
    id: string,
    updates: Partial<Document>,
    options?: { createVersion?: boolean }
  ): Promise<Document> {
    debugLog('updateDocument', id, updates)

    const payload = {
      title: updates.title,
      description: updates.description,
      content: updates.content,
      status: updates.status,
      category: updates.category,
      tags: updates.tags,
      formatting: updates.formatting,
      createVersion: options?.createVersion ?? true
    }

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload]
      }
    })

    const updated = await apiRequest<Record<string, unknown>>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })

    return mapApiDocumentToDocument(updated)
  },

  /**
   * Delete a document
   */
  async deleteDocument(id: string): Promise<boolean> {
    try {
      debugLog('deleteDocument', id)
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
      debugLog('duplicateDocument', id)
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
      debugLog('updateDocumentStatus', id, status)
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
      console.log('[DocumentApiService] shareDocument payload:', JSON.stringify(payload, null, 2))
      debugLog('shareDocument', documentId, shares)
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
      console.log('[DocumentApiService] getSharedUsers called for:', documentId)
      debugLog('getSharedUsers', documentId)
      const shares = await apiRequest<Array<Record<string, unknown>>>(`/sharing/document/${documentId}`)
      console.log('[DocumentApiService] getSharedUsers raw response:', JSON.stringify(shares, null, 2))
      const mapped = (shares || []).map(s => ({
        id: s.id as string,
        userId: s.userId as string,
        permission: s.permission as 'view' | 'edit' | 'comment',
        sharedAt: s.createdAt as string,
        sharedBy: s.sharedBy as string
      }))
      console.log(
        '[DocumentApiService] getSharedUsers mapped:',
        mapped.map(m => ({ userId: m.userId, permission: m.permission }))
      )
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
      debugLog('updateSharePermission', shareId, permission)
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
      debugLog('revokeShareById', shareId)
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
      debugLog('revokeAccess', documentId, userId)
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
  async listTemplates(options?: { category?: string; includePublic?: boolean }): Promise<TemplateSummary[]> {
    const params = new URLSearchParams()
    if (options?.category) params.set('category', options.category)
    if (options?.includePublic !== undefined) params.set('includePublic', options.includePublic.toString())

    const queryString = params.toString()
    const endpoint = `/templates${queryString ? `?${queryString}` : ''}`

    debugLog('listTemplates', endpoint)

    const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(endpoint)

    return response.items.map(t => ({
      id: t.id as string,
      name: t.name as string,
      description: t.description as string | undefined,
      category: (t.category as string) || 'other',
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
  async getTemplate(id: string): Promise<DocumentTemplate | null> {
    try {
      debugLog('getTemplate', id)
      const template = await apiRequest<Record<string, unknown>>(`/templates/${id}`)
      return mapApiTemplateToTemplate(template)
    } catch (error) {
      console.error('Failed to get template:', error)
      return null
    }
  },

  /**
   * Create a template
   */
  async createTemplate(template: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    debugLog('createTemplate', template)

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
    debugLog('updateTemplate', id, updates)

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
      debugLog('deleteTemplate', id)
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
  async createDocumentFromTemplate(templateId: string, title: string): Promise<Document> {
    debugLog('createDocumentFromTemplate', templateId, title)

    const payload = {
      title,
      templateId
    }

    const created = await apiRequest<Record<string, unknown>>('/documents', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    return mapApiDocumentToDocument(created)
  },

  // ============ Approvals ============

  /**
   * Send document for approval
   */
  async sendForApproval(documentId: string, approvers: string[], message?: string): Promise<boolean> {
    try {
      debugLog('sendForApproval', documentId, approvers)

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
      debugLog('getApprovalStatus', documentId)
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
      debugLog('cancelApproval', documentId)
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
   * Get version history for a document
   */
  async getVersionHistory(documentId: string): Promise<
    Array<{
      version: number
      createdAt: string
      changedBy: string
      changeSummary?: string
    }>
  > {
    try {
      debugLog('getVersionHistory', documentId)
      const response = await apiRequest<PaginatedResponse<Record<string, unknown>>>(`/versions/document/${documentId}`)
      return response.items.map(v => ({
        version: v.versionNumber as number,
        createdAt: v.createdAt as string,
        changedBy: v.changedBy as string,
        changeSummary: v.changeSummary as string | undefined
      }))
    } catch (error) {
      console.error('Failed to get version history:', error)
      return []
    }
  },

  /**
   * Get a specific version
   */
  async getVersion(documentId: string, version: number): Promise<Document | null> {
    try {
      debugLog('getVersion', documentId, version)
      const versionData = await apiRequest<Record<string, unknown>>(`/versions/document/${documentId}/${version}`)
      const snapshot = versionData.contentSnapshot as Record<string, unknown>
      if (snapshot) {
        return mapApiDocumentToDocument(snapshot)
      }
      return null
    } catch (error) {
      console.error('Failed to get version:', error)
      return null
    }
  }
}

export default DocumentApiService
