import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_EVALUATIONS,
  type GetEmployeeEvaluationsResponse,
  type EmployeeEvalDetailApi,
  type EmployeeApi
} from '../queries/performanceTrackingQueries'
import type { EmployeeEvalItem, ReviewerDetail } from '../types'

function resolveEmployeeName(employee: EmployeeApi | null): string {
  if (!employee) return 'Unknown'
  if (employee.displayName) return employee.displayName
  const parts = [employee.firstName, employee.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Unknown'
}

function mapEvaluation(api: EmployeeEvalDetailApi): EmployeeEvalItem {
  const reviewers: ReviewerDetail[] = (api.performanceEvaluationReviewer ?? []).map(r => ({
    id: r.id,
    reviewerEmployeeId: r.reviewerEmployeeId,
    reviewerName: resolveEmployeeName(r.reviewerEmployee),
    reviewerType: r.reviewerType,
    status: r.status,
    assignedDate: r.assignedDate,
    completedDate: r.completedDate
  }))

  return {
    id: api.id,
    cycleName: api.performanceCycle?.name ?? 'Unknown',
    statusRef: api.statusRef,
    startDate: api.startDate,
    actualCompletionDate: api.actualCompletionDate,
    reviewers
  }
}

export interface UseEmployeeEvaluationsResult {
  evaluations: EmployeeEvalItem[]
  loading: boolean
  error: string | null
}

export function useEmployeeEvaluations(
  accessToken: string | undefined,
  employeeId: string | null
): UseEmployeeEvaluationsResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [evaluations, setEvaluations] = useState<EmployeeEvalItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvaluations = useCallback(async () => {
    if (!accessToken || !employeeId) {
      setEvaluations([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetEmployeeEvaluationsResponse>(GET_EMPLOYEE_EVALUATIONS, {
        employeeId
      })
      const list = result?.EmployeePerformanceEvaluation ?? []
      setEvaluations(list.map(mapEvaluation))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load employee evaluations'
      setError(message)
      setEvaluations([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId, graphqlClient])

  useEffect(() => {
    fetchEvaluations()
  }, [fetchEvaluations])

  return { evaluations, loading, error }
}
