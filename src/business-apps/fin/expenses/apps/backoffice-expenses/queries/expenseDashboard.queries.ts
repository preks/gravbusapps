/**
 * Centralized GraphQL queries for the expense dashboard
 */

export const GET_TOTAL_COMPANY_SPEND_MONTHLY = `
  query GetTotalCompanySpendMonthly($selectedCurrency: String, $currentMonthStart: timestamp, $currentDate: timestamp, $previousMonthStart: timestamp, $previousMonthEnd: timestamp, $selectedDepartment: uuid) {
    currentPeriodSpend: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $currentMonthStart, _lte: $currentDate } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    previousPeriodSpend: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $previousMonthStart, _lte: $previousMonthEnd } }
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

export const GET_TOTAL_COMPANY_SPEND_QUARTERLY = `
  query GetTotalCompanySpendQuarterly($selectedCurrency: String, $quarterStart: timestamp, $currentDate: timestamp, $previousQuarterStart: timestamp, $previousQuarterEnd: timestamp, $selectedDepartment: uuid) {
    currentPeriodSpend: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $quarterStart, _lte: $currentDate } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    previousPeriodSpend: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

export const GET_TOTAL_COMPANY_SPEND_YEARLY = `
  query GetTotalCompanySpendYearly($selectedCurrency: String, $yearStart: timestamp, $currentDate: timestamp, $previousYearStart: timestamp, $previousYearEnd: timestamp, $selectedDepartment: uuid) {
    currentPeriodSpend: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $yearStart, _lte: $currentDate } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    previousPeriodSpend: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $previousYearStart, _lte: $previousYearEnd } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

export const GET_ACTUAL_VS_PLANNED_YEARLY = `
  query GetActualVsPlannedYearly($selectedCurrency: String, $yearStart: timestamp, $yearEnd: timestamp, $selectedDepartment: uuid) {
    actualExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $yearStart, _lte: $yearEnd } },
          { isDeleted: { _eq: false } }
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
          {
            _or: [
              { startDate: { _gte: $yearStart, _lte: $yearEnd } },
              { endDate: { _gte: $yearStart, _lte: $yearEnd } },
              {
                _and: [
                  { startDate: { _lte: $yearStart } },
                  { endDate: { _gte: $yearEnd } }
                ]
              },
              {
                _and: [
                  { startDate: { _isNull: true } },
                  { endDate: { _isNull: true } },
                  { planDate: { _gte: $yearStart, _lte: $yearEnd } }
                ]
              }
            ]
          }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

export const GET_ACTUAL_VS_PLANNED_QUARTERLY = `
  query GetActualVsPlannedQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp, $selectedDepartment: uuid) {
    actualExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $quarterStart, _lte: $quarterEnd } },
          { isDeleted: { _eq: false } }
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
          {
            _or: [
              { startDate: { _gte: $quarterStart, _lte: $quarterEnd } },
              { endDate: { _gte: $quarterStart, _lte: $quarterEnd } },
              {
                _and: [
                  { startDate: { _lte: $quarterStart } },
                  { endDate: { _gte: $quarterEnd } }
                ]
              },
              {
                _and: [
                  { startDate: { _isNull: true } },
                  { endDate: { _isNull: true } },
                  { planDate: { _gte: $quarterStart, _lte: $quarterEnd } }
                ]
              }
            ]
          }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

export const GET_ACTUAL_VS_PLANNED_MONTHLY = `
  query GetActualVsPlannedMonthly($selectedCurrency: String, $monthStart: timestamp, $monthEnd: timestamp, $selectedDepartment: uuid) {
    actualExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $monthStart, _lte: $monthEnd } },
          { isDeleted: { _eq: false } }
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
          {
            _or: [
              { startDate: { _gte: $monthStart, _lte: $monthEnd } },
              { endDate: { _gte: $monthStart, _lte: $monthEnd } },
              {
                _and: [
                  { startDate: { _lte: $monthStart } },
                  { endDate: { _gte: $monthEnd } }
                ]
              },
              {
                _and: [
                  { startDate: { _isNull: true } },
                  { endDate: { _isNull: true } },
                  { planDate: { _gte: $monthStart, _lte: $monthEnd } }
                ]
              }
            ]
          }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

export const GET_MONTHLY_EXPENSE_TRENDS = `
  query GetMonthlyExpenseTrend($selectedCurrency: String, $startDate: timestamp!, $endDate: timestamp!, $selectedDepartment: uuid) {
    ExpenseRequestAggregate(
      where: {
        _and: [
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { requestDate: { _gte: $startDate, _lte: $endDate } },
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
`;

export const GET_SPEND_COMPARISON_YEARLY = `
  query GetSpendComparisonYearly($selectedCurrency: String, $currentYearStart: timestamp, $currentYearEnd: timestamp, $previousYearStart: timestamp, $previousYearEnd: timestamp, $selectedDepartment: uuid) {
    currentYearExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $currentYearStart, _lte: $currentYearEnd } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    previousYearExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $previousYearStart, _lte: $previousYearEnd } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

export const GET_SPEND_COMPARISON_QUARTERLY = `
  query GetSpendComparisonQuarterly($selectedCurrency: String, $currentQuarterStart: timestamp, $currentQuarterEnd: timestamp, $previousQuarterStart: timestamp, $previousQuarterEnd: timestamp, $selectedDepartment: uuid) {
    currentQuarterExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $currentQuarterStart, _lte: $currentQuarterEnd } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    previousQuarterExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

export const GET_MONTHLY_SPEND_COMPARISON = `
  query GetMonthlySpendComparison($currentMonthStart: timestamp!, $currentMonthEnd: timestamp!, $previousMonthStart: timestamp!, $previousMonthEnd: timestamp!, $selectedCurrency: String, $selectedDepartment: uuid) {
    currentMonthExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $currentMonthStart } },
          { requestDate: { _lt: $currentMonthEnd } }
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    previousMonthExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $previousMonthStart } },
          { requestDate: { _lt: $previousMonthEnd } },
          {isDeleted: {_eq: false}}
          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

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
`;

export const GET_YTD_STATS = `
  query GetYTDStats($currentYearStart: timestamp!, $currentYTD: timestamp!, $previousYearStart: timestamp!, $previousYTD: timestamp!, $selectedDepartment: uuid) {
    currentYearExpenses: ExpenseRequestAggregate(
      where: {
        status: { _eq: "PAID" }
        currencyRef: { _eq: "Currency:v1:EUR" }
        endDate: { _gte: $currentYearStart, _lt: $currentYTD }
        employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } }
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
    previousYearExpenses: ExpenseRequestAggregate(
      where: {
        status: { _eq: "PAID" }
        currencyRef: { _eq: "Currency:v1:EUR" }
        endDate: { _gte: $previousYearStart, _lt: $previousYTD }
        employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } }
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }
  }
`;

export const GET_ADDITIONAL_DASHBOARD_METRICS_YEARLY = `
  query GetAdditionalDashboardMetricsYearly($selectedCurrency: String, $currentYearStart: timestamp, $currentYearEnd: timestamp, $selectedDepartment: uuid) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _gt: 0 } },
          { requestDate: { _gte: $currentYearStart, _lte: $currentYearEnd } }
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
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $currentYearStart, _lte: $currentYearEnd } }
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
`;

export const GET_ADDITIONAL_DASHBOARD_METRICS_MONTHLY = `
  query GetAdditionalDashboardMetricsMonthly($selectedCurrency: String, $currentMonthStart: timestamp, $currentMonthEnd: timestamp, $selectedDepartment: uuid) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $currentMonthStart, _lte: $currentMonthEnd } }
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
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $currentMonthStart, _lte: $currentMonthEnd } }
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
`;

export const GET_ADDITIONAL_DASHBOARD_METRICS_QUARTERLY = `
  query GetAdditionalDashboardMetricsQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp, $selectedDepartment: uuid) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $quarterStart, _lte: $quarterEnd } }
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
          { currencyRef: { _eq: $selectedCurrency } },
          { requestDate: { _gte: $quarterStart, _lte: $quarterEnd } }
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
`;

export const GET_ADVANCE_PAYMENTS_APPROVED_YEARLY = `
  query GetAdvancePaymentsApprovedYearly($selectedCurrency: String, $currentYearStart: timestamptz, $currentYearEnd: timestamptz) {
    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _eq: "APPROVED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { createdAt: { _gte: $currentYearStart, _lte: $currentYearEnd } },
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
`;

export const GET_ADVANCE_PAYMENTS_APPROVED_MONTHLY = `
  query GetAdvancePaymentsApprovedMonthly($selectedCurrency: String, $currentMonthStart: timestamptz, $currentMonthEnd: timestamptz) {
    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _eq: "APPROVED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { createdAt: { _gte: $currentMonthStart, _lte: $currentMonthEnd } },
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
`;

export const GET_ADVANCE_PAYMENTS_APPROVED_QUARTERLY = `
  query GetAdvancePaymentsApprovedQuarterly($selectedCurrency: String, $quarterStart: timestamptz, $quarterEnd: timestamptz) {
    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _eq: "APPROVED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { createdAt: { _gte: $quarterStart, _lte: $quarterEnd } },
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
`;

export const GET_AVG_SPEND_PER_TRIP_YEARLY = `
  query GetAvgSpendPerTripYearly($selectedCurrency: String, $currentYearStart: timestamp, $currentYearEnd: timestamp, $selectedDepartment: uuid) {
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { requestDate: { _gte: $currentYearStart, _lte: $currentYearEnd } }
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
`;

export const GET_AVG_SPEND_PER_TRIP_MONTHLY = `
  query GetAvgSpendPerTripMonthly($selectedCurrency: String, $currentMonthStart: timestamp!, $currentMonthEnd: timestamp!, $selectedDepartment: uuid) {
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _gt: 0 } },
          { requestDate: { _gte: $currentMonthStart, _lte: $currentMonthEnd } },
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
`;

export const GET_AVG_SPEND_PER_TRIP_QUARTERLY = `
  query GetAvgSpendPerTripQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp, $selectedDepartment: uuid) {
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { requestDate: { _gte: $quarterStart, _lte: $quarterEnd } }
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
`;
