import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { GET_SITE_LOCATIONS, type SiteLocationOption } from '../queries/siteLocationQueries'

export const useSiteLocationsForFilter = (accessToken: string) => {
  const [locations, setLocations] = useState<SiteLocationOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const structureId = getCurrentActiveStructureId()

  const fetchLocations = useCallback(async () => {
    if (!accessToken || !structureId) {
      setLocations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{ SiteLocation: { id: string; name: string }[] }>(GET_SITE_LOCATIONS, {
        structureId
      })
      setLocations(result.SiteLocation || [])
    } catch (err) {
      const raw = err instanceof Error ? err : new Error('Failed to fetch site locations')
      const message =
        raw.message === 'Failed to fetch'
          ? 'Network error. Check your connection and that the service is available.'
          : raw.message
      setError(new Error(message))
      setLocations([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, structureId, graphqlClient])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  return { locations, isLoading, error, refetch: fetchLocations }
}
