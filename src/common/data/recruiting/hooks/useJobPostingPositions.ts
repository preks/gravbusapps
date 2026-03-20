/**
 * JobPostingPositions hook - list of posting positions with filtering
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildJobPostingPositionFragment,
  JOB_POSTING_POSITION_QUERY_CONFIGS,
  type JobPostingPositionQueryVariables
} from '../queries/jobPostingPositionQueries'
import { type JobPostingPosition } from '../types/jobPostingPositionTypes'
import { buildWhereCondition, buildOrderByClause, type OrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_POSTING_POSITION_DESCRIPTORS } from '../types/jobPostingPositionTypes'

export interface UseJobPostingPositionsResult {
  jobPostingPositions: JobPostingPosition[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseJobPostingPositionsParams extends Partial<JobPostingPositionQueryVariables> {
  search?: string
  limit?: number
  offset?: number
  orderBy?: OrderBy[]
}

export function useJobPostingPositions(
  accessToken: string,
  params: UseJobPostingPositionsParams = {},
  config: string | string[] = 'list'
): UseJobPostingPositionsResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseJobPostingPositionsResult, 'refetch'>>({
    jobPostingPositions: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchJobPostingPositions = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const fields: string[] =
        typeof config === 'string'
          ? JOB_POSTING_POSITION_QUERY_CONFIGS[config] || JOB_POSTING_POSITION_QUERY_CONFIGS.list
          : config

      const fragment = buildJobPostingPositionFragment(fields)

      const whereCondition = buildWhereCondition(params, JOB_POSTING_POSITION_DESCRIPTORS)
      const orderByClause = buildOrderByClause(params.orderBy || [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const query = `
        query GetJobPostingPositions($limit: Int, $offset: Int) {
          JobPostingPosition(
            where: ${whereCondition}
            limit: $limit
            offset: $offset
            order_by: ${orderByClause}
          ) {
            ${fragment}
          }
          JobPostingPositionAggregate(where: ${whereCondition}) {
            aggregate {
              count
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        JobPostingPosition: any[]
        JobPostingPositionAggregate: { aggregate: { count: number } }
      }>(query, {
        limit: params.limit || 20,
        offset: params.offset || 0
      })

      const jobPostingPositions = result.JobPostingPosition as JobPostingPosition[]
      const total = result.JobPostingPositionAggregate?.aggregate?.count || 0

      setState({ jobPostingPositions, total, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch job posting positions'
      console.error('Error fetching job posting positions:', error)
      setState({ jobPostingPositions: [], total: 0, loading: false, error: errorMessage })
    }
  }, [accessToken, graphqlClient, config, params])

  useEffect(() => {
    fetchJobPostingPositions()
  }, [fetchJobPostingPositions])

  return {
    ...state,
    refetch: fetchJobPostingPositions
  }
}
