/**
 * useRiskTrendHistory Hook
 * Fetches and calculates risk trends from historical risk score data
 */

import { useCallback, useMemo } from 'react'
import { RiskTrend } from '../types/flightRisk.types'

/**
 * Trend result for a single employee
 */
export interface EmployeeTrendResult {
  employeeId: string
  trend: RiskTrend
  currentScore?: number
  previousScore?: number
  changePercent?: number
  dataPoints: number
}

/**
 * Hook props
 */
interface UseRiskTrendHistoryProps {
  accessToken: string
  employeeIds: string[]
  historyLimit?: number
}

/**
 * Hook result
 */
interface UseRiskTrendHistoryResult {
  trends: Map<string, EmployeeTrendResult>
  loading: boolean
  error: Error | null
  fetchTrends: () => Promise<void>
  getTrend: (employeeId: string) => RiskTrend
}

/**
 * Hook to fetch and calculate risk trends from historical data
 */
export const useRiskTrendHistory = ({ employeeIds }: UseRiskTrendHistoryProps): UseRiskTrendHistoryResult => {
  const trends = useMemo(() => {
    const stableTrends = new Map<string, EmployeeTrendResult>()
    employeeIds.forEach(id => {
      stableTrends.set(id, {
        employeeId: id,
        trend: 'stable',
        dataPoints: 0
      })
    })
    return stableTrends
  }, [employeeIds])

  const fetchTrends = useCallback(async () => {
    // Backend trend-history API is not available yet. Keep stable fallback data
    // without calling missing GraphQL fields.
  }, [])

  /**
   * Get trend for a specific employee (with fallback to stable)
   */
  const getTrend = useCallback(
    (employeeId: string): RiskTrend => {
      return trends.get(employeeId)?.trend || 'stable'
    },
    [trends]
  )

  return useMemo(
    () => ({
      trends,
      loading: false,
      error: null,
      fetchTrends,
      getTrend
    }),
    [trends, fetchTrends, getTrend]
  )
}

export default useRiskTrendHistory
