import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ContentCategory } from '../types/contentTypes'
import { buildContentCategoriesQuery } from '../queries/contentQueries'

interface UseContentCategoryOptionsResult {
  options: ContentCategory[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export const useContentCategoryOptions = (accessToken?: string): UseContentCategoryOptionsResult => {
  const [options, setOptions] = useState<ContentCategory[]>([])
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
        const query = buildContentCategoriesQuery()
        const response = await graphqlClient.request<{ ContentCategory: ContentCategory[] }>(query)
        if (!cancelled) {
          setOptions(
            (response.ContentCategory || []).map(contentCategory => ({
              ...contentCategory,
              entryCount: contentCategory.contentEntryCategoriesAggregate?.aggregate?.count ?? 0
            }))
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch content categories'))
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
  }, [accessToken, graphqlClient, refreshKey])

  return { options, isLoading, error, refetch: () => setRefreshKey(k => k + 1) }
}
