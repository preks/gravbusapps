// GraphQL query for fetching expense plans by user (includes fields needed for the form UI)
export const GET_EXPENSE_PLANS_BY_USER = `
  query GetExpensePlansByUser(
    $status: [String]!
    $structureId: uuid!
    $employeeId: uuid!
    $activeUserLocale: String!
  ) {
    ExpensePlan(where: {status: {_in: $status}, employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}}) {
      code
      title
      id
      status
      totalRemainingAmount
      costCenterId
      currencyRef
      currency {
        id
        code
      }
      requestType {
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        catalog {
          defaultLocale
        }
      }
    }
    CostCenter(where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}}){
      id
      name
    }
  }
`

// GraphQL query for fetching specific expense plan details (called only when plan is selected)
export const GET_EXPENSE_PLAN_DETAILS = `
  query GetExpensePlanDetails($planId: uuid!, $activeUserLocale: String!) {
    ExpensePlan(where: {id: { _eq: $planId }}) {
      code
      title
      id
      totalAmountExpense
      totalAmount
      totalRemainingAmount
      costCenterId
      requestType {
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        catalog {
          defaultLocale
        }
      }
      currency {
        id
        code
      }
      currencyRef
    }
  }
`
