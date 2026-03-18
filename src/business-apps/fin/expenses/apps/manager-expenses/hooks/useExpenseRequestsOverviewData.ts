import { useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ExpenseRequest } from './useGetExpenseRequests'
import { useManagerExpensesOverview } from './useManagerExpensesOverview'
import { standardizeCurrencyRef, extractCurrencyCode } from '../utils/currencyUtils'
import dayjs from 'dayjs'

export interface ExpenseRequestsOverviewDataParams {
  managerId: string
  primaryCurrency: string | null
  /** Most-used currency for card stats when primaryCurrency is null (All). */
  mostUsedCurrency: string | null
  searchTerm: string
  statusFilter: string[]
  requestTypeFilter: string[]
  effectiveDateRange: [Date | null, Date | null] | null
  requestDateRange: [Date | null, Date | null] | null
  startDateRange: [Date | null, Date | null] | null
  endDateRange: [Date | null, Date | null] | null
  pageSize: number
  currentPage: number
  reqOrderBy: unknown[]
}

export interface RequestStats {
  pendingCount: number
  pendingAmount: number
  totalRequestsSubmitted: number
  totalSubmittedAmount: number
}

function convertDateRangeToGraphQL(dateRange: [Date | null, Date | null] | null) {
  if (!dateRange || (!dateRange[0] && !dateRange[1])) return null
  return {
    from: dateRange[0] ? dayjs(dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss') : null,
    to: dateRange[1] ? dayjs(dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss') : null
  }
}

export function useExpenseRequestsOverviewData(
  context: BusinessAppContextProps,
  params: ExpenseRequestsOverviewDataParams
) {
  const {
    managerId,
    primaryCurrency,
    mostUsedCurrency,
    searchTerm,
    statusFilter,
    requestTypeFilter,
    effectiveDateRange,
    requestDateRange,
    startDateRange,
    endDateRange,
    pageSize,
    currentPage,
    reqOrderBy
  } = params

  const currencyRef = useMemo(
    () => (primaryCurrency ? standardizeCurrencyRef(primaryCurrency) : undefined),
    [primaryCurrency]
  )

  const statsCurrency = primaryCurrency ?? mostUsedCurrency
  const reqStatsCurrencyRef = useMemo(
    () => (statsCurrency ? standardizeCurrencyRef(statsCurrency) : undefined),
    [statsCurrency]
  )

  const requestsEffectiveDateRange = useMemo(() => convertDateRangeToGraphQL(effectiveDateRange), [effectiveDateRange])
  const requestsRequestDateRange = useMemo(() => convertDateRangeToGraphQL(requestDateRange), [requestDateRange])
  const requestsStartDateRange = useMemo(() => convertDateRangeToGraphQL(startDateRange), [startDateRange])
  const requestsEndDateRange = useMemo(() => convertDateRangeToGraphQL(endDateRange), [endDateRange])

  const requestsParams = useMemo(
    () => ({ limit: pageSize, offset: (currentPage - 1) * pageSize, orderBy: reqOrderBy }),
    [pageSize, currentPage, reqOrderBy]
  )

  const overviewParams = useMemo(
    () => ({
      managerId,
      currencyRef,
      reqStatsCurrencyRef,
      searchTerm,
      requests: requestsParams,
      requestsStatus: statusFilter.length > 0 ? statusFilter : undefined,
      requestsTypeFilter: requestTypeFilter.length > 0 ? requestTypeFilter : undefined,
      requestsEffectiveDateRange,
      requestsRequestDateRange,
      requestsStartDateRange,
      requestsEndDateRange,
      plans: { limit: 0, offset: 0 },
      payments: { limit: 0, offset: 0 }
    }),
    [
      managerId,
      currencyRef,
      reqStatsCurrencyRef,
      searchTerm,
      requestsParams,
      statusFilter,
      requestTypeFilter,
      requestsEffectiveDateRange,
      requestsRequestDateRange,
      requestsStartDateRange,
      requestsEndDateRange
    ]
  )

  const overview = useManagerExpensesOverview(context, overviewParams)
  const lastValidStatsRef = useRef<RequestStats | null>(null)

  const requestStats = useMemo((): RequestStats | null => {
    if (!overview.data) return lastValidStatsRef.current
    const newStats: RequestStats = {
      pendingCount: overview.data.requestPendingCount ?? 0,
      pendingAmount: overview.data.requestPendingAmount ?? 0,
      totalRequestsSubmitted: overview.data.requestSubmittedCount ?? 0,
      totalSubmittedAmount: overview.data.requestSubmittedAmount ?? 0
    }
    lastValidStatsRef.current = newStats
    return newStats
  }, [
    overview.data?.requestPendingCount,
    overview.data?.requestPendingAmount,
    overview.data?.requestSubmittedCount,
    overview.data?.requestSubmittedAmount
  ])

  const expenseRequests = useMemo((): ExpenseRequest[] => {
    const rows = overview.data?.expenseRequests ?? []
    return rows.map((r: Record<string, unknown>) => {
      const currency = r?.currencyRef ? extractCurrencyCode(r.currencyRef as string) : undefined
      return {
        id: r.id,
        code: r.code,
        title: r.title,
        requestDate: r.requestDate,
        startDate: r.startDate,
        endDate: r.endDate,
        description: r.description,
        amount: Number(r.totalAmount ?? 0),
        totalAmount: Number(r.totalAmount ?? 0),
        currency: (currency || primaryCurrency || 'EUR') as string,
        currencyRef: r.currencyRef,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        requestType: r.requestType,
        employeeDocument: r.employeeDocument ?? null,
        expensePlan: r.expensePlan ?? null,
        employee: r.employee ?? null
      } as ExpenseRequest
    })
  }, [overview.data?.expenseRequests, primaryCurrency])

  const totalCount = overview.data?.expenseRequestsTotal ?? 0
  const requestsLoading = overview.isLoading && !overview.data
  const requestsError = overview.error ? new Error(overview.error) : null
  const statsLoading = overview.isLoading && !overview.data
  const statsError = overview.error ? new Error(overview.error) : null

  return {
    requestStats,
    statsLoading,
    statsError,
    expenseRequests,
    requestsLoading,
    requestsError,
    totalCount,
    refetch: overview.refetch
  }
}
