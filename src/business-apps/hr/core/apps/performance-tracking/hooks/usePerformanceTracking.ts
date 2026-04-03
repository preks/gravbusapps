import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_CYCLES_TRACKING,
  type GetCyclesTrackingResponse,
  type CycleTrackingApi
} from '../queries/performanceTrackingQueries'
import type { CycleTrackingSummary } from '../types'

function mapCycleToSummary(api: CycleTrackingApi): CycleTrackingSummary {
  const evaluations = api.employeePerformanceEvaluation ?? []
  const totalEvaluations = evaluations.length
  const completedEvaluations = evaluations.filter(e => e.actualCompletionDate).length

  let totalReviewerTasks = 0
  let completedReviewerTasks = 0
  let totalManagerReviews = 0
  let completedManagerReviews = 0
  let totalSelfReviews = 0
  let completedSelfReviews = 0

  for (const evaluation of evaluations) {
    const reviewers = evaluation.performanceEvaluationReviewer ?? []
    totalReviewerTasks += reviewers.length
    completedReviewerTasks += reviewers.filter(r => r.completedDate).length

    for (const reviewer of reviewers) {
      if (reviewer.reviewerType === 'MANAGER_EVALUATION_PARTICIPANT_TYPE') {
        totalManagerReviews++
        if (reviewer.completedDate) completedManagerReviews++
      } else if (reviewer.reviewerType === 'SELF_EVALUATION_PARTICIPANT_TYPE') {
        totalSelfReviews++
        if (reviewer.completedDate) completedSelfReviews++
      }
    }
  }

  return {
    id: api.id,
    name: api.name ?? '',
    startDate: api.startDate,
    endDate: api.endDate,
    evaluationPeriodStartDate: api.evaluationPeriodStartDate,
    evaluationPeriodEndDate: api.evaluationPeriodEndDate,
    frequency: api.frequency,
    status: api.status,
    totalEvaluations,
    completedEvaluations,
    totalReviewerTasks,
    completedReviewerTasks,
    totalManagerReviews,
    completedManagerReviews,
    totalSelfReviews,
    completedSelfReviews
  }
}

export interface UsePerformanceTrackingResult {
  cycles: CycleTrackingSummary[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePerformanceTracking(accessToken: string | undefined): UsePerformanceTrackingResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [cycles, setCycles] = useState<CycleTrackingSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCycles = useCallback(async () => {
    if (!accessToken) {
      setCycles([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetCyclesTrackingResponse>(GET_CYCLES_TRACKING)
      const list = result?.PerformanceCycle ?? []
      setCycles(list.map(mapCycleToSummary))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load performance tracking data'
      setError(message)
      setCycles([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  return { cycles, loading, error, refetch: fetchCycles }
}
