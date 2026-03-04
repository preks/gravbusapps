/**
 * ⚡ PERFORMANCE OPTIMIZED: Dashboard Statistics Hook
 *
 * Uses ONE combined GraphQL query instead of 10 separate queries.
 * Pattern inspired by manager-expenses dashboard.
 *
 * Benefits:
 * - Single network roundtrip instead of ~10
 * - Faster dashboard load
 * - Better user experience
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  GET_COMBINED_DASHBOARD_STATS_MONTHLY,
  GET_COMBINED_DASHBOARD_STATS_QUARTERLY,
  GET_COMBINED_DASHBOARD_STATS_YEARLY
} from '../queries/combinedDashboard.queries'
import { DashboardStats } from '../types'

interface UseDashboardStatsResult {
  stats: DashboardStats
  loading: boolean
  error: Error | null
  refetch: () => void
}

export const useDashboardStats = ({
  accessToken,
  filters = {},
  isActive = true
}: Pick<BusinessAppContextProps, 'accessToken'> & {
  filters?: {
    currency?: string
    department?: string
    period?: string
  }
  isActive?: boolean
}): UseDashboardStatsResult => {
  const [stats, setStats] = useState<DashboardStats>({
    ytdStats: {
      totalAmount: 0,
      count: 0,
      previousTotalAmount: 0,
      previousCount: 0
    },
    actualVsPlanned: {
      actualExpenses: { totalAmount: 0, count: 0 },
      plannedExpenses: { totalAmount: 0, count: 0 }
    },
    monthlyTrends: Array.from({ length: 12 }).map((_, i) => ({
      month: i + 1,
      monthName: new Date(0, i).toLocaleString(getCurrentActiveUserLocale(), { month: 'short' }),
      totalAmount: 0,
      count: 0
    })),
    monthlySpendComparison: {
      currentMonthTotal: 0,
      previousMonthTotal: 0,
      currentMonthCount: 0,
      previousMonthCount: 0,
      percentChange: null, // null indicates undefined ratio when previous period is 0
      isIncrease: false
    },
    transferRequired: 0,
    pendingRequestsCount: 0,
    avgSpendPerTrip: 0,
    travelExpensesCount: 0,
    advancePaymentsApproved: { count: 0, totalAmount: 0 },
    totalCompanySpend: {
      currentPeriodTotal: 0,
      previousPeriodTotal: 0,
      currentPeriodCount: 0,
      previousPeriodCount: 0,
      percentChange: null, // null indicates undefined ratio when previous period is 0
      isIncrease: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Request deduplication using refs
  const lastRequestKey = useRef<string>('')
  const isLoadingRef = useRef<boolean>(false)

  // Use empty string fallback to match manager-expenses pattern (useGetApprovals.ts L62)
  // Dashboard is the default tab, so it loads before accessToken might be ready
  // Guard in fetchEssentialStats prevents requests when accessToken is empty
  const client = useGraphqlClient(accessToken || '')

  // Helper: Calculate date ranges for all periods (reduces cognitive complexity)
  const calculateDateRanges = useCallback(() => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const previousYear = currentYear - 1

    // Year boundaries
    const startOfYearTs = new Date(currentYear, 0, 1).toISOString().replace('Z', '')
    const endOfYearTs = new Date(currentYear, 11, 31, 23, 59, 59).toISOString().replace('Z', '')
    const currentYTD = currentDate.toISOString().replace('Z', '')
    const previousYearStart = new Date(previousYear, 0, 1).toISOString().replace('Z', '')
    const previousYTD = new Date(previousYear, currentDate.getMonth(), currentDate.getDate())
      .toISOString()
      .replace('Z', '')

    // Month boundaries
    const currentMonthStart = new Date(Date.UTC(currentYear, currentDate.getMonth(), 1)).toISOString().replace('Z', '')
    const currentMonthEnd = new Date(Date.UTC(currentYear, currentDate.getMonth() + 1, 1))
      .toISOString()
      .replace('Z', '')
    const previousMonthStart = new Date(currentYear, currentDate.getMonth() - 1, 1).toISOString().replace('Z', '')
    const previousMonthEnd = new Date(currentYear, currentDate.getMonth(), 0, 23, 59, 59).toISOString().replace('Z', '')

    // Quarter boundaries
    const month = currentDate.getMonth()
    const quarter = Math.floor(month / 3)
    const quarterStartMonth = quarter * 3
    const quarterEndMonth = quarterStartMonth + 2
    const quarterStart = new Date(currentYear, quarterStartMonth, 1).toISOString().replace('Z', '')
    const quarterEnd = new Date(currentYear, quarterEndMonth + 1, 0, 23, 59, 59).toISOString().replace('Z', '')

    // Previous quarter
    let previousQuarter = quarter - 1
    let previousQuarterYear = currentYear
    if (previousQuarter < 0) {
      previousQuarter = 3
      previousQuarterYear = currentYear - 1
    }
    const previousQuarterStartMonth = previousQuarter * 3
    const previousQuarterEndMonth = previousQuarterStartMonth + 2
    const previousQuarterStart = new Date(previousQuarterYear, previousQuarterStartMonth, 1)
      .toISOString()
      .replace('Z', '')
    const previousQuarterEnd = new Date(previousQuarterYear, previousQuarterEndMonth + 1, 0, 23, 59, 59)
      .toISOString()
      .replace('Z', '')

    return {
      currentYear,
      startOfYearTs,
      endOfYearTs,
      currentYTD,
      previousYearStart,
      previousYTD,
      currentMonthStart,
      currentMonthEnd,
      previousMonthStart,
      previousMonthEnd,
      quarterStart,
      quarterEnd,
      previousQuarterStart,
      previousQuarterEnd
    }
  }, [])

  // Helper: Execute query based on period (reduces cognitive complexity)
  const executeQueryForPeriod = useCallback(
    async (
      period: string,
      selectedCurrency: string,
      selectedDepartment: string | null,
      dateRanges: ReturnType<typeof calculateDateRanges>
    ) => {
      const hasDepartment = !!selectedDepartment
      let query
      let variables: any

      if (period === 'yearly') {
        query = GET_COMBINED_DASHBOARD_STATS_YEARLY(hasDepartment)
        variables = {
          selectedCurrency,
          currentYearStart: dateRanges.startOfYearTs,
          currentYearEnd: dateRanges.endOfYearTs,
          previousYearStart: new Date(dateRanges.currentYear - 1, 0, 1).toISOString().replace('Z', ''),
          previousYearEnd: new Date(dateRanges.currentYear - 1, 11, 31, 23, 59, 59).toISOString().replace('Z', ''),
          currentYTD: dateRanges.currentYTD,
          previousYTD: dateRanges.previousYTD
        }
      } else if (period === 'quarterly') {
        query = GET_COMBINED_DASHBOARD_STATS_QUARTERLY(hasDepartment)
        variables = {
          selectedCurrency,
          currentQuarterStart: dateRanges.quarterStart,
          currentQuarterEnd: dateRanges.quarterEnd,
          previousQuarterStart: dateRanges.previousQuarterStart,
          previousQuarterEnd: dateRanges.previousQuarterEnd,
          currentYearStart: dateRanges.startOfYearTs,
          currentYTD: dateRanges.currentYTD,
          previousYearStart: dateRanges.previousYearStart,
          previousYTD: dateRanges.previousYTD
        }
      } else {
        // Monthly (default)
        query = GET_COMBINED_DASHBOARD_STATS_MONTHLY(hasDepartment)
        variables = {
          selectedCurrency,
          currentMonthStart: dateRanges.currentMonthStart,
          currentMonthEnd: dateRanges.currentMonthEnd,
          previousMonthStart: dateRanges.previousMonthStart,
          previousMonthEnd: dateRanges.previousMonthEnd,
          currentYearStart: dateRanges.startOfYearTs,
          currentYTD: dateRanges.currentYTD,
          previousYearStart: dateRanges.previousYearStart,
          previousYTD: dateRanges.previousYTD
        }

        // Add 12 months of variables for bulk trends
        for (let i = 0; i < 12; i++) {
          variables[`m${i + 1}Start`] = new Date(Date.UTC(dateRanges.currentYear, i, 1)).toISOString().replace('Z', '')
          variables[`m${i + 1}End`] = new Date(Date.UTC(dateRanges.currentYear, i + 1, 1))
            .toISOString()
            .replace('Z', '')
        }
      }

      if (hasDepartment) {
        variables.selectedDepartment = selectedDepartment
      }

      return await client.request(query, variables)
    },
    [client]
  )

  const fetchEssentialStats = useCallback(async () => {
    // ⚡ CRITICAL: Validate accessToken before ANY requests (prevents 401 errors)
    // Dashboard is default tab, so it loads before accessToken might be available
    if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
      setLoading(false)
      return
    }

    if (!client) {
      setLoading(false)
      return
    }

    // Build stable key for deduplication
    const requestKey = [filters.currency || '', filters.department || '', filters.period || ''].join('|')

    // ⚡ DEDUPLICATION: Only block if same request is already loading
    // This allows refetch() and filter changes to proceed
    if (isLoadingRef.current && requestKey === lastRequestKey.current) {
      return
    }

    lastRequestKey.current = requestKey
    isLoadingRef.current = true

    setLoading(true)
    setError(null)
    const dashboardFetchStartedAt = Date.now()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '92864d' },
      body: JSON.stringify({
        sessionId: '92864d',
        runId: 'pre-fix',
        hypothesisId: 'H8',
        location: 'useDashboardStats.ts:259',
        message: 'dashboard-stats-fetch-start',
        data: {
          period: filters.period || 'monthly',
          hasDepartment: Boolean(filters.department),
          hasCurrency: Boolean(filters.currency),
          requestKey
        },
        timestamp: Date.now()
      })
    }).catch(() => {})
    // #endregion

    try {
      // Calculate all date ranges using extracted helper
      const dateRanges = calculateDateRanges()

      const selectedCurrency = filters.currency && filters.currency.trim() !== '' ? filters.currency : 'Currency:v1:RON'
      const selectedDepartment =
        filters.department && filters.department.trim() !== '' && filters.department !== 'all'
          ? filters.department
          : null

      // ⚡ OPTIMIZATION: Use ONE combined query instead of 10 separate queries
      const combinedResponse = await executeQueryForPeriod(
        filters.period || 'monthly',
        selectedCurrency,
        selectedDepartment,
        dateRanges
      )

      // ⚡ OPTIMIZATION: Monthly trends are now included in combinedResponse (no separate query)
      const monthlyTrendsResponse = Array.from({ length: 12 }, (_, index) => {
        const reqAggKey = `m${index + 1}_req` as keyof typeof combinedResponse
        const itemAggKey = `m${index + 1}_item` as keyof typeof combinedResponse
        return {
          reqAgg: combinedResponse[reqAggKey],
          itemAgg: combinedResponse[itemAggKey]
        } as any
      })

      // Process combined response into dashboard stats
      const processedStats: DashboardStats = {
        ytdStats: {
          totalAmount: combinedResponse?.currentYearExpenses?.aggregate?.sum?.reimbursableAmount || 0,
          count: combinedResponse?.currentYearExpenses?.aggregate?.count || 0,
          previousTotalAmount: combinedResponse?.previousYearExpenses?.aggregate?.sum?.reimbursableAmount || 0,
          previousCount: combinedResponse?.previousYearExpenses?.aggregate?.count || 0
        },
        monthlyTrends: monthlyTrendsResponse.map((response: any, index: number) => ({
          month: index + 1,
          monthName: new Date(dateRanges.currentYear, index).toLocaleString('default', { month: 'short' }),
          totalAmount:
            (response?.reqAgg?.aggregate?.sum?.totalAmount || 0) +
            (response?.itemAgg?.aggregate?.sum?.reimbursableAmount || 0),
          count: (response?.reqAgg?.aggregate?.count || 0) + (response?.itemAgg?.aggregate?.count || 0)
        })),
        monthlySpendComparison: {
          currentMonthTotal:
            combinedResponse?.currentMonthExpenses?.aggregate?.sum?.reimbursableAmount ||
            combinedResponse?.currentYearExpensesComparison?.aggregate?.sum?.reimbursableAmount ||
            combinedResponse?.currentQuarterExpenses?.aggregate?.sum?.reimbursableAmount ||
            0,
          previousMonthTotal:
            combinedResponse?.previousMonthExpenses?.aggregate?.sum?.reimbursableAmount ||
            combinedResponse?.previousYearExpensesComparison?.aggregate?.sum?.reimbursableAmount ||
            combinedResponse?.previousQuarterExpenses?.aggregate?.sum?.reimbursableAmount ||
            0,
          currentMonthCount:
            combinedResponse?.currentMonthExpenses?.aggregate?.count ||
            combinedResponse?.currentYearExpensesComparison?.aggregate?.count ||
            combinedResponse?.currentQuarterExpenses?.aggregate?.count ||
            0,
          previousMonthCount:
            combinedResponse?.previousMonthExpenses?.aggregate?.count ||
            combinedResponse?.previousYearExpensesComparison?.aggregate?.count ||
            combinedResponse?.previousQuarterExpenses?.aggregate?.count ||
            0,
          percentChange: null, // Will be calculated below (null if division by zero)
          isIncrease: false
        },
        transferRequired: combinedResponse?.transferRequired?.aggregate?.sum?.totalAmount || 0,
        pendingRequestsCount: combinedResponse?.pendingRequests?.aggregate?.count || 0,
        avgSpendPerTrip: combinedResponse?.avgSpendPerTrip?.aggregate?.avg?.totalAmount || 0,
        travelExpensesCount: 0, // Not available in current query
        advancePaymentsApproved: {
          count: combinedResponse?.advancePaymentsApproved?.aggregate?.count || 0,
          totalAmount: combinedResponse?.advancePaymentsApproved?.aggregate?.sum?.amount || 0
        },
        totalCompanySpend: {
          currentPeriodTotal:
            combinedResponse?.currentMonthExpenses?.aggregate?.sum?.reimbursableAmount ||
            combinedResponse?.currentYearExpensesComparison?.aggregate?.sum?.reimbursableAmount ||
            combinedResponse?.currentQuarterExpenses?.aggregate?.sum?.reimbursableAmount ||
            0,
          previousPeriodTotal:
            combinedResponse?.previousMonthExpenses?.aggregate?.sum?.reimbursableAmount ||
            combinedResponse?.previousYearExpensesComparison?.aggregate?.sum?.reimbursableAmount ||
            combinedResponse?.previousQuarterExpenses?.aggregate?.sum?.reimbursableAmount ||
            0,
          currentPeriodCount:
            combinedResponse?.currentMonthExpenses?.aggregate?.count ||
            combinedResponse?.currentYearExpensesComparison?.aggregate?.count ||
            combinedResponse?.currentQuarterExpenses?.aggregate?.count ||
            0,
          previousPeriodCount:
            combinedResponse?.previousMonthExpenses?.aggregate?.count ||
            combinedResponse?.previousYearExpensesComparison?.aggregate?.count ||
            combinedResponse?.previousQuarterExpenses?.aggregate?.count ||
            0,
          percentChange: null, // Will be calculated below (null if division by zero)
          isIncrease: false
        },
        actualVsPlanned: {
          actualExpenses: {
            totalAmount: combinedResponse?.actualExpenses?.aggregate?.sum?.reimbursableAmount || 0,
            count: combinedResponse?.actualExpenses?.aggregate?.count || 0
          },
          plannedExpenses: {
            totalAmount: combinedResponse?.plannedExpenses?.aggregate?.sum?.totalAmount || 0,
            count: combinedResponse?.plannedExpenses?.aggregate?.count || 0
          }
        }
      }

      // Calculate percentages - if previous period is 0, ratio is undefined (division by zero)
      const currentTotal = processedStats.monthlySpendComparison.currentMonthTotal
      const previousTotal = processedStats.monthlySpendComparison.previousMonthTotal
      if (previousTotal > 0) {
        processedStats.monthlySpendComparison.percentChange = ((currentTotal - previousTotal) / previousTotal) * 100
        processedStats.monthlySpendComparison.isIncrease = currentTotal > previousTotal
      } else {
        // When previous total is 0, the percentage change is undefined
        processedStats.monthlySpendComparison.percentChange = null as any // null indicates undefined ratio
      }

      const currentCompanyTotal = processedStats.totalCompanySpend.currentPeriodTotal
      const previousCompanyTotal = processedStats.totalCompanySpend.previousPeriodTotal
      if (previousCompanyTotal > 0) {
        processedStats.totalCompanySpend.percentChange =
          ((currentCompanyTotal - previousCompanyTotal) / previousCompanyTotal) * 100
        processedStats.totalCompanySpend.isIncrease = currentCompanyTotal > previousCompanyTotal
      } else {
        // When previous total is 0, the percentage change is undefined
        processedStats.totalCompanySpend.percentChange = null as any // null indicates undefined ratio
      }

      setStats(processedStats)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '92864d' },
        body: JSON.stringify({
          sessionId: '92864d',
          runId: 'pre-fix',
          hypothesisId: 'H8',
          location: 'useDashboardStats.ts:397',
          message: 'dashboard-stats-fetch-success',
          data: {
            durationMs: Date.now() - dashboardFetchStartedAt,
            monthlyTrendsCount: processedStats.monthlyTrends.length,
            pendingRequestsCount: processedStats.pendingRequestsCount
          },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard stats'))
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ed611493-841a-49f3-bdb3-51459a47d6c7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '92864d' },
        body: JSON.stringify({
          sessionId: '92864d',
          runId: 'pre-fix',
          hypothesisId: 'H8',
          location: 'useDashboardStats.ts:405',
          message: 'dashboard-stats-fetch-error',
          data: {
            durationMs: Date.now() - dashboardFetchStartedAt,
            errorMessage: err instanceof Error ? err.message : 'unknown'
          },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
    // Note: executeQueryForPeriod is async but stable (wrapped in useCallback)
    // React dependency arrays need the function reference, not its return value
  }, [
    accessToken,
    client,
    filters.currency,
    filters.period,
    filters.department,
    calculateDateRanges,
    executeQueryForPeriod
  ])

  useEffect(() => {
    // ⚡ CRITICAL: Only fetch when tab is active AND accessToken is valid
    // Prevents 401 errors when component mounts before auth is ready
    if (isActive && accessToken && accessToken.trim() !== '') {
      void fetchEssentialStats()
    }
  }, [fetchEssentialStats, isActive, accessToken])

  return { stats, loading, error, refetch: fetchEssentialStats }
}

export default useDashboardStats
