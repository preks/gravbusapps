import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_CYCLE_EVALUATION_DETAILS,
  type GetCycleEvaluationDetailsResponse,
  type EvaluationDetailApi,
  type EmployeeApi
} from '../queries/performanceTrackingQueries'
import type { EvaluationDetail, ReviewerDetail } from '../types'

function resolveEmployeeName(employee: EmployeeApi | null): string {
  if (!employee) return 'Unknown'
  if (employee.displayName) return employee.displayName
  const parts = [employee.firstName, employee.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Unknown'
}

function mapReviewer(api: EvaluationDetailApi['performanceEvaluationReviewer'][number]): ReviewerDetail {
  return {
    id: api.id,
    reviewerEmployeeId: api.reviewerEmployeeId,
    reviewerName: resolveEmployeeName(api.reviewerEmployee),
    reviewerType: api.reviewerType,
    status: api.status,
    assignedDate: api.assignedDate,
    completedDate: api.completedDate
  }
}

function mapEvaluation(api: EvaluationDetailApi): EvaluationDetail {
  return {
    id: api.id,
    employeeId: api.employeeId,
    employeeName: resolveEmployeeName(api.employee),
    statusRef: api.statusRef,
    startDate: api.startDate,
    actualCompletionDate: api.actualCompletionDate,
    targetCompletionDate: api.targetCompletionDate,
    reviewers: (api.performanceEvaluationReviewer ?? []).map(mapReviewer)
  }
}

export interface UseCycleDetailResult {
  evaluations: EvaluationDetail[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCycleDetail(accessToken: string | undefined, cycleId: string | null): UseCycleDetailResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [evaluations, setEvaluations] = useState<EvaluationDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetails = useCallback(async () => {
    if (!accessToken || !cycleId) {
      setEvaluations([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetCycleEvaluationDetailsResponse>(GET_CYCLE_EVALUATION_DETAILS, {
        cycleId
      })
      const list = result?.EmployeePerformanceEvaluation ?? []
      setEvaluations(list.map(mapEvaluation))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cycle evaluation details'
      setError(message)
      setEvaluations([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, cycleId, graphqlClient])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  return { evaluations, loading, error, refetch: fetchDetails }
}
