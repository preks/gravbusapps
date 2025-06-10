// GraphQL query to get expense plans filtered by employee ID with pagination and search
export const GET_EXPENSE_PLANS_BY_EMPLOYEE = `
  query GetExpensePlansByEmployee($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String) {
    ExpensePlanAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        _or: [
          {title: {_ilike: $searchTerm}},
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}}
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    ExpensePlan(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        _or: [
          {title: {_ilike: $searchTerm}},
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}}
        ]
      }
    ) {
      id
      code
      title
      description
      startDate
      endDate
      planDate
      totalAmount
      advancePaymentPaidAmount
      advancePaymentTotalAmount
      costCenter {
        name
        id
      }
      status
      employee {
        fullName
      }
      additionalProperties
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      currency {
        value
        translations {
          value
          localeCode
        }
      }
    }
  }
`;

export const GET_EXPENSE_PLAN_BY_ID = `
  query GetExpensePlanById($id: uuid!) {
    ExpensePlan(where: {id: {_eq: $id}}) {
      id
      code
      title
      description
      startDate
      endDate
      planDate
      totalAmount
      advancePaymentPaidAmount
      advancePaymentTotalAmount
      costCenter {
        name
        id
      }
      status
      employee {
        fullName
      }
      additionalProperties
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      currency {
        value
        translations {
          value
          localeCode
        }
      }
    }
  }
`;

export const GET_EXPENSE_PLAN_STATISTICS = `
  query GetExpensePlanStatistics($employeeId: uuid!) {
    ExpensePlanAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
