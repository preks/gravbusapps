export const GET_PENDING_APPROVALS = `
  query GetPendingApprovals($managerId: uuid!, $offset: Int!, $limit: Int!, $searchTerm: String!) {
    PendingApprovals: ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        status: {_eq: "PENDING"},
        isDeleted: {_eq: false},
        _or: [
          {title: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ]
      },
      orderBy: {createdAt: DESC},
      offset: $offset,
      limit: $limit
    ) {
      id
      title
      description
      totalAmount
      status
      requestDate
      createdAt
      employee {
        id
        fullName  
        firstName
        lastName
      }
    }
    PendingApprovalsAggregate: ExpenseRequestAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        status: {_eq: "PENDING"},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const APPROVE_EXPENSE_REQUEST = `
  mutation ApproveExpenseRequest($requestId: uuid!, $comments: String) {
    update_ExpenseRequest_by_pk(
      pk_columns: {id: $requestId}, 
      _set: {
        status: "APPROVED",
        comments: $comments
      }
    ) {
      id
      status
    }
  }
`

export const REJECT_EXPENSE_REQUEST = `
  mutation RejectExpenseRequest($requestId: uuid!, $comments: String) {
    update_ExpenseRequest_by_pk(
      pk_columns: {id: $requestId}, 
      _set: {
        status: "REJECTED",
        comments: $comments
      }
    ) {
      id
      status
    }
  }
`
