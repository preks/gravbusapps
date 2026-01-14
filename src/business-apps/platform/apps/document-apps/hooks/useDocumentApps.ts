/**
 * useDocumentApps Hook
 *
 * Main hook for document CRUD operations, providing
 * state management and actions for the document apps module.
 *
 * Uses the document-service backend API for data persistence.
 */

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { DocumentApiService } from '../services/DocumentApiService'
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
 * Hook for managing documents using the document-service backend
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

  /**
   * Load all documents from the backend
   */
  const refreshDocuments = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      const rawDocuments = await DocumentApiService.listDocuments()

      // Enhance documents with ownership info (backend may already provide some of this)
      const documents = rawDocuments.map(doc => {
        const isOwner = doc.createdBy === userId
        return {
          ...doc,
          // Use backend values if available, otherwise compute
          isOwner: doc.permission === 'owner' || isOwner,
          isShared: doc.isShared ?? !isOwner
        }
      })

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
        error: error instanceof Error ? error.message : 'Failed to load documents'
      }))
    }
  }, [accessToken, userId])

  // Load documents on mount
  useEffect(() => {
    refreshDocuments()
  }, [refreshDocuments])

  /**
   * Load a single document
   */
  const loadDocument = useCallback(
    async (id: string): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const document = await DocumentApiService.getDocument(id)
        if (document) {
          // Use permission from backend API response (already computed by backend)
          // Backend returns 'admin' for owner, which gets mapped to 'owner' in the API service
          // Default to 'owner' if not specified (for newly created documents)
          const permission = document.permission || 'owner'
          
          console.log('[useDocumentApps] loadDocument:', {
            id: document.id,
            createdBy: document.createdBy,
            userId,
            backendPermission: document.permission,
            resolvedPermission: permission
          })

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
    [accessToken, userId]
  )

  /**
   * Create a new document
   */
  const createDocument = useCallback(
    async (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const newDocument = await DocumentApiService.createDocument(document)
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
    [accessToken, refreshDocuments]
  )

  /**
   * Update an existing document
   */
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
    [accessToken]
  )

  /**
   * Delete a document
   */
  const deleteDocument = useCallback(
    async (id: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const success = await DocumentApiService.deleteDocument(id)
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
    [accessToken]
  )

  /**
   * Duplicate a document
   */
  const duplicateDocument = useCallback(
    async (id: string): Promise<Document | null> => {
      if (!accessToken) return null

      try {
        const duplicate = await DocumentApiService.duplicateDocument(id)
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
    [accessToken, refreshDocuments]
  )

  /**
   * Share a document with users
   */
  const shareDocument = useCallback(
    async (id: string, userIds: string[], permission: 'view' | 'edit' | 'comment'): Promise<boolean> => {
      if (!accessToken) return false

      try {
        console.log('[useDocumentApps] shareDocument called with:', { id, userIds, permission })
        const shares = userIds.map(userId => ({ userId, permission }))
        console.log('[useDocumentApps] shareDocument shares array:', shares)
        const success = await DocumentApiService.shareDocument(id, shares)
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
    [accessToken, refreshDocuments]
  )

  /**
   * Revoke document access
   */
  const revokeAccess = useCallback(
    async (id: string, userId: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const success = await DocumentApiService.revokeAccess(id, userId)
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
    [accessToken, refreshDocuments]
  )

  /**
   * Send document for approval
   */
  const sendForApproval = useCallback(
    async (config: ApprovalWorkflowConfig): Promise<DocumentApprovalRequest | null> => {
      if (!accessToken) return null

      try {
        const success = await DocumentApiService.sendForApproval(
          config.documentId,
          config.approvers, // approvers is already string[] of user IDs
          config.message
        )

        if (success) {
          // Update document status
          await DocumentApiService.updateDocumentStatus(config.documentId, 'pending_approval')
          toast.success('Document sent for approval')
          await refreshDocuments()

          // Get the approval status
          const approvalRequest = await DocumentApiService.getApprovalStatus(config.documentId)
          return approvalRequest
        }
        return null
      } catch (error) {
        console.error('[useDocumentApps] Failed to send for approval:', error)
        toast.error('Failed to send for approval')
        return null
      }
    },
    [accessToken, refreshDocuments]
  )

  /**
   * Cancel approval request
   */
  const cancelApproval = useCallback(
    async (documentId: string): Promise<boolean> => {
      if (!accessToken) return false

      try {
        const success = await DocumentApiService.cancelApproval(documentId)

        if (success) {
          await DocumentApiService.updateDocumentStatus(documentId, 'draft')
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
    [accessToken, refreshDocuments]
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
    async (id: string): Promise<string | null> => {
      if (!accessToken) return null

      try {
        const document = await DocumentApiService.getDocument(id)
        if (!document) return null

        // Return content for export (actual export handled by exportUtils)
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
