/**
 * useContentDocuments Hook
 * Fetch documents for a content entry
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildContentDocumentsQuery } from '../queries/contentQueries'
import { mapBaseToContentDocument } from '../mappers/contentMappers'
import type { ContentDocument, ContentDocumentQueryParams } from '../types/contentTypes'
import type { BaseContentDocument } from '../types/contentBaseTypes'

interface UseContentDocumentsResult {
  documents: ContentDocument[]
  isLoading: boolean
  error: Error | null
  totalCount: number
  refetch: () => Promise<void>
}

interface ContentDocumentsResponse {
  ContentDocument: BaseContentDocument[]
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
      const query = buildContentDocumentsQuery(params)
      const response = await graphqlClient.request<ContentDocumentsResponse>(query)

      if (response.ContentDocument) {
        const mappedDocuments = response.ContentDocument.map(mapBaseToContentDocument)
        setDocuments(mappedDocuments)
        setTotalCount(response.ContentDocumentAggregate?.aggregate?.count || mappedDocuments.length)
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
  }, [params, accessToken])

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
