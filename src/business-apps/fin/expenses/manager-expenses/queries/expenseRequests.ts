// GraphQL query for fetching expense requests for team members with pagination, search and filtering
export const GET_EXPENSE_REQUESTS_BY_MANAGER = `
  query GetExpenseRequestsByManager(
    $managerId: uuid!,
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String,
    $status: String,
  ) {
    ExpenseRequestAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        _or: [
          {title: {_ilike: $searchTerm}},
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ],
        status: {_eq: $status, _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"]},
      }
    ) {
      aggregate {
        count
      }
    }
    ExpenseRequest(
      limit: $limit,
      offset: $offset,
      orderBy: {requestDate: DESC},
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        _or: [
          {title: {_ilike: $searchTerm}},
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ],
        status: {_eq: $status, _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"]},
      }
    ) {
      id
      code
      title
      startDate
      endDate
      description
      requestDate
      totalAmount
      status
      employeeDocument { # Corrected field for attachments
        file # Corresponds to fileUrl
        name # Corresponds to fileName
      }
      employee {
        id
        displayName
        fullName
        pictureThumbnail
        employeePosition {
          organizationalUnit { # Corrected path for department
            id
            name # This is the department name
          }
        }
        additionalProperties
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
      requestDate
      amount
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
    }
  }
`;

export const GET_TEAM_MEMBERS_BY_MANAGER = `
  query GetTeamMembersByManager($managerId: uuid!) {
    Employee(
      where: {
        manager: {
          id: {_eq: $managerId}
        },
        isActive: {_eq: true}
      },
      orderBy: {fullName: ASC}
    ) {
      id
      fullName
      department
      jobTitle
    }
  }
`;

export const APPROVE_EXPENSE_REQUEST = `
  mutation ApproveExpenseRequest($id: uuid!) {
    updateExpenseRequest(
      where: {id: {_eq: $id}},
      _set: {status: "APPROVED", approvedAt: "now()"}
    ) {
      affected_rows
      returning {
        id
        status
      }
    }
  }
`;

export const REJECT_EXPENSE_REQUEST = `
  mutation RejectExpenseRequest($id: uuid!, $rejectionReason: String) {
    updateExpenseRequest(
      where: {id: {_eq: $id}},
      _set: {
        status: "REJECTED", 
        rejectedAt: "now()",
        rejectionReason: $rejectionReason
      }
    ) {
      affected_rows
      returning {
        id
        status
      }
    }
  }
`;
