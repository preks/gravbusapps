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

    // QTD year-over-year: same quarter last year, same relative day
    const currentQTD = currentDate.toISOString().replace('Z', '')
    const sameQuarterLastYearStart = new Date(previousYear, quarterStartMonth, 1).toISOString().replace('Z', '')
    const sameQuarterLastYearEnd = new Date(previousYear, quarterEndMonth + 1, 0, 23, 59, 59)
      .toISOString()
      .replace('Z', '')
    const monthInQuarter = month - quarterStartMonth
    const previousQTD = new Date(
      previousYear,
      quarterStartMonth + monthInQuarter,
      currentDate.getDate(),
      currentDate.getHours(),
      currentDate.getMinutes(),
      currentDate.getSeconds()
    )
      .toISOString()
      .replace('Z', '')

    // Same month last year (for monthly YoY first card)
    const sameMonthLastYearStart = new Date(previousYear, currentDate.getMonth(), 1).toISOString().replace('Z', '')
    const sameMonthLastYearEnd = new Date(previousYear, currentDate.getMonth() + 1, 1).toISOString().replace('Z', '')

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
      sameMonthLastYearStart,
      sameMonthLastYearEnd,
      quarterStart,
      quarterEnd,
      previousQuarterStart,
      previousQuarterEnd,
      currentQTD,
      sameQuarterLastYearStart,
      sameQuarterLastYearEnd,
      previousQTD
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

      const addMonthTrendVars = (vars: any) => {
        for (let i = 0; i < 12; i++) {
          vars[`m${i + 1}Start`] = new Date(Date.UTC(dateRanges.currentYear, i, 1)).toISOString().replace('Z', '')
          vars[`m${i + 1}End`] = new Date(Date.UTC(dateRanges.currentYear, i + 1, 1)).toISOString().replace('Z', '')
        }
      }

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
          currentQTD: dateRanges.currentQTD,
          sameQuarterLastYearStart: dateRanges.sameQuarterLastYearStart,
          previousQTD: dateRanges.previousQTD,
          currentYearStart: dateRanges.startOfYearTs,
          currentYTD: dateRanges.currentYTD,
          previousYearStart: dateRanges.previousYearStart,
          previousYTD: dateRanges.previousYTD
        }
      } else {
        query = GET_COMBINED_DASHBOARD_STATS_MONTHLY(hasDepartment)
        variables = {
          selectedCurrency,
          currentMonthStart: dateRanges.currentMonthStart,
          currentMonthEnd: dateRanges.currentMonthEnd,
          previousMonthStart: dateRanges.previousMonthStart,
          previousMonthEnd: dateRanges.previousMonthEnd,
          sameMonthLastYearStart: dateRanges.sameMonthLastYearStart,
          sameMonthLastYearEnd: dateRanges.sameMonthLastYearEnd,
          currentYearStart: dateRanges.startOfYearTs,
          currentYTD: dateRanges.currentYTD,
          previousYearStart: dateRanges.previousYearStart,
          previousYTD: dateRanges.previousYTD
        }
      }

      addMonthTrendVars(variables)

      if (hasDepartment) {
        variables.selectedDepartment = selectedDepartment
      }

      return await client.request(query, variables)
    },
    [client]
  )

  const calculatePercentChange = useCallback((currentValue: number, previousValue: number) => {
    if (previousValue > 0) {
      return {
        percentChange: ((currentValue - previousValue) / previousValue) * 100,
        isIncrease: currentValue > previousValue
      }
    }
    return {
      percentChange: null as any,
      isIncrease: false
    }
  }, [])

  const fetchEssentialStats = useCallback(async () => {
    const hasValidAccessToken = Boolean(accessToken && typeof accessToken === 'string' && accessToken.trim() !== '')
    if (!hasValidAccessToken || !client) {
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

    try {
      // Calculate all date ranges using extracted helper
      const dateRanges = calculateDateRanges()

      const selectedCurrency = filters.currency && filters.currency.trim() !== '' ? filters.currency : 'Currency:v1:EUR'
      const selectedDepartment = filters.department?.trim() && filters.department !== 'all' ? filters.department : null

      // ⚡ OPTIMIZATION: Use ONE combined query instead of 10 separate queries
      const activePeriod = filters.period || 'yearly'
      const combinedResponse = await executeQueryForPeriod(
        activePeriod,
        selectedCurrency,
        selectedDepartment,
        dateRanges
      )

      // ⚡ OPTIMIZATION: Monthly trends are now included in combinedResponse (no separate query)
      const monthlyTrendsResponse = Array.from({ length: 12 }, (_, index) => {
        const itemAggKey = `m${index + 1}_item` as keyof typeof combinedResponse
        return {
          itemAgg: combinedResponse[itemAggKey]
        } as any
      })

      const safeNum = (val: any): number => val ?? 0

      const getPeriodAgg = (current: boolean) => {
        if (activePeriod === 'yearly') {
          return current ? combinedResponse?.currentYearExpenses : combinedResponse?.previousYearExpenses
        }
        if (activePeriod === 'quarterly') {
          return current ? combinedResponse?.currentQTDExpenses : combinedResponse?.previousQTDExpenses
        }
        return current ? combinedResponse?.currentMonthExpenses : combinedResponse?.sameMonthLastYearExpenses
      }

      const getComparisonAgg = (current: boolean) => {
        if (activePeriod === 'yearly') {
          return current
            ? combinedResponse?.currentYearExpensesComparison
            : combinedResponse?.previousYearExpensesComparison
        }
        if (activePeriod === 'quarterly') {
          return current ? combinedResponse?.currentQuarterExpenses : combinedResponse?.previousQuarterExpenses
        }
        return current ? combinedResponse?.currentMonthExpenses : combinedResponse?.previousMonthExpenses
      }

      const currentPeriodAgg = getPeriodAgg(true)
      const previousPeriodAgg = getPeriodAgg(false)
      const currentComparisonAgg = getComparisonAgg(true)
      const previousComparisonAgg = getComparisonAgg(false)

      // Process combined response into dashboard stats
      const processedStats: DashboardStats = {
        ytdStats: {
          totalAmount: safeNum(combinedResponse?.currentYearExpenses?.aggregate?.sum?.reimbursableAmount),
          count: safeNum(combinedResponse?.currentYearExpenses?.aggregate?.count),
          previousTotalAmount: safeNum(combinedResponse?.previousYearExpenses?.aggregate?.sum?.reimbursableAmount),
          previousCount: safeNum(combinedResponse?.previousYearExpenses?.aggregate?.count)
        },
        monthlyTrends: monthlyTrendsResponse.map((response: any, index: number) => ({
          month: index + 1,
          monthName: new Date(dateRanges.currentYear, index).toLocaleString('default', { month: 'short' }),
          totalAmount: safeNum(response?.itemAgg?.aggregate?.sum?.reimbursableAmount),
          count: safeNum(response?.itemAgg?.aggregate?.count)
        })),
        monthlySpendComparison: {
          currentMonthTotal: safeNum(currentComparisonAgg?.aggregate?.sum?.reimbursableAmount),
          previousMonthTotal: safeNum(previousComparisonAgg?.aggregate?.sum?.reimbursableAmount),
          currentMonthCount: safeNum(currentComparisonAgg?.aggregate?.count),
          previousMonthCount: safeNum(previousComparisonAgg?.aggregate?.count),
          percentChange: null,
          isIncrease: false
        },
        transferRequired: safeNum(combinedResponse?.transferRequired?.aggregate?.sum?.totalAmount),
        pendingRequestsCount: safeNum(combinedResponse?.pendingRequests?.aggregate?.count),
        avgSpendPerTrip: safeNum(combinedResponse?.avgSpendPerTrip?.aggregate?.avg?.totalAmount),
        travelExpensesCount: 0,
        advancePaymentsApproved: {
          count: safeNum(combinedResponse?.advancePaymentsApproved?.aggregate?.count),
          totalAmount: safeNum(combinedResponse?.advancePaymentsApproved?.aggregate?.sum?.amount)
        },
        totalCompanySpend: {
          currentPeriodTotal: safeNum(currentPeriodAgg?.aggregate?.sum?.reimbursableAmount),
          previousPeriodTotal: safeNum(previousPeriodAgg?.aggregate?.sum?.reimbursableAmount),
          currentPeriodCount: safeNum(currentPeriodAgg?.aggregate?.count),
          previousPeriodCount: safeNum(previousPeriodAgg?.aggregate?.count),
          percentChange: null,
          isIncrease: false
        },
        actualVsPlanned: {
          actualExpenses: {
            totalAmount: safeNum(combinedResponse?.actualExpenses?.aggregate?.sum?.reimbursableAmount),
            count: safeNum(combinedResponse?.actualExpenses?.aggregate?.count)
          },
          plannedExpenses: {
            totalAmount: safeNum(combinedResponse?.plannedExpenses?.aggregate?.sum?.totalAmount),
            count: safeNum(combinedResponse?.plannedExpenses?.aggregate?.count)
          }
        }
      }

      const monthlyChange = calculatePercentChange(
        processedStats.monthlySpendComparison.currentMonthTotal,
        processedStats.monthlySpendComparison.previousMonthTotal
      )
      processedStats.monthlySpendComparison.percentChange = monthlyChange.percentChange
      processedStats.monthlySpendComparison.isIncrease = monthlyChange.isIncrease

      const companyChange = calculatePercentChange(
        processedStats.totalCompanySpend.currentPeriodTotal,
        processedStats.totalCompanySpend.previousPeriodTotal
      )
      processedStats.totalCompanySpend.percentChange = companyChange.percentChange
      processedStats.totalCompanySpend.isIncrease = companyChange.isIncrease

      setStats(processedStats)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard stats'))
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
    executeQueryForPeriod,
    calculatePercentChange
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
