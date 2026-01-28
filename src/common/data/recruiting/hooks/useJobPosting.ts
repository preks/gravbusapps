import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildJobPostingFragment, JOB_POSTING_QUERY_CONFIGS } from '../queries/jobPostingQueries'
import { type JobPosting } from '../types/jobPostingTypes'

export interface UseJobPostingResult {
  jobPosting: JobPosting | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobPosting(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseJobPostingResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [state, setState] = useState<Omit<UseJobPostingResult, 'refetch'>>({
    jobPosting: null,
    loading: true,
    error: null
  })

  const fetchJobPosting = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const fields: string[] =
        typeof config === 'string' ? JOB_POSTING_QUERY_CONFIGS[config] || JOB_POSTING_QUERY_CONFIGS.record : config
      const fragment = buildJobPostingFragment(fields)
      const query = `query GetJobPostingByPk($id: uuid!) { JobPostingByPk(id: $id) { ${fragment} } }`
      const result = await graphqlClient.request<{ JobPostingByPk: any }>(query, { id })
      setState({ jobPosting: result.JobPostingByPk as JobPosting | null, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job posting'
      console.error('Error fetching job posting:', error)
      setState({ jobPosting: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  useEffect(() => {
    fetchJobPosting()
  }, [fetchJobPosting])

  return { ...state, refetch: fetchJobPosting }
}
