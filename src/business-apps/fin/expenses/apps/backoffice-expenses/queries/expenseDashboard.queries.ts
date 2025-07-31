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
  query GetMonthlySpendComparison($currentMonthStart: timestamp!, $currentMonthEnd: timestamp!, $previousMonthStart: timestamp!, $previousMonthEnd: timestamp!) {
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
  query GetAdditionalDashboardMetrics($selectedCurrency: String) {
    transferRequired: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _eq: "BOOKED" } },
          { currencyRef: { _eq: $selectedCurrency } }
        ]
      }
    ) {
      aggregate {
        sum { totalAmount }
      }
    }
    pendingRequests: ExpenseRequestAggregate(where: { status: { _eq: "PENDING" } }) {
      aggregate {
        count
      }
    }
  }
`;
