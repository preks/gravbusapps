// Investment Opportunity hook - single opportunity by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { toInvestmentOpportunity, type InvestmentOpportunity } from '../types/investmentOpportunityTypes'
import {
  buildInvestmentOpportunityByIdQuery,
  GET_EQUITY_INVESTMENT_ROUND_BY_OPPORTUNITY_ID
} from '../queries/investmentOpportunityQueries'
import type { EquityInvestmentRound } from '../types/investmentTypes'

export interface UseInvestmentOpportunityResult {
  opportunity: InvestmentOpportunity | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment opportunity by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Opportunity ID to fetch
 *
 * @example
 * // Basic usage
 * const { opportunity, loading, error } = useInvestmentOpportunity(accessToken, opportunityId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{opportunity?.name}</div>
 *
 * @example
 * // With refetch
 * const { opportunity, loading, refetch } = useInvestmentOpportunity(accessToken, opportunityId)
 *
 * return (
 *   <div>
 *     <div>{opportunity?.name}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestmentOpportunity(accessToken: string, id: string | undefined): UseInvestmentOpportunityResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseInvestmentOpportunityResult, 'refetch'>>({
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
      const query = buildInvestmentOpportunityByIdQuery()

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{ InvestmentOpportunityByPk: InvestmentOpportunity | null }>(query, {
        id
      })

      const raw = result.InvestmentOpportunityByPk
      let opportunity = raw ? toInvestmentOpportunity(raw) : null

      // Fetch equity investment round separately if opportunity exists
      if (opportunity) {
        try {
          const roundQuery = GET_EQUITY_INVESTMENT_ROUND_BY_OPPORTUNITY_ID(id)
          const roundResult = await graphqlClient.request<{ EquityInvestmentRound: EquityInvestmentRound[] }>(
            roundQuery
          )

          // Attach the round to the opportunity if found
          if (roundResult.EquityInvestmentRound && roundResult.EquityInvestmentRound.length > 0) {
            opportunity = {
              ...opportunity,
              equityInvestmentRound: roundResult.EquityInvestmentRound[0]
            }
          }
        } catch (roundError) {
          // Log but don't fail the entire query if round fetch fails
          console.warn('Failed to fetch equity investment round:', roundError)
        }
      }

      setState({ opportunity, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment opportunity'
      console.error('Error fetching investment opportunity:', error)
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
