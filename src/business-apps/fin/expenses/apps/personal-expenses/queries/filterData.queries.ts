/**
 * GraphQL queries for fetching personal expenses filter data
 */

export const GET_PERSONAL_EXPENSE_CURRENCIES = `
  query GetPersonalExpenseCurrencies($employeeId: uuid!) {
    ExpenseRequest(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        _or: [
          { currencyRef: { _isNull: false } },
          { currencyRef: { _neq: "" } }
        ]
      }
    ) {
      currencyRef
      currency { code value }
    }
  }
`
