import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ContentTag } from '../types/contentTaxonomyTypes'
import { buildContentTagsQuery } from '../queries/contentQueries'

interface UseContentTagOptionsResult {
  options: ContentTag[]
  isLoading: boolean
  error: Error | null
}

export const useContentTagOptions = (accessToken?: string): UseContentTagOptionsResult => {
  const [options, setOptions] = useState<ContentTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    let cancelled = false

    const fetch = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const query = buildContentTagsQuery()
        const response = await graphqlClient.request<{ ContentTag: ContentTag[] }>(query)
        if (!cancelled) {
          setOptions(response.ContentTag || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch content tags'))
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
  }, [accessToken, graphqlClient])

  return { options, isLoading, error }
}
