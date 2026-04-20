/**
 * JobPostingPosition hook - single job posting position by ID
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildJobPostingPositionFragment,
  JOB_POSTING_POSITION_QUERY_CONFIGS
} from '../queries/jobPostingPositionQueries'
import { type JobPostingPosition } from '../types/jobPostingPositionTypes'

export interface UseJobPostingPositionResult {
  jobPostingPosition: JobPostingPosition | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobPostingPosition(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseJobPostingPositionResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseJobPostingPositionResult, 'refetch'>>({
    jobPostingPosition: null,
    loading: true,
    error: null
  })

  const fetchJobPostingPosition = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const fields: string[] =
        typeof config === 'string'
          ? JOB_POSTING_POSITION_QUERY_CONFIGS[config] || JOB_POSTING_POSITION_QUERY_CONFIGS.record
          : config

      const fragment = buildJobPostingPositionFragment(fields)

      const query = `
        query GetJobPostingPositionByPk($id: uuid!) {
          JobPostingPositionByPk(id: $id) {
            ${fragment}
          }
        }
      `

      const result = await graphqlClient.request<{
        JobPostingPositionByPk: any
      }>(query, { id })

      const jobPostingPosition = result.JobPostingPositionByPk as JobPostingPosition | null

      setState({ jobPostingPosition, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job posting position'
      console.error('Error fetching job posting position:', error)
      setState({ jobPostingPosition: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  useEffect(() => {
    fetchJobPostingPosition()
  }, [fetchJobPostingPosition])

  return {
    ...state,
    refetch: fetchJobPostingPosition
  }
}
