import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
dayjs.extend(quarterOfYear)
import { useState, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_EXPENSE_DASHBOARD_BY_EMPLOYEE } from '../queries/expenseDashboard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildDashboardVariables } from '../../personal-expenses/utils/dateRanges'
import { transformDashboardResponse } from '../../personal-expenses/utils/transformExpenseDashboard'

export interface ExpenseDashboard {
  pendingPayouts: number
  bookedExpenseRequests: number
  pendingAdvancePayments: number
  bookedAndPendingCount: number
  pendingItems: number
  currentMonthExpenses: {
    total: number
    count: number
  }
  previousMonthExpenses: {
    total: number
    count: number
  }
  currentQuarterExpenses: {
    total: number
    count: number
  }
  previousQuarterExpenses: {
    total: number
    count: number
  }
  currentYearExpenses: {
    total: number
    count: number
  }
  previousYearExpenses: {
    total: number
    count: number
  }
  flaggedItems: number
  upcomingTrips: number
  recentActivity: Array<{
    id: string
    title: string
    expenseRequest?: {
      id: string
      title: string
      status: string
    }
    expensePlan?: {
      id: string
      title: string
      status: string
    }
    status: string
    updatedAt: string
    expenseType?: string
    expenseDate?: string
  }>
  expensesByTypeMonth: Record<string, number>
  expensesByTypeQuarter: Record<string, number>
  expensesByTypeYear: Record<string, number>
  expenseItemsWithoutReceipts: number
}

export interface ExpenseDashboardDataView {
  stats: ExpenseDashboard | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useGetExpenseDashboard = (
  context?: BusinessAppContextProps,
  filters?: { currency?: string; period?: 'monthly' | 'quarterly' | 'yearly' }
): ExpenseDashboardDataView => {
  const [stats, setStats] = useState<ExpenseDashboard | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(context?.accessToken || '')
  const inflightRef = useRef<Map<string, Promise<any>>>(new Map())
  const depsRef = useRef({ context, filters })

  const fetchStats = async () => {
    const employeeId = depsRef.current.context?.userInfo?.employeeDetails?.employeeId

    // Validate auth; missing currency is not an error (wait for preselect)
    if (!employeeId || !depsRef.current.context?.accessToken) {
      setError(new Error('Employee ID or Access Token not found.'))
      setStats(null)
      setIsLoading(false)
      return
    }
    if (!depsRef.current.filters?.currency) {
      setStats(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const now = dayjs()
      const selectedCurrency = depsRef.current.filters?.currency
      if (!selectedCurrency) {
        throw new Error('Currency is required')
      }
      const selectedPeriod: 'monthly' | 'quarterly' | 'yearly' = depsRef.current.filters?.period || 'monthly'

      const variables = buildDashboardVariables(employeeId, selectedCurrency, now, selectedPeriod)
      const key = JSON.stringify({ employeeId, selectedCurrency, selectedPeriod, date: now.format('YYYY-MM') })

      if (inflightRef.current.has(key)) {
        await inflightRef.current.get(key)
        return
      }

      const p = graphqlClient
        .request(GET_EXPENSE_DASHBOARD_BY_EMPLOYEE, variables)
        .then(res => res)
        .finally(() => {
          inflightRef.current.delete(key)
        })
      inflightRef.current.set(key, p)
      const data = await p
      const expenseDashboard = transformDashboardResponse(data, selectedPeriod)
      setStats(expenseDashboard as ExpenseDashboard)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    depsRef.current = { context, filters }
    fetchStats()
  }, [
    graphqlClient,
    context?.accessToken,
    context?.userInfo?.employeeDetails?.employeeId,
    filters?.currency,
    filters?.period
  ])

  return { stats, isLoading, error: error?.message ?? null, refetch: fetchStats }
}
