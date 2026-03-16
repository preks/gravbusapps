import { useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import {
  buildMonthlyExpenseStatisticsQuery,
  generateYearlyExpenseStatisticsQuery,
  generateQuarterlyExpenseStatisticsQuery,
  QueryWithVariables
} from '../queries/getStatisticsByPeriod'
import { useLoadingErrorDataState } from './useLoadingErrorDataState'
import { PeriodStatisticsHookParams } from './statisticsHookParams'

// Initialize dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
dayjs.extend(quarterOfYear)

// Helper: Convert unknown error to Error instance
const ensureError = (err: unknown): Error => {
  return err instanceof Error ? err : new Error('Unknown error occurred')
}

export interface PeriodStatisticsData {
  expensePlanTotal: number
  expenseRequestTotal: number
  // Add monthly data arrays for year period
  monthlyData?: Array<{
    month: string
    expensePlanTotal: number
    expenseRequestTotal: number
  }>
}

// Helper: Calculate date range based on period (reduces cognitive complexity)
interface DateRange {
  startDate: string
  endDate: string
  currentQuarter?: number
}

const extractMonthTotals = (response: Record<string, any>, month: number) => {
  return {
    monthPlanTotal: response[`plan_month_${month}`]?.aggregate?.sum?.totalAmount || 0,
    monthRequestTotal: response[`request_month_${month}`]?.aggregate?.sum?.reimbursableAmount || 0
  }
}

const calculateDateRange = (period: 'month' | 'quarter' | 'year'): DateRange => {
  const now = dayjs()

  switch (period) {
    case 'month':
      return {
        startDate: now.startOf('month').format('YYYY-MM-DDT00:00:00'),
        endDate: now.endOf('month').format('YYYY-MM-DDT23:59:59')
      }

    case 'quarter': {
      const currentMonth = now.month()
      const currentQuarter = Math.floor(currentMonth / 3) + 1
      const quarterStartMonth = (currentQuarter - 1) * 3
      const startDate = now.month(quarterStartMonth).startOf('month').format('YYYY-MM-DDT00:00:00')
      const endDate = now
        .month(quarterStartMonth + 2)
        .endOf('month')
        .format('YYYY-MM-DDT23:59:59')

      return { startDate, endDate, currentQuarter }
    }

    case 'year':
      return {
        startDate: now.startOf('year').format('YYYY-MM-DDT00:00:00'),
        endDate: now.endOf('year').format('YYYY-MM-DDT23:59:59')
      }
  }
}

/**
 * Hook to fetch expense statistics based on selected period
 * @param accessToken - Authentication token
 * @param period - Selected period ('month', 'quarter', 'year')
 * @returns Statistics data for the selected period
 */
export const useStatisticsByPeriod = ({
  accessToken,
  period,
  currencyRef,
  selectedDepartment,
  isActive = true // ⚡ PERFORMANCE: Only fetch when active
}: PeriodStatisticsHookParams) => {
  const { loading, setLoading, error, setError, data, setData } = useLoadingErrorDataState<PeriodStatisticsData>({
    expensePlanTotal: 0,
    expenseRequestTotal: 0
  })

  const client = useGraphQLClient(accessToken)

  useEffect(() => {
    let isMounted = true

    // Helper: Fetch month statistics (reduces cognitive complexity)
    const fetchMonthStatistics = async (startDate: string, endDate: string) => {
      const includeDepartment = Boolean(selectedDepartment)
      const monthlyQuery = buildMonthlyExpenseStatisticsQuery(includeDepartment)
      const response = await client.request(monthlyQuery, {
        startDate,
        endDate,
        currency: currencyRef || 'Currency:v1:EUR',
        ...(includeDepartment ? { selectedDepartment } : {})
      })

      if (!isMounted) return

      setData({
        expensePlanTotal: response?.planTotal?.aggregate?.sum?.totalAmount || 0,
        expenseRequestTotal: response?.requestTotal?.aggregate?.sum?.reimbursableAmount || 0
      })
    }

    const fetchStatisticsByPeriod = async () => {
      // Early returns for invalid states
      if (!client || !accessToken) {
        if (isMounted) setLoading(false)
        return
      }

      // ⚡ PERFORMANCE: Skip fetch if tab is inactive
      if (!isActive) {
        if (isMounted) setLoading(false)
        return
      }

      try {
        if (isMounted) {
          setLoading(true)
          setError(null)
        }

        // Get date range using extracted helper
        const dateRange = calculateDateRange(period)

        // Fetch appropriate data based on period
        if (period === 'year') {
          await fetchMonthlyBreakdownForYear()
        } else if (period === 'quarter') {
          await fetchMonthlyBreakdownForQuarter(dateRange.currentQuarter!)
        } else {
          await fetchMonthStatistics(dateRange.startDate, dateRange.endDate)
        }
      } catch (err) {
        if (!isMounted) return

        console.error(`Error fetching ${period} statistics:`, err)
        setError(ensureError(err))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const fetchMonthlyBreakdownForYear = async () => {
      try {
        const year = dayjs().year()
        const currentMonth = dayjs().month() // 0-indexed (0 = January, 11 = December)

        // Use the extracted query generator - now returns QueryWithVariables
        const includeDepartment = Boolean(selectedDepartment)
        const { query: yearlyQuery, variables: dateVariables }: QueryWithVariables =
          generateYearlyExpenseStatisticsQuery(currentMonth, year, includeDepartment)

        // Execute the consolidated query with date variables
        const response = await client.request(yearlyQuery, {
          currency: currencyRef ?? 'Currency:v1:EUR',
          ...(includeDepartment ? { selectedDepartment } : {}),
          ...dateVariables // ✅ Include computed date range variables
        })

        // Process the results
        const monthlyDataArray = []
        let yearTotalPlan = 0
        let yearTotalRequest = 0

        // Only process months up to the current month
        for (let month = 0; month <= currentMonth; month++) {
          const monthDate = dayjs().year(year).month(month)
          const monthName = monthDate.format('MMM') // Short month name

          const { monthPlanTotal, monthRequestTotal } = extractMonthTotals(response, month)

          yearTotalPlan += monthPlanTotal
          yearTotalRequest += monthRequestTotal

          monthlyDataArray.push({
            month: monthName,
            expensePlanTotal: monthPlanTotal,
            expenseRequestTotal: monthRequestTotal
          })
        }

        // Update state with the aggregated data
        if (!isMounted) return

        setData({
          expensePlanTotal: yearTotalPlan,
          expenseRequestTotal: yearTotalRequest,
          monthlyData: monthlyDataArray
        })
      } catch (err) {
        if (!isMounted) return

        console.error('Error fetching yearly statistics:', err)
        setError(ensureError(err))
        if (isMounted) setLoading(false)
      }
    }

    // Helper function to fetch monthly breakdown data for quarter period
    const fetchMonthlyBreakdownForQuarter = async (quarterNumber: number) => {
      try {
        const startMonth = (quarterNumber - 1) * 3
        const endMonth = startMonth + 2

        // Get the current year
        const year = dayjs().year()

        // Use the extracted query generator - now returns QueryWithVariables
        const includeDepartment = Boolean(selectedDepartment)
        const { query: quarterlyQuery, variables: dateVariables }: QueryWithVariables =
          generateQuarterlyExpenseStatisticsQuery(startMonth, endMonth, year, includeDepartment)

        // Execute the consolidated query with date variables
        const response = await client.request(quarterlyQuery, {
          currency: currencyRef ?? 'Currency:v1:EUR',
          ...(includeDepartment ? { selectedDepartment } : {}),
          ...dateVariables // ✅ Include computed date range variables
        })

        // Process the results
        const monthlyDataArray = []
        let quarterTotalPlan = 0
        let quarterTotalRequest = 0

        for (let month = startMonth; month <= endMonth; month++) {
          const monthDate = dayjs().year(year).month(month)
          const monthName = monthDate.format('MMM') // Short month name

          const { monthPlanTotal, monthRequestTotal } = extractMonthTotals(response, month)

          quarterTotalPlan += monthPlanTotal
          quarterTotalRequest += monthRequestTotal

          monthlyDataArray.push({
            month: monthName,
            expensePlanTotal: monthPlanTotal,
            expenseRequestTotal: monthRequestTotal
          })
        }

        // Update state with the aggregated data
        if (!isMounted) return

        setData({
          expensePlanTotal: quarterTotalPlan,
          expenseRequestTotal: quarterTotalRequest,
          monthlyData: monthlyDataArray
        })
      } catch (err) {
        if (!isMounted) return

        console.error('Error fetching quarterly statistics:', err)
        setError(ensureError(err))
        if (isMounted) setLoading(false)
      }
    }

    fetchStatisticsByPeriod()

    return () => {
      isMounted = false
    }
  }, [client, accessToken, period, currencyRef, selectedDepartment, isActive])

  return {
    loading,
    error,
    data
  }
}

export default useStatisticsByPeriod
