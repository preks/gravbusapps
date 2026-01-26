import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_CANDIDATE_DESCRIPTORS } from '../types/jobCandidateTypes'
import {
  buildJobCandidateFragment,
  JOB_CANDIDATE_QUERY_CONFIGS,
  type JobCandidateQueryVariables
} from '../queries/jobCandidateQueries'
import type { JobCandidate } from '../types/jobCandidateTypes'

export interface UseJobCandidatesResult {
  jobCandidates: JobCandidate[]
  total: number
  loading: boolean
  error: string | null
  refetch: (variables?: JobCandidateQueryVariables) => Promise<void>
}

export function useJobCandidates(
  accessToken: string,
  variables: JobCandidateQueryVariables = {},
  config: string | string[] = 'list'
): UseJobCandidatesResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const stableVariables = useMemo(() => variables, [JSON.stringify(variables)])
  const [state, setState] = useState<Omit<UseJobCandidatesResult, 'refetch'>>({
    jobCandidates: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchJobCandidates = useCallback(
    async (fetchVariables?: JobCandidateQueryVariables) => {
      const vars = { ...stableVariables, ...fetchVariables }
      if (!accessToken) {
        setState(prev => ({ ...prev, loading: false }))
        return
      }
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const fields: string[] =
          typeof config === 'string' ? JOB_CANDIDATE_QUERY_CONFIGS[config] || JOB_CANDIDATE_QUERY_CONFIGS.list : config
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useJobCandidates.ts:44',
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
        const fragment = buildJobCandidateFragment(fields)
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useJobCandidates.ts:46',
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
          descriptors: JOB_CANDIDATE_DESCRIPTORS,
          ids: vars.ids,
          isDeleted: true
        })
        const orderByInput =
          vars.orderBy && vars.orderBy.length > 0
            ? vars.orderBy
            : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
        const orderByArray = buildOrderBy(orderByInput, JOB_CANDIDATE_DESCRIPTORS)
        const limit = Math.min(vars.limit || 50, 100)
        const offset = vars.offset || 0
        const query = `query GetJobCandidates($limit: Int $offset: Int $where: JobCandidateBoolExp $orderBy: [JobCandidateOrderBy!]) {
          JobCandidate(limit: $limit offset: $offset orderBy: $orderBy where: $where) { ${fragment} }
          JobCandidateAggregate(where: $where) { aggregate { count } }
        }`
        const result = await graphqlClient.request<{
          JobCandidate: any[]
          JobCandidateAggregate: { aggregate: { count: number } }
        }>(query, { limit, offset, where: whereObj, orderBy: orderByArray })

        // #region agent log
        const allCandidatesWithApps = (result.JobCandidate || []).filter(
          (c: any) => c.jobApplications && c.jobApplications.length > 0
        )
        const candidateWithApps = allCandidatesWithApps[0]
        fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useJobCandidates.ts:63',
            message: 'GraphQL result received',
            data: {
              candidateCount: result.JobCandidate?.length || 0,
              candidatesWithApplications: allCandidatesWithApps.length,
              candidateWithAppsId: candidateWithApps?.id,
              candidateWithAppsApplicationsCount: candidateWithApps?.jobApplications?.length || 0,
              candidateWithAppsApplicationsType: typeof candidateWithApps?.jobApplications,
              candidateWithAppsApplicationsIsArray: Array.isArray(candidateWithApps?.jobApplications),
              candidateWithAppsFirstAppId: candidateWithApps?.jobApplications?.[0]?.id
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'D'
          })
        }).catch(() => {})
        // #endregion

        // Map aggregate counts to top-level fields
        const mappedJobCandidates = (result.JobCandidate || []).map((candidate: any) => ({
          ...candidate,
          applicationCount: candidate.jobApplicationsAggregate?.aggregate?.count || 0
        }))

        // #region agent log
        const mappedCandidateWithApps = mappedJobCandidates.find((c: any) => c.id === candidateWithApps?.id)
        fetch('http://127.0.0.1:7242/ingest/1d1d96ce-1896-4db3-b2fa-faa680c1d2c5', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useJobCandidates.ts:72',
            message: 'After mapping - check jobApplications',
            data: {
              mappedCandidateWithAppsId: mappedCandidateWithApps?.id,
              mappedCandidateWithAppsHasApplications: !!mappedCandidateWithApps?.jobApplications,
              mappedCandidateWithAppsApplicationsLength: mappedCandidateWithApps?.jobApplications?.length || 0,
              mappedCandidateWithAppsApplicationsType: typeof mappedCandidateWithApps?.jobApplications
            },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'run1',
            hypothesisId: 'A'
          })
        }).catch(() => {})
        // #endregion

        setState({
          jobCandidates: mappedJobCandidates as JobCandidate[],
          total: result.JobCandidateAggregate?.aggregate?.count || 0,
          loading: false,
          error: null
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job candidates'
        console.error('Error fetching job candidates:', error)
        setState({ jobCandidates: [], total: 0, loading: false, error: errorMessage })
      }
    },
    [accessToken, graphqlClient, config, stableVariables]
  )

  useEffect(() => {
    fetchJobCandidates()
  }, [fetchJobCandidates])

  return { ...state, refetch: fetchJobCandidates }
}
