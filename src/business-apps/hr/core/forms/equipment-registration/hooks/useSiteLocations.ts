import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface SiteLocationOption {
  id: string
  value: string
  label: string
  code: string
  country?: string
  region?: string
}

const GET_SITE_LOCATIONS = `
  query GetSiteLocations($structureId: uuid!) {
    SiteLocation(
      where: { structureId: { _eq: $structureId } }
      orderBy: { name: ASC }
    ) {
      id
      name
      code
      country {
        code
        value
      }
      region {
        code
        value
      }
    }
  }
`

interface SiteLocationResponse {
  SiteLocation: Array<{
    id: string
    name: string
    code: string
    country?: {
      code: string
      value: string
    }
    region?: {
      code: string
      value: string
    }
  }>
}

export const useSiteLocations = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<SiteLocationOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchSiteLocations = useCallback(async () => {
    if (!context.accessToken) {
      console.log('useSiteLocations: No access token, skipping fetch')
      setIsLoading(false)
      return
    }

    const structureId = getCurrentActiveStructureId()
    console.log('useSiteLocations: fetchSiteLocations called', {
      hasAccessToken: !!context.accessToken,
      structureId: structureId
    })

    if (!structureId) {
      console.log('useSiteLocations: No active structure ID found, skipping fetch')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('useSiteLocations: Fetching site locations for structureId:', structureId)
      const response = await graphqlClient.request<SiteLocationResponse>(GET_SITE_LOCATIONS, {
        structureId: structureId
      })

      console.log('useSiteLocations: Received response:', response)

      const locationOptions = response.SiteLocation.map(location => ({
        id: location.id,
        value: location.id,
        label: location.name,
        code: location.code,
        country: location.country?.value,
        region: location.region?.value
      }))

      setOptions(locationOptions)
    } catch (err) {
      console.error('Error fetching site locations:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch site locations')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, context.accessToken, context.activeStructureId])

  useEffect(() => {
    fetchSiteLocations()
  }, [fetchSiteLocations])

  return {
    options,
    isLoading,
    error,
    refetch: fetchSiteLocations
  }
}
