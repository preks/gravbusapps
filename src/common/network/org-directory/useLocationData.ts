import { useState, useEffect } from 'react'
import { OrgDirectoryClient } from './OrgDirectoryClient'

interface SiteLocation {
  id: string
  name: string
}

interface UseLocationDataResult {
  siteLocations: SiteLocation[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching location data (site locations) via GraphQL
 * Uses the same queries as custom-flow-engine for consistency
 *
 * @param accessToken - Access token for authorization
 * @returns Object containing location data, loading state, error state, and refetch function
 */
export const useLocationData = (accessToken: string): UseLocationDataResult => {
  const [siteLocations, setSiteLocations] = useState<SiteLocation[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchLocationData = async () => {
    if (!accessToken) {
      console.log('useLocationData: No access token, skipping fetch')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('useLocationData: Fetching site locations from GraphQL...')
      const client = new OrgDirectoryClient(accessToken)
      const locations = await client.getSiteLocations()

      console.log('useLocationData: Successfully fetched', locations.length, 'site locations')
      setSiteLocations(locations)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch location data'
      console.error('useLocationData: Error fetching location data:', errorMessage)
      setError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLocationData()
  }, [accessToken])

  return {
    siteLocations,
    loading,
    error,
    refetch: () => void fetchLocationData()
  }
}
