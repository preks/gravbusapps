/**
 * Backoffice analytics query - global data (no supervisor/manager filter).
 * Same structure as manager GET_EXPENSE_ANALYTICS_DATA but without employee.supervisorEmployeeId filtering.
 */
export const GET_BACKOFFICE_ANALYTICS_DATA = `
  query GetBackofficeAnalyticsData(
    $startDateTs: timestamp,
    $endDateTs: timestamp,
    $itemCurrencyWhere: ExpenseItemBoolExp = {},
    $reqCurrencyWhere: ExpenseRequestBoolExp = {},
    $planCurrencyWhere: ExpensePlanBoolExp = {},
    $payCurrencyWhere: AdvancePaymentBoolExp = {}
  ) {
    expenseItems: ExpenseItem(
      where: {
        _and: [
          $itemCurrencyWhere,
          { status: { _in: ["PAID", "CLOSED"] } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $startDateTs, _lte: $endDateTs } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ]},
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $startDateTs, _lte: $endDateTs } } }
            ]}
          ]}
        ]
      }
    ) {
      id title expenseDate createdAt status totalAmount currencyRef
      expenseRequest { requestTypeRef startDate }
      expensePosition { expenseGroupRef expenseGroup { value translations { value localeCode } } }
    }

    expenseRequests: ExpenseRequest(
      where: {
        _and: [
          $reqCurrencyWhere,
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
              { expenseItem: { expenseDate: { _gte: $startDateTs, _lte: $endDateTs } } }
            ]},
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
              { startDate: { _gte: $startDateTs, _lte: $endDateTs } }
            ]}
          ]}
        ]
      }
    ) {
      id title createdAt status totalAmount currencyRef requestTypeRef startDate
      expenseRequestTrip(
        where: { isDeleted: { _eq: false }, pointType: { _eq: "DESTINATION_POINT" } }
        orderBy: { tripDateTime: ASC }
      ) {
        id
        pointType
        address
        countryRef
        travelRegion { value translations { value localeCode } }
      }
    }

    expensePlans: ExpensePlan(
      where: {
        _and: [
          $planCurrencyWhere,
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
              { expensePlanItem: { expenseDate: { _gte: $startDateTs, _lte: $endDateTs } } }
            ]},
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
              { startDate: { _gte: $startDateTs, _lte: $endDateTs } }
            ]}
          ]}
        ]
      }
    ) {
      id title code createdAt status totalAmount currencyRef requestTypeRef startDate planDate
    }

    advancePayments: AdvancePayment(
      where: {
        _and: [
          $payCurrencyWhere,
          { isDeleted: { _eq: false } },
          { _or: [
            { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" }, expensePlanItem: { expenseDate: { _gte: $startDateTs, _lte: $endDateTs } } } },
            { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $startDateTs, _lte: $endDateTs } } }
          ]}
        ]
      }
    ) {
      id code amount status transactionDate createdAt currencyRef
      expensePlan {
        id title requestTypeRef startDate expensePlanItem { expenseDate }
      }
    }
  }
`
