// GraphQL queries for expense statistics by period
import dayjs from 'dayjs'

/**
 * Constants for expense plan and request statuses
 */
const EXPENSE_PLAN_EXCLUDED_STATUSES = ['CREATED', 'DISCARDED'] as const
const EXPENSE_ITEM_INCLUDED_STATUSES = ['APPROVED', 'VERIFIED', 'BOOKED', 'PAID'] as const

/**
 * Constants for request type references
 */
const REQUEST_TYPE_EXPENSES = 'ExpenseRequestType:v1:EXPENSES'
const REQUEST_TYPE_TRIP = 'ExpenseRequestType:v1:TRIP'

/**
 * Query for getting expense statistics for a specific month
 */
export const buildMonthlyExpenseStatisticsQuery = (includeDepartment: boolean): string => `
  query GetMonthlyExpenseStatistics(
    $startDate: timestamp!,
    $endDate: timestamp!,
    $currency: String!${includeDepartment ? ',\n    $selectedDepartment: uuid' : ''}
  ) {
    planTotal: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ${JSON.stringify(EXPENSE_PLAN_EXCLUDED_STATUSES)} } },
          { currencyRef: { _eq: $currency } },
          ${includeDepartment ? '{ employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },' : ''}
          { isDeleted: { _eq: false } },
          { startDate: { _gte: $startDate, _lte: $endDate } }
        ]
      }
    ) { aggregate { sum { totalAmount } } }
    
    requestTotal: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ${JSON.stringify(EXPENSE_ITEM_INCLUDED_STATUSES)} } },
          { currencyRef: { _eq: $currency } },
          ${includeDepartment ? '{ employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },' : ''}
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $startDate, _lte: $endDate } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "${REQUEST_TYPE_EXPENSES}" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "${REQUEST_TYPE_TRIP}" }, startDate: { _gte: $startDate, _lte: $endDate } } }
            ] }
          ] }
        ]
      }
    ) { aggregate { sum { reimbursableAmount } } }
  }
`

/**
 * Helper function to build month subquery with GraphQL variables
 * @param month - Month index
 * @param includeDepartment - Whether to include department filter
 */
const buildMonthSubquery = (month: number, includeDepartment: boolean): string => `
  plan_month_${month}: ExpensePlanAggregate(
    where: {
      _and: [
        { status: { _nin: ${JSON.stringify(EXPENSE_PLAN_EXCLUDED_STATUSES)} } },
        { currencyRef: { _eq: $currency } },
        ${includeDepartment ? '{ employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },' : ''}
        { isDeleted: { _eq: false } },
        { startDate: { _gte: $startDate_${month}, _lte: $endDate_${month} } }
      ]
    }
  ) { aggregate { sum { totalAmount } } }
  
  request_month_${month}: ExpenseItemAggregate(
    where: {
      _and: [
        { status: { _in: ${JSON.stringify(EXPENSE_ITEM_INCLUDED_STATUSES)} } },
        { currencyRef: { _eq: $currency } },
        ${includeDepartment ? '{ employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },' : ''}
        { isDeleted: { _eq: false } },
        { _or: [
          { _and: [
            { expenseDate: { _gte: $startDate_${month}, _lte: $endDate_${month} } },
            { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "${REQUEST_TYPE_EXPENSES}" } } }
          ] },
          { _and: [
            { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "${REQUEST_TYPE_TRIP}" }, startDate: { _gte: $startDate_${month}, _lte: $endDate_${month} } } }
          ] }
        ] }
      ]
    }
  ) { aggregate { sum { reimbursableAmount } } }
`

/**
 * Interface for query result with variables
 */
export interface QueryWithVariables {
  query: string
  variables: Record<string, string>
}

/**
 * Generate a consolidated query for yearly expense statistics with GraphQL variables
 * @param currentMonth - The current month (0-indexed, 0 = January)
 * @param year - The year to fetch data for
 * @param includeDepartment - Whether to include department filter
 * @returns Object containing the query string and variables object
 * @throws Error if month or year parameters are invalid
 */
export const generateYearlyExpenseStatisticsQuery = (
  currentMonth: number,
  year: number,
  includeDepartment: boolean
): QueryWithVariables => {
  // Input validation for month parameter
  if (currentMonth < 0 || currentMonth > 11) {
    throw new Error(`Invalid month: ${currentMonth}. Month must be between 0 (January) and 11 (December).`)
  }

  // Input validation for year parameter
  const currentYear = dayjs().year()
  if (year < 2000 || year > currentYear + 10) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and ${currentYear + 10}.`)
  }

  const variables: Record<string, string> = {}

  // Build query signature with variable declarations
  let consolidatedQuery = `
    query GetYearlyExpenseStatistics(
      $currency: String!${includeDepartment ? ',\n      $selectedDepartment: uuid' : ''}`

  // Add variable declarations for each month's date range
  for (let month = 0; month <= currentMonth; month++) {
    consolidatedQuery += `,\n      $startDate_${month}: timestamp!,\n      $endDate_${month}: timestamp!`

    // Compute and store month boundaries in variables object
    const monthDate = dayjs().year(year).month(month)
    variables[`startDate_${month}`] = monthDate.startOf('month').format('YYYY-MM-DDTHH:mm:ss')
    variables[`endDate_${month}`] = monthDate.endOf('month').format('YYYY-MM-DDTHH:mm:ss')
  }

  consolidatedQuery += `\n    ) {\n`

  // Add subqueries for each month using the shared helper
  for (let month = 0; month <= currentMonth; month++) {
    consolidatedQuery += buildMonthSubquery(month, includeDepartment)
  }

  // Close the query
  consolidatedQuery += `}`

  return {
    query: consolidatedQuery,
    variables
  }
}

/**
 * Generate a consolidated query for quarterly expense statistics with GraphQL variables
 * @param startMonth - The starting month of the quarter (0-indexed)
 * @param endMonth - The ending month of the quarter (0-indexed)
 * @param year - The year to fetch data for
 * @param includeDepartment - Whether to include department filter
 * @returns Object containing the query string and variables object
 * @throws Error if month or year parameters are invalid
 */
export const generateQuarterlyExpenseStatisticsQuery = (
  startMonth: number,
  endMonth: number,
  year: number,
  includeDepartment: boolean
): QueryWithVariables => {
  // Input validation for month parameters
  if (startMonth < 0 || startMonth > 11) {
    throw new Error(`Invalid startMonth: ${startMonth}. Month must be between 0 (January) and 11 (December).`)
  }
  if (endMonth < 0 || endMonth > 11) {
    throw new Error(`Invalid endMonth: ${endMonth}. Month must be between 0 (January) and 11 (December).`)
  }
  if (startMonth > endMonth) {
    throw new Error(`Invalid month range: startMonth (${startMonth}) cannot be greater than endMonth (${endMonth}).`)
  }

  // Input validation for year parameter
  const currentYear = dayjs().year()
  if (year < 2000 || year > currentYear + 10) {
    throw new Error(`Invalid year: ${year}. Year must be between 2000 and ${currentYear + 10}.`)
  }

  const variables: Record<string, string> = {}

  // Build query signature with variable declarations
  let consolidatedQuery = `
    query GetQuarterlyExpenseStatistics(
      $currency: String!${includeDepartment ? ',\n      $selectedDepartment: uuid' : ''}`

  // Add variable declarations for each month's date range
  for (let month = startMonth; month <= endMonth; month++) {
    consolidatedQuery += `,\n      $startDate_${month}: timestamp!,\n      $endDate_${month}: timestamp!`

    // Compute and store month boundaries in variables object
    const monthDate = dayjs().year(year).month(month)
    variables[`startDate_${month}`] = monthDate.startOf('month').format('YYYY-MM-DDTHH:mm:ss')
    variables[`endDate_${month}`] = monthDate.endOf('month').format('YYYY-MM-DDTHH:mm:ss')
  }

  consolidatedQuery += `\n    ) {\n`

  // Add subqueries for each month using the shared helper
  for (let month = startMonth; month <= endMonth; month++) {
    consolidatedQuery += buildMonthSubquery(month, includeDepartment)
  }

  // Close the query
  consolidatedQuery += `}`

  return {
    query: consolidatedQuery,
    variables
  }
}
