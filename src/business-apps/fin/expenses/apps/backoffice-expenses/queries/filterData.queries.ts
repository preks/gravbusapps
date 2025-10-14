/**
 * GraphQL queries for fetching filter data
 */

export const GET_ORGANIZATIONAL_UNITS = `
  query GetOrganizationalUnits($structureId: uuid!) {
    OrganizationalUnit(
      where: { 
        structureId: { _eq: $structureId },
        isDeleted: { _eq: false }
      }
    ) {
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
`

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
`
