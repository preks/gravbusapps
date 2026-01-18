// GraphQL query for fetching expense plans for team members with pagination, search and filtering
export const GET_EXPENSE_PLANS_BY_MANAGER = `
  query GetExpensePlansByManager(
    $managerId: uuid!,
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String,
    $status: String
  ) {
    ExpensePlanAggregate(
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
      orderBy: {planDate: DESC},
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
        ]
      }
    ) {
      id
      code
      title
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      expenseRequest { 
        id 
        code
        requestType {
          value
          translations {
            value
            localeCode
          }
        }
      }
      startDate
      endDate
      status
      activeFrom
      activeTo
      totalAmount
      currencyRef
      createdAt
      updatedAt
      decisionDate
      planDate
      employeeDocument {
        id
        file
        fileSize
        name
        mimeType
      }
      employee {
        id
        code
        displayName
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

export const GET_EXPENSE_PLAN_STATISTICS = `
  query GetExpensePlanStatistics($managerId: uuid!) {
  allPlansStats: ExpensePlanAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $managerId}
        }
      },
      isDeleted: {_eq: false},
      status: {_nin: ["CREATED", "DISCARDED", "RETURNED", "REJECTED"]}
    }
  ) {
    aggregate {
      totalCount: count
      sum {
        totalAmount
      }
    }
  }
  pendingPlansStats: ExpensePlanAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $managerId}
        }
      },
      isDeleted: {_eq: false},
      status: {_eq: "PENDING"}
    }
  ) {
    aggregate {
      pendingCount: count
      sum {
        totalAmount
      }
    }
  }
}
`

export const APPROVE_EXPENSE_PLAN = `
  mutation ApproveExpensePlan($planId: uuid!, $approverEmployeeId: uuid!, $comments: String) {
    update_ExpensePlan(
      where: {id: {_eq: $planId}},
      _set: {
        status: "APPROVED",
        approvedBy: $approverEmployeeId,
        approvedDate: "now()",
        approvalComments: $comments
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

export const REJECT_EXPENSE_PLAN = `
  mutation RejectExpensePlan($planId: uuid!, $rejectorEmployeeId: uuid!, $reason: String!) {
    update_ExpensePlan(
      where: {id: {_eq: $planId}},
      _set: {
        status: "REJECTED",
        rejectedBy: $rejectorEmployeeId,
        rejectedDate: "now()",
        rejectionReason: $reason
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
