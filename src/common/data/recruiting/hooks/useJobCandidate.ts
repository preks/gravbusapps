import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildJobCandidateFragment, JOB_CANDIDATE_QUERY_CONFIGS } from '../queries/jobCandidateQueries'
import { type JobCandidate } from '../types/jobCandidateTypes'

export interface UseJobCandidateResult {
  jobCandidate: JobCandidate | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobCandidate(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseJobCandidateResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [state, setState] = useState<Omit<UseJobCandidateResult, 'refetch'>>({
    jobCandidate: null,
    loading: true,
    error: null
  })

  const fetchJobCandidate = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const fields: string[] =
        typeof config === 'string' ? JOB_CANDIDATE_QUERY_CONFIGS[config] || JOB_CANDIDATE_QUERY_CONFIGS.record : config
      const fragment = buildJobCandidateFragment(fields)
      const query = `query GetJobCandidateByPk($id: uuid!) { JobCandidateByPk(id: $id) { ${fragment} } }`
      const result = await graphqlClient.request<{ JobCandidateByPk: any }>(query, { id })
      setState({ jobCandidate: result.JobCandidateByPk as JobCandidate | null, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job candidate'
      console.error('Error fetching job candidate:', error)
      setState({ jobCandidate: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  useEffect(() => {
    fetchJobCandidate()
  }, [fetchJobCandidate])

  return { ...state, refetch: fetchJobCandidate }
}
