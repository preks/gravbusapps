import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getTurnoverMetricsQuery } from '../queries/getTurnoverMetrics'
import dayjs from 'dayjs'
import { formatDate } from '@/common/utils/windowUtils'

/**
 * GraphQL response type for combined turnover metrics
 */
interface TurnoverMetricsResponse {
  currentTerminations: { aggregate: { count: number } }
  previousTerminations: { aggregate: { count: number } }
  currentHeadcount: { aggregate: { count: number } }
  previousHeadcount: { aggregate: { count: number } }
  currentHeadcountStart: { aggregate: { count: number } }
  previousHeadcountStart: { aggregate: { count: number } }
}

/**
 * Hook to calculate the turnover rate for the current month and MoM change.
 * - Numerator: terminations (distinct employees) within period
 * - Denominator: average headcount over the period = (start + end) / 2
 */
export const useTurnoverRate = (accessToken: string) => {
  // Define all hooks at the top level to ensure consistent order
  const [rate, setRate] = useState<number>(0)
  const [terminatedCount, setTerminatedCount] = useState<number>(0)
  const [change, setChange] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Get GraphQL client using the project's pattern
  const graphQLClient = useGraphqlClient(accessToken)

  /**
   * Get date ranges for current full month and previous full month
   */
  const getCurrentAndPreviousMonthRanges = useCallback(() => {
    const now = dayjs()
    const currentStart = formatDate(now.startOf('month').toDate(), 'fullDateTime.ISO') as string
    const currentEnd = formatDate(now.endOf('month').toDate(), 'fullDateTime.ISO') as string

    const prev = now.subtract(1, 'month')
    const previousStart = formatDate(prev.startOf('month').toDate(), 'fullDateTime.ISO') as string
    const previousEnd = formatDate(prev.endOf('month').toDate(), 'fullDateTime.ISO') as string

    return {
      current: { startDate: currentStart, endDate: currentEnd },
      previous: { startDate: previousStart, endDate: previousEnd }
    }
  }, [])

  const calculateTurnoverRate = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      const { current, previous } = getCurrentAndPreviousMonthRanges()

      // Cutoffs for end-of-month denominators
      const currentCutoff = formatDate(dayjs().endOf('month').toDate(), 'fullDateTime.ISO') as string
      const prevCutoff = previous.endDate

      // Single combined call
      const metrics = await graphQLClient.request<TurnoverMetricsResponse>(getTurnoverMetricsQuery, {
        currentStart: current.startDate,
        currentEnd: current.endDate,
        previousStart: previous.startDate,
        previousEnd: previous.endDate,
        currentCutoff: currentCutoff,
        previousCutoff: prevCutoff
      })

      const currentTerminated = Number(metrics?.currentTerminations?.aggregate?.count ?? 0)
      const previousTerminated = Number(metrics?.previousTerminations?.aggregate?.count ?? 0)
      const currentEndTotal = Number(metrics?.currentHeadcount?.aggregate?.count ?? 0)
      const previousEndTotal = Number(metrics?.previousHeadcount?.aggregate?.count ?? 0)
      const currentStartTotal = Number(metrics?.currentHeadcountStart?.aggregate?.count ?? 0)
      const previousStartTotal = Number(metrics?.previousHeadcountStart?.aggregate?.count ?? 0)

      // Average denominators
      const currentAvg = (currentStartTotal + currentEndTotal) / 2
      const previousAvg = (previousStartTotal + previousEndTotal) / 2

      const currentRate = currentAvg > 0 ? (currentTerminated / currentAvg) * 100 : 0
      const previousRate = previousAvg > 0 ? (previousTerminated / previousAvg) * 100 : 0

      const roundedCurrent = Math.round(currentRate * 10) / 10
      const roundedPrevious = Math.round(previousRate * 10) / 10
      const changeValue = Math.round((roundedCurrent - roundedPrevious) * 10) / 10

      if (isMounted.current) {
        setTerminatedCount(currentTerminated)
        setRate(roundedCurrent)
        setChange(changeValue)
        setError(null)
      }
    } catch (err) {
      console.error('[useTurnoverRate] Error calculating turnover rate:', err)
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to calculate turnover rate'))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, graphQLClient, getCurrentAndPreviousMonthRanges])

  useEffect(() => {
    isMounted.current = true
    calculateTurnoverRate()
    return () => {
      isMounted.current = false
    }
  }, [calculateTurnoverRate])

  const refetch = useCallback(() => {
    calculateTurnoverRate()
  }, [calculateTurnoverRate])

  return { rate, terminatedCount, change, loading, error, refetch }
}
