import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildJobInterviewFragment, JOB_INTERVIEW_QUERY_CONFIGS } from '../queries/jobInterviewQueries'
import { type JobInterview } from '../types/jobInterviewTypes'

export interface UseJobInterviewResult {
  jobInterview: JobInterview | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobInterview(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseJobInterviewResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [state, setState] = useState<Omit<UseJobInterviewResult, 'refetch'>>({
    jobInterview: null,
    loading: true,
    error: null
  })

  const fetchJobInterview = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const fields: string[] =
        typeof config === 'string' ? JOB_INTERVIEW_QUERY_CONFIGS[config] || JOB_INTERVIEW_QUERY_CONFIGS.record : config
      const fragment = buildJobInterviewFragment(fields)
      const query = `query GetJobInterviewByPk($id: uuid!) { JobInterviewByPk(id: $id) { ${fragment} } }`
      const result = await graphqlClient.request<{ JobInterviewByPk: any }>(query, { id })
      setState({
        jobInterview: result.JobInterviewByPk as JobInterview | null,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch interview'
      console.error('Error fetching interview:', error)
      setState({ jobInterview: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  useEffect(() => {
    fetchJobInterview()
  }, [fetchJobInterview])

  return { ...state, refetch: fetchJobInterview }
}
