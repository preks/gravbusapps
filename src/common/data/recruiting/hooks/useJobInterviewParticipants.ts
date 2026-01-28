/**
 * JobInterviewParticipants hook - list of participants for an interview
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildJobInterviewParticipantFragment,
  JOB_INTERVIEW_PARTICIPANT_QUERY_CONFIGS,
  type JobInterviewParticipantQueryVariables
} from '../queries/jobInterviewParticipantQueries'
import { type JobInterviewParticipant } from '../types/jobInterviewParticipantTypes'
import { buildWhereCondition, buildOrderByClause, type OrderBy } from '@/common/network/graphql/queryHelpers'
import { JOB_INTERVIEW_PARTICIPANT_DESCRIPTORS } from '../types/jobInterviewParticipantTypes'

export interface UseJobInterviewParticipantsResult {
  participants: JobInterviewParticipant[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export interface UseJobInterviewParticipantsParams extends Partial<JobInterviewParticipantQueryVariables> {
  search?: string
  limit?: number
  offset?: number
  orderBy?: OrderBy[]
}

export function useJobInterviewParticipants(
  accessToken: string,
  params: UseJobInterviewParticipantsParams = {},
  config: string | string[] = 'list'
): UseJobInterviewParticipantsResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseJobInterviewParticipantsResult, 'refetch'>>({
    participants: [],
    total: 0,
    loading: true,
    error: null
  })

  const fetchParticipants = useCallback(async () => {
    if (!accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const fields: string[] =
        typeof config === 'string'
          ? JOB_INTERVIEW_PARTICIPANT_QUERY_CONFIGS[config] || JOB_INTERVIEW_PARTICIPANT_QUERY_CONFIGS.list
          : config

      const fragment = buildJobInterviewParticipantFragment(fields)

      const whereCondition = buildWhereCondition(params, JOB_INTERVIEW_PARTICIPANT_DESCRIPTORS)
      const orderByClause = buildOrderByClause(params.orderBy || [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      const query = `
        query GetJobInterviewParticipants($limit: Int, $offset: Int) {
          JobInterviewParticipant(
            where: ${whereCondition}
            limit: $limit
            offset: $offset
            order_by: ${orderByClause}
          ) {
            ${fragment}
          }
          JobInterviewParticipantAggregate(where: ${whereCondition}) {
            aggregate {
              count
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        JobInterviewParticipant: any[]
        JobInterviewParticipantAggregate: { aggregate: { count: number } }
      }>(query, {
        limit: params.limit || 20,
        offset: params.offset || 0
      })

      const participants = result.JobInterviewParticipant as JobInterviewParticipant[]
      const total = result.JobInterviewParticipantAggregate?.aggregate?.count || 0

      setState({ participants, total, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch interview participants'
      console.error('Error fetching interview participants:', error)
      setState({ participants: [], total: 0, loading: false, error: errorMessage })
    }
  }, [accessToken, graphqlClient, config, params])

  useEffect(() => {
    fetchParticipants()
  }, [fetchParticipants])

  return {
    ...state,
    refetch: fetchParticipants
  }
}
