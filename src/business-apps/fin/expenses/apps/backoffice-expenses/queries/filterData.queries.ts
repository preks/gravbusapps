/**
 * GraphQL queries for fetching filter data (organizational units and currencies)
 */

export const GET_ORGANIZATIONAL_UNITS = `
  query GetOrganizationalUnits {
    ExpenseRequest(
      where: {
        isDeleted: { _eq: false }
      }
    ) {
      employeePosition {
        organizationalUnit {
          id
          name
          code
          description
          structureId
          company {
            id
            name
            code
          }
        }
      }
    }
  }
`;

export const GET_EXPENSE_CURRENCIES = `
  query GetExpenseCurrencies {
    ExpenseRequest(
      where: { 
        _or: [
          { currencyRef: { _isNull: false } },
          { currencyRef: { _neq: "" } }
        ],
        isDeleted: { _eq: false }
      }
    ) {
      currencyRef
      currency {
        code
        value
      }
    }
  }
`;
