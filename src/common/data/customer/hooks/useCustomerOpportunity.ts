// Customer Opportunity hook - single opportunity by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { toCustomerOpportunity, type CustomerOpportunity } from '../types/customerOpportunityTypes'
import { buildCustomerOpportunityByIdQuery } from '../queries/customerOpportunityQueries'

export interface UseCustomerOpportunityResult {
  opportunity: CustomerOpportunity | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single customer opportunity by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Opportunity ID to fetch
 *
 * @example
 * // Basic usage
 * const { opportunity, loading, error } = useCustomerOpportunity(accessToken, opportunityId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{opportunity?.name}</div>
 *
 * @example
 * // With refetch
 * const { opportunity, loading, refetch } = useCustomerOpportunity(accessToken, opportunityId)
 *
 * return (
 *   <div>
 *     <div>{opportunity?.name}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useCustomerOpportunity(accessToken: string, id: string | undefined): UseCustomerOpportunityResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseCustomerOpportunityResult, 'refetch'>>({
    opportunity: null,
    loading: true,
    error: null
  })

  const fetchOpportunity = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query
      const query = buildCustomerOpportunityByIdQuery()

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{ OpportunityByPk: CustomerOpportunity | null }>(query, { id })

      const raw = result.OpportunityByPk
      const opportunity = raw ? toCustomerOpportunity(raw) : null

      setState({ opportunity, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer opportunity'
      console.error('Error fetching customer opportunity:', error)
      setState({ opportunity: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchOpportunity()
  }, [fetchOpportunity])

  return {
    ...state,
    refetch: fetchOpportunity
  }
}
