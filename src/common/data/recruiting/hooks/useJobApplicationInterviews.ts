import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_APPLICATION_INTERVIEW_DESCRIPTORS } from '../types/jobApplicationInterviewTypes'
import {
  buildJobApplicationInterviewFragment,
  JOB_APPLICATION_INTERVIEW_QUERY_CONFIGS,
  type JobApplicationInterviewQueryVariables
} from '../queries/jobApplicationInterviewQueries'
import type { JobApplicationInterview } from '../types/jobApplicationInterviewTypes'

export interface UseJobApplicationInterviewsResult {
  jobApplicationInterviews: JobApplicationInterview[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: JobApplicationInterviewQueryVariables & { where?: any }) => Promise<void>
}

export interface JobApplicationInterviewQueryOptions extends JobApplicationInterviewQueryVariables {
  where?: any // Additional where conditions to merge
}

export function useJobApplicationInterviews(
  accessToken: string,
  variables: JobApplicationInterviewQueryOptions = {},
  config: string | string[] = 'list'
): UseJobApplicationInterviewsResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])
  const [state, setState] = useState<Omit<UseJobApplicationInterviewsResult, 'refetch'>>({
    jobApplicationInterviews: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchJobApplicationInterviews = useCallback(
    async (fetchVariables?: JobApplicationInterviewQueryOptions) => {
      const vars = { ...stableVariables, ...fetchVariables }
      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const fields: string[] =
          typeof config === 'string'
            ? JOB_APPLICATION_INTERVIEW_QUERY_CONFIGS[config] || JOB_APPLICATION_INTERVIEW_QUERY_CONFIGS.list
            : config
        const fragment = buildJobApplicationInterviewFragment(fields)

        // Build base where condition from search/filters
        const baseWhereObj = buildWhere({
          variables: vars,
          descriptors: JOB_APPLICATION_INTERVIEW_DESCRIPTORS,
          ids: vars.ids,
          isDeleted: true
        })

        // Merge with additional where conditions if provided
        const whereObj = vars.where ? { _and: [baseWhereObj, vars.where] } : baseWhereObj

        const orderByInput =
          vars.orderBy && vars.orderBy.length > 0
            ? vars.orderBy
            : [{ field: 'scheduledDate', direction: 'DESC_NULLS_LAST' as const }]
        const orderByArray = buildOrderBy(orderByInput, JOB_APPLICATION_INTERVIEW_DESCRIPTORS)
        const limit = Math.min(vars.limit || 50, 100)
        const offset = vars.offset || 0
        const query = `query GetJobApplicationInterviews($limit: Int $offset: Int $where: JobApplicationInterviewBoolExp $orderBy: [JobApplicationInterviewOrderBy!]) {
          JobApplicationInterview(limit: $limit offset: $offset orderBy: $orderBy where: $where) { ${fragment} }
          JobApplicationInterviewAggregate(where: $where) { aggregate { count } }
        }`
        const result = await graphqlClient.request<{
          JobApplicationInterview: any[]
          JobApplicationInterviewAggregate: { aggregate: { count: number } }
        }>(query, { limit, offset, where: whereObj, orderBy: orderByArray })
        setState({
          jobApplicationInterviews: (result.JobApplicationInterview || []) as JobApplicationInterview[],
          total: result.JobApplicationInterviewAggregate?.aggregate?.count || 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch interviews'
        console.error('Error fetching interviews:', error)
        setState({ jobApplicationInterviews: [], total: 0, loading: false, error: errorMessage })
      }
    },
    [accessToken, graphqlClient, config, stableVariables]
  )

  useEffect(() => {
    fetchJobApplicationInterviews()
  }, [fetchJobApplicationInterviews])

  return { ...state, refetch: fetchJobApplicationInterviews }
}
