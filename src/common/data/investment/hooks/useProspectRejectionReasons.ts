/**
 * Hook for querying Investment Prospect Rejection Reasons
 * Provides read operations for rejection reasons associated with leads and opportunities
 * Note: Create/Update/Delete operations are handled via the rejectInvestmentProspect backend process
 */

import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_REJECTION_REASONS_BY_LEAD, GET_REJECTION_REASONS_BY_OPPORTUNITY } from '../queries/rejectionReasonQueries'
import type { RejectionReason } from '../types/rejectionReasonTypes'

interface UseProspectRejectionReasonsReturn {
  fetchByLead: (leadId: string) => Promise<RejectionReason[]>
  fetchByOpportunity: (opportunityId: string) => Promise<RejectionReason[]>
  loading: boolean
  error: string | null
}

/**
 * Custom hook for prospect rejection reason query operations
 * @param context - Business app context with access token
 * @returns Object with fetch functions and state
 */
export const useProspectRejectionReasons = (context: BusinessAppContextProps): UseProspectRejectionReasonsReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch rejection reasons for a specific lead
   */
  const fetchByLead = useCallback(
    async (leadId: string): Promise<RejectionReason[]> => {
      setLoading(true)
      setError(null)

      try {
        const query = GET_REJECTION_REASONS_BY_LEAD()
        const result = await graphqlClient.request<{ InvestmentRejectionReason: RejectionReason[] }>(query, {
          leadId
        })
        return result.InvestmentRejectionReason || []
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load rejection reasons'
        console.error('Error fetching lead rejection reasons:', err)
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [graphqlClient]
  )

  /**
   * Fetch rejection reasons for a specific opportunity
   */
  const fetchByOpportunity = useCallback(
    async (opportunityId: string): Promise<RejectionReason[]> => {
      setLoading(true)
      setError(null)

      try {
        const query = GET_REJECTION_REASONS_BY_OPPORTUNITY()
        const result = await graphqlClient.request<{ InvestmentRejectionReason: RejectionReason[] }>(query, {
          opportunityId
        })
        return result.InvestmentRejectionReason || []
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load rejection reasons'
        console.error('Error fetching opportunity rejection reasons:', err)
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [graphqlClient]
  )

  return {
    fetchByLead,
    fetchByOpportunity,
    loading,
    error
  }
}
