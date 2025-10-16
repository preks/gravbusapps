import { useCallback, useState } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
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
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query: GET_EXPENSE_ITEM_STATS_OVERVIEW,
            variables: {
              employeeId,
              currencyRef,
              currentStart,
              currentEnd,
              previousStart,
              previousEnd
            }
          })
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = await response.json()
        if (result.errors) throw new Error(result.errors.map((e: any) => e.message).join(', '))

        const currentTotals = result.data?.currentMonthTotals?.aggregate?.sum?.totalAmount ?? 0
        const previousTotals = result.data?.previousMonthTotals?.aggregate?.sum?.totalAmount ?? 0
        const currentPending = result.data?.currentMonthPending?.aggregate?.sum?.reimbursableAmount ?? 0
        const previousPending = result.data?.previousMonthPending?.aggregate?.sum?.reimbursableAmount ?? 0
        const currentPendingCount = result.data?.currentMonthPending?.aggregate?.count ?? 0
        const previousPendingCount = result.data?.previousMonthPending?.aggregate?.count ?? 0

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


