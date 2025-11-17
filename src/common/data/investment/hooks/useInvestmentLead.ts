// Investment Lead hook - single lead by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { toInvestmentLead, type InvestmentLead } from '../types/investmentLeadTypes'
import { buildInvestmentLeadByIdQuery } from '../queries/investmentLeadQueries'

export interface UseInvestmentLeadResult {
  lead: InvestmentLead | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment lead by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param context - Business app context with access token
 * @param id - Lead ID to fetch
 *
 * @example
 * // Basic usage
 * const { lead, loading, error } = useInvestmentLead(context, leadId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{lead?.companyName}</div>
 *
 * @example
 * // With refetch
 * const { lead, loading, refetch } = useInvestmentLead(context, leadId)
 *
 * return (
 *   <div>
 *     <div>{lead?.companyName}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestmentLead(context: BusinessAppContextProps, id: string | undefined): UseInvestmentLeadResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [state, setState] = useState<Omit<UseInvestmentLeadResult, 'refetch'>>({
    lead: null,
    loading: true,
    error: null
  })

  const fetchLead = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !context.accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query
      const query = buildInvestmentLeadByIdQuery()

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{ InvestmentLeadByPk: InvestmentLead | null }>(query, { id })

      const raw = result.InvestmentLeadByPk
      const lead = raw ? toInvestmentLead(raw) : null

      setState({ lead, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment lead'
      console.error('Error fetching investment lead:', error)
      setState({ lead: null, loading: false, error: errorMessage })
    }
  }, [id, context.accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  return {
    ...state,
    refetch: fetchLead
  }
}
