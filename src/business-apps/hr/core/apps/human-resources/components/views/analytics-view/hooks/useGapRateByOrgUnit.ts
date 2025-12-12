import { useState, useEffect, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_GAP_RATE_BY_ORG_UNIT } from '../queries/getGapRateByOrgUnit'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

/**
 * Interface for organizational unit gap rate data
 */
export interface OrganizationalUnitGapRate {
  id: string
  name: string
  totalPositions: number
  vacantPositions: number
  gapRate: number // percentage of vacant positions
}

/**
 * Response type for Gap Rate by Org Unit query
 */
interface GapRateByOrgUnitResponse {
  OrganizationalUnit: Array<{
    id: string
    name: string
    totalPositions: {
      aggregate: {
        count: number
      }
    }
    vacantPositions: {
      aggregate: {
        count: number
      }
    }
  }>
}

/**
 * Hook to fetch and calculate Gap Rate by Organizational Unit
 * @param accessToken Access token for API authentication
 * @returns Object containing gap rate data by org unit, loading state, and error
 */
export function useGapRateByOrgUnit(accessToken: string) {
  const [data, setData] = useState<OrganizationalUnitGapRate[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)
  const lastFetchKeyRef = useRef<string>('')
  const staticCache =
    (useGapRateByOrgUnit as any).__cache || ((useGapRateByOrgUnit as any).__cache = new Map<string, Promise<any>>())

  // Fetch gap rate data by organizational unit
  useEffect(() => {
    if (!graphqlClient) return

    setLoading(true)
    setError(null)

    // Get the current structure ID from windowUtils
    const structureId = getCurrentActiveStructureId()

    if (!structureId) {
      console.warn('[useGapRateByOrgUnit] No active structure ID found')
      setError(new Error('No active structure ID found'))
      setLoading(false)
      return
    }

    // Build dedupe key and guard
    const fetchKey = `${accessToken}|${structureId}`
    if (lastFetchKeyRef.current === fetchKey) {
      return
    }
    lastFetchKeyRef.current = fetchKey

    // Log request
    console.info('[useGapRateByOrgUnit] Fetching gap rate data for structure:', structureId)

    let p = staticCache.get(fetchKey)
    if (!p) {
      p = graphqlClient.request<GapRateByOrgUnitResponse>(GET_GAP_RATE_BY_ORG_UNIT, { structureId })
      staticCache.set(fetchKey, p)
    }

    p.then(response => {
      // Log successful response
      console.info('[useGapRateByOrgUnit] Received gap rate data')

      // Check if the response has the expected structure
      if (!response?.OrganizationalUnit || !Array.isArray(response.OrganizationalUnit)) {
        throw new Error('Invalid response format from API')
      }

      // Process the data
      const orgUnitGapRateData = response.OrganizationalUnit.map((orgUnit: any) => {
        // Extract the total positions count using the alias
        const totalPositions = orgUnit.totalPositions?.aggregate?.count || 0

        // Extract the vacant positions count using the alias
        const vacantPositions = orgUnit.vacantPositions?.aggregate?.count || 0

        // Calculate gap rate (avoid division by zero)
        const gapRate = totalPositions > 0 ? (vacantPositions / totalPositions) * 100 : 0

        // Round to one decimal place
        const roundedGapRate = Math.round(gapRate * 10) / 10

        return {
          id: orgUnit.id,
          name: orgUnit.name,
          totalPositions,
          vacantPositions,
          gapRate: roundedGapRate
        }
      })

      // Filter out org units with no positions
      const filteredData = orgUnitGapRateData.filter(item => item.totalPositions > 0)

      // Sort by gap rate in descending order
      filteredData.sort((a, b) => b.gapRate - a.gapRate)

      setData(filteredData)
      setLoading(false)
    }).catch(err => {
      console.error('[useGapRateByOrgUnit] Error fetching gap rate data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch gap rate data'))
      setLoading(false)
    })
  }, [accessToken])

  return {
    data,
    loading,
    error
  }
}
