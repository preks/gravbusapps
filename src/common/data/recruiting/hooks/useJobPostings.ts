import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_POSTING_DESCRIPTORS } from '../types/jobPostingTypes'
import {
  buildJobPostingFragment,
  JOB_POSTING_QUERY_CONFIGS,
  type JobPostingQueryVariables
} from '../queries/jobPostingQueries'
import type { JobPosting } from '../types/jobPostingTypes'

export interface UseJobPostingsResult {
  jobPostings: JobPosting[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: JobPostingQueryVariables) => Promise<void>
}

export function useJobPostings(
  accessToken: string,
  variables: JobPostingQueryVariables = {},
  config: string | string[] = 'list'
): UseJobPostingsResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [state, setState] = useState<Omit<UseJobPostingsResult, 'refetch'>>({
    jobPostings: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchJobPostings = useCallback(
    async (fetchVariables?: JobPostingQueryVariables) => {
      const vars = { ...stableVariables, ...fetchVariables }
      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }
      // Only set loading to true on initial load, not on subsequent searches
      if (isInitialLoad) {
        setState(prev => ({ ...prev, loading: true, error: null }))
      } else {
        setState(prev => ({ ...prev, error: null }))
      }
      try {
        const fields: string[] =
          typeof config === 'string' ? JOB_POSTING_QUERY_CONFIGS[config] || JOB_POSTING_QUERY_CONFIGS.list : config
        const fragment = buildJobPostingFragment(fields)
        const whereObj = buildWhere({
          variables: vars,
          descriptors: JOB_POSTING_DESCRIPTORS,
          ids: vars.ids,
          isDeleted: true
        })
        const orderByInput =
          vars.orderBy && vars.orderBy.length > 0
            ? vars.orderBy
            : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
        const orderByArray = buildOrderBy(orderByInput, JOB_POSTING_DESCRIPTORS)
        const limit = Math.min(vars.limit || 50, 100)
        const offset = vars.offset || 0
        const query = `query GetJobPostings($limit: Int $offset: Int $where: JobPostingBoolExp $orderBy: [JobPostingOrderBy!]) {
          JobPosting(limit: $limit offset: $offset orderBy: $orderBy where: $where) { ${fragment} }
          JobPostingAggregate(where: $where) { aggregate { count } }
        }`
        const result = await graphqlClient.request<{
          JobPosting: any[]
          JobPostingAggregate: { aggregate: { count: number } }
        }>(query, { limit, offset, where: whereObj, orderBy: orderByArray })

        // Map aggregate counts to top-level fields
        const mappedJobPostings = (result.JobPosting || []).map((posting: any) => ({
          ...posting,
          applicationCount: posting.jobApplicationsAggregate?.aggregate?.count || 0,
          positionCount: posting.jobPostingPositionsAggregate?.aggregate?.count || 0
        }))

        setState({
          jobPostings: mappedJobPostings as JobPosting[],
          total: result.JobPostingAggregate?.aggregate?.count || 0,
          loading: false,
          error: null
        })
        setIsInitialLoad(false)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job postings'
        console.error('Error fetching job postings:', error)
        setState({ jobPostings: [], total: 0, loading: false, error: errorMessage })
      }
    },
    [accessToken, graphqlClient, config, stableVariables, isInitialLoad]
  )

  useEffect(() => {
    fetchJobPostings()
  }, [fetchJobPostings])

  return { ...state, refetch: fetchJobPostings }
}
