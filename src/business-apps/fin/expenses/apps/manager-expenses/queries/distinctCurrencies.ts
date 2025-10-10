// GraphQL queries for fetching distinct currencies from different expense entities

export const GET_DISTINCT_EXPENSE_PLAN_CURRENCIES = `
  query GetDistinctExpensePlanCurrencies($managerId: uuid!) {
    ExpensePlan(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      currencyRef
    }
  }
`

export const GET_DISTINCT_EXPENSE_REQUEST_CURRENCIES = `
  query GetDistinctExpenseRequestCurrencies($managerId: uuid!) {
    ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      currencyRef
    }
  }
`

export const GET_DISTINCT_ADVANCE_PAYMENT_CURRENCIES = `
  query GetDistinctAdvancePaymentCurrencies($managerId: uuid!) {
    AdvancePayment(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          },
          isDeleted: {_eq: false}
        },
        status: {_eq: "PAID"}
      }
    ) {
      currencyRef
    }
  }
`
