import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

// GraphQL query to fetch the number of child units for an organizational unit
const GET_CHILD_UNITS_COUNT = /*sql*/ `
  query GetOrganizationalChildUnits($organizationalUnitId: uuid!) {
    nwOrgchartStructureDetails(where: {organizationalUnitId: {_eq: $organizationalUnitId}}) {
      numberOfChildUnits
    }
  }
`

// Response type for the child units query
interface ChildUnitsResponse {
  nwOrgchartStructureDetails: {
    numberOfChildUnits: number
  }[]
}

interface UseOrganizationalChildUnitsResult {
  childUnitsCount: number | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch the number of child units for an organizational unit
 * @param accessToken User access token
 * @param organizationalUnitId The ID of the organizational unit to fetch child units for
 * @returns The number of child units, loading state, and error state
 */
export const useOrganizationalChildUnits = (
  accessToken: string,
  organizationalUnitId: string
): UseOrganizationalChildUnitsResult => {
  const [childUnitsCount, setChildUnitsCount] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get GraphQL client
  const client = useGraphqlClient(accessToken)

  // Function to fetch child units count
  const fetchChildUnitsCount = useCallback(async () => {
    if (!accessToken || !organizationalUnitId) {
      setChildUnitsCount(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Execute the GraphQL query
      const variables = {
        organizationalUnitId
      }

      const response = await client.request<ChildUnitsResponse>(GET_CHILD_UNITS_COUNT, variables)

      // Extract the number of child units from the response
      const count = response.nwOrgchartStructureDetails?.[0]?.numberOfChildUnits ?? 0
      setChildUnitsCount(count)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch child units count'))
      console.error('Error fetching child units count:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, organizationalUnitId])

  // Fetch child units count on component mount or when dependencies change
  useEffect(() => {
    fetchChildUnitsCount()
  }, [fetchChildUnitsCount])
  return {
    childUnitsCount,
    loading,
    error,
    refetch: fetchChildUnitsCount
  }
}
