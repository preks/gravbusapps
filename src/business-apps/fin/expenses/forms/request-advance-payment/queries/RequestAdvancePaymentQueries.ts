// GraphQL query for fetching expense plans by user (basic info only)
export const GET_EXPENSE_PLANS_BY_USER = `
  query GetExpensePlansByUser($status: [String]!, $structureId: uuid!, $userId: uuid!) {
    ExpensePlan(where: {status: {_in: $status}, createdBy: {_eq: $userId}, isDeleted: {_eq: false}}) {
      code
      title
      id
      status
    }
    CostCenter(where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}}){
      id
      name
    }
  }
`;

// GraphQL query for fetching ALL expense plans by user (no status filter)
export const GET_ALL_EXPENSE_PLANS_BY_USER = `
  query GetAllExpensePlansByUser($structureId: uuid!, $userId: uuid!) {
    ExpensePlan(where: {createdBy: {_eq: $userId}, isDeleted: {_eq: false}}) {
      code
      title
      id
      status
    }
    CostCenter(where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}}){
      id
      name
    }
  }
`;

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
    }
  }
`;
