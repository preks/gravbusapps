// Investment Lead hook - single lead by ID with automatic state management
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { toInvestmentLead, type InvestmentLead } from '../types/investmentLeadTypes'
import { buildInvestmentLeadByIdQuery } from '../queries/investmentLeadQueries'

export interface AdditionalQuery<TResult = any> {
  query: string
  variables?: Record<string, any>
  data: (result: any) => TResult
  key: string
}

export interface UseInvestmentLeadOptions {
  additionalQueries?: AdditionalQuery[]
}

export interface UseInvestmentLeadResult {
  lead: InvestmentLead | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  [key: string]: any
}

/**
 * Declarative hook for fetching a single investment lead by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Lead ID to fetch
 *
 * @example
 * // Basic usage
 * const { lead, loading, error } = useInvestmentLead(accessToken, leadId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{lead?.companyName}</div>
 *
 * @example
 * // With refetch
 * const { lead, loading, refetch } = useInvestmentLead(accessToken, leadId)
 *
 * return (
 *   <div>
 *     <div>{lead?.companyName}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestmentLead(
  accessToken: string,
  id: string | undefined,
  options?: UseInvestmentLeadOptions
): UseInvestmentLeadResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const additionalQueries = useMemo(() => options?.additionalQueries || [], [options?.additionalQueries])

  const [state, setState] = useState<Omit<UseInvestmentLeadResult, 'refetch'>>({
    lead: null,
    loading: true,
    error: null,
    ...Object.fromEntries(additionalQueries.map(aq => [aq.key, undefined]))
  })

  const fetchLead = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build main query
      let combinedQuery = buildInvestmentLeadByIdQuery()

      // Combine additional query bodies into main query
      if (additionalQueries.length > 0) {
        const additionalQueryBodies = additionalQueries.map(aq => aq.query).join('\n')
        // Insert additional queries before the closing brace of the query
        // Pattern: query GetInvestmentLeadById($id: uuid!) { InvestmentLeadByPk(...) { ... } }
        // becomes: query GetInvestmentLeadById($id: uuid!) { InvestmentLeadByPk(...) { ... } additionalQueries }
        const lastBraceIndex = combinedQuery.lastIndexOf('}')
        if (lastBraceIndex !== -1) {
          combinedQuery = combinedQuery.slice(0, lastBraceIndex) + `\n${additionalQueryBodies}\n}`
        }
      }

      // Execute combined query with ID as GraphQL variable
      const result = await graphqlClient.request<{ InvestmentLeadByPk: InvestmentLead | null } & Record<string, any>>(
        combinedQuery,
        { id }
      )

      const raw = result.InvestmentLeadByPk
      const lead = raw ? toInvestmentLead(raw) : null

      // Extract additional results from combined response
      const additionalData = Object.fromEntries(additionalQueries.map(aq => [aq.key, aq.data(result)]))

      setState({
        lead,
        loading: false,
        error: null,
        ...additionalData
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment lead'
      console.error('Error fetching investment lead:', error)
      setState({
        lead: null,
        loading: false,
        error: errorMessage,
        ...Object.fromEntries(additionalQueries.map(aq => [aq.key, undefined]))
      })
    }
  }, [id, accessToken, graphqlClient, additionalQueries])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  return {
    ...state,
    refetch: fetchLead
  }
}
