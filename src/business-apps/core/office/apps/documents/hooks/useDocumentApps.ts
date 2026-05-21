/**
 * useDocumentApps Hook
 *
 * Main hook for document CRUD operations, providing
 * state management and actions for the document apps module.
 *
 * Uses the document-service backend API for data persistence.
 * Server-driven pagination — fetches exactly one page per request.
 */

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import { useOfficeClient } from '@/common/network/office/useOfficeClient'
import type { Document, DocumentSummary, ApprovalWorkflowConfig, DocumentApprovalRequest } from '../types'
import translations from '../_i18n'
import {
  getDocumentById,
  getDocumentForOpenById,
  mapApiDocToSummary,
  mapApiDocumentToDocument
} from '../utils/documentOfficeOperations'

interface ServerPageMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UseDocumentAppsState {
  documents: DocumentSummary[]
  currentDocument: Document | null
  currentDocumentPermission: 'owner' | 'view' | 'edit' | 'comment' | null
  isLoading: boolean
  error: string | null
  storageMode: 'database' | 'local'
  pageMeta: ServerPageMeta
}

export interface ListQueryParams {
  section?: string
  favoriteIds?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  sortOrder?: 'ASC' | 'DESC'
}

interface UseDocumentAppsResult extends UseDocumentAppsState {
  loadDocument: (id: string, filePath?: string) => Promise<Document | null>
  createDocument: (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Document | null>
  updateDocument: (id: string, updates: Partial<Document>) => Promise<Document | null>
  deleteDocument: (id: string) => Promise<boolean>
  duplicateDocument: (id: string) => Promise<Document | null>
  shareDocument: (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment') => Promise<boolean>
  revokeAccess: (id: string, userId: string) => Promise<boolean>
  sendForApproval: (config: ApprovalWorkflowConfig) => Promise<DocumentApprovalRequest | null>
  cancelApproval: (documentId: string) => Promise<boolean>
  clearCurrentDocument: () => void
  refreshDocuments: (queryOverride?: ListQueryParams) => Promise<void>
  exportDocument: (id: string, format: 'docx' | 'pdf' | 'html') => Promise<string | null>
}

export function useDocumentApps(accessToken: string, userId?: string): UseDocumentAppsResult {
  const { t } = useTranslation(translations)
  const officeClient = useOfficeClient(accessToken)
  const [state, setState] = useState<UseDocumentAppsState>({
    documents: [],
    currentDocument: null,
    currentDocumentPermission: null,
    isLoading: true,
    error: null,
    storageMode: 'database',
    pageMeta: { total: 0, page: 1, limit: 20, totalPages: 0 }
  })

  const lastQueryRef = useRef<ListQueryParams>({})
  const latestRequestIdRef = useRef(0)

  const refreshDocuments = useCallback(
    async (queryOverride?: ListQueryParams) => {
      if (!accessToken) {
        setState(prev => ({ ...prev, isLoading: false, error: t('doc-apps-error-not-authenticated') }))
        return
      }

      const query = queryOverride ?? lastQueryRef.current
      lastQueryRef.current = query
      const requestId = ++latestRequestIdRef.current

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const backendSortBy = query.sortBy ?? 'updatedAt'
        const backendSortOrder = query.sortOrder ?? 'DESC'

        const params = new URLSearchParams()
        if (query.section) params.set('section', query.section)
        if (query.favoriteIds) params.set('favoriteIds', query.favoriteIds)
        if (query.search) params.set('search', query.search)
        params.set('page', String(query.page ?? 1))
        params.set('limit', String(query.limit ?? 20))
        params.set('sortBy', backendSortBy)
        params.set('sortOrder', backendSortOrder)

        let rawResult
        try {
          rawResult = await officeClient.documents.list<ServerPageMeta & { items: Record<string, unknown>[] }>(
            params.toString()
          )
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes('section should not exist')) {
            throw error
          }

          params.delete('section')
          if (query.section === 'archived') params.set('status', 'archived')
          else if (query.section === 'shared') params.set('includeShared', 'true')
          else if (query.section === 'my-documents') params.set('includeShared', 'false')
          rawResult = await officeClient.documents.list<ServerPageMeta & { items: Record<string, unknown>[] }>(
            params.toString()
          )
        }

        const result = {
          ...rawResult,
          items: rawResult.items.map(mapApiDocToSummary)
        }

        const documents = result.items.map(doc => {
          const isOwner = doc.createdBy === userId
          return {
            ...doc,
            isOwner: doc.permission === 'owner' || isOwner,
            isShared: doc.isShared ?? !isOwner
          }
        })

        if (requestId !== latestRequestIdRef.current) {
          return
        }

        setState(prev => ({
          ...prev,
          documents,
          isLoading: false,
          storageMode: 'database',
          pageMeta: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages
          }
        }))
      } catch (error) {
        if (requestId !== latestRequestIdRef.current) {
          return
        }

        console.error('[useDocumentApps] Failed to load documents:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : t('doc-apps-error-load-documents')
        }))
      }
    },
    [accessToken, officeClient, userId, t]
  )

  const loadDocument = useCallback(
    async (id: string): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const document = await getDocumentForOpenById(officeClient, id)
        if (document) {
          const permission = document.permission === 'admin' ? 'owner' : document.permission || 'owner'
          setState(prev => ({
            ...prev,
            currentDocument: document,
            currentDocumentPermission: permission
          }))
        }
        return document
      } catch (error) {
        console.error('[useDocumentApps] Failed to load document:', error)
        toast.error(t('doc-apps-error-load-document'))
        return null
      }
    },
    [accessToken, officeClient, t]
  )

  const createDocument = useCallback(
    async (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const newDocument = mapApiDocumentToDocument(
          await officeClient.documents.create({
            title: document.title || 'Untitled Document',
            description: document.description,
            content: document.content || '',
            status: document.status || 'draft',
            category: document.category,
            tags: document.tags,
            formatting: document.formatting,
            templateId: undefined
          })
        )
        if (newDocument) {
          toast.success(t('doc-apps-toast-document-created'))
          await refreshDocuments()
        }
        return newDocument
      } catch (error) {
        console.error('[useDocumentApps] Failed to create document:', error)
        toast.error(t('doc-apps-toast-create-failed'))
        return null
      }
    },
    [accessToken, officeClient, refreshDocuments, t]
  )

  const updateDocument = useCallback(
    async (id: string, updates: Partial<Document>): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const payload: Record<string, unknown> = {
          title: updates.title,
          description: updates.description,
          content: updates.content,
          status: updates.status,
          category: updates.category,
          tags: updates.tags,
          formatting: updates.formatting,
          createVersion: true
        }
        const contentJson = (updates as Record<string, unknown>).contentJson
        if (contentJson !== undefined) payload.contentJson = contentJson
        Object.keys(payload).forEach(key => {
          if (payload[key] === undefined) delete payload[key]
        })
        const updatedDocument = mapApiDocumentToDocument(await officeClient.documents.update(id, payload))
        if (updatedDocument) {
          setState(prev => ({
            ...prev,
            currentDocument: updatedDocument
          }))
          setState(prev => ({
            ...prev,
            documents: prev.documents.map(d =>
              d.id === id
                ? {
                    ...d,
                    title: updatedDocument.title,
                    description: updatedDocument.description,
                    status: updatedDocument.status,
                    updatedAt: updatedDocument.updatedAt
                  }
                : d
            )
          }))
        }
        return updatedDocument
      } catch (error) {
        console.error('[useDocumentApps] Failed to update document:', error)
        toast.error(t('doc-apps-toast-save-failed'))
        return null
      }
    },
    [accessToken, officeClient, t]
  )

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        await officeClient.documents.delete(id)
        const success = true
        if (success) {
          toast.success(t('doc-apps-toast-document-deleted'))
          await refreshDocuments()
        }
        return success
      } catch (error) {
        console.error('[useDocumentApps] Failed to delete document:', error)
        toast.error(t('doc-apps-toast-delete-failed'))
        return false
      }
    },
    [accessToken, officeClient, refreshDocuments, t]
  )

  const duplicateDocument = useCallback(
    async (id: string): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const duplicated = await officeClient.documents.duplicate<Record<string, unknown>>(id)
        const duplicate = duplicated ? mapApiDocumentToDocument(duplicated) : null
        if (duplicate) {
          toast.success(t('doc-apps-toast-document-duplicated'))
          await refreshDocuments()
        }
        return duplicate
      } catch (error) {
        console.error('[useDocumentApps] Failed to duplicate document:', error)
        toast.error(t('doc-apps-toast-duplicate-failed'))
        return null
      }
    },
    [accessToken, officeClient, refreshDocuments, t]
  )

  const shareDocument = useCallback(
    async (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment'): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const shares = userIds.map(userId => ({ userId, permission }))
        await officeClient.createShare({
          entityType: 'document',
          entityId: id,
          recipients: shares.map(share => ({
            userId: share.userId,
            permission: share.permission
          }))
        })
        const success = true
        if (success) {
          toast.success(t('doc-apps-toast-share-success'))
          await refreshDocuments()
        }
        return success
      } catch (error) {
        console.error('[useDocumentApps] Failed to share document:', error)
        toast.error(t('doc-apps-toast-share-failed'))
        return false
      }
    },
    [accessToken, officeClient, refreshDocuments, t]
  )

  const revokeAccess = useCallback(
    async (id: string, revokeUserId: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const shares = await officeClient.getSharingForDocument<Array<{ id: string; userId: string }>>(id)
        const share = shares.find(entry => entry.userId === revokeUserId)
        if (share) {
          await officeClient.deleteShare(share.id)
        }
        const success = true
        if (success) {
          toast.success(t('doc-apps-toast-access-revoked'))
          await refreshDocuments()
        }
        return success
      } catch (error) {
        console.error('[useDocumentApps] Failed to revoke access:', error)
        toast.error(t('doc-apps-toast-revoke-failed'))
        return false
      }
    },
    [accessToken, officeClient, refreshDocuments, t]
  )

  const sendForApproval = useCallback(
    async (config: ApprovalWorkflowConfig): Promise<DocumentApprovalRequest | null> => {
      if (!accessToken) return null

      try {
        const response = await officeClient.documents.submitForApproval<{
          approvalRequest?: DocumentApprovalRequest
        }>(config.documentId, {
          approvers: config.approvers.map(userId => ({ userId })),
          message: config.message,
          dueDate: config.dueDate
        })

        toast.success(t('doc-apps-toast-sent-approval'))
        await refreshDocuments()

        return response.approvalRequest ?? null
      } catch (error) {
        console.error('[useDocumentApps] Failed to send for approval:', error)
        toast.error(t('doc-apps-toast-send-approval-failed'))
        return null
      }
    },
    [accessToken, officeClient, refreshDocuments, t]
  )

  const cancelApproval = useCallback(
    async (documentId: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const approvals = await officeClient.documents.getApprovalsForDocument<Array<{ id: string }>>(documentId)
        if (approvals.length > 0) {
          await officeClient.documents.deleteApproval(approvals[0].id)
        }

        toast.success(t('doc-apps-toast-approval-cancelled'))
        await refreshDocuments()
        return true
      } catch (error) {
        console.error('[useDocumentApps] Failed to cancel approval:', error)
        toast.error(t('doc-apps-toast-cancel-approval-failed'))
        return false
      }
    },
    [accessToken, officeClient, refreshDocuments, t]
  )

  const clearCurrentDocument = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentDocument: null,
      currentDocumentPermission: null
    }))
  }, [])

  const exportDocument = useCallback(
    async (id: string): Promise<string | null> => {
      if (!accessToken) return null

      try {
        const document = await getDocumentById(officeClient, id)
        if (!document) return null
        return document.content
      } catch (error) {
        console.error('[useDocumentApps] Failed to export document:', error)
        return null
      }
    },
    [accessToken, officeClient]
  )

  return {
    ...state,
    loadDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    duplicateDocument,
    shareDocument,
    revokeAccess,
    sendForApproval,
    cancelApproval,
    clearCurrentDocument,
    refreshDocuments,
    exportDocument
  }
}
