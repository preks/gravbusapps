// Query builder and filter utilities for Advance Payments
// SOLID: keep query construction separate from static query strings

export interface AdvancePaymentFilters {
  statusFilter?: string[]
  amountRange?: { min?: number; max?: number }
  advanceRange?: { min?: number; max?: number }
  currencyRef?: string
}

export interface FilterState {
  hasStatusFilter: boolean
  hasAmountRange: boolean
  hasAdvanceRange: boolean
  hasCurrencyRef: boolean
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

  return {
    hasStatusFilter,
    hasAmountRange,
    hasAdvanceRange,
    hasCurrencyRef
  }
}

const buildQueryParameters = (filterState: FilterState, filters: AdvancePaymentFilters): string => {
  const parameters: string[] = []

  if (filterState.hasStatusFilter) {
    parameters.push('$statusFilter: [String!]')
  }

  if (filterState.hasAmountRange) {
    if (filters.amountRange?.min !== undefined) {
      parameters.push('$amountMin: numeric')
    }
    if (filters.amountRange?.max !== undefined) {
      parameters.push('$amountMax: numeric')
    }
  }

  if (filterState.hasAdvanceRange) {
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

  // Add orderBy parameter for dynamic sorting
  parameters.push('$orderBy: [AdvancePaymentOrderBy!]')

  return parameters.join(', ')
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
  const filterState = validateFilters(filters)
  const queryParameters = buildQueryParameters(filterState, filters)
  const expensePlanConditions = buildExpensePlanConditions(filterState, filters)
  const advancePaymentConditions = buildAdvancePaymentConditions(filterState, filters)

  const parameterString = queryParameters ? `, ${queryParameters}` : ''
  const expensePlanConditionString = expensePlanConditions ? `, ${expensePlanConditions}` : ''
  const advancePaymentConditionString = advancePaymentConditions ? `, ${advancePaymentConditions}` : ''

  return `
    query GetAdvancePaymentsByEmployee(
      $employeeId: uuid!,
      $limit: Int,
      $offset: Int,
      $searchTerm: String${parameterString}
    ) {
      AdvancePaymentAggregate(
        where: {
          expensePlan: {
            employeeId: {_eq: $employeeId}
            ${expensePlanConditionString}
          },
          isDeleted: {_eq: false},
          ${filterState.hasStatusFilter ? 'status: {_in: $statusFilter},' : ''}
          ${filterState.hasCurrencyRef ? 'currencyRef: {_eq: $currencyRef},' : ''}
          ${advancePaymentConditionString ? `${advancePaymentConditionString},` : ''}
          _or: [
            {code: {_ilike: $searchTerm}},
            {description: {_ilike: $searchTerm}},
            {status: {_ilike: $searchTerm}},
            {paymentMethod: {_ilike: $searchTerm}},
            {expensePlan: {title: {_ilike: $searchTerm}}}
          ]
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
          expensePlan: {employeeId: 
              {_eq: $employeeId} 
              ${expensePlanConditionString}},
          isDeleted: {_eq: false},
          ${filterState.hasStatusFilter ? 'status: {_in: $statusFilter},' : ''}
          ${filterState.hasCurrencyRef ? 'currencyRef: {_eq: $currencyRef},' : ''}
          ${advancePaymentConditionString ? `${advancePaymentConditionString},` : ''}
          _or: [
            {code: {_ilike: $searchTerm}},
            {description: {_ilike: $searchTerm}},
            {status: {_ilike: $searchTerm}},
            {paymentMethod: {_ilike: $searchTerm}},
            {expensePlan: {
              title: {_ilike: $searchTerm}
            }
           }
          ]
        }
      ) {
        id
        code
        description
        amount
        currencyRef
        currency { code }
        costCenter { name }
        status
        paymentMethod
        expensePlan {
          id
          code
          reimbursableAmount
          startDate
          endDate
          planDate
          decisionDate
          status
          title
          totalAmount
          requestTypeRef
          createdAt
          employeeDocumentId
          advancePaymentPaidAmount
          advancePaymentInTransitAmount
          currencyRef
          description
          currency {
            type
            translations(where: {localeCode: {_eq: "en"}}) { localeCode value }
            catalog { defaultLocale }
            value
            id
            code
          }
          requestType {
            value
            translations(where: {localeCode: {_eq: "en"}}) { localeCode value }
            catalog { defaultLocale }
          }
          expensePlanItem { title status totalAmount expenseDate }
          advancePayment {
            id
            amount
            status
            currency {
              code
              translations(where: {localeCode: {_eq: "en"}}) { localeCode value }
              catalog { defaultLocale }
            }
          }
          expenseRequestTrip { tripDateTime }
          expenseRequest {
            id 
            code 
            title 
            description 
            startDate 
            endDate 
            requestDate 
            decisionDate 
            totalAmount 
            currencyRef 
            status
            reimbursableAmount nonReimbursableAmount additionalProperties
            currency { value translations(where: {localeCode: {_eq: "en"}}) { localeCode value } catalog { defaultLocale } }
            requestType { value translations(where: {localeCode: {_eq: "en"}}) { localeCode value } catalog { defaultLocale } }
            costCenter { name }
            project { name }
            employee { fullName employeePosition { supervisor { fullName } } }
          }
          employee {
            id code firstName lastName
            employeePosition {
              siteLocation { name }
              organizationalUnit { name }
              firstName lastName
            }
          }
        }
        expensePlanId
      }
    }
  `
}
