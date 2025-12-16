/**
 * JobRequests hook - list of job requests with automatic state management
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_REQUEST_DESCRIPTORS } from '../types/jobRequestTypes'
import {
  buildJobRequestFragment,
  JOB_REQUEST_QUERY_CONFIGS,
  type JobRequestQueryVariables
} from '../queries/jobRequestQueries'
import type { JobRequest } from '../types/jobRequestTypes'

export interface UseJobRequestsResult {
  jobRequests: JobRequest[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: JobRequestQueryVariables) => Promise<void>
}

/**
 * Declarative hook for fetching a list of job requests.
 * Automatically fetches data when component mounts or variables change.
 */
export function useJobRequests(
  accessToken: string,
  variables: JobRequestQueryVariables = {},
  config: string | string[] = 'list'
): UseJobRequestsResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])

  const [state, setState] = useState<Omit<UseJobRequestsResult, 'refetch'>>({
    jobRequests: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchJobRequests = useCallback(
    async (fetchVariables?: JobRequestQueryVariables) => {
      const vars = { ...stableVariables, ...fetchVariables }
      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const fields: string[] =
          typeof config === 'string' ? JOB_REQUEST_QUERY_CONFIGS[config] || JOB_REQUEST_QUERY_CONFIGS.list : config

        const fragment = buildJobRequestFragment(fields)

        const whereObj = buildWhere({
          variables: vars,
          descriptors: JOB_REQUEST_DESCRIPTORS,
          ids: vars.ids,
          isDeleted: true
        })

        const orderByInput =
          vars.orderBy && vars.orderBy.length > 0
            ? vars.orderBy
            : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
        const orderByArray = buildOrderBy(orderByInput, JOB_REQUEST_DESCRIPTORS)

        const limit = Math.min(vars.limit || 50, 100)
        const offset = vars.offset || 0

        const query = `query GetJobRequisitions($limit: Int $offset: Int $where: JobRequisitionBoolExp $orderBy: [JobRequisitionOrderBy!]) {
          JobRequisition(limit: $limit offset: $offset orderBy: $orderBy where: $where) { ${fragment} }
          JobRequisitionAggregate(where: $where) { aggregate { count } }
        }`
        const result = await graphqlClient.request<{
          JobRequisition: any[]
          JobRequisitionAggregate: { aggregate: { count: number } }
        }>(query, { limit, offset, where: whereObj, orderBy: orderByArray })

        setState({
          jobRequests: (result.JobRequisition || []) as JobRequest[],
          total: result.JobRequisitionAggregate?.aggregate?.count || 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job requisitions'
        console.error('Error fetching job requisitions:', error)
        setState({
          jobRequests: [],
          total: 0,
          loading: false,
          error: errorMessage
        })
      }
    },
    [accessToken, graphqlClient, config, stableVariables]
  )

  useEffect(() => {
    fetchJobRequests()
  }, [fetchJobRequests])

  return {
    ...state,
    refetch: fetchJobRequests
  }
}
