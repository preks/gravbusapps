/**
 * useContentDocuments Hook
 * Fetch documents for a content entry
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildContentDocumentsQuery, buildContentDocumentsVariables } from '../queries/contentQueries'
import type { ContentDocument } from '../types/contentDocumentTypes'
import type { ContentDocumentQueryParams } from '../queries/contentQueries'

interface UseContentDocumentsResult {
  documents: ContentDocument[]
  isLoading: boolean
  error: Error | null
  totalCount: number
  refetch: () => Promise<void>
}

interface ContentDocumentsResponse {
  ContentDocument: ContentDocument[]
  ContentDocumentAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch content documents
 */
export const useContentDocuments = (
  params: ContentDocumentQueryParams,
  accessToken?: string
): UseContentDocumentsResult => {
  const [documents, setDocuments] = useState<ContentDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = buildContentDocumentsQuery()
      const variables = buildContentDocumentsVariables(params)
      const response = await graphqlClient.request<ContentDocumentsResponse>(query, variables)

      if (response.ContentDocument) {
        setDocuments(response.ContentDocument)
        setTotalCount(response.ContentDocumentAggregate?.aggregate?.count || response.ContentDocument.length)
      } else {
        setDocuments([])
        setTotalCount(0)
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch content documents')
      setError(errorObj)
      console.error('Error fetching content documents:', err)
    } finally {
      setIsLoading(false)
    }
  }, [params, graphqlClient])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    documents,
    isLoading,
    error,
    totalCount,
    refetch: fetchDocuments
  }
}
