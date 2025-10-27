import { useState, useEffect } from 'react'
import { OrgDirectoryClient } from './OrgDirectoryClient'

interface Capability {
  id: string
  name: string
}

interface UseCapabilitiesDataResult {
  capabilities: Capability[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching capabilities data via GraphQL
 * Uses the same queries as custom-flow-engine for consistency
 *
 * @param accessToken - Access token for authorization
 * @returns Object containing capabilities data, loading state, error state, and refetch function
 */
export const useCapabilitiesData = (accessToken: string): UseCapabilitiesDataResult => {
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCapabilitiesData = async () => {
    if (!accessToken) {
      console.log('useCapabilitiesData: No access token, skipping fetch')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('useCapabilitiesData: Fetching capabilities from GraphQL...')
      const client = new OrgDirectoryClient(accessToken)
      const capabilitiesData = await client.getCapabilities()

      console.log('useCapabilitiesData: Successfully fetched', capabilitiesData.length, 'capabilities')
      setCapabilities(capabilitiesData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch capabilities'
      console.error('useCapabilitiesData: Error fetching capabilities:', errorMessage)
      setError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCapabilitiesData()
  }, [accessToken])

  return {
    capabilities,
    loading,
    error,
    refetch: () => void fetchCapabilitiesData()
  }
}
