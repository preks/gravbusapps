import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_SITE_LOCATIONS, GET_SITE_LOCATIONS_BY_COMPANY } from '../queries/siteLocationQueries'
import { SiteLocationCapacity } from '../types'

export const useSiteLocations = (accessToken: string, structureId: string, selectedCompanyIds: string[] = []) => {
  const [locations, setLocations] = useState<SiteLocationCapacity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchLocations = useCallback(async () => {
    if (!accessToken || !structureId) {
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const hasCompanyFilter = selectedCompanyIds.length > 0
      const result = await graphqlClient.request(
        hasCompanyFilter ? GET_SITE_LOCATIONS_BY_COMPANY : GET_SITE_LOCATIONS,
        hasCompanyFilter
          ? {
              structureId,
              companyIds: selectedCompanyIds,
              asOfTs: new Date().toISOString()
            }
          : { structureId }
      )
      const companyLocationIds = new Set<string>(
        ((result.EmployeeSiteLocation ?? []) as Array<{ siteLocationId?: string }>)
          .map(row => row.siteLocationId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )

      const locationsWithCapacity: SiteLocationCapacity[] = (result.SiteLocation ?? [])
        .filter((loc: any) => !hasCompanyFilter || companyLocationIds.has(loc.id))
        .map((loc: any) => ({
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
  }, [accessToken, structureId, graphqlClient, selectedCompanyIds])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  return { locations, isLoading, error, refetch: fetchLocations }
}
