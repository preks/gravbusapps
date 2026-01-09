/**
 * useDocumentApps Hook
 *
 * Main hook for document CRUD operations, providing
 * state management and actions for the document apps module.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { DocumentFileStorageService, DocumentApprovalService } from '../services'
import type { Document, DocumentSummary, ApprovalWorkflowConfig, DocumentApprovalRequest } from '../types'

interface UseDocumentAppsState {
  documents: DocumentSummary[]
  currentDocument: Document | null
  currentDocumentPermission: 'owner' | 'view' | 'edit' | 'comment' | null
  isLoading: boolean
  error: string | null
  storageMode: 'database' | 'local'
}

interface UseDocumentAppsResult extends UseDocumentAppsState {
  // Document operations
  loadDocument: (id: string, filePath?: string) => Promise<Document | null>
  createDocument: (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Document | null>
  updateDocument: (id: string, updates: Partial<Document>) => Promise<Document | null>
  deleteDocument: (id: string) => Promise<boolean>
  duplicateDocument: (id: string) => Promise<Document | null>

  // Sharing
  shareDocument: (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment') => Promise<boolean>
  revokeAccess: (id: string, userId: string) => Promise<boolean>

  // Approval workflow
  sendForApproval: (config: ApprovalWorkflowConfig) => Promise<DocumentApprovalRequest | null>
  cancelApproval: (documentId: string) => Promise<boolean>

  // Utilities
  clearCurrentDocument: () => void
  refreshDocuments: () => Promise<void>
  exportDocument: (id: string, format: 'docx' | 'pdf' | 'html') => Promise<string | null>
}

/**
 * Hook for managing documents
 */
export function useDocumentApps(accessToken: string, userId?: string): UseDocumentAppsResult {
  const [state, setState] = useState<UseDocumentAppsState>({
    documents: [],
    currentDocument: null,
    currentDocumentPermission: null,
    isLoading: true,
    error: null,
    storageMode: 'database'
  })

  // Initialize services
  const storageService = useMemo(() => {
    if (!accessToken || !userId) return null
    return new DocumentFileStorageService(accessToken, userId)
  }, [accessToken, userId])

  const approvalService = useMemo(() => {
    if (!accessToken || !userId) return null
    return new DocumentApprovalService(accessToken, userId)
  }, [accessToken, userId])

  /**
   * Load all documents and sync pending approval statuses
   */
  const refreshDocuments = useCallback(async () => {
    if (!storageService) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      let documents = await storageService.listDocuments()

      // Sync approval statuses for documents with pending approvals
      if (approvalService) {
        const pendingDocs = documents.filter(
          doc =>
            doc.approvalRequest?.status === 'pending' &&
            (doc.approvalRequest?.workflowIds?.length || doc.approvalRequest?.workflowId)
        )

        // Process pending approvals in parallel (limit to 5 concurrent to avoid overload)
        const BATCH_SIZE = 5
        for (let i = 0; i < pendingDocs.length; i += BATCH_SIZE) {
          const batch = pendingDocs.slice(i, i + BATCH_SIZE)
          const results = await Promise.all(
            batch.map(async doc => {
              if (!doc.approvalRequest) return null
              try {
                const updatedApproval = await approvalService.syncApprovalStatus(doc.approvalRequest)
                if (updatedApproval && updatedApproval.status !== 'pending') {
                  // Update the document in storage
                  const newStatus =
                    updatedApproval.status === 'approved'
                      ? 'approved'
                      : updatedApproval.status === 'rejected'
                        ? 'rejected'
                        : doc.status

                  await storageService.updateDocument(doc.id, {
                    status: newStatus,
                    approvalRequest: updatedApproval
                  })

                  return { docId: doc.id, updatedApproval, newStatus }
                }
              } catch (err) {
                console.warn('[useDocumentApps] Failed to sync approval for doc:', doc.id, err)
              }
              return null
            })
          )

          // Update local documents array with any changes
          const changes = results.filter(Boolean)
          if (changes.length > 0) {
            documents = documents.map(doc => {
              const change = changes.find(c => c?.docId === doc.id)
              if (change) {
                return {
                  ...doc,
                  status: change.newStatus,
                  approvalStatus: change.updatedApproval.status,
                  approvalRequest: change.updatedApproval
                }
              }
              return doc
            })
          }
        }
      }

      setState(prev => ({
        ...prev,
        documents,
        isLoading: false,
        storageMode: 'database'
      }))
    } catch (error) {
      console.error('[useDocumentApps] Failed to load documents:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load documents'
      }))
    }
  }, [storageService, approvalService])

  // Load documents on mount
  useEffect(() => {
    refreshDocuments()
  }, [refreshDocuments])

  /**
   * Load a single document
   */
  const loadDocument = useCallback(
    async (id: string, filePath?: string): Promise<Document | null> => {
      if (!storageService) return null

      try {
        let document = await storageService.getDocument(id, filePath)
        if (document) {
          // Sync approval status if document has a pending approval request
          if (document.approvalRequest && document.approvalRequest.status === 'pending' && approvalService) {
            const updatedApproval = await approvalService.syncApprovalStatus(document.approvalRequest)
            if (updatedApproval) {
              // Update the document with synced approval status
              const newStatus =
                updatedApproval.status === 'approved'
                  ? 'approved'
                  : updatedApproval.status === 'rejected'
                    ? 'rejected'
                    : document.status

              const updatedDoc = await storageService.updateDocument(id, {
                status: newStatus,
                approvalRequest: updatedApproval
              })

              if (updatedDoc) {
                document = updatedDoc
                // Also refresh the documents list to update the card
                await refreshDocuments()
              }
            }
          }

          // Determine permission
          const isOwner = document.createdBy === userId
          const share = document.sharedWith?.find(s => s.userId === userId)
          const permission = isOwner ? 'owner' : share?.permission || 'view'

          setState(prev => ({
            ...prev,
            currentDocument: document,
            currentDocumentPermission: permission
          }))
        }
        return document
      } catch (error) {
        console.error('[useDocumentApps] Failed to load document:', error)
        toast.error('Failed to load document')
        return null
      }
    },
    [storageService, userId, approvalService, refreshDocuments]
  )

  /**
   * Create a new document
   */
  const createDocument = useCallback(
    async (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document | null> => {
      if (!storageService) return null

      try {
        const newDocument = await storageService.createDocument(document)
        if (newDocument) {
          toast.success('Document created successfully')
          await refreshDocuments()
        }
        return newDocument
      } catch (error) {
        console.error('[useDocumentApps] Failed to create document:', error)
        toast.error('Failed to create document')
        return null
      }
    },
    [storageService, refreshDocuments]
  )

  /**
   * Update an existing document
   */
  const updateDocument = useCallback(
    async (id: string, updates: Partial<Document>): Promise<Document | null> => {
      if (!storageService) return null

      try {
        const updatedDocument = await storageService.updateDocument(id, updates)
        if (updatedDocument) {
          setState(prev => ({
            ...prev,
            currentDocument: updatedDocument
          }))
          // Update list entry
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
        toast.error('Failed to save document')
        return null
      }
    },
    [storageService]
  )

  /**
   * Delete a document
   */
  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      if (!storageService) return false

      try {
        const success = await storageService.deleteDocument(id)
        if (success) {
          toast.success('Document deleted')
          setState(prev => ({
            ...prev,
            documents: prev.documents.filter(d => d.id !== id),
            currentDocument: prev.currentDocument?.id === id ? null : prev.currentDocument
          }))
        }
        return success
      } catch (error) {
        console.error('[useDocumentApps] Failed to delete document:', error)
        toast.error('Failed to delete document')
        return false
      }
    },
    [storageService]
  )

  /**
   * Duplicate a document
   */
  const duplicateDocument = useCallback(
    async (id: string): Promise<Document | null> => {
      if (!storageService) return null

      try {
        const duplicate = await storageService.duplicateDocument(id)
        if (duplicate) {
          toast.success('Document duplicated')
          await refreshDocuments()
        }
        return duplicate
      } catch (error) {
        console.error('[useDocumentApps] Failed to duplicate document:', error)
        toast.error('Failed to duplicate document')
        return null
      }
    },
    [storageService, refreshDocuments]
  )

  /**
   * Share a document with users
   */
  const shareDocument = useCallback(
    async (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment'): Promise<boolean> => {
      if (!storageService) return false

      try {
        const success = await storageService.shareDocument(id, userIds, permission)
        if (success) {
          toast.success('Document shared successfully')
          await refreshDocuments()
        }
        return success
      } catch (error) {
        console.error('[useDocumentApps] Failed to share document:', error)
        toast.error('Failed to share document')
        return false
      }
    },
    [storageService, refreshDocuments]
  )

  /**
   * Revoke document access
   */
  const revokeAccess = useCallback(
    async (id: string, userId: string): Promise<boolean> => {
      if (!storageService) return false

      try {
        const success = await storageService.revokeAccess(id, userId)
        if (success) {
          toast.success('Access revoked')
          await refreshDocuments()
        }
        return success
      } catch (error) {
        console.error('[useDocumentApps] Failed to revoke access:', error)
        toast.error('Failed to revoke access')
        return false
      }
    },
    [storageService, refreshDocuments]
  )

  /**
   * Send document for approval
   */
  const sendForApproval = useCallback(
    async (config: ApprovalWorkflowConfig): Promise<DocumentApprovalRequest | null> => {
      if (!approvalService || !storageService) return null

      try {
        const approvalRequest = await approvalService.sendForApproval(config)
        if (approvalRequest) {
          // Update document with approval request
          await storageService.updateDocument(config.documentId, {
            status: 'pending_approval',
            approvalRequest
          })
          toast.success('Document sent for approval')
          await refreshDocuments()
        }
        return approvalRequest
      } catch (error) {
        console.error('[useDocumentApps] Failed to send for approval:', error)
        toast.error('Failed to send for approval')
        return null
      }
    },
    [approvalService, storageService, refreshDocuments]
  )

  /**
   * Cancel approval request
   */
  const cancelApproval = useCallback(
    async (documentId: string): Promise<boolean> => {
      if (!approvalService || !storageService) return false

      try {
        const document = await storageService.getDocument(documentId)
        if (!document?.approvalRequest) return false

        const success = await approvalService.cancelApproval(
          document.approvalRequest.id,
          document.approvalRequest.workflowId
        )

        if (success) {
          await storageService.updateDocument(documentId, {
            status: 'draft',
            approvalRequest: {
              ...document.approvalRequest,
              status: 'cancelled'
            }
          })
          toast.success('Approval cancelled')
          await refreshDocuments()
        }
        return success
      } catch (error) {
        console.error('[useDocumentApps] Failed to cancel approval:', error)
        toast.error('Failed to cancel approval')
        return false
      }
    },
    [approvalService, storageService, refreshDocuments]
  )

  /**
   * Clear current document
   */
  const clearCurrentDocument = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentDocument: null,
      currentDocumentPermission: null
    }))
  }, [])

  /**
   * Export document to specified format
   */
  const exportDocument = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async (id: string, format: 'docx' | 'pdf' | 'html'): Promise<string | null> => {
      if (!storageService) return null

      try {
        const document = await storageService.getDocument(id)
        if (!document) return null

        // Return content for export (actual export handled by exportUtils)
        return document.content
      } catch (error) {
        console.error('[useDocumentApps] Failed to export document:', error)
        return null
      }
    },
    [storageService]
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
