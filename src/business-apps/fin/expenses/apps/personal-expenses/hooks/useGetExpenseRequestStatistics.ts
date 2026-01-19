import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_EXPENSE_REQUEST_STATISTICS_CONSOLIDATED } from '../queries/expenseRequests'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ExpenseRequestStatisticsData {
  currentMonthTotal: number
  previousMonthTotal: number
  currentMonthAmount: number
  previousMonthAmount: number
  pendingApproval: number
  reimbursableAmount: number
}

export interface ExpenseRequestStatisticsDataView {
  statistics: ExpenseRequestStatisticsData
  isLoading: boolean
  error: string | null
  fetchStatistics: () => Promise<void>
}

export const useGetExpenseRequestStatistics = (
  context?: BusinessAppContextProps,
  currencyRef: string = 'Currency:v1:EUR'
): ExpenseRequestStatisticsDataView => {
  const accessToken = context?.accessToken
  const employeeId = context?.userInfo?.employeeDetails?.employeeId
  const graphqlClient = useGraphQLClient(accessToken || '')
  const [statistics, setStatistics] = useState<ExpenseRequestStatisticsData>({
    currentMonthTotal: 0,
    previousMonthTotal: 0,
    currentMonthAmount: 0,
    previousMonthAmount: 0,
    pendingApproval: 0,
    reimbursableAmount: 0
  })
  // Start in "not loading" state; we only show skeletons while an actual request is in flight.
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStatistics = useCallback(async () => {
    if (!employeeId || !accessToken) {
      setError(new Error('Employee ID or Access Token not found.'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = dayjs()
      // Use timestamp format for requestDate queries (no timezone)
      const currentMonthStart = now.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const currentMonthEnd = now.endOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previousMonthStart = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previousMonthEnd = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD HH:mm:ss')

      const data = await graphqlClient.request<any>(GET_EXPENSE_REQUEST_STATISTICS_CONSOLIDATED, {
        employeeId,
        currentStart: currentMonthStart,
        currentEnd: currentMonthEnd,
        previousStart: previousMonthStart,
        previousEnd: previousMonthEnd,
        currencyRef
      })

      const currentCount = data?.Current?.aggregate?.count ?? 0
      const currentAmount = data?.Current?.aggregate?.sum?.totalAmount ?? 0
      const previousCount = data?.Previous?.aggregate?.count ?? 0
      const previousAmount = data?.Previous?.aggregate?.sum?.totalAmount ?? 0
      const pendingApproval = data?.PendingApproval?.aggregate?.count ?? 0
      const reimbursableAmount = data?.ReimbursableAmount?.aggregate?.sum?.reimbursableAmount ?? 0

      setStatistics({
        currentMonthTotal: currentCount,
        previousMonthTotal: previousCount,
        currentMonthAmount: currentAmount,
        previousMonthAmount: previousAmount,
        pendingApproval,
        reimbursableAmount
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setStatistics({
        currentMonthTotal: 0,
        previousMonthTotal: 0,
        currentMonthAmount: 0,
        previousMonthAmount: 0,
        pendingApproval: 0,
        reimbursableAmount: 0
      })
    } finally {
      setIsLoading(false)
    }
  }, [employeeId, accessToken, currencyRef, graphqlClient])

  return { statistics, isLoading, error: error?.message ?? null, fetchStatistics }
}
