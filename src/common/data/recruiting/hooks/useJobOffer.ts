/**
 * JobOffer hook - single job offer by ID with automatic state management
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildJobOfferFragment, JOB_OFFER_QUERY_CONFIGS } from '../queries/jobOfferQueries'
import { type JobOffer } from '../types/jobOfferTypes'

export interface UseJobOfferResult {
  jobOffer: JobOffer | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single job offer by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Job offer ID to fetch
 * @param config - Query config name or custom field array (default: 'record')
 */
export function useJobOffer(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseJobOfferResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseJobOfferResult, 'refetch'>>({
    jobOffer: null,
    loading: true,
    error: null
  })

  const fetchJobOffer = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const fields: string[] =
        typeof config === 'string' ? JOB_OFFER_QUERY_CONFIGS[config] || JOB_OFFER_QUERY_CONFIGS.record : config

      const fragment = buildJobOfferFragment(fields)

      const query = `
        query GetJobOfferByPk($id: uuid!) {
          JobOfferByPk(id: $id) {
            ${fragment}
          }
        }
      `

      const result = await graphqlClient.request<{
        JobOfferByPk: any
      }>(query, { id })

      const jobOffer = result.JobOfferByPk as JobOffer | null

      setState({ jobOffer, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job offer'
      console.error('Error fetching job offer:', error)
      setState({ jobOffer: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  useEffect(() => {
    fetchJobOffer()
  }, [fetchJobOffer])

  return {
    ...state,
    refetch: fetchJobOffer
  }
}
