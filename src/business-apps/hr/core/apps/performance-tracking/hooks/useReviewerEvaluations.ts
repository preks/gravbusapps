import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_REVIEWER_EVALUATIONS,
  type GetReviewerEvaluationsResponse,
  type ReviewerEvaluationApi,
  type EmployeeApi
} from '../queries/performanceTrackingQueries'
import type { ReviewerEvaluationItem } from '../types'

function resolveEmployeeName(employee: EmployeeApi | null): string {
  if (!employee) return 'Unknown'
  if (employee.displayName) return employee.displayName
  const parts = [employee.firstName, employee.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Unknown'
}

function mapReviewerEvaluation(api: ReviewerEvaluationApi): ReviewerEvaluationItem {
  const evaluation = api.employeePerformanceEvaluation
  return {
    id: api.id,
    reviewerType: api.reviewerType,
    status: api.status,
    assignedDate: api.assignedDate,
    completedDate: api.completedDate,
    employeeName: resolveEmployeeName(evaluation?.employee ?? null),
    cycleName: evaluation?.performanceCycle?.name ?? 'Unknown',
    evaluationStatusRef: evaluation?.statusRef ?? null
  }
}

export interface UseReviewerEvaluationsResult {
  evaluations: ReviewerEvaluationItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useReviewerEvaluations(
  accessToken: string | undefined,
  reviewerEmployeeId: string | null
): UseReviewerEvaluationsResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [evaluations, setEvaluations] = useState<ReviewerEvaluationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvaluations = useCallback(async () => {
    if (!accessToken || !reviewerEmployeeId) {
      setEvaluations([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetReviewerEvaluationsResponse>(GET_REVIEWER_EVALUATIONS, {
        reviewerEmployeeId
      })
      const list = result?.PerformanceEvaluationReviewer ?? []
      setEvaluations(list.map(mapReviewerEvaluation))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reviewer evaluations'
      setError(message)
      setEvaluations([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, reviewerEmployeeId, graphqlClient])

  useEffect(() => {
    fetchEvaluations()
  }, [fetchEvaluations])

  return { evaluations, loading, error, refetch: fetchEvaluations }
}
