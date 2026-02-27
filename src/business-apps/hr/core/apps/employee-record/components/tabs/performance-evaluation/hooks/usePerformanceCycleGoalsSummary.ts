import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { employeePerformanceQuery } from '@/business-apps/hr/core/apps/employee-record/queries/performanceQueries'
import { PerformanceCycleOverview } from '../types/performanceEvaluation.types'
import {
  computePerformanceGoalsSummary,
  emptyPerformanceGoalsSummary,
  PerformanceGoalSummaryItem,
  PerformanceGoalsSummary
} from '../utils/performanceGoalsSummary'

interface UsePerformanceCycleGoalsSummaryParams {
  accessToken: string
  employeeId?: string
  activeCycle?: PerformanceCycleOverview
}

interface UsePerformanceCycleGoalsSummaryResult {
  summary: PerformanceGoalsSummary
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface EmployeePerformanceQueryResponse {
  EmployeePerformanceGoal?: PerformanceGoalSummaryItem[]
}

export const usePerformanceCycleGoalsSummary = ({
  accessToken,
  employeeId,
  activeCycle
}: UsePerformanceCycleGoalsSummaryParams): UsePerformanceCycleGoalsSummaryResult => {
  const graphQLClient = useGraphqlClient(accessToken)
  const [goals, setGoals] = useState<PerformanceGoalSummaryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    if (!employeeId) {
      setGoals([])
      setError(null)
      return
    }

    if (!accessToken) {
      console.error('Access token missing')
      setGoals([])
      setError('Access token missing')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = (await graphQLClient.request(employeePerformanceQuery, {
        employeeId
      })) as EmployeePerformanceQueryResponse
      setGoals(response?.EmployeePerformanceGoal || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load performance goals summary'
      setError(errorMessage)
      setGoals([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId, graphQLClient])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const summary = useMemo(() => {
    if (!activeCycle) return emptyPerformanceGoalsSummary()
    return computePerformanceGoalsSummary(
      goals,
      activeCycle.performanceCycleStartDate,
      activeCycle.performanceCycleEndDate
    )
  }, [goals, activeCycle])

  return {
    summary,
    loading,
    error,
    refetch: fetchGoals
  }
}
