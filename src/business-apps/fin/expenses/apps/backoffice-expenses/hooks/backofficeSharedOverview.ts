type DateRangeInput = { from?: string | null; to?: string | null } | null | undefined
export type GqlBoolExp = Record<string, unknown>
type RequestTypeMode = 'plan' | 'request'
type PaginationParams = {
  currencyRef?: string | null
  searchTerm?: string | null
  monthStart?: string | null
  monthEnd?: string | null
  yearStart?: string | null
  requests?: { limit?: number; offset?: number; orderBy?: any[] }
  plans?: { limit?: number; offset?: number; orderBy?: any[] }
  payments?: { limit?: number; offset?: number; orderBy?: any[] }
  requestsStatus?: string[]
  plansStatus?: string[]
  plansStatusExclude?: readonly string[]
  paymentsStatus?: string[]
}

export type OverviewDateFilterParams = {
  plansEffectiveDateRange?: DateRangeInput
  plansStartDateRange?: DateRangeInput
  plansEndDateRange?: DateRangeInput
  plansPlanDateRange?: DateRangeInput
  plansTypeFilter?: string[]
  requestsEffectiveDateRange?: DateRangeInput
  requestsRequestDateRange?: DateRangeInput
  requestsStartDateRange?: DateRangeInput
  requestsEndDateRange?: DateRangeInput
  requestsTypeFilter?: string[]
}

function buildSearchPattern(searchTerm?: string | null): string {
  const trimmedSearch = (searchTerm ?? '').toString().trim()
  return trimmedSearch.length > 0 ? `%${trimmedSearch}%` : '%%'
}

export function buildDateRangeCondition(from?: string | null, to?: string | null): GqlBoolExp | null {
  if (!from && !to) return null
  const condition: Record<string, string> = {}
  if (from) condition._gte = from
  if (to) condition._lte = to
  return Object.keys(condition).length > 0 ? (condition as unknown as GqlBoolExp) : null
}

function wrapFieldCondition(field: string, condition: GqlBoolExp | null): GqlBoolExp | null {
  return condition ? ({ [field]: condition } as unknown as GqlBoolExp) : null
}

function buildEffectiveDateFilter(range: DateRangeInput, mode: RequestTypeMode): GqlBoolExp | null {
  if (!range?.from && !range?.to) return null
  const tripAnd: GqlBoolExp[] = []
  const expenseAnd: GqlBoolExp[] = []

  const assignExpenseDateCondition = (operator: '_gte' | '_lte', value: string) => {
    if (mode === 'plan') {
      expenseAnd.push({ expensePlanItem: { expenseDate: { [operator]: value } } })
      return
    }
    expenseAnd.push({ expenseItem: { expenseDate: { [operator]: value } } })
  }

  if (range.from) {
    tripAnd.push({ startDate: { _gte: range.from } })
    assignExpenseDateCondition('_gte', range.from)
  }
  if (range.to) {
    tripAnd.push({ startDate: { _lte: range.to } })
    assignExpenseDateCondition('_lte', range.to)
  }
  if (tripAnd.length === 0 && expenseAnd.length === 0) return null
  return {
    _or: [
      { _and: [{ requestTypeRef: { _eq: 'ExpenseRequestType:v1:TRIP' } }, ...tripAnd] },
      { _and: [{ requestTypeRef: { _eq: 'ExpenseRequestType:v1:EXPENSES' } }, ...expenseAnd] }
    ]
  } as unknown as GqlBoolExp
}

function buildPlanEffectiveDateFilter(range: DateRangeInput): GqlBoolExp | null {
  return buildEffectiveDateFilter(range, 'plan')
}

export function buildRequestEffectiveDateFilter(range: DateRangeInput): GqlBoolExp | null {
  return buildEffectiveDateFilter(range, 'request')
}

function buildPlanTypeFilter(typeFilters?: string[]): GqlBoolExp | null {
  if (!typeFilters || typeFilters.length === 0) return null
  const planTypeTokens = typeFilters.filter(filterToken => filterToken.startsWith('planType:'))
  if (planTypeTokens.length === 0) return null
  const allowedTypes = planTypeTokens
    .map(filterToken => filterToken.replace('planType:', ''))
    .filter(typeValue => typeValue === 'EXPENSES' || typeValue === 'TRIP')
  if (allowedTypes.length === 0) return null
  return {
    _or: allowedTypes.map(typeValue => ({ requestTypeRef: { _eq: `ExpenseRequestType:v1:${typeValue}` } }))
  } as unknown as GqlBoolExp
}

export function buildRequestTypeFilter(typeFilters?: string[]): GqlBoolExp | null {
  if (!typeFilters || typeFilters.length === 0) return null
  const requestTypeTokens = typeFilters.filter(filterToken => filterToken.startsWith('ExpenseRequestType:'))
  if (requestTypeTokens.length === 0) return null
  const allowedTypes = requestTypeTokens
    .map(filterToken => filterToken.replace('ExpenseRequestType:v1:', ''))
    .filter(typeValue => typeValue === 'EXPENSES' || typeValue === 'TRIP')
  if (allowedTypes.length === 0) return null
  return {
    _or: allowedTypes.map(typeValue => ({ requestTypeRef: { _eq: `ExpenseRequestType:v1:${typeValue}` } }))
  } as unknown as GqlBoolExp
}

export function buildPlanDateWhereClause(params: OverviewDateFilterParams): GqlBoolExp {
  const conditions = [
    buildPlanEffectiveDateFilter(params.plansEffectiveDateRange),
    wrapFieldCondition(
      'startDate',
      buildDateRangeCondition(params.plansStartDateRange?.from, params.plansStartDateRange?.to)
    ),
    wrapFieldCondition(
      'endDate',
      buildDateRangeCondition(params.plansEndDateRange?.from, params.plansEndDateRange?.to)
    ),
    wrapFieldCondition(
      'planDate',
      buildDateRangeCondition(params.plansPlanDateRange?.from, params.plansPlanDateRange?.to)
    ),
    buildPlanTypeFilter(params.plansTypeFilter)
  ].filter(Boolean)
  return (conditions.length > 0 ? { _and: conditions } : {}) as unknown as GqlBoolExp
}

export function buildRequestDateWhereClause(params: OverviewDateFilterParams): GqlBoolExp {
  const conditions = [
    buildRequestEffectiveDateFilter(params.requestsEffectiveDateRange),
    wrapFieldCondition(
      'requestDate',
      buildDateRangeCondition(params.requestsRequestDateRange?.from, params.requestsRequestDateRange?.to)
    ),
    wrapFieldCondition(
      'startDate',
      buildDateRangeCondition(params.requestsStartDateRange?.from, params.requestsStartDateRange?.to)
    ),
    wrapFieldCondition(
      'endDate',
      buildDateRangeCondition(params.requestsEndDateRange?.from, params.requestsEndDateRange?.to)
    ),
    buildRequestTypeFilter(params.requestsTypeFilter)
  ].filter(Boolean)
  return (conditions.length > 0 ? { _and: conditions } : {}) as unknown as GqlBoolExp
}

function extractDistinctCurrenciesByKeys(result: any, keys: string[]): string[] {
  const currencyRefs = new Set<string>()
  const pushRefs = (arr?: Array<{ currencyRef?: string }>) => {
    if (!Array.isArray(arr)) return
    for (const row of arr) {
      if (row?.currencyRef) currencyRefs.add(row.currencyRef)
    }
  }
  keys.forEach(key => {
    pushRefs(result?.[key])
  })
  return Array.from(currencyRefs).sort((left, right) => left.localeCompare(right))
}

function buildMonthlyTrends(trendItems: any[]): Array<{ month: string; amount: number }> {
  const monthToAmount = new Map<string, number>()
  for (const row of trendItems) {
    const typeRef: string | undefined = row?.expenseRequest?.requestTypeRef
    const effectiveDate: string | undefined =
      typeRef === 'ExpenseRequestType:v1:TRIP' ? row?.expenseRequest?.startDate : row?.expenseDate
    if (!effectiveDate) continue
    const monthKey = String(effectiveDate).slice(0, 7)
    const prev = monthToAmount.get(monthKey) ?? 0
    const add = Number(row?.reimbursableAmount ?? 0) || 0
    monthToAmount.set(monthKey, prev + add)
  }
  return Array.from(monthToAmount.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([month, amount]) => ({ month, amount }))
}

function aggregateExpenseCategories(trendItems: any[]): Array<{ name: string; amount: number }> {
  const categoryMap = new Map<string, number>()
  for (const row of trendItems) {
    const positions = Array.isArray(row?.expensePosition) ? row.expensePosition : []
    if (positions.length === 0) continue
    const per = (Number(row?.reimbursableAmount ?? 0) || 0) / positions.length
    for (const position of positions) {
      const translations = Array.isArray(position?.expenseGroup?.translations) ? position.expenseGroup.translations : []
      const fallback = position?.expenseGroup?.value || 'Uncategorized'
      const currentLocale = String(globalThis?.window?.lowcoder?.i18n?.selectedLocale || 'en-US').toLowerCase()
      const localized =
        translations.find((translation: any) => String(translation?.localeCode || '').toLowerCase() === currentLocale)
          ?.value || fallback
      categoryMap.set(localized, (categoryMap.get(localized) || 0) + per)
    }
  }
  return Array.from(categoryMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((left, right) => right.amount - left.amount)
}

function buildOverviewCoreState(result: any) {
  const expenseRequests = Array.isArray(result?.ExpenseRequests) ? result.ExpenseRequests : []
  const expenseRequestsTotal = Number(result?.ExpenseRequestsAggregate?.aggregate?.count ?? 0)
  const expensePlans = Array.isArray(result?.ExpensePlans) ? result.ExpensePlans : []
  const expensePlansTotal = Number(result?.ExpensePlansAggregate?.aggregate?.count ?? 0)
  const advancePayments = Array.isArray(result?.AdvancePayments) ? result.AdvancePayments : []
  const advancePaymentsTotal = Number(result?.AdvancePaymentsAggregate?.aggregate?.count ?? 0)

  return {
    teamMembersCount: Number(result?.TeamMembersAggregate?.aggregate?.count ?? 0),
    pendingApprovalsCount: Number(result?.PendingApprovalsAggregate?.aggregate?.count ?? 0),
    totalPlansAmount: Number(result?.ExpensePlansTotalAggregate?.aggregate?.sum?.totalAmount ?? 0),
    totalRequestsUsedAmount: Number(result?.ExpenseRequestsUsedAggregate?.aggregate?.sum?.reimbursableAmount ?? 0),
    monthlyExpensesAmount: Number(result?.MonthlyExpensesAggregate?.aggregate?.sum?.reimbursableAmount ?? 0),
    expenseRequests,
    expenseRequestsTotal,
    expensePlans,
    expensePlansTotal,
    advancePayments,
    advancePaymentsTotal,
    requestPendingCount: Number(result?.RequestsPendingCountAggregate?.aggregate?.count ?? 0),
    requestPendingAmount: Number(result?.RequestsPendingAmountAggregate?.aggregate?.sum?.reimbursableAmount ?? 0) || 0,
    requestSubmittedCount: Number(result?.RequestsSubmittedCountAggregate?.aggregate?.count ?? 0),
    requestSubmittedAmount:
      Number(result?.RequestsSubmittedAmountAggregate?.aggregate?.sum?.reimbursableAmount ?? 0) || 0,
    planTotalCount: Number(result?.AllPlansAggregate?.aggregate?.count ?? 0),
    planTotalAmount: Number(result?.AllPlansAggregate?.aggregate?.sum?.totalAmount ?? 0) || 0,
    planPendingCount: Number(result?.PendingPlansCountAggregate?.aggregate?.count ?? 0),
    planPendingAmount: Number(result?.PendingPlansAmountAggregate?.aggregate?.sum?.totalAmount ?? 0) || 0,
    paymentTotalCount: Number(result?.AllPaymentsAggregate?.aggregate?.count ?? 0),
    paymentTotalAmount: Number(result?.AllPaymentsAggregate?.aggregate?.sum?.amount ?? 0) || 0,
    paymentPendingCount: Number(result?.PendingPaymentsAggregate?.aggregate?.count ?? 0),
    paymentPendingAmount: Number(result?.PendingPaymentsAggregate?.aggregate?.sum?.amount ?? 0) || 0,
    pendingRequestsAll: Number(result?.PendingRequestsAllCountAggregate?.aggregate?.count ?? 0),
    pendingPlansAll: Number(result?.PendingPlansAllCountAggregate?.aggregate?.count ?? 0),
    pendingPaymentsAll: Number(result?.PendingPaymentsAllCountAggregate?.aggregate?.count ?? 0),
    totalRequestsAll: Number(result?.TotalRequestsAllCountAggregate?.aggregate?.count ?? 0),
    totalPlansAll: Number(result?.TotalPlansAllCountAggregate?.aggregate?.count ?? 0),
    totalPaymentsAll: Number(result?.TotalPaymentsAllCountAggregate?.aggregate?.count ?? 0)
  }
}

export function buildOverviewBaseVariables(
  params: PaginationParams,
  defaults: { reqOrder: any[]; planOrder: any[]; payOrder: any[] }
): Record<string, unknown> {
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
    reqOrderBy: params.requests?.orderBy ?? defaults.reqOrder,
    planLimit: params.plans?.limit ?? 20,
    planOffset: params.plans?.offset ?? 0,
    planOrderBy: params.plans?.orderBy ?? defaults.planOrder,
    payLimit: params.payments?.limit ?? 20,
    payOffset: params.payments?.offset ?? 0,
    payOrderBy: params.payments?.orderBy ?? defaults.payOrder,
    monthStart: params.monthStart ?? undefined,
    monthEnd: params.monthEnd ?? undefined,
    yearStart: params.yearStart ?? undefined,
    reqCurrencyWhere,
    planCurrencyWhere,
    payCurrencyWhere
  }
}

function buildOverviewState(
  result: any,
  distinctCurrencies: string[],
  distinctCurrenciesFromPayments: string[],
  monthlyExpenseTrends: Array<{ month: string; amount: number }>,
  expenseCategories: Array<{ name: string; amount: number }>
) {
  return {
    distinctCurrencies,
    distinctCurrenciesFromPayments,
    monthlyExpenseTrends,
    expenseCategories,
    ...buildOverviewCoreState(result)
  }
}

const OVERVIEW_CURRENCY_KEYS = [
  'DistinctCurrenciesFromItems',
  'DistinctCurrenciesFromRequests',
  'DistinctCurrenciesFromPlans',
  'DistinctCurrenciesFromPayments'
]

function extractDistinctOverviewCurrencies(result: any): string[] {
  const currencyRefs = new Set<string>()

  if (Array.isArray(result?.DistinctCurrencies)) {
    for (const row of result.DistinctCurrencies) {
      if (row?.currency_ref) currencyRefs.add(row.currency_ref)
    }
  } else {
    extractDistinctCurrenciesByKeys(result, OVERVIEW_CURRENCY_KEYS).forEach(currencyRef => {
      currencyRefs.add(currencyRef)
    })
  }

  return Array.from(currencyRefs).sort((left, right) => left.localeCompare(right))
}

function extractDistinctOverviewPaymentCurrencies(result: any): string[] {
  return extractDistinctCurrenciesByKeys(result, ['DistinctCurrenciesFromPayments'])
}

export function buildOverviewStateFromResult(result: any) {
  const distinctCurrencies = extractDistinctOverviewCurrencies(result)
  const distinctCurrenciesFromPayments = extractDistinctOverviewPaymentCurrencies(result)
  const trendItems = Array.isArray(result?.MonthlyExpenseItemsForTrends) ? result.MonthlyExpenseItemsForTrends : []
  const monthlyExpenseTrends = buildMonthlyTrends(trendItems)
  const expenseCategories = aggregateExpenseCategories(trendItems)

  return buildOverviewState(
    result,
    distinctCurrencies,
    distinctCurrenciesFromPayments,
    monthlyExpenseTrends,
    expenseCategories
  )
}

export function buildOverviewCoreDependencies(params: PaginationParams): unknown[] {
  return [
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
    JSON.stringify(params.paymentsStatus || [])
  ]
}

type CachedState<T> = { ts: number; data: T }
type ExecuteWithCacheOptions<TState> = {
  signature: string
  latestSignatureRef: { current: string }
  cacheBySignature: Map<string, CachedState<TState>>
  inFlightBySignature: Map<string, Promise<any>>
  cacheTtlMs: number
  setError: (value: string | null) => void
  setIsLoading: (value: boolean) => void
  setState: (value: TState) => void
  requestFactory: () => Promise<any>
  resultToState: (result: any) => TState
  fallbackErrorMessage: string
}

export async function executeOverviewWithCache<TState>(options: ExecuteWithCacheOptions<TState>): Promise<void> {
  const {
    signature,
    latestSignatureRef,
    cacheBySignature,
    inFlightBySignature,
    cacheTtlMs,
    setError,
    setIsLoading,
    setState,
    requestFactory,
    resultToState,
    fallbackErrorMessage
  } = options

  setError(null)
  const cached = cacheBySignature.get(signature)
  if (cached && Date.now() - cached.ts < cacheTtlMs) {
    latestSignatureRef.current = signature
    setState(cached.data)
    setIsLoading(false)
    return
  }

  latestSignatureRef.current = signature
  setIsLoading(true)

  try {
    let requestPromise = inFlightBySignature.get(signature)
    const isNewRequest = !requestPromise
    if (isNewRequest) {
      requestPromise = requestFactory().finally(() => {
        inFlightBySignature.delete(signature)
      })
      inFlightBySignature.set(signature, requestPromise)
    }

    const result = await requestPromise
    if (latestSignatureRef.current !== signature) return

    const nextState = resultToState(result)
    setState(nextState)
    cacheBySignature.set(signature, { ts: Date.now(), data: nextState })
  } catch (error: any) {
    if (latestSignatureRef.current !== signature) return
    setError(error?.message || fallbackErrorMessage)
  } finally {
    if (latestSignatureRef.current === signature) {
      setIsLoading(false)
    }
  }
}
