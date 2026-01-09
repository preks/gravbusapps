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
  refetch: (options?: { force?: boolean }) => void
  invalidateCache: () => void
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
  const pageCacheRef = useRef<Map<string, ExpenseDashboard>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)
  const depsRef = useRef({ context, filters })

  const fetchStats = async (options?: { force?: boolean }) => {
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

    const now = dayjs()
    const selectedCurrency = depsRef.current.filters?.currency
    if (!selectedCurrency) {
      setError(new Error('Currency is required'))
      setStats(null)
      setIsLoading(false)
      return
    }
    const selectedPeriod: 'monthly' | 'quarterly' | 'yearly' = depsRef.current.filters?.period || 'monthly'

    const cacheKey = JSON.stringify({ employeeId, selectedCurrency, selectedPeriod, date: now.format('YYYY-MM') })

    const cachedData = pageCacheRef.current.get(cacheKey)
    if (cachedData && !options?.force) {
      setStats(cachedData)
      setIsLoading(false)
      setError(null)
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError(null)
    try {
      const variables = buildDashboardVariables(employeeId, selectedCurrency, now, selectedPeriod)
      const key = JSON.stringify({ employeeId, selectedCurrency, selectedPeriod, date: now.format('YYYY-MM') })

      if (inflightRef.current.has(key)) {
        try {
          const result = await inflightRef.current.get(key)
          const expenseDashboard = transformDashboardResponse(result, selectedPeriod)
          pageCacheRef.current.set(cacheKey, expenseDashboard as ExpenseDashboard)
          setStats(expenseDashboard as ExpenseDashboard)
          setIsLoading(false)
          setError(null)
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            throw err
          }
        }
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

      // If a newer request started, ignore this response.
      if (abortControllerRef.current !== controller) {
        return
      }

      const expenseDashboard = transformDashboardResponse(data, selectedPeriod)
      pageCacheRef.current.set(cacheKey, expenseDashboard as ExpenseDashboard)
      setStats(expenseDashboard as ExpenseDashboard)
    } catch (err) {
      // We can't abort the underlying fetch without client support; ignore stale results instead.
      if (abortControllerRef.current !== controller || controller.signal.aborted) {
        return
      }
      setError(err instanceof Error ? err : new Error(String(err)))
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }

  const invalidateAllCache = () => {
    pageCacheRef.current.clear()
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

  const refetch = (options?: { force?: boolean }) => {
    void fetchStats(options)
  }

  return { stats, isLoading, error: error?.message ?? null, refetch, invalidateCache: invalidateAllCache }
}
