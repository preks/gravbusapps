/**
 * Company Documents hooks - hooks for managing company documents
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { DocumentItem } from '@/components/document-section'
import type { CompanyDocument } from '../types/companyTypes'

// ==========================================
// GRAPHQL QUERY
// ==========================================

/**
 * GraphQL query for fetching company documents
 * Only includes fields that exist in the CompanyDocument table
 */
const COMPANY_DOCUMENTS_QUERY = `
  query GetCompanyDocuments($companyId: uuid!) {
    CompanyDocument(
      where: {
        companyId: { _eq: $companyId },
        isDeleted: { _eq: false }
      }
      orderBy: [{ createdAt: DESC }]
    ) {
      id
      version
      createdAt
      updatedAt
      isDeleted
      
      # Core Document Fields
      name
      description
      fileInfo
      folder
      
      # Metadata Fields
      expirationDate
      
      # Catalog Relations
      documentType
      documentTypeRef {
        id
        code
        value
      }
      documentGroup
      documentGroupRef {
        id
        code
        value
      }
      
      # Hierarchy
      parentDocumentId
      parentDocument {
        id
        name
      }
      
      # Company Relation
      companyId
      company {
        id
        name
        code
      }
    }
  }
`

// ==========================================
// TRANSFORM FUNCTIONS
// ==========================================

/**
 * Transform CompanyDocument to DocumentItem interface
 */
export function transformCompanyDocument(doc: CompanyDocument): DocumentItem {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description,
    createdAt: doc.createdAt || new Date().toISOString(),
    expirationDate: doc.expirationDate,
    documentType: doc.documentTypeRef
      ? {
          id: doc.documentTypeRef.id,
          value: doc.documentTypeRef.value || '',
          code: doc.documentTypeRef.code
        }
      : null,
    documentGroup: doc.documentGroupRef
      ? {
          id: doc.documentGroupRef.id,
          value: doc.documentGroupRef.value || '',
          code: doc.documentGroupRef.code
        }
      : null,
    fileInfo: doc.fileInfo,
    parentDocument: doc.parentDocument?.id ?? doc.parentDocumentId ?? null,
    folder: doc.folder === true,
    version: doc.version
  }
}

/**
 * Transform array of CompanyDocuments to DocumentItems
 */
export function transformCompanyDocuments(docs: CompanyDocument[]): DocumentItem[] {
  return docs.map(transformCompanyDocument)
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
 *
 * @param accessToken - Access token for authentication
 * @param companyId - Company ID to fetch documents for
 *
 * @example
 * const { documents, loading, error, refetch } = useCompanyDocuments(accessToken, companyId)
 */
export function useCompanyDocuments(accessToken: string, companyId: string | undefined): UseCompanyDocumentsResult {
  const graphqlClient = useGraphQLClient(accessToken)
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
      const result = await graphqlClient.request<{ CompanyDocument: CompanyDocument[] }>(COMPANY_DOCUMENTS_QUERY, {
        companyId
      })

      const rawDocuments = result.CompanyDocument || []
      const transformedDocuments = transformCompanyDocuments(rawDocuments)

      setState({
        documents: transformedDocuments,
        rawDocuments,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch company documents'
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

/**
 * GraphQL query for fetching a single company document
 */
const COMPANY_DOCUMENT_BY_PK_QUERY = `
  query GetCompanyDocumentByPk($id: uuid!) {
    CompanyDocumentByPk(id: $id) {
      id
      version
      name
      description
      fileInfo
      createdAt
      updatedAt
      expirationDate
      authenticated
      authenticationDate
      verificationDate
      documentType
      documentTypeRef {
        id
        code
        value
      }
      documentGroup
      documentGroupRef {
        id
        code
        value
      }
      parentDocumentId
      parentDocument {
        id
      }
      folder
      isDeleted
      companyId
    }
  }
`

export interface UseCompanyDocumentResult {
  document: CompanyDocument | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching a single company document by ID.
 *
 * @param accessToken - Access token for authentication
 * @param documentId - Document ID to fetch
 *
 * @example
 * const { document, loading, error, refetch } = useCompanyDocument(accessToken, documentId)
 */
export function useCompanyDocument(accessToken: string, documentId: string | undefined): UseCompanyDocumentResult {
  const graphqlClient = useGraphQLClient(accessToken)
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
      const result = await graphqlClient.request<{ CompanyDocumentByPk: CompanyDocument | null }>(
        COMPANY_DOCUMENT_BY_PK_QUERY,
        {
          id: documentId
        }
      )

      setState({
        document: result.CompanyDocumentByPk || null,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch company document'
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
