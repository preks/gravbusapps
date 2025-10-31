import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EXPENSE_ITEM_STATISTICS,
  GET_PENDING_ITEMS,
  GET_PENDING_ITEMS_WITH_DATE_RANGE,
  GET_EXPENSE_ITEMS_BY_EMPLOYEE
} from '../queries/expenseItems'
import { ExpenseStatus } from '../utils'

export interface ExpenseStats {
  totalExpenses: number | null
  previousMonthTotalExpenses: number | null
  pendingReimbursementTotal: number
  previousMonthPendingReimbursementTotal: number
  pendingItemCountFromApi: number
  allItems: any[]
  hasLoadedAllItems: boolean
  isLoading: boolean
  error: string | null
}

export const useExpenseItemStatistics = (context: BusinessAppContextProps, currencyRef: string) => {
  const [stats, setStats] = useState<ExpenseStats>({
    totalExpenses: null,
    previousMonthTotalExpenses: null,
    pendingReimbursementTotal: 0,
    previousMonthPendingReimbursementTotal: 0,
    pendingItemCountFromApi: 0,
    allItems: [],
    hasLoadedAllItems: false,
    isLoading: false,
    error: null
  })
  const isMounted = useRef(true)

  useEffect(
    () => () => {
      isMounted.current = false
    },
    []
  )

  const graphqlClient = useGraphQLClient(context?.accessToken || '')

  const fetchItemStatistics = useCallback(async () => {
    setStats(s => ({ ...s, isLoading: true, error: null }))
    try {
      const employeeId = context?.userInfo?.employeeDetails?.employeeId
      const accessToken = context?.accessToken
      if (!employeeId || !accessToken) throw new Error('Missing employee ID or access token')

      const today = dayjs()
      const currentMonthStart = today.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const currentMonthEnd = today.endOf('month').format('YYYY-MM-DD HH:mm:ss')
      const lastMonth = today.subtract(1, 'month')
      const previousMonthStart = lastMonth.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previousMonthEnd = lastMonth.endOf('month').format('YYYY-MM-DD HH:mm:ss')

      const fetchStatsForPeriod = async (startDate: string, endDate: string) => {
        const result: any = await graphqlClient.request(GET_EXPENSE_ITEM_STATISTICS, {
          employeeId,
          currencyRef,
          startDate,
          endDate
        })
        return result?.totalExpenses?.aggregate?.sum?.totalAmount ?? 0
      }

      const fetchPendingStatsForPeriod = async (startDate: string, endDate: string) => {
        const result: any = await graphqlClient.request(GET_PENDING_ITEMS_WITH_DATE_RANGE, {
          employeeId,
          currencyRef,
          startDate,
          endDate
        })
        return result?.pendingExcludingAllowance?.aggregate?.sum?.reimbursableAmount ?? 0
      }

      const [currentMonthTotal, previousMonthTotal, currentMonthPending, previousMonthPending] = await Promise.all([
        fetchStatsForPeriod(currentMonthStart, currentMonthEnd),
        fetchStatsForPeriod(previousMonthStart, previousMonthEnd),
        fetchPendingStatsForPeriod(currentMonthStart, currentMonthEnd),
        fetchPendingStatsForPeriod(previousMonthStart, previousMonthEnd)
      ])

      if (!isMounted.current) return
      setStats(s => ({
        ...s,
        totalExpenses: currentMonthTotal,
        previousMonthTotalExpenses: previousMonthTotal,
        pendingReimbursementTotal: currentMonthPending,
        previousMonthPendingReimbursementTotal: previousMonthPending
      }))
    } catch {
      if (!isMounted.current) return
      setStats(s => ({ ...s, error: error instanceof Error ? error.message : 'Unknown error' }))
    } finally {
      if (!isMounted.current) return
      setStats(s => ({ ...s, isLoading: false }))
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, currencyRef])

  const fetchAllItemsForStats = useCallback(async () => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId
    const accessToken = context?.accessToken
    if (!employeeId || !accessToken) return

    try {
      const variables = {
        employeeId,
        searchTerm: '%',
        limit: 1000,
        offset: 0,
        status: Object.values(ExpenseStatus),
        expenseDateStart: null,
        expenseDateEnd: null,
        totalAmountMin: null,
        totalAmountMax: null,
        currencyRef
      }
      const result: any = await graphqlClient.request(GET_EXPENSE_ITEMS_BY_EMPLOYEE, variables)
      const responseItems = result?.ExpenseItem ?? []
      const mappedItems = responseItems.map((item: any) => ({
        id: item.id,
        description: item.description,
        date: item.date,
        status: item.status,
        totalAmount: item.totalAmount,
        reimbursableAmount: item.reimbursableAmount,
        nonReimbursableAmount: (item.totalAmount ?? 0) - (item.deductibleAmount ?? 0),
        deductibleAmount: item.deductibleAmount,
        currencyRef: item.currencyRef,
        costCenter: item.costCenter,
        expenseClass: item.expenseClass,
        additionalProperties: item.additionalProperties,
        expenseItemFile: item.expenseItemFile,
        employee: item.employee
      }))
      if (!isMounted.current) return
      setStats(s => ({ ...s, allItems: mappedItems, hasLoadedAllItems: true }))
    } catch {
      return
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, currencyRef, graphqlClient])

  const refreshPendingCount = useCallback(async () => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId
    const accessToken = context?.accessToken
    if (!employeeId || !accessToken) return
    try {
      const result: any = await graphqlClient.request(GET_PENDING_ITEMS, { employeeId, currencyRef })
      const count = result?.pendingExcludingAllowance?.aggregate?.count ?? 0
      if (!isMounted.current) return
      setStats(s => ({ ...s, pendingItemCountFromApi: count }))
    } catch {
      console.error('Error refreshing pending item count', {
        employeeId,
        currencyRef,
        error
      })
      if (!isMounted.current) return
      setStats(s => ({ ...s, pendingItemCountFromApi: 0 }))
    }
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, currencyRef])

  useEffect(() => {
    fetchItemStatistics()
  }, [fetchItemStatistics])

  return {
    ...stats,
    refetch: fetchItemStatistics,
    fetchAllItemsForStats,
    refreshPendingCount
  }
}
