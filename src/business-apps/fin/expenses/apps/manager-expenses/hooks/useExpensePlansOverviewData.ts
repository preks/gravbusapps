import { useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpensePlan } from './useMainViewExpensePlans'
import { useManagerExpensesOverview } from './useManagerExpensesOverview'
import { standardizeCurrencyRef, extractCurrencyCode } from '../utils/currencyUtils'
import { PLAN_TAB_HIDDEN_STATUSES } from '../constants/expenseStatus'
import dayjs from 'dayjs'

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

function convertDateRangeToGraphQL(dateRange: [Date | null, Date | null] | null) {
  if (!dateRange || (!dateRange[0] && !dateRange[1])) return null
  return {
    from: dateRange[0] ? dayjs(dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss') : null,
    to: dateRange[1] ? dayjs(dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss') : null
  }
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

  const currencyRef = useMemo(
    () => (primaryCurrency ? standardizeCurrencyRef(primaryCurrency) : undefined),
    [primaryCurrency]
  )

  const effectiveStatsCurrency = primaryCurrency ?? mostUsedCurrency ?? null
  const planStatsCurrencyRef = useMemo(
    () => (effectiveStatsCurrency ? standardizeCurrencyRef(effectiveStatsCurrency) : undefined),
    [effectiveStatsCurrency]
  )

  const plansEffectiveDateRange = useMemo(() => convertDateRangeToGraphQL(effectiveDateRange), [effectiveDateRange])
  const plansStartDateRange = useMemo(() => convertDateRangeToGraphQL(startDateRange), [startDateRange])
  const plansEndDateRange = useMemo(() => convertDateRangeToGraphQL(endDateRange), [endDateRange])
  const plansPlanDateRange = useMemo(() => convertDateRangeToGraphQL(planDateRange), [planDateRange])

  const plansParams = useMemo(
    () => ({
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      orderBy: planOrderBy
    }),
    [pageSize, currentPage, planOrderBy]
  )

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
  const lastValidStatsRef = useRef<PlanStats | null>(null)

  const planStats = useMemo((): PlanStats | null => {
    if (!overview.data) return lastValidStatsRef.current
    const newStats: PlanStats = {
      totalCount: overview.data.planTotalCount || 0,
      sumTotalAmount: overview.data.planTotalAmount || 0,
      pendingCount: overview.data.planPendingCount || 0,
      pendingAmount: overview.data.planPendingAmount || 0
    }
    lastValidStatsRef.current = newStats
    return newStats
  }, [
    overview.data?.planTotalCount,
    overview.data?.planTotalAmount,
    overview.data?.planPendingCount,
    overview.data?.planPendingAmount
  ])

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
        currency: (currency || primaryCurrency || 'EUR') as string,
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

  const totalCount = overview.data?.expensePlansTotal ?? 0
  const plansLoading = overview.isLoading && !overview.data
  const plansError = overview.error ? new Error(overview.error) : null
  const statsLoading = overview.isLoading && !overview.data
  const statsError = overview.error ? new Error(overview.error) : null

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
