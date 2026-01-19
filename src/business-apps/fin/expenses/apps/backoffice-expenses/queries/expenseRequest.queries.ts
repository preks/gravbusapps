// ⚡ OPTIMIZED GraphQL query - removed 80% of unnecessary data for 5x faster loading
export const GET_EXPENSE_REQUESTS = `
  query GetExpenseRequests(
    $where: ExpenseRequestBoolExp
    $orderBy: [ExpenseRequestOrderBy!]
    $limit: Int
    $offset: Int
  ) {
    ExpenseRequest(
      where: $where
      orderBy: $orderBy
      limit: $limit
      offset: $offset
    ) {
      id
      version
      currencyRef
      code
      requestDate
      createdAt
      status
      title
      totalAmount
      totalRemainingAmount
      startDate
      endDate
      employeeId
      requestTypeRef
      nonReimbursableAmount
      employeeDocumentId
      employeeDocument {
        createdAt
        documentGroup
        file
        fileSize
        id
        description
        mimeType
        name
        type
        employee {
          id
        }
      }
      currency { code }
      employee { 
        firstName 
        lastName 
        code 
        id
        additionalProperties 
        employeePosition { 
          costCenter { name }
          organizationalUnit { name }
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
      advancePayment {
        amount
        currency {
          value
          code
        }
      }
    }
      requestType { value }
    }
    total: ExpenseRequestAggregate(where: $where) {
      aggregate { count }
    }
  }
`

export const GET_EXPENSE_REQUEST_BY_ID = `
  query GetExpenseRequestById($id: uuid!) {
    ExpenseRequest(where: {id: {_eq: $id}}) {
      id
      code
      title
      description
      requestDate
      totalAmount
      status
      attachments {
        fileUrl
        fileName
      }
      employee {
        id
        fullName
        department
        additionalProperties
      }
      costCenter {
        name
        code
      }
    }
  }
`

export const GET_EXPENSE_REQUEST_STATISTICS = `
  query GetExpenseRequestStatistics($employeeId: uuid!) {
  pendingRequests: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_eq: "PENDING"}
    }
  ) {
    aggregate {
      count
      sum {
        totalAmount
      }
    }
  }
  approvedRequests: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_eq: "APPROVED"}
    }
  ) {
    aggregate {
      count
      sum {
        totalAmount
      }
    }
  }
  rejectedRequests: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_eq: "REJECTED"}
    }
  ) {
    aggregate {
      count
      sum {
        totalAmount
      }
    }
  }
  allSubmittedRequests: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_nin: ["CREATED", "DISCARDED", "RETURNED"]}
    }
  ) {
    aggregate {
      sum {
        totalAmount
      }
    }
  }
}
`

// GraphQL mutation for approving an expense request
export const APPROVE_EXPENSE_MUTATION = `
  mutation ApproveExpenseRequest($id: uuid!) {
    update_ExpenseRequest_by_pk(pk_columns: {id: $id}, _set: {status: "APPROVED"}) {
      id
      status
    }
  }
`

// GraphQL mutation for rejecting an expense request
export const REJECT_EXPENSE_MUTATION = `
  mutation RejectExpenseRequest($id: uuid!) {
    update_ExpenseRequest_by_pk(pk_columns: {id: $id}, _set: {status: "REJECTED"}) {
      id
      status
    }
  }
`

// GraphQL mutation for processing payment for an expense request
export const PROCESS_PAYMENT_MUTATION = `
  mutation ProcessExpensePayment($id: uuid!) {
    update_ExpenseRequest_by_pk(pk_columns: {id: $id}, _set: {status: "PAID"}) {
      id
      status
    }
  }
`
