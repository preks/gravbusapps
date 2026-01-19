// GraphQL query for fetching expense requests for team members with pagination, search and filtering
export const GET_EXPENSE_REQUESTS_BY_MANAGER = `
  query GetExpenseRequestsByManager(
    $where: ExpenseRequestBoolExp,
    $limit: Int!,
    $offset: Int!,
    $orderBy: [ExpenseRequestOrderBy!]
  ) {
    ExpenseRequestAggregate(where: $where) {
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
      requestDate
      startDate
      endDate
      description
      totalAmount
      currencyRef
      status
      createdAt
      updatedAt
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      expensePlan { 
        code
        requestType {
          value
          translations {
            value
            localeCode
          }
        }
      }
      employeeDocument {
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
      employee {
        id
        code
        displayName
        firstName
        lastName
        fullName
        pictureThumbnail
        additionalProperties
        employeePosition {
          organizationalUnit { # Corrected path for department
            id
            name # This is the department name
          }
        }
      }
    }
  }
`

// New query that follows the same pattern as expense plans with proper search and status filtering
export const GET_MAIN_VIEW_EXPENSE_REQUESTS = `
  query GetMainViewExpenseRequests(
    $managerId: uuid!,
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String,
    $status: String
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
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ],
        status: {_eq: $status}
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
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ],
        status: {_eq: $status}
      }
    ) {
      id
      code
      title
      requestDate
      startDate
      endDate
      description
      totalAmount
      currencyRef
      status
      createdAt
      updatedAt
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      expensePlan { 
        code
        requestType {
          value
          translations {
            value
            localeCode
          }
        }
      }
      employeeDocument {
        file
        name
      }
      employee {
        id
        code
        displayName
        firstName
        lastName
        fullName
        pictureThumbnail
        additionalProperties
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
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
      startDate
      endDate
      totalAmount
      currencyRef
      status
      attachments {
        fileUrl
        fileName
      }
      employee {
        id
        firstName
        lastName
        fullName
        department
        additionalProperties
      }
    }
  }
`

export const GET_TEAM_MEMBERS_BY_MANAGER = `
  query GetTeamMembersByManager($managerId: uuid!) {
    Employee(
      where: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $managerId}
        },
        isDeleted: {_eq: false}
      },
      orderBy: {fullName: ASC}
    ) {
      id
      firstName
      lastName
      fullName
      displayName
      employeePosition {
        organizationalUnit {
          name
        }
      }
    }
  }
`

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
`

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
    }
  }
  pendingAmount: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED"]}
    }
  ) {
    aggregate {
      sum {
        totalAmount
      }
    }
  }
  totalRequestsSubmitted: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_nin: ["REJECTED", "DISCARDED", "CREATED"]}
    }
  ) {
    aggregate {
      count
    }
  }
  totalSubmittedAmount: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_nin: ["REJECTED", "DISCARDED", "CREATED"]}
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

export const GET_EXPENSE_REQUEST_STATISTICS_WITH_CURRENCY = `
  query GetExpenseRequestStatisticsWithCurrency($employeeId: uuid!, $currencyRef: String!) {
  pendingRequests: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_eq: "PENDING"},
      currencyRef: {_eq: $currencyRef}
    }
  ) {
    aggregate {
      count
    }
  }
  pendingAmount: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED"]},
      currencyRef: {_eq: $currencyRef}
    }
  ) {
    aggregate {
      sum {
        totalAmount
      }
    }
  }
  totalRequestsSubmitted: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_nin: ["REJECTED", "DISCARDED", "CREATED"]},
      currencyRef: {_eq: $currencyRef}
    }
  ) {
    aggregate {
      count
    }
  }
  totalSubmittedAmount: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
        }
      },
      isDeleted: {_eq: false},
      status: {_nin: ["REJECTED", "DISCARDED", "CREATED"]},
      currencyRef: {_eq: $currencyRef}
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
