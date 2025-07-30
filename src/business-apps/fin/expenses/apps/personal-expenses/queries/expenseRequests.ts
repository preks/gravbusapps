// GraphQL query to get expense requests filtered by employee ID with pagination and search
export const GET_EXPENSE_REQUESTS_BY_EMPLOYEE = `
  query GetExpenseRequestsByEmployee(
    $limit: Int,
    $offset: Int,
    $where: ExpenseRequestBoolExp,
    $orderBy: [ExpenseRequestOrderBy!]
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
      orderBy: $orderBy,
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
      currency {
        code
      }
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
      expensePlan {
        advancePaymentTotalAmount
        code
        advancePaymentAggregate {
          aggregate {
            sum {
              amount
            }
          }
        }
        currency {
          code
        }
      }
      employeeDocumentId
      employeeDocument {
        file
        name
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
      currency {
        code
      }
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
      expensePlan {
        advancePaymentTotalAmount
        code
        advancePaymentAggregate {
          aggregate {
            sum {
              amount
            }
          }
        }
        currency {
          code
        }
      }
      employeeDocumentId
      employeeDocument {
        file
        name
      }
    }
  }
`;

export const GET_EXPENSE_REQUEST_STATISTICS = `
  query GetExpenseRequestStatistics($employeeId: uuid!, $startDate: timestamp!, $endDate: timestamp!) {
    ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        requestDate: {_gte: $startDate, _lt: $endDate}
        status: {_in: ["PAID", "CLOSED", "TRANSFERRED"]}
      }
    ) {
      aggregate {
        count
        sum {
          totalAmount
        }
      }
    }
    PendingApproval: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"},
      }
    ) {
      aggregate {
        count
      }
    }
    ReimbursableAmount: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_nin: ["PAID", "CLOSED", "TRANSFERRED"]}
      }
    ) {
      aggregate {
        sum {
          reimbursableAmount
        }
      }
    }
  }
`;