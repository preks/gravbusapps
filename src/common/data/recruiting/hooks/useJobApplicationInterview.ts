import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildJobApplicationInterviewFragment,
  JOB_APPLICATION_INTERVIEW_QUERY_CONFIGS
} from '../queries/jobApplicationInterviewQueries'
import { type JobApplicationInterview } from '../types/jobApplicationInterviewTypes'

export interface UseJobApplicationInterviewResult {
  jobApplicationInterview: JobApplicationInterview | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobApplicationInterview(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseJobApplicationInterviewResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [state, setState] = useState<Omit<UseJobApplicationInterviewResult, 'refetch'>>({
    jobApplicationInterview: null,
    loading: true,
    error: null
  })

  const fetchJobApplicationInterview = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const fields: string[] =
        typeof config === 'string'
          ? JOB_APPLICATION_INTERVIEW_QUERY_CONFIGS[config] || JOB_APPLICATION_INTERVIEW_QUERY_CONFIGS.record
          : config
      const fragment = buildJobApplicationInterviewFragment(fields)
      const query = `query GetJobApplicationInterviewByPk($id: uuid!) { JobApplicationInterviewByPk(id: $id) { ${fragment} } }`
      const result = await graphqlClient.request<{ JobApplicationInterviewByPk: any }>(query, { id })
      setState({
        jobApplicationInterview: result.JobApplicationInterviewByPk as JobApplicationInterview | null,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch interview'
      console.error('Error fetching interview:', error)
      setState({ jobApplicationInterview: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  useEffect(() => {
    fetchJobApplicationInterview()
  }, [fetchJobApplicationInterview])

  return { ...state, refetch: fetchJobApplicationInterview }
}
