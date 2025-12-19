/**
 * JobRequest hook - single job request by ID with automatic state management
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildJobRequestFragment, JOB_REQUEST_QUERY_CONFIGS } from '../queries/jobRequestQueries'
import { type JobRequest } from '../types/jobRequestTypes'

export interface UseJobRequestResult {
  jobRequest: JobRequest | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single job request by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Job request ID to fetch
 * @param config - Query config name or custom field array (default: 'record')
 */
export function useJobRequest(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseJobRequestResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseJobRequestResult, 'refetch'>>({
    jobRequest: null,
    loading: true,
    error: null
  })

  const fetchJobRequest = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const fields: string[] =
        typeof config === 'string' ? JOB_REQUEST_QUERY_CONFIGS[config] || JOB_REQUEST_QUERY_CONFIGS.record : config

      const fragment = buildJobRequestFragment(fields)

      const query = `
        query GetJobRequestByPk($id: uuid!) {
          JobRequestByPk(id: $id) {
            ${fragment}
          }
        }
      `

      const result = await graphqlClient.request<{
        JobRequestByPk: any
      }>(query, { id })

      const jobRequest = result.JobRequestByPk as JobRequest | null

      setState({ jobRequest, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job request'
      console.error('Error fetching job request:', error)
      setState({ jobRequest: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  useEffect(() => {
    fetchJobRequest()
  }, [fetchJobRequest])

  return {
    ...state,
    refetch: fetchJobRequest
  }
}
