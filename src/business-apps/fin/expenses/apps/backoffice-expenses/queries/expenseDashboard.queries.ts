/**
 * Centralized GraphQL queries for the expense dashboard
 */

export const GET_EXPENSE_PLAN_YEARLY_TOTAL = `
  query GetExpensePlanYearlyTotal($startOfYear: timestamp!, $endOfYear: timestamp!, $startOfYearTs: timestamptz!, $endOfYearTs: timestamptz!) {
    ExpensePlan(where: {
      _and: [
        { currencyRef: { _eq: "Currency:v1:EUR" } },
        { totalAmount: { _isNull: false } },
        { status: { _nin: ["CREATED", "DISCARDED"] } },
        {
          _or: [
            { startDate: { _gte: $startOfYear, _lte: $endOfYear } },
            { endDate: { _gte: $startOfYear, _lte: $endOfYear } },
            {
              _and: [
                { startDate: { _lte: $startOfYear } },
                { endDate: { _gte: $endOfYear } }
              ]
            },
            {
              _and: [
                { startDate: { _isNull: true } },
                { endDate: { _isNull: true } },
                { createdAt: { _gte: $startOfYearTs, _lte: $endOfYearTs } }
              ]
            }
          ]
        }
      ]
    }) {
      id
    }
    ExpensePlanAggregate(
      where: {
        _and: [
          { currencyRef: { _eq: "Currency:v1:EUR" } },
          { totalAmount: { _isNull: false } },
          { status: { _nin: ["CREATED", "DISCARDED"] } },
          {
            _or: [
              { startDate: { _gte: $startOfYear, _lte: $endOfYear } },
              { endDate: { _gte: $startOfYear, _lte: $endOfYear } },
              {
                _and: [
                  { startDate: { _lte: $startOfYear } },
                  { endDate: { _gte: $endOfYear } }
                ]
              },
              {
                _and: [
                  { startDate: { _isNull: true } },
                  { endDate: { _isNull: true } },
                  { createdAt: { _gte: $startOfYearTs, _lte: $endOfYearTs } }
                ]
              }
            ]
          }
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

export const GET_MONTHLY_STATS = `
  query GetMonthlyStats($currentMonthStart: timestamp!, $currentMonthEnd: timestamp!, $previousMonthStart: timestamp!, $previousMonthEnd: timestamp!) {
    currentMonthExpenses: ExpenseRequest(
      where: {
        _and: [
          { status: { _eq: "PAID" } },
          { currencyRef: { _eq: "Currency:v1:EUR" } },
          { endDate: { _gte: $currentMonthStart } },
          { endDate: { _lt: $currentMonthEnd } }
        ]
      }
    ) {
      totalAmount
    }
    
    previousMonthExpenses: ExpenseRequest(
      where: {
        _and: [
          { status: { _eq: "PAID" } },
          { currencyRef: { _eq: "Currency:v1:EUR" } },
          { endDate: { _gte: $previousMonthStart } },
          { endDate: { _lt: $previousMonthEnd } }
        ]
      }
    ) {
      totalAmount
    }
  }
`;

export const GET_MONTHLY_EXPENSE_TRENDS = `
  query GetMonthlyExpenseTrend($startDate: timestamptz!, $endDate: timestamptz!) {
    ExpenseRequestAggregate(
      where: {
        _and: [
          { currencyRef: { _eq: "Currency:v1:EUR" } },
          { totalAmount: { _isNull: false } },
          { status: { _eq: "PAID" } },
          { createdAt: { _gte: $startDate, _lt: $endDate } }
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

export const GET_MONTHLY_SPEND_COMPARISON = `
  query GetMonthlySpendComparison($currentMonthStart: timestamp!, $currentMonthEnd: timestamp!, $previousMonthStart: timestamp!, $previousMonthEnd: timestamp!, $selectedCurrency: String) {
    currentMonthExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { endDate: { _gte: $currentMonthStart } },
          { endDate: { _lt: $currentMonthEnd } }
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
          { endDate: { _gte: $previousMonthStart } },
          { endDate: { _lt: $previousMonthEnd } }
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

export const GET_YTD_STATS = `
  query GetYTDStats($currentYearStart: timestamp!, $currentYTD: timestamp!, $previousYearStart: timestamp!, $previousYTD: timestamp!) {
    currentYearExpenses: ExpenseRequestAggregate(
      where: {
        status: { _eq: "PAID" }
        currencyRef: { _eq: "Currency:v1:EUR" }
        endDate: { _gte: $currentYearStart, _lt: $currentYTD }
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
  query GetAdditionalDashboardMetrics($selectedCurrency: String, $currentYearStart: timestamp, $currentMonthStart: timestamp, $quarterStart: timestamp, $quarterEnd: timestamp) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { endDate: { _gte: $currentYearStart } }
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
          { endDate: { _gte: $currentYearStart } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_AVG_SPEND_PER_TRIP_YEARLY = `
  query GetAvgSpendPerTripYearly($selectedCurrency: String, $currentYearStart: timestamp, $currentYearEnd: timestamp) {
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { endDate: { _gte: $currentYearStart, _lte: $currentYearEnd } }
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
  query GetAvgSpendPerTripMonthly($selectedCurrency: String, $currentMonthStart: timestamp, $currentMonthEnd: timestamp) {
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { endDate: { _gte: $currentMonthStart, _lte: $currentMonthEnd } }
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
  query GetAvgSpendPerTripQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp) {
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { endDate: { _gte: $quarterStart, _lte: $quarterEnd } }
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

export const GET_ADDITIONAL_DASHBOARD_METRICS_YEARLY = `
  query GetAdditionalDashboardMetricsYearly($selectedCurrency: String, $currentYearStart: timestamp, $currentYearEnd: timestamp) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { endDate: { _gte: $currentYearStart, _lte: $currentYearEnd } }
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
          { endDate: { _gte: $currentYearStart, _lte: $currentYearEnd } }
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
  query GetAdditionalDashboardMetricsMonthly($selectedCurrency: String, $currentMonthStart: timestamp, $currentMonthEnd: timestamp) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { endDate: { _gte: $currentMonthStart, _lte: $currentMonthEnd } }
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
          { endDate: { _gte: $currentMonthStart, _lte: $currentMonthEnd } }
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
  query GetAdditionalDashboardMetricsQuarterly($selectedCurrency: String, $quarterStart: timestamp, $quarterEnd: timestamp) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { endDate: { _gte: $quarterStart, _lte: $quarterEnd } }
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
          { endDate: { _gte: $quarterStart, _lte: $quarterEnd } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_SPEND_COMPARISON_YEARLY = `
  query GetSpendComparisonYearly($selectedCurrency: String, $currentYearStart: timestamp, $currentYearEnd: timestamp, $previousYearStart: timestamp, $previousYearEnd: timestamp) {
    currentYearExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { endDate: { _gte: $currentYearStart, _lte: $currentYearEnd } }
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
          { endDate: { _gte: $previousYearStart, _lte: $previousYearEnd } }
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
  query GetSpendComparisonQuarterly($selectedCurrency: String, $currentQuarterStart: timestamp, $currentQuarterEnd: timestamp, $previousQuarterStart: timestamp, $previousQuarterEnd: timestamp) {
    currentQuarterExpenses: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID", "CLOSED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { endDate: { _gte: $currentQuarterStart, _lte: $currentQuarterEnd } }
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
          { endDate: { _gte: $previousQuarterStart, _lte: $previousQuarterEnd } }
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

export const GET_ADVANCE_PAYMENTS_APPROVED = `
  query GetAdvancePaymentsApproved($selectedCurrency: String) {
    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _eq: "APPROVED" } },
          { currencyRef: { _eq: $selectedCurrency } }
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

export const GET_ADVANCE_PAYMENTS_APPROVED_YEARLY = `
  query GetAdvancePaymentsApprovedYearly($selectedCurrency: String, $currentYearStart: timestamptz, $currentYearEnd: timestamptz) {
    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _eq: "APPROVED" } },
          { currencyRef: { _eq: $selectedCurrency } },
          { createdAt: { _gte: $currentYearStart, _lte: $currentYearEnd } }
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
          { createdAt: { _gte: $currentMonthStart, _lte: $currentMonthEnd } }
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
          { createdAt: { _gte: $quarterStart, _lte: $quarterEnd } }
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
