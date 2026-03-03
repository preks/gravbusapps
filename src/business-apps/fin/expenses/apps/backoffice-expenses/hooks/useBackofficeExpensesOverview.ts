/**
 * Backoffice Expenses Overview hook - global data (no supervisor/manager filter).
 * Adapted from useManagerExpensesOverview; removes managerId from all queries.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  BACKOFFICE_EXPENSES_OVERVIEW_KPI,
  BACKOFFICE_EXPENSES_OVERVIEW_TABLE
} from '../queries/backofficeExpensesOverview'
import {
  buildSearchPattern,
  buildPlanDateWhereClause,
  buildRequestDateWhereClause,
  extractDistinctCurrenciesByKeys,
  buildMonthlyTrends,
  aggregateExpenseCategories,
  buildOverviewCoreState,
  type GqlBoolExp
} from '../../manager-expenses/hooks/expensesOverview/sharedOverview'

export interface OverviewPagingAndSort<TOrder> {
  limit?: number
  offset?: number
  orderBy?: TOrder[]
}

export interface UseBackofficeExpensesOverviewParams {
  currencyRef?: string | null
  searchTerm?: string | null
  monthStart?: string | null
  monthEnd?: string | null
  yearStart?: string | null
  requests?: OverviewPagingAndSort<any>
  plans?: OverviewPagingAndSort<any>
  payments?: OverviewPagingAndSort<any>
  requestsStatus?: string[]
  plansStatus?: string[]
  plansStatusExclude?: readonly string[]
  paymentsStatus?: string[]
  requestsEmployeeNames?: string[]
  plansEmployeeNames?: string[]
  paymentsEmployeeNames?: string[]
  requestsDepartmentNames?: string[]
  plansDepartmentNames?: string[]
  paymentsDepartmentNames?: string[]
  plansEffectiveDateRange?: { from?: string | null; to?: string | null } | null
  plansStartDateRange?: { from?: string | null; to?: string | null } | null
  plansEndDateRange?: { from?: string | null; to?: string | null } | null
  plansPlanDateRange?: { from?: string | null; to?: string | null } | null
  plansTypeFilter?: string[]
  requestsEffectiveDateRange?: { from?: string | null; to?: string | null } | null
  requestsRequestDateRange?: { from?: string | null; to?: string | null } | null
  requestsStartDateRange?: { from?: string | null; to?: string | null } | null
  requestsEndDateRange?: { from?: string | null; to?: string | null } | null
  requestsTypeFilter?: string[]
  includeRequests?: boolean
  includePlans?: boolean
  includePayments?: boolean
  includeKpis?: boolean
}

export interface BackofficeExpensesOverviewState {
  distinctCurrencies: string[]
  distinctCurrenciesFromPayments: string[]
  teamMembersCount: number
  pendingApprovalsCount: number
  totalPlansAmount: number
  totalRequestsUsedAmount: number
  monthlyExpensesAmount: number
  monthlyExpenseTrends: Array<{ month: string; amount: number }>
  expenseCategories?: Array<{ name: string; amount: number }>
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
  pendingRequestsAll?: number
  pendingPlansAll?: number
  pendingPaymentsAll?: number
  totalRequestsAll?: number
  totalPlansAll?: number
  totalPaymentsAll?: number
  expenseRequests: any[]
  expenseRequestsTotal: number
  expensePlans: any[]
  expensePlansTotal: number
  advancePayments: any[]
  advancePaymentsTotal: number
}

export interface UseBackofficeExpensesOverviewReturn {
  data: BackofficeExpensesOverviewState | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_REQ_ORDER: any[] = [{ createdAt: 'DESC' }]
const DEFAULT_PLAN_ORDER: any[] = [{ createdAt: 'DESC' }]
const DEFAULT_PAY_ORDER: any[] = [{ createdAt: 'DESC' }]

function buildStatusWhere(statuses?: string[]): GqlBoolExp {
  const excludedStatuses = ['CREATED', 'DISCARDED']
  if (Array.isArray(statuses) && statuses.length > 0) {
    const allowedStatuses = statuses.filter(status => !excludedStatuses.includes(status))
    if (allowedStatuses.length > 0) {
      return { status: { _in: allowedStatuses } } as unknown as GqlBoolExp
    }
    return { status: { _nin: excludedStatuses } } as unknown as GqlBoolExp
  }
  return { status: { _nin: excludedStatuses } } as unknown as GqlBoolExp
}

function buildPlanStatusWhere(statuses?: string[], exclude?: readonly string[]): GqlBoolExp {
  const excluded: readonly string[] = Array.isArray(exclude) && exclude.length > 0 ? exclude : ['CREATED', 'DISCARDED']
  const selected = Array.isArray(statuses) ? statuses.filter(Boolean) : []
  const allowed = selected.filter(s => !excluded.includes(s))
  if (allowed.length > 0) {
    return { status: { _in: allowed } } as unknown as GqlBoolExp
  }
  return { status: { _nin: excluded } } as unknown as GqlBoolExp
}

function buildEmployeeNameWhere(
  names: string[] | undefined,
  path: 'employee' | 'expensePlan.employee' = 'employee'
): GqlBoolExp {
  const normalizedNames = Array.isArray(names) ? names.map(name => String(name || '').trim()).filter(Boolean) : []
  if (normalizedNames.length === 0) return {}
  if (path === 'employee') {
    return {
      _or: normalizedNames.map(name => ({ employee: { fullName: { _eq: name } } }))
    } as unknown as GqlBoolExp
  }
  return {
    _or: normalizedNames.map(name => ({ expensePlan: { employee: { fullName: { _eq: name } } } }))
  } as unknown as GqlBoolExp
}

function buildDepartmentNameWhere(
  names: string[] | undefined,
  path: 'employee' | 'expensePlan.employee' = 'employee'
): GqlBoolExp {
  const normalizedNames = Array.isArray(names) ? names.map(name => String(name || '').trim()).filter(Boolean) : []
  if (normalizedNames.length === 0) return {}
  if (path === 'employee') {
    return {
      _or: normalizedNames.map(name => ({
        employee: {
          employeePosition: {
            organizationalUnit: {
              name: { _eq: name }
            }
          }
        }
      }))
    } as unknown as GqlBoolExp
  }
  return {
    _or: normalizedNames.map(name => ({
      expensePlan: {
        employee: {
          employeePosition: {
            organizationalUnit: {
              name: { _eq: name }
            }
          }
        }
      }
    }))
  } as unknown as GqlBoolExp
}

function combineWithAnd(baseWhere: GqlBoolExp, extraWhere: GqlBoolExp): GqlBoolExp {
  const baseHasKeys = Object.keys(baseWhere || {}).length > 0
  const extraHasKeys = Object.keys(extraWhere || {}).length > 0
  if (!baseHasKeys && !extraHasKeys) return {}
  if (!baseHasKeys) return extraWhere
  if (!extraHasKeys) return baseWhere
  return { _and: [baseWhere, extraWhere] } as unknown as GqlBoolExp
}

function buildBackofficeOverviewVariables(params: UseBackofficeExpensesOverviewParams): Record<string, unknown> {
  const currencyRef = params.currencyRef || null
  const searchTerm = buildSearchPattern(params.searchTerm)
  const reqCurrencyWhere = currencyRef ? { currencyRef: { _eq: currencyRef } } : {}
  const planCurrencyWhere = currencyRef ? { currencyRef: { _eq: currencyRef } } : {}
  const payCurrencyWhere = currencyRef ? { currencyRef: { _eq: currencyRef } } : {}

  return {
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
    planDateWhere: combineWithAnd(
      combineWithAnd(buildPlanDateWhereClause(params), buildEmployeeNameWhere(params.plansEmployeeNames, 'employee')),
      buildDepartmentNameWhere(params.plansDepartmentNames, 'employee')
    ),
    reqDateWhere: combineWithAnd(
      combineWithAnd(
        buildRequestDateWhereClause(params),
        buildEmployeeNameWhere(params.requestsEmployeeNames, 'employee')
      ),
      buildDepartmentNameWhere(params.requestsDepartmentNames, 'employee')
    ),
    reqStatusWhere: buildStatusWhere(params.requestsStatus),
    planStatusWhere: buildPlanStatusWhere(params.plansStatus, params.plansStatusExclude),
    payStatusWhere: combineWithAnd(
      combineWithAnd(
        buildStatusWhere(params.paymentsStatus),
        buildEmployeeNameWhere(params.paymentsEmployeeNames, 'expensePlan.employee')
      ),
      buildDepartmentNameWhere(params.paymentsDepartmentNames, 'expensePlan.employee')
    ),
    includeRequests: params.includeRequests ?? true,
    includePlans: params.includePlans ?? true,
    includePayments: params.includePayments ?? true
  }
}

function pickTableQueryVariables(variables: Record<string, unknown>): Record<string, unknown> {
  const {
    searchTerm,
    reqLimit,
    reqOffset,
    reqOrderBy,
    planLimit,
    planOffset,
    planOrderBy,
    payLimit,
    payOffset,
    payOrderBy,
    reqCurrencyWhere,
    planCurrencyWhere,
    payCurrencyWhere,
    reqStatusWhere,
    planStatusWhere,
    payStatusWhere,
    planDateWhere,
    reqDateWhere,
    includeRequests,
    includePlans,
    includePayments
  } = variables

  return {
    searchTerm,
    reqLimit,
    reqOffset,
    reqOrderBy,
    planLimit,
    planOffset,
    planOrderBy,
    payLimit,
    payOffset,
    payOrderBy,
    reqCurrencyWhere,
    planCurrencyWhere,
    payCurrencyWhere,
    reqStatusWhere,
    planStatusWhere,
    payStatusWhere,
    planDateWhere,
    reqDateWhere,
    includeRequests,
    includePlans,
    includePayments
  }
}

function pickKpiQueryVariables(variables: Record<string, unknown>): Record<string, unknown> {
  const { currencyRef, monthStart, monthEnd, yearStart, reqCurrencyWhere, planCurrencyWhere } = variables

  return {
    currencyRef,
    monthStart,
    monthEnd,
    yearStart,
    reqCurrencyWhere,
    planCurrencyWhere
  }
}

const mergeOverviewResults = (tableResult?: Record<string, unknown>, kpiResult?: Record<string, unknown>) => ({
  ...kpiResult,
  ...tableResult
})

const inFlightBySignature: Map<string, Promise<any>> = new Map()
const cacheBySignature: Map<string, { ts: number; data: BackofficeExpensesOverviewState }> = new Map()
const CACHE_TTL_MS = 30_000

function extractDistinctCurrenciesFromPayments(result: any): string[] {
  return extractDistinctCurrenciesByKeys(result, ['DistinctCurrenciesFromPayments'])
}

function extractDistinctCurrencies(result: any): string[] {
  return extractDistinctCurrenciesByKeys(result, [
    'DistinctCurrenciesFromItems',
    'DistinctCurrenciesFromRequests',
    'DistinctCurrenciesFromPlans',
    'DistinctCurrenciesFromPayments'
  ])
}

function transformResultToState(
  result: any,
  distinctCurrencies: string[],
  distinctCurrenciesFromPayments: string[],
  monthlyExpenseTrends: Array<{ month: string; amount: number }>,
  expenseCategories: Array<{ name: string; amount: number }>
): BackofficeExpensesOverviewState {
  return {
    distinctCurrencies,
    distinctCurrenciesFromPayments,
    monthlyExpenseTrends,
    expenseCategories,
    ...buildOverviewCoreState(result)
  }
}

export const useBackofficeExpensesOverview = (
  context: BusinessAppContextProps,
  params: UseBackofficeExpensesOverviewParams
): UseBackofficeExpensesOverviewReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<BackofficeExpensesOverviewState | null>(null)
  const latestSignatureRef = useRef<string>('')

  const variables = useMemo(
    () => buildBackofficeOverviewVariables(params),
    [
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
      JSON.stringify(params.requestsStatus || []),
      JSON.stringify(params.plansStatus || []),
      JSON.stringify(params.plansStatusExclude || []),
      JSON.stringify(params.paymentsStatus || []),
      JSON.stringify(params.requestsEmployeeNames || []),
      JSON.stringify(params.plansEmployeeNames || []),
      JSON.stringify(params.paymentsEmployeeNames || []),
      JSON.stringify(params.requestsDepartmentNames || []),
      JSON.stringify(params.plansDepartmentNames || []),
      JSON.stringify(params.paymentsDepartmentNames || []),
      params.plansEffectiveDateRange?.from,
      params.plansEffectiveDateRange?.to,
      params.plansStartDateRange?.from,
      params.plansStartDateRange?.to,
      params.plansEndDateRange?.from,
      params.plansEndDateRange?.to,
      params.plansPlanDateRange?.from,
      params.plansPlanDateRange?.to,
      JSON.stringify(params.plansTypeFilter || []),
      params.requestsEffectiveDateRange?.from,
      params.requestsEffectiveDateRange?.to,
      params.requestsRequestDateRange?.from,
      params.requestsRequestDateRange?.to,
      params.requestsStartDateRange?.from,
      params.requestsStartDateRange?.to,
      params.requestsEndDateRange?.from,
      params.requestsEndDateRange?.to,
      JSON.stringify(params.requestsTypeFilter || []),
      params.includeRequests,
      params.includePlans,
      params.includePayments
    ]
  )

  const run = useCallback(async () => {
    if (!context.accessToken) return
    const includeRequests = params.includeRequests ?? true
    const includePlans = params.includePlans ?? true
    const includePayments = params.includePayments ?? true
    const shouldFetchTable = includeRequests || includePlans || includePayments
    const shouldFetchKpis = params.includeKpis ?? true
    const tableVariables = pickTableQueryVariables(variables)
    const kpiVariables = pickKpiQueryVariables(variables)
    const signature = JSON.stringify({ tableVariables, kpiVariables, shouldFetchTable, shouldFetchKpis })
    setError(null)
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
        requestPromise = Promise.all([
          shouldFetchTable
            ? graphqlClient.request(BACKOFFICE_EXPENSES_OVERVIEW_TABLE, tableVariables)
            : Promise.resolve(undefined),
          shouldFetchKpis
            ? graphqlClient.request(BACKOFFICE_EXPENSES_OVERVIEW_KPI, kpiVariables)
            : Promise.resolve(undefined)
        ])
          .then(([tableResult, kpiResult]) =>
            mergeOverviewResults(
              tableResult as Record<string, unknown> | undefined,
              kpiResult as Record<string, unknown> | undefined
            )
          )
          .finally(() => {
            inFlightBySignature.delete(signature)
          })
        inFlightBySignature.set(signature, requestPromise)
      }
      const result: any = await requestPromise
      if (latestSignatureRef.current !== signature) return

      const distinctCurrencies = extractDistinctCurrencies(result)
      const distinctCurrenciesFromPayments = extractDistinctCurrenciesFromPayments(result)
      const trendItems = Array.isArray(result?.MonthlyExpenseItemsForTrends) ? result.MonthlyExpenseItemsForTrends : []
      const monthlyExpenseTrends = buildMonthlyTrends(trendItems)
      const expenseCategories = aggregateExpenseCategories(trendItems)

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
      setError(e?.message || 'Failed to load backoffice expenses overview')
    } finally {
      if (latestSignatureRef.current === signature) setIsLoading(false)
    }
  }, [
    context.accessToken,
    graphqlClient,
    variables,
    params.includeRequests,
    params.includePlans,
    params.includePayments,
    params.includeKpis
  ])

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
