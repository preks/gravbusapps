/**
 * JobInterviewParticipant hook - single participant by ID
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildJobInterviewParticipantFragment,
  JOB_INTERVIEW_PARTICIPANT_QUERY_CONFIGS
} from '../queries/jobInterviewParticipantQueries'
import { type JobInterviewParticipant } from '../types/jobInterviewParticipantTypes'

export interface UseJobInterviewParticipantResult {
  participant: JobInterviewParticipant | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useJobInterviewParticipant(
  accessToken: string,
  id: string | undefined,
  config: string | string[] = 'record'
): UseJobInterviewParticipantResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseJobInterviewParticipantResult, 'refetch'>>({
    participant: null,
    loading: true,
    error: null
  })

  const fetchParticipant = useCallback(async () => {
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const fields: string[] =
        typeof config === 'string'
          ? JOB_INTERVIEW_PARTICIPANT_QUERY_CONFIGS[config] || JOB_INTERVIEW_PARTICIPANT_QUERY_CONFIGS.record
          : config

      const fragment = buildJobInterviewParticipantFragment(fields)

      const query = `
        query GetJobInterviewParticipantByPk($id: uuid!) {
          JobInterviewParticipantByPk(id: $id) {
            ${fragment}
          }
        }
      `

      const result = await graphqlClient.request<{
        JobInterviewParticipantByPk: any
      }>(query, { id })

      const participant = result.JobInterviewParticipantByPk as JobInterviewParticipant | null

      setState({ participant, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch interview participant'
      console.error('Error fetching interview participant:', error)
      setState({ participant: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient, config])

  useEffect(() => {
    fetchParticipant()
  }, [fetchParticipant])

  return {
    ...state,
    refetch: fetchParticipant
  }
}
