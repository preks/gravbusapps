import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildSalesAssociatesQuery, type SalesAssociateEmployee } from './salesAssociateEmployees'

interface UseSalesAssociatesResult {
  employees: SalesAssociateEmployee[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Fetches every employee with the "Sales Associate" capability exactly once.
 * Shared by the Top Individual Performers and Employees Needing Attention cards
 * so the GetSalesAssociates query is only sent a single time.
 *
 * @param accessToken - The access token for API authentication
 */
export const useSalesAssociates = (accessToken: string): UseSalesAssociatesResult => {
  const [employees, setEmployees] = useState<SalesAssociateEmployee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchSalesAssociates = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{
        Employee: SalesAssociateEmployee[]
      }>(buildSalesAssociatesQuery())

      setEmployees(result.Employee || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales associates')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchSalesAssociates().catch(() => undefined)
  }, [fetchSalesAssociates])

  return {
    employees,
    isLoading,
    error,
    refetch: () => {
      fetchSalesAssociates().catch(() => undefined)
    }
  }
}
