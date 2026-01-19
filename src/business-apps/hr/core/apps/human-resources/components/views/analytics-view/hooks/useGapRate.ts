import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_JOB_POSITION_DATA } from '../queries/getJobPositionData'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

/**
 * Response type for Job Position data query
 */
interface JobPositionDataResponse {
  // Total job positions in the structure
  TotalJobPositionAggregate: {
    aggregate: {
      count: number
    }
  }
  // Vacant job positions in the structure
  VacantJobPositionAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to calculate the Gap Rate - percentage of job positions without assigned employees
 * @param accessToken Access token for API authentication
 * @returns Object containing gap rate, vacant positions count, total positions count, loading state, and error
 */
export function useGapRate(accessToken: string) {
  const [gapRate, setGapRate] = useState<number>(0)
  const [vacantPositions, setVacantPositions] = useState<number>(0)
  const [totalPositions, setTotalPositions] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)

  // Fetch job position data
  useEffect(() => {
    if (!graphqlClient) return

    setLoading(true)
    setError(null)

    // Get the current structure ID from windowUtils
    const structureId = getCurrentActiveStructureId()

    if (!structureId) {
      console.warn('[useGapRate] No active structure ID found')
      setError(new Error('No active structure ID found'))
      setLoading(false)
      return
    }

    // Log request
    console.info('[useGapRate] Fetching job position data for structure:', structureId)

    graphqlClient
      .request<JobPositionDataResponse>(GET_JOB_POSITION_DATA, { structureId })
      .then(response => {
        // Log successful response
        console.info('[useGapRate] Received job position data')

        // Get total job positions count
        const total = response?.TotalJobPositionAggregate?.aggregate?.count || 0

        // Get vacant positions count from the VacantJobPositionAggregate
        const vacant = response?.VacantJobPositionAggregate?.aggregate?.count || 0

        // Log the results
        console.debug(`[useGapRate] Total positions: ${total}, Vacant positions: ${vacant}`)

        // Calculate gap rate (avoid division by zero)
        const calculatedGapRate = total > 0 ? (vacant / total) * 100 : 0

        // Round to one decimal place
        const roundedGapRate = Math.round(calculatedGapRate * 10) / 10

        // Update state with results
        setTotalPositions(total)
        setVacantPositions(vacant)
        setGapRate(roundedGapRate)
        setLoading(false)
      })
      .catch(err => {
        console.error('[useGapRate] Error fetching job position data:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch job position data'))
        setLoading(false)
      })
  }, [graphqlClient])

  return {
    gapRate,
    vacantPositions,
    totalPositions,
    loading,
    error
  }
}
