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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useJobPostings.ts:50',
            message: 'Fields config check',
            data: {
              config: typeof config === 'string' ? config : 'custom',
              fields,
              hasJobApplications: fields.includes('jobApplications')
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          })
        }).catch(() => {})
        // #endregion
        const fragment = buildJobPostingFragment(fields)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useJobPostings.ts:52',
            message: 'Fragment built',
            data: {
              fragmentLength: fragment.length,
              fragmentContainsJobApplications: fragment.includes('jobApplications')
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          })
        }).catch(() => {})
        // #endregion
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

        // #region agent log
        const allPostingsWithApps = (result.JobPosting || []).filter(
          (p: any) => p.jobApplications && p.jobApplications.length > 0
        )
        const postingWithApps = allPostingsWithApps[0]
        fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useJobPostings.ts:72',
            message: 'GraphQL result received',
            data: {
              postingCount: result.JobPosting?.length || 0,
              postingsWithApplications: allPostingsWithApps.length,
              postingWithAppsId: postingWithApps?.id,
              postingWithAppsApplicationsCount: postingWithApps?.jobApplications?.length || 0,
              postingWithAppsApplicationsType: typeof postingWithApps?.jobApplications,
              postingWithAppsApplicationsIsArray: Array.isArray(postingWithApps?.jobApplications),
              postingWithAppsFirstAppId: postingWithApps?.jobApplications?.[0]?.id
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          })
        }).catch(() => {})
        // #endregion

        // Map aggregate counts to top-level fields
        const mappedJobPostings = (result.JobPosting || []).map((posting: any) => ({
          ...posting,
          applicationCount: posting.jobApplicationsAggregate?.aggregate?.count || 0,
          positionCount: posting.jobPostingPositionsAggregate?.aggregate?.count || 0
        }))

        // #region agent log
        const mappedPostingWithApps = mappedJobPostings.find((p: any) => p.id === postingWithApps?.id)
        fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useJobPostings.ts:79',
            message: 'After mapping - check jobApplications',
            data: {
              mappedPostingWithAppsId: mappedPostingWithApps?.id,
              mappedPostingWithAppsHasApplications: !!mappedPostingWithApps?.jobApplications,
              mappedPostingWithAppsApplicationsLength: mappedPostingWithApps?.jobApplications?.length || 0,
              mappedPostingWithAppsApplicationsType: typeof mappedPostingWithApps?.jobApplications
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'A'
          })
        }).catch(() => {})
        // #endregion

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
