import { useCallback, useState } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_ITEM_STATS_OVERVIEW } from '../queries/expenseItems'

export interface ExpenseItemStatsOverviewResult {
  totalExpensesCurrent: number
  totalExpensesPrevious: number
  pendingReimbursementCurrent: number
  pendingReimbursementPrevious: number
  pendingCountCurrent: number
  pendingCountPrevious: number
}

export const useExpenseItemStatsOverview = (context: BusinessAppContextProps) => {
  const [data, setData] = useState<ExpenseItemStatsOverviewResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchOverview = useCallback(
    async (currencyRef: string) => {
      const employeeId = context.userInfo?.employeeDetails?.employeeId
      const accessToken = context.accessToken
      if (!employeeId || !accessToken) return

      setIsLoading(true)
      setError(null)

      const today = dayjs()
      const currentStart = today.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const currentEnd = today.endOf('month').format('YYYY-MM-DD HH:mm:ss')
      const lastMonth = today.subtract(1, 'month')
      const previousStart = lastMonth.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previousEnd = lastMonth.endOf('month').format('YYYY-MM-DD HH:mm:ss')

      try {
        const result = await graphqlClient.request<any>(GET_EXPENSE_ITEM_STATS_OVERVIEW, {
          employeeId,
          currencyRef,
          currentStart,
          currentEnd,
          previousStart,
          previousEnd
        })

        const currentTotals = result?.currentMonthTotals?.aggregate?.sum?.totalAmount ?? 0
        const previousTotals = result?.previousMonthTotals?.aggregate?.sum?.totalAmount ?? 0
        const currentPending = result?.currentMonthPending?.aggregate?.sum?.reimbursableAmount ?? 0
        const previousPending = result?.previousMonthPending?.aggregate?.sum?.reimbursableAmount ?? 0
        const currentPendingCount = result?.currentMonthPending?.aggregate?.count ?? 0
        const previousPendingCount = result?.previousMonthPending?.aggregate?.count ?? 0

        setData({
          totalExpensesCurrent: currentTotals,
          totalExpensesPrevious: previousTotals,
          pendingReimbursementCurrent: currentPending,
          pendingReimbursementPrevious: previousPending,
          pendingCountCurrent: currentPendingCount,
          pendingCountPrevious: previousPendingCount
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, context.userInfo?.employeeDetails?.employeeId]
  )

  return { data, isLoading, error, fetchOverview }
}
