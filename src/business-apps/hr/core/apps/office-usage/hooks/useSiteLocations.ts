import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_SITE_LOCATIONS } from '../queries/siteLocationQueries'
import { SiteLocationCapacity } from '../types'

export const useSiteLocations = (accessToken: string, structureId: string) => {
  const [locations, setLocations] = useState<SiteLocationCapacity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchLocations = useCallback(async () => {
    if (!accessToken || !structureId) {
      return
    }

    console.log('[useSiteLocations] Fetching site locations...', { structureId })
    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request(GET_SITE_LOCATIONS, { structureId })
      console.log('[useSiteLocations] Fetched locations:', result.SiteLocation.length)

      const locationsWithCapacity: SiteLocationCapacity[] = result.SiteLocation.map((loc: any) => ({
        siteLocationId: loc.id,
        name: loc.name,
        code: loc.code,
        locality: loc.locality,
        country: loc.country,
        region: loc.region,
        capacity: loc.deskCapacity ?? 0 // Use deskCapacity from GraphQL (camelCase)
      }))

      setLocations(locationsWithCapacity)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch site locations'))
      console.error('Error fetching site locations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, structureId, graphqlClient])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  return { locations, isLoading, error, refetch: fetchLocations }
}
