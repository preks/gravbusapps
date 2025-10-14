import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_EXPENSE_REQUEST_STATISTICS } from '../queries/expenseRequests'
import { env } from '@/common/env/EnvUtils'

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
  const [statistics, setStatistics] = useState<ExpenseRequestStatisticsData>({
    currentMonthTotal: 0,
    previousMonthTotal: 0,
    currentMonthAmount: 0,
    previousMonthAmount: 0,
    pendingApproval: 0,
    reimbursableAmount: 0
  })
  const [isLoading, setIsLoading] = useState<boolean>(true)
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

      const fetchCount = async (startDate: string, endDate: string) => {
        const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            query: GET_EXPENSE_REQUEST_STATISTICS,
            variables: {
              employeeId,
              startDate,
              endDate,
              currencyRef
            }
          })
        })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const result = await response.json()
        if (result.errors) throw new Error(result.errors.map((e: any) => e.message).join(', '))
        const count = result.data?.ExpenseRequestAggregate?.aggregate?.count ?? 0
        const totalAmount = result.data?.ExpenseRequestAggregate?.aggregate?.sum?.totalAmount ?? 0
        const pendingApproval = result.data?.PendingApproval?.aggregate?.count ?? 0
        const reimbursableAmount = result.data?.ReimbursableAmount?.aggregate?.sum?.reimbursableAmount ?? 0

        return { count, totalAmount, pendingApproval, reimbursableAmount }
      }

      // Fetch all statistics in parallel
      const [currentMonthData, previousMonthData] = await Promise.all([
        fetchCount(currentMonthStart, currentMonthEnd),
        fetchCount(previousMonthStart, previousMonthEnd)
      ])

      setStatistics({
        currentMonthTotal: currentMonthData.count,
        previousMonthTotal: previousMonthData.count,
        currentMonthAmount: currentMonthData.totalAmount,
        previousMonthAmount: previousMonthData.totalAmount,
        pendingApproval: currentMonthData.pendingApproval,
        reimbursableAmount: currentMonthData.reimbursableAmount
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
  }, [employeeId, accessToken, currencyRef])

  return { statistics, isLoading, error: error?.message ?? null, fetchStatistics }
}
