// GraphQL query to get advance payments filtered by employee ID (through expense plan) with pagination and search
export const GET_ADVANCE_PAYMENTS_BY_EMPLOYEE = `
  query GetAdvancePaymentsByEmployee($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      id
      code
      description
      amount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
        totalAmount
        currency {
          code
        }
      }
      expensePlanId
    }
  }
`;


export const GET_ADVANCE_PAYMENT_BY_ID = `
  query GetAdvancePaymentById($id: uuid!) {
    AdvancePayment(where: {id: {_eq: $id}}) {
      id
      code
      description
      amount
      currencyRef
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
      }
      expensePlanId
    }
  }
`;


export const GET_ADVANCE_PAYMENT_STATISTICS = `
  query GetAdvancePaymentStatistics($employeeId: uuid!) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
  