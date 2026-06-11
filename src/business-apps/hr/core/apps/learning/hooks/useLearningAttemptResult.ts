import { useCallback, useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { decodeAccessTokenSub } from '@/common/utils/decodeJwtSub'
import {
  GET_LEARNING_ATTEMPT_RESULT,
  type GetLearningAttemptResultResponse
} from '../queries/learningAssignmentQueries'
import type { LearningAttemptApi, LearningAttemptCommandResult } from '../types'

export interface UseLearningAttemptResultResult {
  result: LearningAttemptCommandResult | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function isCompletedAttempt(status: string | null | undefined): boolean {
  return status === 'GRADED_LEARNING_ATTEMPT' || status === 'SUBMITTED_LEARNING_ATTEMPT'
}

function mapAttemptResult(attempt: LearningAttemptApi | undefined): LearningAttemptCommandResult | null {
  if (!attempt) return null
  if (!isCompletedAttempt(attempt.status)) return null
  return {
    attemptId: attempt.id,
    status: attempt.status ?? 'GRADED_LEARNING_ATTEMPT',
    scoreRaw: toNumber(attempt.scoreRaw),
    scorePct: toNumber(attempt.scorePct),
    passed: attempt.passed ?? undefined,
    bandLabel: attempt.bandLabel ?? undefined,
    canRetake: false
  }
}

export function useLearningAttemptResult(
  assignmentId: string | null | undefined,
  courseVersionId: string | null | undefined,
  accessToken: string | undefined
): UseLearningAttemptResultResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [result, setResult] = useState<LearningAttemptCommandResult | null>(null)
  const [loading, setLoading] = useState(Boolean(accessToken && assignmentId && courseVersionId))
  const [error, setError] = useState<string | null>(null)

  const fetchResult = useCallback(async () => {
    const userId = decodeAccessTokenSub(accessToken)
    if (!accessToken || !assignmentId || !courseVersionId || !userId) {
      setResult(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await graphqlClient.request<GetLearningAttemptResultResponse>(GET_LEARNING_ATTEMPT_RESULT, {
        assignmentId,
        courseVersionId,
        userId
      })
      setResult(mapAttemptResult(response.LearningAttempt?.[0]))
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Failed to load learning attempt result')
    } finally {
      setLoading(false)
    }
  }, [accessToken, assignmentId, courseVersionId, graphqlClient])

  useEffect(() => {
    fetchResult().catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to load learning attempt result')
    })
  }, [fetchResult])

  return { result, loading, error, refetch: fetchResult }
}
