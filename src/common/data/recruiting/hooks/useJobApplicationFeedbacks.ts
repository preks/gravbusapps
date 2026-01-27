/**
 * JobApplicationFeedbacks hook - list of feedback for applications/interviews
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildJobApplicationFeedbackFragment,
  JOB_APPLICATION_FEEDBACK_QUERY_CONFIGS,
  type JobApplicationFeedbackQueryVariables
} from '../queries/jobApplicationFeedbackQueries'
import { type JobApplicationFeedback } from '../types/jobApplicationFeedbackTypes'
import { buildWhereCondition, buildOrderByClause, type OrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_APPLICATION_FEEDBACK_DESCRIPTORS } from '../types/jobApplicationFeedbackTypes'

export interface UseJobApplicationFeedbacksResult {
  feedbacks: JobApplicationFeedback[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseJobApplicationFeedbacksParams extends Partial<JobApplicationFeedbackQueryVariables> {
  search?: string
  limit?: number
  offset?: number
  orderBy?: OrderBy[]
}

export function useJobApplicationFeedbacks(
  accessToken: string,
  params: UseJobApplicationFeedbacksParams = {},
  config: string | string[] = 'list'
): UseJobApplicationFeedbacksResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseJobApplicationFeedbacksResult, 'refetch'>>({
    feedbacks: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchFeedbacks = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const fields: string[] =
        typeof config === 'string'
          ? JOB_APPLICATION_FEEDBACK_QUERY_CONFIGS[config] || JOB_APPLICATION_FEEDBACK_QUERY_CONFIGS.list
          : config

      const fragment = buildJobApplicationFeedbackFragment(fields)

      const whereCondition = buildWhereCondition(params, JOB_APPLICATION_FEEDBACK_DESCRIPTORS)
      const orderByClause = buildOrderByClause(params.orderBy || [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const query = `
        query GetJobApplicationFeedbacks($limit: Int, $offset: Int) {
          JobApplicationFeedback(
            where: ${whereCondition}
            limit: $limit
            offset: $offset
            order_by: ${orderByClause}
          ) {
            ${fragment}
          }
          JobApplicationFeedbackAggregate(where: ${whereCondition}) {
            aggregate {
              count
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        JobApplicationFeedback: any[]
        JobApplicationFeedbackAggregate: { aggregate: { count: number } }
      }>(query, {
        limit: params.limit || 20,
        offset: params.offset || 0
      })

      const feedbacks = result.JobApplicationFeedback as JobApplicationFeedback[]
      const total = result.JobApplicationFeedbackAggregate?.aggregate?.count || 0

      setState({ feedbacks, total, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch application feedbacks'
      console.error('Error fetching application feedbacks:', error)
      setState({ feedbacks: [], total: 0, loading: false, error: errorMessage })
    }
  }, [accessToken, graphqlClient, config, params])

  useEffect(() => {
    fetchFeedbacks()
  }, [fetchFeedbacks])

  return {
    ...state,
    refetch: fetchFeedbacks
  }
}
