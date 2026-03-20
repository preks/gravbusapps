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
  buildPlanDateWhereClause,
  buildRequestDateWhereClause,
  buildOverviewBaseVariables,
  buildOverviewStateFromResult,
  buildOverviewCoreDependencies,
  executeOverviewWithCache,
  type GqlBoolExp
} from './backofficeSharedOverview'

interface OverviewPagingAndSort<TOrder> {
  limit?: number
  offset?: number
  orderBy?: TOrder[]
}

interface UseBackofficeExpensesOverviewParams {
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
  plansPlanDateRange?: { from?: string | null; to?: string | null } | null
  plansTypeFilter?: string[]
  requestsEffectiveDateRange?: { from?: string | null; to?: string | null } | null
  requestsRequestDateRange?: { from?: string | null; to?: string | null } | null
  requestsTypeFilter?: string[]
  includeRequests?: boolean
  includePlans?: boolean
  includePayments?: boolean
  includeKpis?: boolean
}

interface BackofficeExpensesOverviewState {
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

interface UseBackofficeExpensesOverviewReturn {
  data: BackofficeExpensesOverviewState | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_OVERVIEW_ORDER: any[] = [{ createdAt: 'DESC' }]

const REQUEST_EXCLUDED_STATUSES = ['CREATED', 'DISCARDED']
const PAYMENT_EXCLUDED_STATUSES = ['CREATED', 'RETURNED', 'REJECTED', 'DISCARDED']
const PLAN_EXCLUDED_STATUSES = ['CREATED', 'DISCARDED']

function buildEntityStatusWhere(statuses: string[] | undefined, defaultExcluded: string[]): GqlBoolExp {
  if (Array.isArray(statuses) && statuses.length > 0) {
    return { status: { _in: statuses } } as unknown as GqlBoolExp
  }
  return { status: { _nin: defaultExcluded } } as unknown as GqlBoolExp
}

function buildStatusWhere(statuses?: string[]): GqlBoolExp {
  return buildEntityStatusWhere(statuses, REQUEST_EXCLUDED_STATUSES)
}

function buildPaymentStatusWhere(statuses?: string[]): GqlBoolExp {
  return buildEntityStatusWhere(statuses, PAYMENT_EXCLUDED_STATUSES)
}

function buildPlanStatusWhere(statuses?: string[], exclude?: readonly string[]): GqlBoolExp {
  const excluded = Array.isArray(exclude) && exclude.length > 0 ? exclude : PLAN_EXCLUDED_STATUSES
  return buildEntityStatusWhere(statuses, excluded)
}

function buildBackofficeOverviewDependencies(params: UseBackofficeExpensesOverviewParams): unknown[] {
  const dateRangePairs: Array<{ from?: string | null; to?: string | null } | null | undefined> = [
    params.plansEffectiveDateRange,
    params.plansPlanDateRange,
    params.requestsEffectiveDateRange,
    params.requestsRequestDateRange
  ]
  return [
    ...buildOverviewCoreDependencies(params),
    JSON.stringify(params.requestsEmployeeNames || []),
    JSON.stringify(params.plansEmployeeNames || []),
    JSON.stringify(params.paymentsEmployeeNames || []),
    JSON.stringify(params.requestsDepartmentNames || []),
    JSON.stringify(params.plansDepartmentNames || []),
    JSON.stringify(params.paymentsDepartmentNames || []),
    ...dateRangePairs.flatMap(range => [range?.from, range?.to]),
    JSON.stringify(params.plansTypeFilter || []),
    JSON.stringify(params.requestsTypeFilter || []),
    params.includeRequests,
    params.includePlans,
    params.includePayments
  ]
}

function normalizeNames(names: string[] | undefined): string[] {
  return Array.isArray(names) ? names.map(name => String(name || '').trim()).filter(Boolean) : []
}

function wrapScopedEmployeeWhere(path: 'employee' | 'expensePlan.employee', employeeWhere: GqlBoolExp): GqlBoolExp {
  return path === 'employee' ? { employee: employeeWhere } : { expensePlan: { employee: employeeWhere } }
}

function buildScopedNameWhere(
  names: string[] | undefined,
  path: 'employee' | 'expensePlan.employee',
  buildEmployeeWhere: (name: string) => GqlBoolExp
): GqlBoolExp {
  const normalizedNames = normalizeNames(names)
  if (normalizedNames.length === 0) return {}
  return {
    _or: normalizedNames.map(name => wrapScopedEmployeeWhere(path, buildEmployeeWhere(name)))
  } as unknown as GqlBoolExp
}

function buildEmployeeNameWhere(
  names: string[] | undefined,
  path: 'employee' | 'expensePlan.employee' = 'employee'
): GqlBoolExp {
  return buildScopedNameWhere(names, path, name => ({ fullName: { _eq: name } }))
}

function buildDepartmentNameWhere(
  names: string[] | undefined,
  path: 'employee' | 'expensePlan.employee' = 'employee'
): GqlBoolExp {
  return buildScopedNameWhere(names, path, idOrName => ({
    employeePosition: {
      organizationalUnitId: { _eq: idOrName }
    }
  }))
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
  const baseVariables = buildOverviewBaseVariables(params, {
    reqOrder: DEFAULT_OVERVIEW_ORDER,
    planOrder: DEFAULT_OVERVIEW_ORDER,
    payOrder: DEFAULT_OVERVIEW_ORDER
  })

  return {
    ...baseVariables,
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
        buildPaymentStatusWhere(params.paymentsStatus),
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

export const useBackofficeExpensesOverview = (
  context: BusinessAppContextProps,
  params: UseBackofficeExpensesOverviewParams
): UseBackofficeExpensesOverviewReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<BackofficeExpensesOverviewState | null>(null)
  const latestSignatureRef = useRef<string>('')

  const dependencies = useMemo(() => buildBackofficeOverviewDependencies(params), [params])
  const variables = useMemo(() => buildBackofficeOverviewVariables(params), dependencies)

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
    await executeOverviewWithCache({
      signature,
      latestSignatureRef,
      cacheBySignature,
      inFlightBySignature,
      cacheTtlMs: CACHE_TTL_MS,
      setError,
      setIsLoading,
      setState,
      requestFactory: () =>
        Promise.all([
          shouldFetchTable
            ? graphqlClient.request(BACKOFFICE_EXPENSES_OVERVIEW_TABLE, tableVariables)
            : Promise.resolve(undefined),
          shouldFetchKpis
            ? graphqlClient.request(BACKOFFICE_EXPENSES_OVERVIEW_KPI, kpiVariables)
            : Promise.resolve(undefined)
        ]).then(([tableResult, kpiResult]) =>
          mergeOverviewResults(
            tableResult as Record<string, unknown> | undefined,
            kpiResult as Record<string, unknown> | undefined
          )
        ),
      resultToState: (result: any) => buildOverviewStateFromResult(result) as BackofficeExpensesOverviewState,
      fallbackErrorMessage: 'Failed to load backoffice expenses overview'
    })
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
