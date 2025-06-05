// GraphQL query to get expense requests filtered by employee ID with pagination and search
export const GET_EXPENSE_REQUESTS_BY_EMPLOYEE = `
  query GetExpenseRequestsByEmployee(
    $limit: Int,
    $offset: Int,
    $where: ExpenseRequestBoolExp
  ) {
    ExpenseRequestAggregate(
      where: $where
    ) {
      aggregate {
        count
      }
    }
    ExpenseRequest(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: $where
    ) {
      id
      code
      title
      description
      startDate
      endDate
      requestDate
      totalAmount
      currencyRef
      costCenter {
        name
      }
      status
      reimbursableAmount
      nonReimbursableAmount
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
    }
  }
`;

export const GET_EXPENSE_REQUEST_BY_ID = `
  query GetExpenseRequestById($id: uuid!) {
    ExpenseRequest(where: {id: {_eq: $id}}) {
      id
      code
      title
      description
      startDate
      endDate
      requestDate
      totalAmount
      currencyRef
      costCenter {
        name
      }
      status
      reimbursableAmount
      nonReimbursableAmount
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
    }
  }
`;

export const GET_EXPENSE_REQUEST_STATISTICS = `
  query GetExpenseRequestStatistics($employeeId: uuid!) {
    ExpenseRequestAggregate(
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