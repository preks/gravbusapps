// GraphQL queries for team spending analytics data

/**
 * Query to get all currencies used across expense entities
 * We'll use a single query for both distinct currencies and most used currency
 * and handle the processing client-side for better efficiency
 */
export const GET_ALL_CURRENCIES = `
  query GetAllCurrencies($managerId: uuid!) {
    # Get currencies from ExpenseItems
    expenseItems: ExpenseItem(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        currencyRef: {_neq: null}
      }
    ) {
      currencyRef
    }
    
    # Get currencies from ExpenseRequests
    expenseRequests: ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        currencyRef: {_neq: null}
      }
    ) {
      currencyRef
    }
    
    # Get currencies from ExpensePlans
    expensePlans: ExpensePlan(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        currencyRef: {_neq: null}
      }
    ) {
      currencyRef
    }
    
    # Get currencies from AdvancePayments
    advancePayments: AdvancePayment(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          }
        },
        isDeleted: {_eq: false},
        currencyRef: {_neq: null}
      }
    ) {
      currencyRef
    }
  }
`

// For backward compatibility, we'll keep these exports but they'll use the same query
export const GET_DISTINCT_CURRENCIES = GET_ALL_CURRENCIES
export const GET_MOST_USED_CURRENCY = GET_ALL_CURRENCIES
export const GET_EXPENSE_ANALYTICS_DATA = `
  query GetExpenseAnalyticsDataV2(
    $managerId: uuid!,
    $startDateTs: timestamp,
    $endDateTs: timestamp,
    $itemCurrencyWhere: ExpenseItemBoolExp = {},
    $reqCurrencyWhere: ExpenseRequestBoolExp = {},
    $planCurrencyWhere: ExpensePlanBoolExp = {},
    $payCurrencyWhere: AdvancePaymentBoolExp = {}
  ) {
    # Expense Items analytics (actual spend) with correct period logic
    # NO createdAt filtering - only expenseDate/startDate based on type
    expenseItems: ExpenseItem(
      where: {
        _and: [
          $itemCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
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
      id
      title
      expenseDate
      createdAt
      status
      totalAmount
      currencyRef
      employee {
        id
        fullName
        employeePosition {
          organizationalUnit { id name }
          siteLocation { id name }
        }
      }
      expenseRequest { requestTypeRef startDate }
      expensePosition {
        expenseGroupRef
        expenseGroup { value translations { value localeCode } }
      }
    }
    
    # Expense Requests analytics with aligned period logic
    # EXPENSES → expenseItem.expenseDate; TRIP → request.startDate
    expenseRequests: ExpenseRequest(
      where: {
        _and: [
          $reqCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _in: ["PAID", "CLOSED"] } },
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
      id
      title
      createdAt
      status
      totalAmount
      currencyRef
      requestTypeRef
      startDate
      employee {
        id
        fullName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          siteLocation {
            id
            name
          }
        }
      }
    }
    
    # Expense Plans analytics (committed budgets) with aligned period logic
    # EXPENSES → planItem.expenseDate; TRIP → plan.startDate
    expensePlans: ExpensePlan(
      where: {
        _and: [
          $planCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _in: ["PAID", "CLOSED"] } },
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
      id
      title
      code
      createdAt
      status
      totalAmount
      currencyRef
      requestTypeRef
      startDate
      planDate
      employee {
        id
        fullName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          siteLocation {
            id
            name
          }
        }
      }
    }
    
    # Advance Payments analytics with aligned period logic via associated plan
    # EXPENSES → plan.expensePlanItem.expenseDate; TRIP → plan.startDate
    advancePayments: AdvancePayment(
      where: {
        _and: [
          $payCurrencyWhere,
          { expensePlan: {
            employee: { employeePosition: { supervisorEmployeeId: {_eq: $managerId} } }
          }},
          { status: { _in: ["PAID", "CLOSED"] } },
          { isDeleted: {_eq: false} },
          { _or: [
            { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" }, expensePlanItem: { expenseDate: { _gte: $startDateTs, _lte: $endDateTs } } } },
            { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $startDateTs, _lte: $endDateTs } } }
          ]}
        ]
      }
    ) {
      id
      code
      amount
      status
      transactionDate
      createdAt
      currencyRef
      expensePlan {
        id
        title
        requestTypeRef
        startDate
        expensePlanItem { expenseDate }
        employee {
          id
          fullName
          employeePosition {
            organizationalUnit {
              id
              name
            }
            siteLocation {
              id
              name
            }
          }
        }
      }
    }
  }
`
