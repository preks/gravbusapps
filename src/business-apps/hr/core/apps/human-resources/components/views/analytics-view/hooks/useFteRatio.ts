import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_FTE_DATA } from '../queries/getFteData'
import { useEmployeeCount } from './useEmployeeCount'

/**
 * Response type for FTE data query
 */
interface FteDataResponse {
  EmployeeWorkingHours: Array<{
    id: string
    fullTimeEquivalent: number
    employee: {
      id: string
    }
  }>
  EmployeeWorkingHoursAggregate: {
    aggregate: {
      sum: {
        fullTimeEquivalent: number
      }
      count: number
    }
  }
}

/**
 * Hook to calculate the FTE/Employees ratio
 * @param accessToken Access token for API authentication
 * @returns Object containing ratio, loading state, and error
 */
export function useFteRatio(accessToken: string) {
  const [totalFte, setTotalFte] = useState<number>(0)
  const [ratio, setRatio] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)

  // Get employee count
  const { count: employeeCount, loading: countLoading, error: countError } = useEmployeeCount(accessToken)

  // Fetch FTE data
  useEffect(() => {
    if (!graphqlClient || countLoading) return

    setLoading(true)
    setError(null)

    graphqlClient
      .request<FteDataResponse>(GET_FTE_DATA)
      .then(response => {
        // Extract FTE sum from response
        const fteSumData = response?.EmployeeWorkingHoursAggregate?.aggregate?.sum?.fullTimeEquivalent
        const fteSum = typeof fteSumData === 'number' ? fteSumData : 0

        // Calculate FTE to Employee ratio
        const totalEmployees = Math.max(employeeCount, 1) // Avoid division by zero
        const calculatedRatio = fteSum / totalEmployees

        setTotalFte(fteSum)
        setRatio(calculatedRatio)
        setLoading(false)
      })
      .catch(err => {
        console.error('[useFteRatio] Error fetching FTE data:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch FTE data'))
        setLoading(false)
      })
  }, [graphqlClient, employeeCount, countLoading])

  // Combine errors
  useEffect(() => {
    if (countError) {
      setError(countError)
    }
  }, [countError])

  return {
    totalFte,
    employeeCount,
    ratio,
    loading: loading || countLoading,
    error
  }
}
