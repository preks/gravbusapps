// Query builder and filter utilities for Advance Payments
// SOLID: keep query construction separate from static query strings

export interface AdvancePaymentFilters {
  statusFilter?: string[]
  amountRange?: { min?: number; max?: number }
  advanceRange?: { min?: number; max?: number }
  currencyRef?: string
  /** When set, restricts rows to AdvancePayment.createdAt within [gte, lte] (matches statistics cards). */
  createdAtRange?: { gte: string; lte: string } | null
}

export interface AdvancePaymentsQueryOptions {
  includeSearch?: boolean
}

export interface FilterState {
  hasStatusFilter: boolean
  hasAmountRange: boolean
  hasAdvanceRange: boolean
  hasCurrencyRef: boolean
  hasCreatedAtRange: boolean
}

export const validateFilters = (filters: AdvancePaymentFilters): FilterState => {
  const hasStatusFilter = Boolean(filters.statusFilter && filters.statusFilter.length > 0)
  const hasAmountRange = Boolean(
    filters.amountRange && (filters.amountRange.min !== undefined || filters.amountRange.max !== undefined)
  )
  const hasAdvanceRange = Boolean(
    filters.advanceRange && (filters.advanceRange.min !== undefined || filters.advanceRange.max !== undefined)
  )
  const hasCurrencyRef = Boolean(filters.currencyRef && filters.currencyRef.length > 0)
  const hasCreatedAtRange = Boolean(filters.createdAtRange?.gte && filters.createdAtRange?.lte)

  return {
    hasStatusFilter,
    hasAmountRange,
    hasAdvanceRange,
    hasCurrencyRef,
    hasCreatedAtRange
  }
}

const buildQueryParameters = (filterState: FilterState, filters: AdvancePaymentFilters): string[] => {
  const parameters: string[] = []

  if (filterState.hasStatusFilter) {
    parameters.push('$statusFilter: [String!]')
  }

  if (filterState.hasAmountRange) {
    // Only declare variables that are actually used (more efficient GraphQL queries)
    if (filters.amountRange?.min !== undefined) {
      parameters.push('$amountMin: numeric')
    }
    if (filters.amountRange?.max !== undefined) {
      parameters.push('$amountMax: numeric')
    }
  }

  if (filterState.hasAdvanceRange) {
    // Only declare variables that are actually used (more efficient GraphQL queries)
    if (filters.advanceRange?.min !== undefined) {
      parameters.push('$advanceMin: numeric')
    }
    if (filters.advanceRange?.max !== undefined) {
      parameters.push('$advanceMax: numeric')
    }
  }

  if (filterState.hasCurrencyRef) {
    parameters.push('$currencyRef: String!')
  }

  if (filterState.hasCreatedAtRange) {
    parameters.push('$createdAtGte: timestamptz!')
    parameters.push('$createdAtLte: timestamptz!')
  }

  // Add orderBy parameter for dynamic sorting (always present)
  parameters.push('$orderBy: [AdvancePaymentOrderBy!]')

  return parameters
}

const buildExpensePlanConditions = (filterState: FilterState, filters: AdvancePaymentFilters): string => {
  if (filterState.hasAmountRange && filters.amountRange) {
    const { min, max } = filters.amountRange
    const conditions: string[] = []

    if (min !== undefined) {
      conditions.push('_gte: $amountMin')
    }
    if (max !== undefined) {
      conditions.push('_lte: $amountMax')
    }

    if (conditions.length > 0) {
      return `totalAmount: { ${conditions.join(', ')} }`
    }
  }

  return ''
}

const buildAdvancePaymentConditions = (filterState: FilterState, filters: AdvancePaymentFilters): string => {
  if (filterState.hasAdvanceRange && filters.advanceRange) {
    const { min, max } = filters.advanceRange
    const conditions: string[] = []

    if (min !== undefined) {
      conditions.push('_gte: $advanceMin')
    }
    if (max !== undefined) {
      conditions.push('_lte: $advanceMax')
    }

    if (conditions.length > 0) {
      return `amount: { ${conditions.join(', ')} }`
    }
  }

  return ''
}

export const buildAdvancePaymentsQuery = (filters: AdvancePaymentFilters): string => {
  return buildAdvancePaymentsListQuery(filters, { includeSearch: true })
}

const buildSearchCondition = (): string => `
  _or: [
    {code: {_ilike: $searchTerm}}
    {description: {_ilike: $searchTerm}}
    {status: {_ilike: $searchTerm}}
    {paymentMethod: {_ilike: $searchTerm}}
    {expensePlan: {title: {_ilike: $searchTerm}}}
  ]
`

/**
 * Builds the where clause conditions for the GraphQL query.
 * Extracted as a separate function for better testability and maintainability (SRP).
 */
const buildWhereConditions = (
  expensePlanConditionString: string,
  statusConditionString: string,
  currencyConditionString: string,
  advancePaymentConditionString: string,
  searchConditionString: string,
  createdAtConditionString: string
): string => {
  const conditions: string[] = [
    `expensePlan: {
            employeeId: {_eq: $employeeId}${expensePlanConditionString}
          }`,
    'isDeleted: {_eq: false}'
  ]

  if (createdAtConditionString) conditions.push(createdAtConditionString)
  if (statusConditionString) conditions.push(statusConditionString)
  if (currencyConditionString) conditions.push(currencyConditionString)
  if (advancePaymentConditionString) conditions.push(advancePaymentConditionString)
  if (searchConditionString) conditions.push(searchConditionString.trim())

  return conditions.join(',\n          ')
}

export const buildAdvancePaymentsListQuery = (
  filters: AdvancePaymentFilters,
  options?: AdvancePaymentsQueryOptions
) => {
  const includeSearch = options?.includeSearch ?? true
  const filterState = validateFilters(filters)
  const queryParameters = buildQueryParameters(filterState, filters)
  const expensePlanConditions = buildExpensePlanConditions(filterState, filters)
  const advancePaymentConditions = buildAdvancePaymentConditions(filterState, filters)

  const baseParameters = [
    '$employeeId: uuid!',
    '$limit: Int',
    '$offset: Int',
    ...(includeSearch ? ['$searchTerm: String'] : [])
  ]
  const allParameters = [...baseParameters, ...queryParameters].join(', ')

  const expensePlanConditionString = expensePlanConditions ? `\n            ${expensePlanConditions}` : ''
  const advancePaymentConditionString = advancePaymentConditions ? `\n          ${advancePaymentConditions}` : ''
  const searchConditionString = includeSearch ? buildSearchCondition() : ''
  const statusConditionString = filterState.hasStatusFilter ? 'status: {_in: $statusFilter}' : ''
  const currencyConditionString = filterState.hasCurrencyRef ? 'currencyRef: {_eq: $currencyRef}' : ''
  const createdAtConditionString = filterState.hasCreatedAtRange
    ? 'createdAt: {_gte: $createdAtGte, _lte: $createdAtLte}'
    : ''

  const whereConditions = buildWhereConditions(
    expensePlanConditionString,
    statusConditionString,
    currencyConditionString,
    advancePaymentConditionString,
    searchConditionString,
    createdAtConditionString
  )

  return `
    query GetAdvancePaymentsByEmployee(
      ${allParameters}
    ) {
      AdvancePaymentAggregate(
        where: {
          ${whereConditions}
        }
      ) {
        aggregate {
          count
        }
      }
      AdvancePayment(
        limit: $limit,
        offset: $offset,
        orderBy: $orderBy,
        where: {
          ${whereConditions}
        }
      ) {
        id
        code
        description
        amount
        currencyRef
        currency { code }
        status
        paymentMethod
        expensePlan {
          id
          code
          title
          startDate
          endDate
          totalAmount
          currency { code }
          costCenter { name }
          project { name }
          employee {
            id
            code
            firstName
            lastName
            fullName
            employeePosition {
              jobPosition { name }
              organizationalUnit { name }
            }
          }
          expenseRequestTrip(orderBy: { tripOrder: ASC }, where: { isDeleted: { _eq: false } }) {
            id
            address
            pointType
            countryRef
            tripDateTime
            tripOrder
            tripDirection
            travelRegion { value }
            country { value }
          }
          expenseRequest(where: { isDeleted: { _eq: false } }) {
            id
            code
            expenseRequestTrip(orderBy: { tripOrder: ASC }, where: { isDeleted: { _eq: false } }) {
              id
              address
              pointType
              countryRef
              tripDateTime
              tripOrder
              tripDirection
              travelRegion { value }
              country { value }
            }
          }
        }
        expensePlanId
      }
    }
  `
}
