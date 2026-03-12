/**
 * useDocumentApps Hook
 *
 * Main hook for document CRUD operations, providing
 * state management and actions for the document apps module.
 *
 * Uses the document-service backend API for data persistence.
 * Server-driven pagination — fetches exactly one page per request.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import { DocumentApiService } from '../services/DocumentApiService'
import type { Document, DocumentSummary, ApprovalWorkflowConfig, DocumentApprovalRequest } from '../types'
import translations from '../_i18n'

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

  useEffect(() => {
    DocumentApiService.setAccessToken(accessToken || null)
  }, [accessToken])

  const refreshDocuments = useCallback(
    async (queryOverride?: ListQueryParams) => {
      if (!accessToken) {
        setState(prev => ({ ...prev, isLoading: false, error: t('doc-apps-error-not-authenticated') }))
        return
      }

      const query = queryOverride ?? lastQueryRef.current
      lastQueryRef.current = query

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const sortByMap: Record<string, 'createdAt' | 'updatedAt' | 'title'> = {
          created: 'createdAt',
          modified: 'updatedAt',
          name: 'title'
        }
        const backendSortBy = query.sortBy ?? (sortByMap[query.sortBy as string] || 'updatedAt')
        const backendSortOrder = query.sortOrder ?? 'DESC'

        const result = await DocumentApiService.listDocuments({
          section: query.section,
          favoriteIds: query.favoriteIds,
          search: query.search,
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          sortBy: backendSortBy,
          sortOrder: backendSortOrder
        })

        const documents = result.items.map(doc => {
          const isOwner = doc.createdBy === userId
          return {
            ...doc,
            isOwner: doc.permission === 'owner' || isOwner,
            isShared: doc.isShared ?? !isOwner
          }
        })

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
        console.error('[useDocumentApps] Failed to load documents:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : t('doc-apps-error-load-documents')
        }))
      }
    },
    [accessToken, userId, t]
  )

  const loadDocument = useCallback(
    async (id: string): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const document = await DocumentApiService.getDocument(id)
        if (document) {
          const permission = document.permission || 'owner'
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
    [accessToken, t]
  )

  const createDocument = useCallback(
    async (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const newDocument = await DocumentApiService.createDocument(document)
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
    [accessToken, refreshDocuments, t]
  )

  const updateDocument = useCallback(
    async (id: string, updates: Partial<Document>): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const updatedDocument = await DocumentApiService.updateDocument(id, updates)
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
    [accessToken, t]
  )

  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const success = await DocumentApiService.deleteDocument(id)
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
    [accessToken, refreshDocuments, t]
  )

  const duplicateDocument = useCallback(
    async (id: string): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const duplicate = await DocumentApiService.duplicateDocument(id)
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
    [accessToken, refreshDocuments, t]
  )

  const shareDocument = useCallback(
    async (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment'): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const shares = userIds.map(userId => ({ userId, permission }))
        const success = await DocumentApiService.shareDocument(id, shares)
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
    [accessToken, refreshDocuments, t]
  )

  const revokeAccess = useCallback(
    async (id: string, revokeUserId: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const success = await DocumentApiService.revokeAccess(id, revokeUserId)
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
    [accessToken, refreshDocuments, t]
  )

  const sendForApproval = useCallback(
    async (config: ApprovalWorkflowConfig): Promise<DocumentApprovalRequest | null> => {
      if (!accessToken) return null

      try {
        const success = await DocumentApiService.sendForApproval(config.documentId, config.approvers, config.message)

        if (success) {
          await DocumentApiService.updateDocumentStatus(config.documentId, 'pending_approval')
          toast.success(t('doc-apps-toast-sent-approval'))
          await refreshDocuments()

          const approvalRequest = await DocumentApiService.getApprovalStatus(config.documentId)
          return approvalRequest
        }
        return null
      } catch (error) {
        console.error('[useDocumentApps] Failed to send for approval:', error)
        toast.error(t('doc-apps-toast-send-approval-failed'))
        return null
      }
    },
    [accessToken, refreshDocuments, t]
  )

  const cancelApproval = useCallback(
    async (documentId: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const success = await DocumentApiService.cancelApproval(documentId)

        if (success) {
          await DocumentApiService.updateDocumentStatus(documentId, 'draft')
          toast.success(t('doc-apps-toast-approval-cancelled'))
          await refreshDocuments()
        }
        return success
      } catch (error) {
        console.error('[useDocumentApps] Failed to cancel approval:', error)
        toast.error(t('doc-apps-toast-cancel-approval-failed'))
        return false
      }
    },
    [accessToken, refreshDocuments, t]
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
        const document = await DocumentApiService.getDocument(id)
        if (!document) return null
        return document.content
      } catch (error) {
        console.error('[useDocumentApps] Failed to export document:', error)
        return null
      }
    },
    [accessToken]
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
