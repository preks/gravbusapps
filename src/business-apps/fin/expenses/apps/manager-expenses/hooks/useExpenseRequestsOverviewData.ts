import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ExpenseRequest } from './useGetExpenseRequests'
import { useManagerExpensesOverview } from './useManagerExpensesOverview'
import { extractCurrencyCode } from '../utils/currencyUtils'
import { convertDateRangeToGraphQL } from '../utils/dateUtils'
import { useCurrencyRefs, usePaginationParams, useStatsFromOverview, extractLoadingError } from './overviewHelpers'

export interface ExpenseRequestsOverviewDataParams {
  managerId: string
  primaryCurrency: string | null
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

  const { currencyRef, statsCurrencyRef: reqStatsCurrencyRef } = useCurrencyRefs(primaryCurrency, mostUsedCurrency)
  const requestsParams = usePaginationParams(pageSize, currentPage, reqOrderBy)

  const requestsEffectiveDateRange = useMemo(() => convertDateRangeToGraphQL(effectiveDateRange), [effectiveDateRange])
  const requestsRequestDateRange = useMemo(() => convertDateRangeToGraphQL(requestDateRange), [requestDateRange])
  const requestsStartDateRange = useMemo(() => convertDateRangeToGraphQL(startDateRange), [startDateRange])
  const requestsEndDateRange = useMemo(() => convertDateRangeToGraphQL(endDateRange), [endDateRange])

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

  const requestStats = useStatsFromOverview<RequestStats, typeof overview.data>(
    overview.data,
    d => ({
      pendingCount: d?.requestPendingCount ?? 0,
      pendingAmount: d?.requestPendingAmount ?? 0,
      totalRequestsSubmitted: d?.requestSubmittedCount ?? 0,
      totalSubmittedAmount: d?.requestSubmittedAmount ?? 0
    }),
    [
      overview.data?.requestPendingCount,
      overview.data?.requestPendingAmount,
      overview.data?.requestSubmittedCount,
      overview.data?.requestSubmittedAmount
    ]
  )

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
        currency: currency || primaryCurrency || 'EUR',
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

  const { loading: requestsLoading, error: requestsError } = extractLoadingError(overview)
  const { loading: statsLoading, error: statsError } = extractLoadingError(overview)
  const totalCount = overview.data?.expenseRequestsTotal ?? 0

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
