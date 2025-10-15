/**
 * Centralized GraphQL queries for the expense dashboard
 */

export const GET_TOTAL_COMPANY_SPEND_MONTHLY = `
  query GetTotalCompanySpendMonthly($selectedCurrency: String, $currentMonthStart: timestamp, $currentMonthEnd: timestamp, $previousMonthStart: timestamp, $previousMonthEnd: timestamp, $selectedDepartment: uuid) {
    currentPeriodSpend: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    previousPeriodSpend: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousMonthStart, _lt: $previousMonthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousMonthStart, _lt: $previousMonthEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
  }
`

export const GET_TOTAL_COMPANY_SPEND_QUARTERLY = `
  query GetTotalCompanySpendQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp, $previousQuarterStart: timestamp, $previousQuarterEnd: timestamp, $selectedDepartment: uuid) {
    currentPeriodSpend: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $quarterStart, _lte: $quarterEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $quarterStart, _lte: $quarterEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    previousPeriodSpend: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
  }
`

export const GET_TOTAL_COMPANY_SPEND_YEARLY = `
  query GetTotalCompanySpendYearly($selectedCurrency: String, $yearStart: timestamp, $currentDate: timestamp, $previousYearStart: timestamp, $previousYearEnd: timestamp, $selectedDepartment: uuid) {
    currentPeriodSpend: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $yearStart, _lte: $currentDate } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $yearStart, _lte: $currentDate } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    previousPeriodSpend: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousYearStart, _lte: $previousYearEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousYearStart, _lte: $previousYearEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
  }
`

export const GET_ACTUAL_VS_PLANNED_YEARLY = `
  query GetActualVsPlannedYearly($selectedCurrency: String, $yearStart: timestamp, $yearEnd: timestamp, $selectedDepartment: uuid) {
    actualExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $yearStart, _lte: $yearEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $yearStart, _lte: $yearEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { startDate: { _gte: $yearStart, _lte: $yearEnd } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`

export const GET_ACTUAL_VS_PLANNED_YEARLY_NODEPT = `
  query GetActualVsPlannedYearlyNoDept($selectedCurrency: String, $yearStart: timestamp, $yearEnd: timestamp) {
    actualExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $yearStart, _lte: $yearEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $yearStart, _lte: $yearEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate { sum { reimbursableAmount } count }
    }
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { startDate: { _gte: $yearStart, _lte: $yearEnd } }
        ]
      }
    ) {
      aggregate { sum { totalAmount } count }
    }
  }
`

export const GET_ACTUAL_VS_PLANNED_QUARTERLY = `
  query GetActualVsPlannedQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp, $selectedDepartment: uuid) {
    actualExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $quarterStart, _lte: $quarterEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $quarterStart, _lte: $quarterEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { startDate: { _gte: $quarterStart, _lte: $quarterEnd } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`

export const GET_ACTUAL_VS_PLANNED_QUARTERLY_NODEPT = `
  query GetActualVsPlannedQuarterlyNoDept($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp) {
    actualExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $quarterStart, _lte: $quarterEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $quarterStart, _lte: $quarterEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate { sum { reimbursableAmount } count }
    }
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { startDate: { _gte: $quarterStart, _lte: $quarterEnd } }
        ]
      }
    ) {
      aggregate { sum { totalAmount } count }
    }
  }
`

export const GET_ACTUAL_VS_PLANNED_MONTHLY = `
  query GetActualVsPlannedMonthly($selectedCurrency: String, $monthStart: timestamp, $monthEnd: timestamp, $selectedDepartment: uuid) {
    actualExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $monthStart, _lte: $monthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $monthStart, _lte: $monthEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { startDate: { _gte: $monthStart, _lte: $monthEnd } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`

export const GET_ACTUAL_VS_PLANNED_MONTHLY_NODEPT = `
  query GetActualVsPlannedMonthlyNoDept($selectedCurrency: String, $monthStart: timestamp, $monthEnd: timestamp) {
    actualExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $monthStart, _lte: $monthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $monthStart, _lte: $monthEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate { sum { reimbursableAmount } count }
    }
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { startDate: { _gte: $monthStart, _lte: $monthEnd } }
        ]
      }
    ) {
      aggregate { sum { totalAmount } count }
    }
  }
`

// DEBUG: List planned ExpensePlan IDs under the same filters (to reconcile counts)
export const GET_PLANNED_PLAN_IDS_YEARLY = `
  query GetPlannedPlanIdsYearly($selectedCurrency: String, $yearStart: timestamp, $yearEnd: timestamp, $selectedDepartment: uuid) {
    ExpensePlan(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { startDate: { _gte: $yearStart, _lte: $yearEnd } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_PLANNED_PLAN_IDS_YEARLY_NODEPT = `
  query GetPlannedPlanIdsYearlyNoDept($selectedCurrency: String, $yearStart: timestamp, $yearEnd: timestamp) {
    ExpensePlan(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { startDate: { _gte: $yearStart, _lte: $yearEnd } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_PLANNED_PLAN_IDS_QUARTERLY = `
  query GetPlannedPlanIdsQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp, $selectedDepartment: uuid) {
    ExpensePlan(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { startDate: { _gte: $quarterStart, _lte: $quarterEnd } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_PLANNED_PLAN_IDS_QUARTERLY_NODEPT = `
  query GetPlannedPlanIdsQuarterlyNoDept($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp) {
    ExpensePlan(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { startDate: { _gte: $quarterStart, _lte: $quarterEnd } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_PLANNED_PLAN_IDS_MONTHLY = `
  query GetPlannedPlanIdsMonthly($selectedCurrency: String, $monthStart: timestamp, $monthEnd: timestamp, $selectedDepartment: uuid) {
    ExpensePlan(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { startDate: { _gte: $monthStart, _lte: $monthEnd } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_PLANNED_PLAN_IDS_MONTHLY_NODEPT = `
  query GetPlannedPlanIdsMonthlyNoDept($selectedCurrency: String, $monthStart: timestamp, $monthEnd: timestamp) {
    ExpensePlan(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { isDeleted: { _eq: false } },
          { startDate: { _gte: $monthStart, _lte: $monthEnd } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

// DEBUG: Fetch startDate for specific ExpensePlan IDs
export const GET_EXPENSE_PLAN_STARTDATES_BY_IDS = `
  query GetExpensePlanStartDatesByIds($ids: [uuid!]) {
    ExpensePlan(where: { id: { _in: $ids } }) {
      id
      startDate
    }
  }
`

// DEBUG: List actual ExpenseRequest IDs used in Actual vs Planned (same filters as actualExpenses)
export const GET_ACTUAL_EXPENSE_IDS_YEARLY = `
  query GetActualExpenseIdsYearly($selectedCurrency: String, $yearStart: timestamp, $yearEnd: timestamp, $selectedDepartment: uuid) {
    ExpenseRequest(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { startDate: { _gte: $yearStart, _lte: $yearEnd } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_ACTUAL_EXPENSE_IDS_QUARTERLY = `
  query GetActualExpenseIdsQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp, $selectedDepartment: uuid) {
    ExpenseRequest(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { startDate: { _gte: $quarterStart, _lte: $quarterEnd } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_ACTUAL_EXPENSE_IDS_MONTHLY = `
  query GetActualExpenseIdsMonthly($selectedCurrency: String, $monthStart: timestamp, $monthEnd: timestamp, $selectedDepartment: uuid) {
    ExpenseRequest(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { startDate: { _gte: $monthStart, _lte: $monthEnd } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

// DEBUG variants without department filter (used when no department is selected)
export const GET_ACTUAL_EXPENSE_IDS_YEARLY_NODEPT = `
  query GetActualExpenseIdsYearlyNoDept($selectedCurrency: String, $yearStart: timestamp, $yearEnd: timestamp) {
    ExpenseRequest(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { startDate: { _gte: $yearStart, _lte: $yearEnd } },
          { isDeleted: { _eq: false } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_ACTUAL_EXPENSE_IDS_QUARTERLY_NODEPT = `
  query GetActualExpenseIdsQuarterlyNoDept($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp) {
    ExpenseRequest(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { startDate: { _gte: $quarterStart, _lte: $quarterEnd } },
          { isDeleted: { _eq: false } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_ACTUAL_EXPENSE_IDS_MONTHLY_NODEPT = `
  query GetActualExpenseIdsMonthlyNoDept($selectedCurrency: String, $monthStart: timestamp, $monthEnd: timestamp) {
    ExpenseRequest(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { startDate: { _gte: $monthStart, _lte: $monthEnd } },
          { isDeleted: { _eq: false } }
        ]
      }
      orderBy: { startDate: ASC }
      limit: 1000
    ) { id code status startDate }
  }
`

export const GET_MONTHLY_EXPENSE_TRENDS = `
  query GetMonthlyExpenseTrend($selectedCurrency: String, $startDate: timestamp!, $endDate: timestamp!, $selectedDepartment: uuid) {
    ExpenseRequestAggregate(
      where: {
        _and: [
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { startDate: { _gte: $startDate, _lte: $endDate } },
          { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        count
        sum {
          totalAmount
        }
      }
    }
  }
`

export const GET_SPEND_COMPARISON_YEARLY = `
  query GetSpendComparisonYearly($selectedCurrency: String, $currentYearStart: timestamp, $currentYearEnd: timestamp, $previousYearStart: timestamp, $previousYearEnd: timestamp, $selectedDepartment: uuid) {
    currentYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentYearStart, _lte: $currentYearEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentYearStart, _lte: $currentYearEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    previousYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousYearStart, _lte: $previousYearEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousYearStart, _lte: $previousYearEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
  }
`

export const GET_SPEND_COMPARISON_QUARTERLY = `
  query GetSpendComparisonQuarterly($selectedCurrency: String, $currentQuarterStart: timestamp, $currentQuarterEnd: timestamp, $previousQuarterStart: timestamp, $previousQuarterEnd: timestamp, $selectedDepartment: uuid) {
    currentQuarterExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentQuarterStart, _lte: $currentQuarterEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentQuarterStart, _lte: $currentQuarterEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    previousQuarterExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
  }
`

export const GET_MONTHLY_SPEND_COMPARISON = `
  query GetMonthlySpendComparison($currentMonthStart: timestamp!, $currentMonthEnd: timestamp!, $previousMonthStart: timestamp!, $previousMonthEnd: timestamp!, $selectedCurrency: String, $selectedDepartment: uuid) {
    currentMonthExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    previousMonthExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousMonthStart, _lt: $previousMonthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousMonthStart, _lt: $previousMonthEnd } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
  }
`

export const GET_ADDITIONAL_DASHBOARD_METRICS = `
  query GetAdditionalDashboardMetrics($selectedCurrency: String, $currentYearStart: timestamp, $currentMonthStart: timestamp, $quarterStart: timestamp, $quarterEnd: timestamp, $selectedDepartment: uuid) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { startDate: { _gte: $currentYearStart } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
      }
    }
    pendingRequests: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "PENDING" } },
          { startDate: { _gte: $currentYearStart } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_YTD_STATS = `
  query GetYTDStats($selectedCurrency: String!, $currentYearStart: timestamp!, $currentYTD: timestamp!, $previousYearStart: timestamp!, $previousYTD: timestamp!, $selectedDepartment: uuid) {
    currentYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _eq: "PAID" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentYearStart, _lt: $currentYTD } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentYearStart, _lt: $currentYTD } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
    previousYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _eq: "PAID" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousYearStart, _lt: $previousYTD } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousYearStart, _lt: $previousYTD } } }
            ] }
          ] }
        ]
      }
    ) {
      aggregate {
        sum { reimbursableAmount }
        count
      }
    }
  }
`

export const GET_ADDITIONAL_DASHBOARD_METRICS_YEARLY = `
  query GetAdditionalDashboardMetricsYearly($selectedCurrency: String, $selectedDepartment: uuid) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _gt: 0 } },
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
      }
    }
    pendingRequests: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "PENDING" } },
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_ADDITIONAL_DASHBOARD_METRICS_MONTHLY = `
  query GetAdditionalDashboardMetricsMonthly($selectedCurrency: String, $selectedDepartment: uuid) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _gt: 0 } },
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
      }
    }
    pendingRequests: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "PENDING" } },
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_ADDITIONAL_DASHBOARD_METRICS_QUARTERLY = `
  query GetAdditionalDashboardMetricsQuarterly($selectedCurrency: String, $selectedDepartment: uuid) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _gt: 0 } },
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
      }
    }
    pendingRequests: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "PENDING" } },
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_ADVANCE_PAYMENTS_APPROVED_YEARLY = `
  query GetAdvancePaymentsApprovedYearly($selectedCurrency: String, $currentYearStart: timestamp, $currentYearEnd: timestamp) {
    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _eq: "APPROVED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expensePlan: { startDate: { _gte: $currentYearStart, _lte: $currentYearEnd } } },
          {isDeleted: {_eq: false}}
        ]
      }
    ) {
      aggregate {
        count
        sum { amount }
      }
    }
  }
`

export const GET_ADVANCE_PAYMENTS_APPROVED_MONTHLY = `
  query GetAdvancePaymentsApprovedMonthly($selectedCurrency: String, $currentMonthStart: timestamp, $currentMonthEnd: timestamp) {
    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _eq: "APPROVED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expensePlan: { startDate: { _gte: $currentMonthStart, _lte: $currentMonthEnd } } },
          {isDeleted: {_eq: false}}
        ]
      }
    ) {
      aggregate {
        count
        sum { amount }
      }
    }
  }
`

export const GET_ADVANCE_PAYMENTS_APPROVED_QUARTERLY = `
  query GetAdvancePaymentsApprovedQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp) {
    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _eq: "APPROVED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expensePlan: { startDate: { _gte: $quarterStart, _lte: $quarterEnd } } },
          {isDeleted: {_eq: false}}
        ]
      }
    ) {
      aggregate {
        count
        sum { amount }
      }
    }
  }
`

// ExpenseItem aggregates (expense-type) by period using expenseDate
export const GET_EXPENSE_ITEM_SUM_MONTHLY = `
  query GetExpenseItemSumMonthly($selectedCurrency: String, $currentMonthStart: timestamp!, $currentMonthEnd: timestamp!, $previousMonthStart: timestamp!, $previousMonthEnd: timestamp!, $selectedDepartment: uuid) {
    currentItems: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expenseDate: { _gte: $currentMonthStart, _lte: $currentMonthEnd } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) { aggregate { count sum { reimbursableAmount } } }
    previousItems: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expenseDate: { _gte: $previousMonthStart, _lte: $previousMonthEnd } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) { aggregate { count sum { reimbursableAmount } } }
  }
`

export const GET_EXPENSE_ITEM_SUM_QUARTERLY = `
  query GetExpenseItemSumQuarterly($selectedCurrency: String, $quarterStart: timestamp!, $quarterEnd: timestamp!, $previousQuarterStart: timestamp!, $previousQuarterEnd: timestamp!, $selectedDepartment: uuid) {
    currentItems: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expenseDate: { _gte: $quarterStart, _lte: $quarterEnd } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) { aggregate { count sum { reimbursableAmount } } }
    previousItems: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expenseDate: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) { aggregate { count sum { reimbursableAmount } } }
  }
`

export const GET_EXPENSE_ITEM_SUM_YEARLY = `
  query GetExpenseItemSumYearly($selectedCurrency: String, $yearStart: timestamp!, $currentDate: timestamp!, $previousYearStart: timestamp!, $previousYearEnd: timestamp!, $selectedDepartment: uuid) {
    currentItems: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expenseDate: { _gte: $yearStart, _lte: $currentDate } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) { aggregate { count sum { reimbursableAmount } } }
    previousItems: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expenseDate: { _gte: $previousYearStart, _lte: $previousYearEnd } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) { aggregate { count sum { reimbursableAmount } } }
  }
`

export const GET_EXPENSE_ITEM_TREND = `
  query GetExpenseItemTrend($selectedCurrency: String, $startDate: timestamp!, $endDate: timestamp!, $selectedDepartment: uuid) {
    ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { expenseDate: { _gte: $startDate, _lte: $endDate } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) { aggregate { count sum { reimbursableAmount } } }
  }
`

// Bulk monthly trends (Requests + Items) using aliases, one roundtrip for the full year
export const GET_BULK_MONTHLY_TRENDS = (): string => {
  const monthVars = Array.from({ length: 12 }, (_, i) => `$m${i + 1}Start: timestamp!, $m${i + 1}End: timestamp!`).join(
    ', '
  )
  const monthFields = Array.from({ length: 12 }, (_, i) => {
    const idx = i + 1
    return `
    m${idx}_req: ExpenseRequestAggregate(
      where: {
        _and: [
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { startDate: { _gte: $m${idx}Start, _lte: $m${idx}End } },
          { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) { aggregate { count sum { totalAmount } } }
    m${idx}_item: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $m${idx}Start, _lte: $m${idx}End } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $m${idx}Start, _lte: $m${idx}End } } }
            ] }
          ] }
        ]
      }
    ) { aggregate { count sum { reimbursableAmount } } }`
  }).join('\n')
  return `
  query GetBulkMonthlyTrends($selectedCurrency: String, $selectedDepartment: uuid, ${monthVars}) {
${monthFields}
  }
  `
}

export const GET_AVG_SPEND_PER_TRIP_YEARLY = `
  query GetAvgSpendPerTripYearly($selectedCurrency: String, $currentYearStart: timestamp, $currentYearEnd: timestamp, $selectedDepartment: uuid) {
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { startDate: { _gte: $currentYearStart, _lte: $currentYearEnd } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        avg { totalAmount }
        count
      }
    }
  }
`

export const GET_AVG_SPEND_PER_TRIP_MONTHLY = `
  query GetAvgSpendPerTripMonthly($selectedCurrency: String, $currentMonthStart: timestamp!, $currentMonthEnd: timestamp!, $selectedDepartment: uuid) {
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _gt: 0 } },
          { startDate: { _gte: $currentMonthStart, _lte: $currentMonthEnd } },
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        avg { totalAmount }
        count
      }
    }
  }
`

export const GET_AVG_SPEND_PER_TRIP_QUARTERLY = `
  query GetAvgSpendPerTripQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp, $selectedDepartment: uuid) {
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { startDate: { _gte: $quarterStart, _lte: $quarterEnd } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        avg { totalAmount }
        count
      }
    }
  }
`
