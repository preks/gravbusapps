// Customer Lead hook - single lead by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { toCustomerLead, type CustomerLead } from '../types/customerLeadTypes'
import { buildCustomerLeadByIdQuery } from '../queries/customerLeadQueries'

export interface UseCustomerLeadResult {
  lead: CustomerLead | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single customer lead by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param context - Business app context with access token
 * @param id - Lead ID to fetch
 *
 * @example
 * // Basic usage
 * const { lead, loading, error } = useCustomerLead(context, leadId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{lead?.companyName}</div>
 *
 * @example
 * // With refetch
 * const { lead, loading, refetch } = useCustomerLead(context, leadId)
 *
 * return (
 *   <div>
 *     <div>{lead?.companyName}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useCustomerLead(context: BusinessAppContextProps, id: string | undefined): UseCustomerLeadResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [state, setState] = useState<Omit<UseCustomerLeadResult, 'refetch'>>({
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
      const query = buildCustomerLeadByIdQuery()

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{ LeadByPk: CustomerLead | null }>(query, { id })

      const raw = result.LeadByPk
      const lead = raw ? toCustomerLead(raw) : null

      setState({ lead, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer lead'
      console.error('Error fetching customer lead:', error)
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
