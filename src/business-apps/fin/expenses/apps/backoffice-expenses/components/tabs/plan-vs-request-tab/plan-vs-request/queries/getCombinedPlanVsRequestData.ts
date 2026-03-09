// ⚡ PERFORMANCE OPTIMIZED: Combined Plan vs Request Query
// Consolidates 4 separate queries into 1 for better performance

/**
 * Generate combined query for Plan vs Request data
 * Includes: Period statistics, Category statistics, Overdue plans, and Most used currency
 */
export const generateCombinedPlanVsRequestQuery = (selectedDepartment?: string, requestTypes?: string[]): string => {
  const includeDepartment = Boolean(selectedDepartment)

  // Department condition for ExpensePlan and ExpenseItem (direct employee relationship)
  const departmentCondition = includeDepartment
    ? `{ employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },`
    : ''

  // Department condition for nested filters (e.g., inside expenseItem)
  const nestedDepartmentCondition = includeDepartment
    ? `employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } },`
    : ''

  // Build query signature
  const querySignature = includeDepartment
    ? `query GetCombinedPlanVsRequestData(
      $currency: String!,
      $startDate: timestamp!,
      $endDate: timestamp!,
      $previousStartDate: timestamp!,
      $previousEndDate: timestamp!,
      $currentDate: timestamp!,
      $selectedDepartment: uuid
    )`
    : `query GetCombinedPlanVsRequestData(
      $currency: String!,
      $startDate: timestamp!,
      $endDate: timestamp!,
      $previousStartDate: timestamp!,
      $previousEndDate: timestamp!,
      $currentDate: timestamp!
    )`

  // Build request type conditions for ExpenseItem filtering
  const buildRequestTypeConditions = (startVar: string, endVar: string): string => {
    // Default conditions: include both EXPENSES and TRIP types
    const defaultConditions = `
        { _and: [
          { expenseDate: { _gte: ${startVar}, _lte: ${endVar} } },
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
        ] },
        { _and: [
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: ${startVar}, _lte: ${endVar} } } }
        ] }
      `

    // If no requestTypes specified, return default
    if (!requestTypes || requestTypes.length === 0) {
      return defaultConditions
    }

    const conditions: string[] = []
    if (requestTypes.includes('ExpenseRequestType:v1:EXPENSES')) {
      conditions.push(`
        { _and: [
          { expenseDate: { _gte: ${startVar}, _lte: ${endVar} } },
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
        ] }
      `)
    }
    if (requestTypes.includes('ExpenseRequestType:v1:TRIP')) {
      conditions.push(`
        { _and: [
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: ${startVar}, _lte: ${endVar} } } }
        ] }
      `)
    }

    // If no conditions matched, fall back to default to avoid empty _or array
    return conditions.length > 0 ? conditions.join(',\n') : defaultConditions
  }

  return `
    ${querySignature} {
      # ALIGNED_WITH_DASHBOARD_2025_10_13
      # 1. Current Period Expense Plan Total - using item-level dates like Dashboard
      planTotal: ExpensePlanAggregate(
        where: {
          _and: [
            { status: { _nin: ["CREATED", "REJECTED", "DISCARDED"] } },
            { currencyRef: { _eq: $currency } },
            ${departmentCondition}
            { isDeleted: { _eq: false } },
            { _or: [
              { _and: [
                { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
                { expensePlanItem: { expenseDate: { _gte: $startDate, _lte: $endDate }, isDeleted: { _eq: false } } }
              ] },
              { _and: [
                { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
                { startDate: { _gte: $startDate, _lte: $endDate } }
              ] }
            ] }
          ]
        }
      ) { aggregate { sum { totalAmount } } }
      
      # 2. Current Period Expense Request Total
      requestTotal: ExpenseItemAggregate(
        where: {
          _and: [
            { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
            { currencyRef: { _eq: $currency } },
            ${departmentCondition}
            { isDeleted: { _eq: false } },
            { _or: [
              ${buildRequestTypeConditions('$startDate', '$endDate')}
            ] }
          ]
        }
      ) { aggregate { sum { reimbursableAmount } } }

      # 3. Current Period Category Statistics (Query ExpensePosition for reliable expenseGroupRef)
      currentPeriodCategories: ExpensePosition(
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            { expenseItem: {
              status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] },
              currencyRef: { _eq: $currency },
              ${nestedDepartmentCondition}
              isDeleted: { _eq: false },
              _or: [
                ${buildRequestTypeConditions('$startDate', '$endDate')}
              ]
            }}
          ]
        }
      ) {
        expenseGroupRef
        reimbursableAmount
      }

      # 4. Previous Period Category Statistics (Query ExpensePosition for reliable expenseGroupRef)
      previousPeriodCategories: ExpensePosition(
        where: {
          _and: [
            { isDeleted: { _eq: false } },
            { expenseItem: {
              status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] },
              currencyRef: { _eq: $currency },
              ${nestedDepartmentCondition}
              isDeleted: { _eq: false },
              _or: [
                ${buildRequestTypeConditions('$previousStartDate', '$previousEndDate')}
              ]
            }}
          ]
        }
      ) {
        expenseGroupRef
        reimbursableAmount
      }

      # 5. Overdue Plans Count
      overduePlans: ExpensePlanAggregate(
        where: {
          _and: [
            { status: { _in: ["PENDING", "APPROVED"] } },
            ${departmentCondition}
            { isDeleted: { _eq: false } },
            { endDate: { _lt: $currentDate } },
            { _not: { expenseRequest: { id: { _isNull: false } } } }
          ]
        }
      ) {
        aggregate { count }
      }

      # 6. Most Used Currency Detection (lightweight)
      currencyUsage: ExpenseItem(
        where: {
          isDeleted: { _eq: false },
          currencyRef: { _isNull: false }
        },
        limit: 1000
      ) {
        currencyRef
      }
    }
  `
}
