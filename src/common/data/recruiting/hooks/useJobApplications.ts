import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_APPLICATION_DESCRIPTORS } from '../types/jobApplicationTypes'
import {
  buildJobApplicationFragment,
  JOB_APPLICATION_QUERY_CONFIGS,
  type JobApplicationQueryVariables
} from '../queries/jobApplicationQueries'
import type { JobApplication } from '../types/jobApplicationTypes'

export interface UseJobApplicationsResult {
  jobApplications: JobApplication[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: JobApplicationQueryVariables & { where?: any }) => Promise<void>
}

export interface JobApplicationQueryOptions extends JobApplicationQueryVariables {
  where?: any // Additional where conditions to merge
}

export function useJobApplications(
  accessToken: string,
  variables: JobApplicationQueryOptions = {},
  config: string | string[] = 'list'
): UseJobApplicationsResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])
  const [state, setState] = useState<Omit<UseJobApplicationsResult, 'refetch'>>({
    jobApplications: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchJobApplications = useCallback(
    async (fetchVariables?: JobApplicationQueryOptions) => {
      const vars = { ...stableVariables, ...fetchVariables }
      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const fields: string[] =
          typeof config === 'string'
            ? JOB_APPLICATION_QUERY_CONFIGS[config] || JOB_APPLICATION_QUERY_CONFIGS.list
            : config
        const fragment = buildJobApplicationFragment(fields)

        // Build base where condition from search/filters
        const baseWhereObj = buildWhere({
          variables: vars,
          descriptors: JOB_APPLICATION_DESCRIPTORS,
          ids: vars.ids,
          isDeleted: true
        })

        // Merge with additional where conditions if provided
        const whereObj = vars.where ? { _and: [baseWhereObj, vars.where] } : baseWhereObj

        const orderByInput =
          vars.orderBy && vars.orderBy.length > 0
            ? vars.orderBy
            : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
        const orderByArray = buildOrderBy(orderByInput, JOB_APPLICATION_DESCRIPTORS)
        const limit = Math.min(vars.limit || 50, 100)
        const offset = vars.offset || 0
        const query = `query GetJobApplications($limit: Int $offset: Int $where: JobApplicationBoolExp $orderBy: [JobApplicationOrderBy!]) {
          JobApplication(limit: $limit offset: $offset orderBy: $orderBy where: $where) { ${fragment} }
          JobApplicationAggregate(where: $where) { aggregate { count } }
        }`
        const result = await graphqlClient.request<{
          JobApplication: any[]
          JobApplicationAggregate: { aggregate: { count: number } }
        }>(query, { limit, offset, where: whereObj, orderBy: orderByArray })
        setState({
          jobApplications: (result.JobApplication || []) as JobApplication[],
          total: result.JobApplicationAggregate?.aggregate?.count || 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job applications'
        console.error('Error fetching job applications:', error)
        setState({ jobApplications: [], total: 0, loading: false, error: errorMessage })
      }
    },
    [accessToken, graphqlClient, config, stableVariables]
  )

  useEffect(() => {
    fetchJobApplications()
  }, [fetchJobApplications])

  return { ...state, refetch: fetchJobApplications }
}
