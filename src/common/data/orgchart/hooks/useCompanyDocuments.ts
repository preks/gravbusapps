/**
 * Company Documents hooks - hooks for managing company documents
 * NOTE: These hooks have empty queries and return empty data because
 * the GraphQL schema for company documents is not yet available.
 */
import { useState, useEffect, useCallback } from 'react'
import type { DocumentItem } from '@/components/document-section'

// ==========================================
// COMPANY DOCUMENT TYPE
// ==========================================

/**
 * CompanyDocument interface (similar to CrmDocument)
 * Defined here since the GraphQL schema is not yet available
 */
export interface CompanyDocument {
  id: string
  version?: number
  name: string
  description?: string
  file?: string
  fileInfo?: any
  mimeType?: string
  fileSize?: number
  format?: string
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  expirationDate?: string
  documentType?: {
    id: string
    code?: string
    value?: string
  }
  documentGroup?: {
    id: string
    code?: string
    value?: string
  }
  parentDocument?: string | { id: string }
  folder?: boolean
}

// ==========================================
// USE COMPANY DOCUMENTS HOOK
// ==========================================

export interface UseCompanyDocumentsResult {
  documents: DocumentItem[]
  rawDocuments: CompanyDocument[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching company documents.
 * NOTE: Currently returns empty data as GraphQL schema is not yet available.
 *
 * @param accessToken - Access token for authentication
 * @param companyId - Company ID to fetch documents for
 *
 * @example
 * const { documents, loading, error, refetch } = useCompanyDocuments(accessToken, companyId)
 */
export function useCompanyDocuments(accessToken: string, companyId: string | undefined): UseCompanyDocumentsResult {
  const [state, setState] = useState<Omit<UseCompanyDocumentsResult, 'refetch'>>({
    documents: [],
    rawDocuments: [],
    loading: false,
    error: null
  })

  const fetchDocuments = useCallback(async () => {
    // Don't fetch if no company ID or no access token
    if (!companyId || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // NOTE: GraphQL query is not yet available for company documents
      // When the schema is ready, implement the actual query here:
      //
      // const query = `
      //   query GetCompanyDocuments($companyId: uuid!) {
      //     CompanyDocument(
      //       where: {
      //         _and: [
      //           { companyId: { _eq: $companyId } },
      //           { isDeleted: { _neq: true } }
      //         ]
      //       }
      //     ) {
      //       id
      //       version
      //       name
      //       ...
      //     }
      //   }
      // `
      //
      // const result = await graphqlClient.request(query, { companyId })

      // For now, return empty arrays
      setState({
        documents: [],
        rawDocuments: [],
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch company documents'
      console.error('Error fetching company documents:', error)
      setState({
        documents: [],
        rawDocuments: [],
        loading: false,
        error: errorMessage
      })
    }
  }, [companyId, accessToken])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    ...state,
    refetch: fetchDocuments
  }
}

// ==========================================
// USE COMPANY DOCUMENT HOOK
// ==========================================

export interface UseCompanyDocumentResult {
  document: CompanyDocument | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching a single company document by ID.
 * NOTE: Currently returns null as GraphQL schema is not yet available.
 *
 * @param accessToken - Access token for authentication
 * @param documentId - Document ID to fetch
 *
 * @example
 * const { document, loading, error, refetch } = useCompanyDocument(accessToken, documentId)
 */
export function useCompanyDocument(accessToken: string, documentId: string | undefined): UseCompanyDocumentResult {
  const [state, setState] = useState<Omit<UseCompanyDocumentResult, 'refetch'>>({
    document: null,
    loading: false,
    error: null
  })

  const fetchDocument = useCallback(async () => {
    // Don't fetch if no document ID or no access token
    if (!documentId || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // NOTE: GraphQL query is not yet available for company documents
      // When the schema is ready, implement the actual query here:
      //
      // const query = `
      //   query GetCompanyDocumentByPk($id: uuid!) {
      //     CompanyDocumentByPk(id: $id) {
      //       id
      //       version
      //       name
      //       ...
      //     }
      //   }
      // `
      //
      // const result = await graphqlClient.request(query, { id: documentId })

      // For now, return null
      setState({
        document: null,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch company document'
      console.error('Error fetching company document:', error)
      setState({
        document: null,
        loading: false,
        error: errorMessage
      })
    }
  }, [documentId, accessToken])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  return {
    ...state,
    refetch: fetchDocument
  }
}
