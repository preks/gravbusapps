import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_INTERVIEW_DESCRIPTORS } from '../types/jobInterviewTypes'
import {
  buildJobInterviewFragment,
  JOB_INTERVIEW_QUERY_CONFIGS,
  type JobInterviewQueryVariables
} from '../queries/jobInterviewQueries'
import type { JobInterview } from '../types/jobInterviewTypes'

export interface UseJobInterviewsResult {
  jobInterviews: JobInterview[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: JobInterviewQueryVariables & { where?: any }) => Promise<void>
}

export interface JobInterviewQueryOptions extends JobInterviewQueryVariables {
  where?: any // Additional where conditions to merge
}

export function useJobInterviews(
  accessToken: string,
  variables: JobInterviewQueryOptions = {},
  config: string | string[] = 'list'
): UseJobInterviewsResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])
  const [state, setState] = useState<Omit<UseJobInterviewsResult, 'refetch'>>({
    jobInterviews: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchJobInterviews = useCallback(
    async (fetchVariables?: JobInterviewQueryOptions) => {
      const vars = { ...stableVariables, ...fetchVariables }
      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const fields: string[] =
          typeof config === 'string' ? JOB_INTERVIEW_QUERY_CONFIGS[config] || JOB_INTERVIEW_QUERY_CONFIGS.list : config
        const fragment = buildJobInterviewFragment(fields)

        // Build base where condition from search/filters
        const baseWhereObj = buildWhere({
          variables: vars,
          descriptors: JOB_INTERVIEW_DESCRIPTORS,
          ids: vars.ids,
          isDeleted: true
        })

        // Merge with additional where conditions if provided
        const whereObj = vars.where ? { _and: [baseWhereObj, vars.where] } : baseWhereObj

        const orderByInput =
          vars.orderBy && vars.orderBy.length > 0
            ? vars.orderBy
            : [{ field: 'scheduledAt', direction: 'DESC_NULLS_LAST' as const }]
        const orderByArray = buildOrderBy(orderByInput, JOB_INTERVIEW_DESCRIPTORS)
        const limit = Math.min(vars.limit || 50, 100)
        const offset = vars.offset || 0
        const query = `query GetJobInterviews($limit: Int $offset: Int $where: JobInterviewBoolExp $orderBy: [JobInterviewOrderBy!]) {
          JobInterview(limit: $limit offset: $offset orderBy: $orderBy where: $where) { ${fragment} }
          JobInterviewAggregate(where: $where) { aggregate { count } }
        }`
        const result = await graphqlClient.request<{
          JobInterview: any[]
          JobInterviewAggregate: { aggregate: { count: number } }
        }>(query, { limit, offset, where: whereObj, orderBy: orderByArray })
        setState({
          jobInterviews: (result.JobInterview || []) as JobInterview[],
          total: result.JobInterviewAggregate?.aggregate?.count || 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch interviews'
        console.error('Error fetching interviews:', error)
        setState({ jobInterviews: [], total: 0, loading: false, error: errorMessage })
      }
    },
    [accessToken, graphqlClient, config, stableVariables]
  )

  useEffect(() => {
    fetchJobInterviews()
  }, [fetchJobInterviews])

  return { ...state, refetch: fetchJobInterviews }
}
