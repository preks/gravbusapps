import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { MANAGER_EXPENSES_OVERVIEW } from '../queries/ManagerExpensesOverview'

// Input configuration for the consolidated overview query
export interface OverviewPagingAndSort<TOrder> {
  limit?: number
  offset?: number
  orderBy?: TOrder[]
}

export interface UseManagerExpensesOverviewParams {
  managerId: string
  currencyRef?: string | null
  searchTerm?: string | null
  // Windows for aggregates/trends
  monthStart?: string | null // ISO timestamp
  monthEnd?: string | null // ISO timestamp
  yearStart?: string | null // ISO timestamp
  // Per-list paging/sorting
  requests?: OverviewPagingAndSort<any>
  plans?: OverviewPagingAndSort<any>
  payments?: OverviewPagingAndSort<any>
  // Optional status filters
  requestsStatus?: string[]
  plansStatus?: string[]
  paymentsStatus?: string[]
}

export interface ManagerExpensesOverviewState {
  // Distinct currencies combined and de-duplicated
  distinctCurrencies: string[]
  // Aggregates
  teamMembersCount: number
  pendingApprovalsCount: number
  totalPlansAmount: number
  totalRequestsUsedAmount: number
  monthlyExpensesAmount: number
  // Aggregated monthly trends with normalized shape for charts
  monthlyExpenseTrends: Array<{ month: string; amount: number }>
  // Categories (aggregated from item positions within year window)
  expenseCategories?: Array<{ name: string; amount: number }>
  // Stats derived for tabs (to drop legacy stats hooks)
  requestPendingCount?: number
  requestPendingAmount?: number
  requestSubmittedCount?: number
  requestSubmittedAmount?: number
  planTotalCount?: number
  planTotalAmount?: number
  planPendingCount?: number
  planPendingAmount?: number
  paymentTotalCount?: number
  paymentTotalAmount?: number
  paymentPendingCount?: number
  paymentPendingAmount?: number
  // Currency-agnostic pending counts
  pendingRequestsAll?: number
  pendingPlansAll?: number
  pendingPaymentsAll?: number
  // Currency-agnostic total counts
  totalRequestsAll?: number
  totalPlansAll?: number
  totalPaymentsAll?: number
  // Lists
  expenseRequests: any[]
  expenseRequestsTotal: number
  expensePlans: any[]
  expensePlansTotal: number
  advancePayments: any[]
  advancePaymentsTotal: number
}

export interface UseManagerExpensesOverviewReturn {
  data: ManagerExpensesOverviewState | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Default orders to keep current UX parity
const DEFAULT_REQ_ORDER: any[] = [{ createdAt: 'DESC' }]
const DEFAULT_PLAN_ORDER: any[] = [{ planDate: 'DESC' }]
const DEFAULT_PAY_ORDER: any[] = [{ createdAt: 'DESC' }]

// Global in-flight request cache to deduplicate concurrent identical calls across components
const inFlightBySignature: Map<string, Promise<any>> = new Map()
// Small memory cache to keep recent results for smooth tab transitions
const cacheBySignature: Map<string, { ts: number; data: ManagerExpensesOverviewState }> = new Map()
const CACHE_TTL_MS = 30_000 // 30s TTL for smooth transitions

/**
 * Helper: Extract distinct currencies from result data
 */
function extractDistinctCurrencies(result: any): string[] {
  const currencyRefs = new Set<string>()
  const pushRefs = (arr?: Array<{ currencyRef?: string }>) => {
    if (!Array.isArray(arr)) return
    for (const r of arr) {
      if (r?.currencyRef) currencyRefs.add(r.currencyRef)
    }
  }

  if (Array.isArray(result?.DistinctCurrencies)) {
    // When a view is available
    for (const row of result.DistinctCurrencies) {
      if (row?.currency_ref) currencyRefs.add(row.currency_ref)
    }
  } else {
    // Fallback: gather from source arrays
    pushRefs(result?.DistinctCurrenciesFromItems)
    pushRefs(result?.DistinctCurrenciesFromRequests)
    pushRefs(result?.DistinctCurrenciesFromPlans)
    pushRefs(result?.DistinctCurrenciesFromPayments)
  }

  return Array.from(currencyRefs).sort((a, b) => a.localeCompare(b))
}

/**
 * Helper: Build monthly expense trends from ExpenseItem rows
 * Uses correct date logic per type: EXPENSES → expenseDate, TRIP → startDate
 */
function buildMonthlyTrends(trendItems: any[]): Array<{ month: string; amount: number }> {
  const monthToAmount = new Map<string, number>()

  for (const row of trendItems) {
    const typeRef: string | undefined = row?.expenseRequest?.requestTypeRef
    const effectiveDate: string | undefined =
      typeRef === 'ExpenseRequestType:v1:TRIP' ? row?.expenseRequest?.startDate : row?.expenseDate
    if (!effectiveDate) continue

    const monthKey = String(effectiveDate).slice(0, 7) // YYYY-MM
    const prev = monthToAmount.get(monthKey) ?? 0
    const add = Number(row?.totalAmount ?? 0) || 0
    monthToAmount.set(monthKey, prev + add)
  }

  return Array.from(monthToAmount.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amount]) => ({ month, amount }))
}

/**
 * Helper: Aggregate expense categories from trendItems positions
 */
function aggregateExpenseCategories(trendItems: any[]): Array<{ name: string; amount: number }> {
  const categoryMap = new Map<string, number>()

  for (const row of trendItems) {
    const positions = Array.isArray(row?.expensePosition) ? row.expensePosition : []
    if (positions.length === 0) continue

    const per = (Number(row?.totalAmount ?? 0) || 0) / positions.length

    for (const pos of positions) {
      const translations = Array.isArray(pos?.expenseGroup?.translations) ? pos.expenseGroup.translations : []
      const fallback = pos?.expenseGroup?.value || 'Uncategorized'
      const currentLocale = String(globalThis?.window?.lowcoder?.i18n?.selectedLocale || 'en-US').toLowerCase()
      const localized =
        translations.find((t: any) => String(t?.localeCode || '').toLowerCase() === currentLocale)?.value || fallback

      categoryMap.set(localized, (categoryMap.get(localized) || 0) + per)
    }
  }

  return Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Helper: Transform GraphQL result into final state object
 */
function transformResultToState(
  result: any,
  distinctCurrencies: string[],
  monthlyExpenseTrends: Array<{ month: string; amount: number }>,
  expenseCategories: Array<{ name: string; amount: number }>
): ManagerExpensesOverviewState {
  const expenseRequests = Array.isArray(result?.ExpenseRequests) ? result.ExpenseRequests : []
  const expenseRequestsTotal = Number(result?.ExpenseRequestsAggregate?.aggregate?.count ?? 0)

  const expensePlans = Array.isArray(result?.ExpensePlans) ? result.ExpensePlans : []
  const expensePlansTotal = Number(result?.ExpensePlansAggregate?.aggregate?.count ?? 0)

  const advancePayments = Array.isArray(result?.AdvancePayments) ? result.AdvancePayments : []
  const advancePaymentsTotal = Number(result?.AdvancePaymentsAggregate?.aggregate?.count ?? 0)

  return {
    distinctCurrencies,
    teamMembersCount: Number(result?.TeamMembersAggregate?.aggregate?.count ?? 0),
    pendingApprovalsCount: Number(result?.PendingApprovalsAggregate?.aggregate?.count ?? 0),
    totalPlansAmount: Number(result?.ExpensePlansTotalAggregate?.aggregate?.sum?.totalAmount ?? 0),
    totalRequestsUsedAmount: Number(result?.ExpenseRequestsUsedAggregate?.aggregate?.sum?.totalAmount ?? 0),
    monthlyExpensesAmount: Number(result?.MonthlyExpensesAggregate?.aggregate?.sum?.totalAmount ?? 0),
    monthlyExpenseTrends,
    expenseCategories,
    expenseRequests,
    expenseRequestsTotal,
    expensePlans,
    expensePlansTotal,
    advancePayments,
    advancePaymentsTotal,
    // Stats (guard against missing aggregates)
    requestPendingCount: Number(result?.RequestsPendingCountAggregate?.aggregate?.count ?? 0),
    requestPendingAmount: Number(result?.RequestsPendingAmountAggregate?.aggregate?.sum?.totalAmount ?? 0) || 0,
    requestSubmittedCount: Number(result?.RequestsSubmittedCountAggregate?.aggregate?.count ?? 0),
    requestSubmittedAmount: Number(result?.RequestsSubmittedAmountAggregate?.aggregate?.sum?.totalAmount ?? 0) || 0,
    planTotalCount: Number(result?.AllPlansAggregate?.aggregate?.count ?? 0),
    planTotalAmount: Number(result?.AllPlansAggregate?.aggregate?.sum?.totalAmount ?? 0) || 0,
    planPendingCount: Number(result?.PendingPlansCountAggregate?.aggregate?.count ?? 0),
    planPendingAmount: Number(result?.PendingPlansAmountAggregate?.aggregate?.sum?.totalAmount ?? 0) || 0,
    paymentTotalCount: Number(result?.AllPaymentsAggregate?.aggregate?.count ?? 0),
    paymentTotalAmount: Number(result?.AllPaymentsAggregate?.aggregate?.sum?.amount ?? 0) || 0,
    paymentPendingCount: Number(result?.PendingPaymentsAggregate?.aggregate?.count ?? 0),
    paymentPendingAmount: Number(result?.PendingPaymentsAggregate?.aggregate?.sum?.amount ?? 0) || 0,
    // Unfiltered pending counts (for dashboard card)
    pendingRequestsAll: Number(result?.PendingRequestsAllCountAggregate?.aggregate?.count ?? 0),
    pendingPlansAll: Number(result?.PendingPlansAllCountAggregate?.aggregate?.count ?? 0),
    pendingPaymentsAll: Number(result?.PendingPaymentsAllCountAggregate?.aggregate?.count ?? 0),
    totalRequestsAll: Number(result?.TotalRequestsAllCountAggregate?.aggregate?.count ?? 0),
    totalPlansAll: Number(result?.TotalPlansAllCountAggregate?.aggregate?.count ?? 0),
    totalPaymentsAll: Number(result?.TotalPaymentsAllCountAggregate?.aggregate?.count ?? 0)
  }
}

export const useManagerExpensesOverview = (
  context: BusinessAppContextProps,
  params: UseManagerExpensesOverviewParams
): UseManagerExpensesOverviewReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<ManagerExpensesOverviewState | null>(null)

  // Normalize/prepare variables
  const variables = useMemo(() => {
    const trimmedSearch = (params.searchTerm ?? '').toString().trim()
    const searchPattern = trimmedSearch.length > 0 ? `%${trimmedSearch}%` : '%%'

    // Build currency filter boolean expressions conditionally
    const currencyRef = params.currencyRef || null
    const reqCurrencyWhere = currencyRef ? { currencyRef: { _eq: currencyRef } } : {}
    const planCurrencyWhere = currencyRef ? { currencyRef: { _eq: currencyRef } } : {}
    const payCurrencyWhere = currencyRef ? { currencyRef: { _eq: currencyRef } } : {}

    const v: any = {
      managerId: params.managerId,
      currencyRef,
      searchTerm: searchPattern,
      reqLimit: params.requests?.limit ?? 20,
      reqOffset: params.requests?.offset ?? 0,
      reqOrderBy: params.requests?.orderBy ?? DEFAULT_REQ_ORDER,
      planLimit: params.plans?.limit ?? 20,
      planOffset: params.plans?.offset ?? 0,
      planOrderBy: params.plans?.orderBy ?? DEFAULT_PLAN_ORDER,
      payLimit: params.payments?.limit ?? 20,
      payOffset: params.payments?.offset ?? 0,
      payOrderBy: params.payments?.orderBy ?? DEFAULT_PAY_ORDER,
      monthStart: params.monthStart ?? undefined,
      monthEnd: params.monthEnd ?? undefined,
      yearStart: params.yearStart ?? undefined,
      reqCurrencyWhere,
      planCurrencyWhere,
      payCurrencyWhere
    }

    // Build status filter boolean expressions conditionally
    // Only add status filter if we have a non-empty array
    if (Array.isArray(params.requestsStatus) && params.requestsStatus.length > 0) {
      v.reqStatusWhere = { status: { _in: params.requestsStatus } }
    } else {
      // Exclude CREATED status by default when no specific filter is provided
      v.reqStatusWhere = { status: { _neq: 'CREATED' } }
    }
    if (Array.isArray(params.plansStatus) && params.plansStatus.length > 0) {
      v.planStatusWhere = { status: { _in: params.plansStatus } }
    } else {
      // Exclude CREATED status by default when no specific filter is provided
      v.planStatusWhere = { status: { _neq: 'CREATED' } }
    }
    if (Array.isArray(params.paymentsStatus) && params.paymentsStatus.length > 0) {
      v.payStatusWhere = { status: { _in: params.paymentsStatus } }
    } else {
      // Exclude CREATED status by default when no specific filter is provided
      v.payStatusWhere = { status: { _neq: 'CREATED' } }
    }

    return v
  }, [
    params.managerId,
    params.currencyRef,
    params.searchTerm,
    params.requests?.limit,
    params.requests?.offset,
    params.requests?.orderBy,
    params.plans?.limit,
    params.plans?.offset,
    params.plans?.orderBy,
    params.payments?.limit,
    params.payments?.offset,
    params.payments?.orderBy,
    params.monthStart,
    params.monthEnd,
    params.yearStart,
    // Serialize status arrays for dependency comparison
    JSON.stringify(params.requestsStatus || []),
    JSON.stringify(params.plansStatus || []),
    JSON.stringify(params.paymentsStatus || [])
  ])

  const run = useCallback(async () => {
    if (!context.accessToken || !variables.managerId) return
    const signature = JSON.stringify(variables)

    setError(null)
    // Use cache to avoid flashes on tab switches
    const cached = cacheBySignature.get(signature)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setState(cached.data)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      let requestPromise = inFlightBySignature.get(signature)
      if (!requestPromise) {
        requestPromise = graphqlClient.request(MANAGER_EXPENSES_OVERVIEW, variables).finally(() => {
          inFlightBySignature.delete(signature)
        })
        inFlightBySignature.set(signature, requestPromise)
      }
      const result: any = await requestPromise

      // Extract and aggregate data using helper functions
      const distinctCurrencies = extractDistinctCurrencies(result)

      const trendItems = Array.isArray(result?.MonthlyExpenseItemsForTrends) ? result.MonthlyExpenseItemsForTrends : []
      const monthlyExpenseTrends = buildMonthlyTrends(trendItems)
      const expenseCategories = aggregateExpenseCategories(trendItems)

      // Transform result into final state
      const nextState = transformResultToState(result, distinctCurrencies, monthlyExpenseTrends, expenseCategories)

      setState(nextState)
      cacheBySignature.set(signature, { ts: Date.now(), data: nextState })
    } catch (e: any) {
      setError(e?.message || 'Failed to load manager expenses overview')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient, variables])

  useEffect(() => {
    void run()
  }, [run])

  return {
    data: state,
    isLoading,
    error,
    refetch: run
  }
}
