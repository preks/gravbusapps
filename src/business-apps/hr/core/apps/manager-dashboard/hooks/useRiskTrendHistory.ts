/**
 * useRiskTrendHistory Hook
 * Fetches and calculates risk trends from historical risk score data
 */

import { useState, useCallback, useMemo } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { RiskTrend, EmployeeRiskScoreHistory, TeamRiskScoreHistoryQueryResponse } from '../types/flightRisk.types'
import { GET_TEAM_RISK_SCORE_HISTORY } from '../queries/flightRiskQueries'

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
 * Calculate trend from an array of scores (most recent first)
 */
const calculateTrend = (scores: { overallScore: number; calculatedAt: string }[]): RiskTrend => {
  if (scores.length < 2) return 'stable'

  // Take up to 3 most recent and 3 older scores for comparison
  const recentScores = scores.slice(0, Math.min(3, scores.length))
  const olderScores = scores.slice(Math.min(3, scores.length), Math.min(6, scores.length))

  if (olderScores.length === 0) return 'stable'

  const recentAvg = recentScores.reduce((sum, s) => sum + s.overallScore, 0) / recentScores.length
  const olderAvg = olderScores.reduce((sum, s) => sum + s.overallScore, 0) / olderScores.length

  const diff = recentAvg - olderAvg

  // Threshold of 10 points for significant change
  if (diff < -10) return 'improving' // Risk score went down = improving
  if (diff > 10) return 'worsening' // Risk score went up = worsening
  return 'stable'
}

/**
 * Calculate change percentage
 */
const calculateChangePercent = (current: number | undefined, previous: number | undefined): number | undefined => {
  if (current === undefined || previous === undefined || previous === 0) {
    return undefined
  }
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Hook to fetch and calculate risk trends from historical data
 */
export const useRiskTrendHistory = ({
  accessToken,
  employeeIds,
  historyLimit = 6
}: UseRiskTrendHistoryProps): UseRiskTrendHistoryResult => {
  const [trends, setTrends] = useState<Map<string, EmployeeTrendResult>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const fetchTrends = useCallback(async () => {
    if (!accessToken || employeeIds.length === 0) {
      setTrends(new Map())
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await graphQLClient.request<TeamRiskScoreHistoryQueryResponse>(GET_TEAM_RISK_SCORE_HISTORY, {
        employeeIds,
        limit: historyLimit
      })

      const newTrends = new Map<string, EmployeeTrendResult>()

      if (response.teamRiskScoreHistory) {
        response.teamRiskScoreHistory.forEach((history: EmployeeRiskScoreHistory) => {
          const scores = history.scores || []
          const trend = calculateTrend(scores)

          const result: EmployeeTrendResult = {
            employeeId: history.employeeId,
            trend,
            currentScore: scores[0]?.overallScore,
            previousScore: scores.length > 1 ? scores[scores.length - 1]?.overallScore : undefined,
            changePercent: calculateChangePercent(
              scores[0]?.overallScore,
              scores.length > 1 ? scores[scores.length - 1]?.overallScore : undefined
            ),
            dataPoints: scores.length
          }

          newTrends.set(history.employeeId, result)
        })
      }

      setTrends(newTrends)
    } catch (err) {
      // Graceful fallback - if the backend API is not available yet, just return stable trends
      console.warn('Risk trend history not available:', err)
      setError(null) // Don't show error to user as this is expected during rollout

      // Create default stable trends for all employees
      const defaultTrends = new Map<string, EmployeeTrendResult>()
      employeeIds.forEach(id => {
        defaultTrends.set(id, {
          employeeId: id,
          trend: 'stable',
          dataPoints: 0
        })
      })
      setTrends(defaultTrends)
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeIds, historyLimit, graphQLClient])

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
      loading,
      error,
      fetchTrends,
      getTrend
    }),
    [trends, loading, error, fetchTrends, getTrend]
  )
}

export default useRiskTrendHistory
