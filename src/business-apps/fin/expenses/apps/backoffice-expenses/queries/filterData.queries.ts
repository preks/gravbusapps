/**
 * GraphQL queries for fetching filter data (organizational units and currencies)
 */

export const GET_ORGANIZATIONAL_UNITS = `
  query GetOrganizationalUnits {
    OrganizationalUnit(
      limit: 100
      where: {
        _and: [
          {isDeleted: {_eq: false}},
          {name: {_neq: ""}},
          {name: {_neq: "New Unit"}}
        ]
      }
      orderBy: [{structureId: ASC}, {name: ASC}]
    ) {
      id
      name
      code
      description
      structureId
      structure {
        id
        name
        description
      }
      company {
        id
        name
        code
      }
    }
  }
`;

export const GET_EXPENSE_CURRENCIES = `
  query GetExpenseCurrencies {
    expenseRequestCurrencies: ExpenseRequest(
      limit: 20
      distinctOn: [currencyRef]
      where: { currencyRef: { _neq: "" } }
    ) {
      currencyRef
      currency {
        code
        value
      }
    }
    expensePlanCurrencies: ExpensePlan(
      limit: 20
      distinctOn: [currencyRef]
      where: { currencyRef: { _neq: "" } }
    ) {
      currencyRef
      currency {
        code
        value
      }
    }
    advancePaymentCurrencies: AdvancePayment(
      limit: 20
      distinctOn: [currencyRef]
      where: { currencyRef: { _neq: "" } }
    ) {
      currencyRef
      currency {
        code
        value
      }
    }
  }
`;
