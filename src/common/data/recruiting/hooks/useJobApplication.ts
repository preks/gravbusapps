import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildJobApplicationFragment, JOB_APPLICATION_QUERY_CONFIGS } from '../queries/jobApplicationQueries'
import { type JobApplication } from '../types/jobApplicationTypes'

export interface UseJobApplicationResult {
  jobApplication: JobApplication | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobApplication(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseJobApplicationResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [state, setState] = useState<Omit<UseJobApplicationResult, 'refetch'>>({
    jobApplication: null,
    loading: true,
    error: null
  })

  const fetchJobApplication = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const fields: string[] =
        typeof config === 'string'
          ? JOB_APPLICATION_QUERY_CONFIGS[config] || JOB_APPLICATION_QUERY_CONFIGS.record
          : config
      const fragment = buildJobApplicationFragment(fields)
      const query = `query GetJobApplicationByPk($id: uuid!) { JobApplicationByPk(id: $id) { ${fragment} } }`
      const result = await graphqlClient.request<{ JobApplicationByPk: any }>(query, { id })
      setState({ jobApplication: result.JobApplicationByPk as JobApplication | null, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job application'
      console.error('Error fetching job application:', error)
      setState({ jobApplication: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  useEffect(() => {
    fetchJobApplication()
  }, [fetchJobApplication])

  return { ...state, refetch: fetchJobApplication }
}
