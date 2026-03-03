import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { MANAGER_EXPENSES_OVERVIEW } from '../queries/ManagerExpensesOverview'
import {
  buildSearchPattern,
  buildPlanDateWhereClause,
  buildRequestDateWhereClause,
  extractDistinctCurrenciesByKeys,
  buildMonthlyTrends,
  aggregateExpenseCategories,
  buildOverviewCoreState,
  type GqlBoolExp
} from './expensesOverview/sharedOverview'

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
  /** Optional: statuses to always exclude from plans list (caller-owned; e.g. Plans tab passes PLAN_TAB_HIDDEN_STATUSES). */
  plansStatusExclude?: readonly string[]
  paymentsStatus?: string[]
  // Date range filters for plans
  plansEffectiveDateRange?: { from?: string | null; to?: string | null } | null
  plansStartDateRange?: { from?: string | null; to?: string | null } | null
  plansEndDateRange?: { from?: string | null; to?: string | null } | null
  plansPlanDateRange?: { from?: string | null; to?: string | null } | null
  // Plan type filter (EXPENSES, TRIP)
  plansTypeFilter?: string[]
  // Date range filters for requests
  requestsEffectiveDateRange?: { from?: string | null; to?: string | null } | null
  requestsRequestDateRange?: { from?: string | null; to?: string | null } | null
  requestsStartDateRange?: { from?: string | null; to?: string | null } | null
  requestsEndDateRange?: { from?: string | null; to?: string | null } | null
  // Request type filter (EXPENSES, TRIP)
  requestsTypeFilter?: string[]
}

export interface ManagerExpensesOverviewState {
  // Distinct currencies combined and de-duplicated (from requests + plans + payments)
  distinctCurrencies: string[]
  /** Currencies that have at least one advance payment. Use for Advance Payments tab filter options so chips only show currencies that yield results. */
  distinctCurrenciesFromPayments: string[]
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
const DEFAULT_PLAN_ORDER: any[] = [{ createdAt: 'DESC' }]
const DEFAULT_PAY_ORDER: any[] = [{ createdAt: 'DESC' }]

function buildStatusWhere(statuses?: string[]): GqlBoolExp {
  if (Array.isArray(statuses) && statuses.length > 0) {
    return { status: { _in: statuses } } as unknown as GqlBoolExp
  }
  // Exclude CREATED status by default when no specific filter is provided
  return { status: { _neq: 'CREATED' } } as unknown as GqlBoolExp
}

/** Build plan status filter. When exclude is provided (e.g. PLAN_TAB_HIDDEN_STATUSES), uses it; otherwise excludes only CREATED. */
function buildPlanStatusWhere(statuses?: string[], exclude?: readonly string[]): GqlBoolExp {
  const excluded: readonly string[] = Array.isArray(exclude) && exclude.length > 0 ? exclude : ['CREATED']
  const selected = Array.isArray(statuses) ? statuses.filter(Boolean) : []
  const allowed = selected.filter(s => !excluded.includes(s))
  if (allowed.length > 0) {
    return { status: { _in: allowed } } as unknown as GqlBoolExp
  }
  return { status: { _nin: excluded } } as unknown as GqlBoolExp
}

function buildOverviewVariables(params: UseManagerExpensesOverviewParams): Record<string, unknown> {
  const currencyRef = params.currencyRef || null
  const searchTerm = buildSearchPattern(params.searchTerm)

  const reqCurrencyWhere = currencyRef ? { currencyRef: { _eq: currencyRef } } : {}
  const planCurrencyWhere = currencyRef ? { currencyRef: { _eq: currencyRef } } : {}
  const payCurrencyWhere = currencyRef ? { currencyRef: { _eq: currencyRef } } : {}

  return {
    managerId: params.managerId,
    currencyRef,
    searchTerm,
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
    payCurrencyWhere,
    planDateWhere: buildPlanDateWhereClause(params),
    reqDateWhere: buildRequestDateWhereClause(params),
    reqStatusWhere: buildStatusWhere(params.requestsStatus),
    planStatusWhere: buildPlanStatusWhere(params.plansStatus, params.plansStatusExclude),
    payStatusWhere: buildStatusWhere(params.paymentsStatus)
  }
}

// Global in-flight request cache to deduplicate concurrent identical calls across components
const inFlightBySignature: Map<string, Promise<any>> = new Map()
// Small memory cache to keep recent results for smooth tab transitions
const cacheBySignature: Map<string, { ts: number; data: ManagerExpensesOverviewState }> = new Map()
const CACHE_TTL_MS = 30_000 // 30s TTL for smooth transitions

function extractDistinctCurrencies(result: any): string[] {
  const currencyRefs = new Set<string>()

  if (Array.isArray(result?.DistinctCurrencies)) {
    for (const row of result.DistinctCurrencies) {
      if (row?.currency_ref) currencyRefs.add(row.currency_ref)
    }
  } else {
    extractDistinctCurrenciesByKeys(result, [
      'DistinctCurrenciesFromItems',
      'DistinctCurrenciesFromRequests',
      'DistinctCurrenciesFromPlans',
      'DistinctCurrenciesFromPayments'
    ]).forEach(currencyRef => currencyRefs.add(currencyRef))
  }

  return Array.from(currencyRefs).sort((left, right) => left.localeCompare(right))
}

function extractDistinctCurrenciesFromPayments(result: any): string[] {
  return extractDistinctCurrenciesByKeys(result, ['DistinctCurrenciesFromPayments'])
}

function transformResultToState(
  result: any,
  distinctCurrencies: string[],
  distinctCurrenciesFromPayments: string[],
  monthlyExpenseTrends: Array<{ month: string; amount: number }>,
  expenseCategories: Array<{ name: string; amount: number }>
): ManagerExpensesOverviewState {
  return {
    distinctCurrencies,
    distinctCurrenciesFromPayments,
    monthlyExpenseTrends,
    expenseCategories,
    ...buildOverviewCoreState(result)
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
  const latestSignatureRef = useRef<string>('')

  // Normalize/prepare variables
  const variables = useMemo(() => {
    return buildOverviewVariables(params)
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
    JSON.stringify(params.plansStatusExclude || []),
    JSON.stringify(params.paymentsStatus || []),
    // Date range filters
    params.plansEffectiveDateRange?.from,
    params.plansEffectiveDateRange?.to,
    params.plansStartDateRange?.from,
    params.plansStartDateRange?.to,
    params.plansEndDateRange?.from,
    params.plansEndDateRange?.to,
    params.plansPlanDateRange?.from,
    params.plansPlanDateRange?.to,
    // Plan type filter
    JSON.stringify(params.plansTypeFilter || []),
    // Request date range filters
    params.requestsEffectiveDateRange?.from,
    params.requestsEffectiveDateRange?.to,
    params.requestsRequestDateRange?.from,
    params.requestsRequestDateRange?.to,
    params.requestsStartDateRange?.from,
    params.requestsStartDateRange?.to,
    params.requestsEndDateRange?.from,
    params.requestsEndDateRange?.to,
    // Request type filter
    JSON.stringify(params.requestsTypeFilter || [])
  ])

  const run = useCallback(async () => {
    if (!context.accessToken || !variables.managerId) return
    const signature = JSON.stringify(variables)

    setError(null)
    // Use cache to avoid flashes on tab switches
    const cached = cacheBySignature.get(signature)
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      latestSignatureRef.current = signature
      setState(cached.data)
      setIsLoading(false)
      return
    }

    latestSignatureRef.current = signature
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

      // Ignore stale response if a newer request was started (e.g. filter + page reset)
      if (latestSignatureRef.current !== signature) return

      // Extract and aggregate data using helper functions
      const distinctCurrencies = extractDistinctCurrencies(result)
      const distinctCurrenciesFromPayments = extractDistinctCurrenciesFromPayments(result)

      const trendItems = Array.isArray(result?.MonthlyExpenseItemsForTrends) ? result.MonthlyExpenseItemsForTrends : []
      const monthlyExpenseTrends = buildMonthlyTrends(trendItems)
      const expenseCategories = aggregateExpenseCategories(trendItems)

      // Transform result into final state
      const nextState = transformResultToState(
        result,
        distinctCurrencies,
        distinctCurrenciesFromPayments,
        monthlyExpenseTrends,
        expenseCategories
      )

      setState(nextState)
      cacheBySignature.set(signature, { ts: Date.now(), data: nextState })
    } catch (e: any) {
      if (latestSignatureRef.current !== signature) return
      setError(e?.message || 'Failed to load manager expenses overview')
    } finally {
      if (latestSignatureRef.current === signature) setIsLoading(false)
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
