import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpensePlan } from './useMainViewExpensePlans'
import { useManagerExpensesOverview } from './useManagerExpensesOverview'
import { extractCurrencyCode } from '../utils/currencyUtils'
import { PLAN_TAB_HIDDEN_STATUSES } from '../constants/expenseStatus'
import { convertDateRangeToGraphQL } from '../utils/dateUtils'
import { useCurrencyRefs, usePaginationParams, useStatsFromOverview, extractLoadingError } from './overviewHelpers'

export interface ExpensePlansOverviewDataParams {
  managerId: string
  primaryCurrency: string | null
  mostUsedCurrency: string | null
  searchTerm: string
  statusFilter: string[]
  planTypeFilter: string[]
  effectiveDateRange: [Date | null, Date | null] | null
  planDateRange: [Date | null, Date | null] | null
  startDateRange: [Date | null, Date | null] | null
  endDateRange: [Date | null, Date | null] | null
  pageSize: number
  currentPage: number
  planOrderBy: unknown[]
}

export interface PlanStats {
  totalCount: number
  sumTotalAmount: number
  pendingCount: number
  pendingAmount: number
}

export function useExpensePlansOverviewData(context: BusinessAppContextProps, params: ExpensePlansOverviewDataParams) {
  const {
    managerId,
    primaryCurrency,
    mostUsedCurrency,
    searchTerm,
    statusFilter,
    planTypeFilter,
    effectiveDateRange,
    planDateRange,
    startDateRange,
    endDateRange,
    pageSize,
    currentPage,
    planOrderBy
  } = params

  const { currencyRef, statsCurrencyRef: planStatsCurrencyRef } = useCurrencyRefs(primaryCurrency, mostUsedCurrency)
  const plansParams = usePaginationParams(pageSize, currentPage, planOrderBy)

  const plansEffectiveDateRange = useMemo(() => convertDateRangeToGraphQL(effectiveDateRange), [effectiveDateRange])
  const plansStartDateRange = useMemo(() => convertDateRangeToGraphQL(startDateRange), [startDateRange])
  const plansEndDateRange = useMemo(() => convertDateRangeToGraphQL(endDateRange), [endDateRange])
  const plansPlanDateRange = useMemo(() => convertDateRangeToGraphQL(planDateRange), [planDateRange])

  const overviewParams = useMemo(
    () => ({
      managerId,
      currencyRef,
      planStatsCurrencyRef,
      searchTerm,
      plans: plansParams,
      plansStatus: statusFilter,
      plansStatusExclude: PLAN_TAB_HIDDEN_STATUSES,
      requests: { limit: 0, offset: 0 },
      payments: { limit: 0, offset: 0 },
      plansEffectiveDateRange,
      plansStartDateRange,
      plansEndDateRange,
      plansPlanDateRange,
      plansTypeFilter: planTypeFilter
    }),
    [
      managerId,
      currencyRef,
      planStatsCurrencyRef,
      searchTerm,
      plansParams,
      statusFilter,
      plansEffectiveDateRange,
      plansStartDateRange,
      plansEndDateRange,
      plansPlanDateRange,
      planTypeFilter
    ]
  )

  const overview = useManagerExpensesOverview(context, overviewParams)

  const planStats = useStatsFromOverview<PlanStats, typeof overview.data>(
    overview.data,
    d => ({
      totalCount: d?.planTotalCount || 0,
      sumTotalAmount: d?.planTotalAmount || 0,
      pendingCount: d?.planPendingCount || 0,
      pendingAmount: d?.planPendingAmount || 0
    }),
    [
      overview.data?.planTotalCount,
      overview.data?.planTotalAmount,
      overview.data?.planPendingCount,
      overview.data?.planPendingAmount
    ]
  )

  const expensePlans = useMemo((): ExpensePlan[] => {
    const rows = overview.data?.expensePlans || []
    return rows.map((p: Record<string, unknown>) => {
      const currency = p?.currencyRef ? extractCurrencyCode(p.currencyRef as string) : undefined
      return {
        id: p.id,
        code: p.code,
        title: p.title,
        description: (p.description as string) ?? null,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        planDate: p.planDate,
        totalAmount: Number(p.totalAmount ?? 0),
        currency: currency || primaryCurrency || 'EUR',
        currencyRef: p.currencyRef,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        requestType: p.requestType,
        expenseRequest: Array.isArray(p.expenseRequest) ? p.expenseRequest : [],
        employeeDocument: p.employeeDocument ?? null,
        employee: p.employee
      } as ExpensePlan
    })
  }, [overview.data?.expensePlans, primaryCurrency])

  const { loading: plansLoading, error: plansError } = extractLoadingError(overview)
  const { loading: statsLoading, error: statsError } = extractLoadingError(overview)
  const totalCount = overview.data?.expensePlansTotal ?? 0

  return {
    planStats,
    statsLoading,
    statsError,
    expensePlans,
    plansLoading,
    plansError,
    totalCount
  }
}
