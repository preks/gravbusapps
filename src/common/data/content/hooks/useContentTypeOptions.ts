import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ContentType } from '../types/contentTypes'
import { buildContentTypesQuery, buildContentTypesVariables } from '../queries/contentQueries'

interface UseContentTypeOptionsResult {
  options: ContentType[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export const useContentTypeOptions = (
  accessToken?: string,
  contentGroup?: string | null
): UseContentTypeOptionsResult => {
  const [options, setOptions] = useState<ContentType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    let cancelled = false

    const fetch = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const query = buildContentTypesQuery()
        const variables = buildContentTypesVariables(contentGroup)
        const response = await graphqlClient.request<{ ContentType: ContentType[] }>(query, variables)
        if (!cancelled) {
          setOptions(
            (response.ContentType || []).map(contentType => ({
              ...contentType,
              entryCount: contentType.contentEntriesAggregate?.aggregate?.count ?? 0
            }))
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch content types'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetch()
    return () => {
      cancelled = true
    }
  }, [accessToken, contentGroup, graphqlClient, refreshKey])

  return { options, isLoading, error, refetch: () => setRefreshKey(k => k + 1) }
}
