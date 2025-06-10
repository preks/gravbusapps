// GraphQL query for fetching expense plans for team members with pagination, search and filtering
export const GET_EXPENSE_PLANS_BY_MANAGER = `
  query GetExpensePlansByManager(
    $employeeId: uuid!, 
    $limit: Int!, 
    $offset: Int!, 
    $searchTerm: String,
    $status: String
  ) {
    ExpensePlanAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $employeeId}
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
        status: {_eq: $status, _nin: ["CREATED", "DISCARDED", "RETURNED", "REJECTED"]}
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
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $employeeId}
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
        status: {_eq: $status, _nin: ["CREATED", "DISCARDED", "RETURNED", "REJECTED"]}
      }
    ) {
      id
      code
      title
      description
      status
      activeFrom
      activeTo
      totalAmount
      createdAt
      updatedAt
      decisionDate
      startDate
      endDate
      planDate
      employee {
        id
        displayName
        fullName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
    }
  }
`;

export const GET_EXPENSE_PLAN_STATISTICS = `
  query GetExpensePlanStatistics($employeeId: uuid!) {
  allPlansStats: ExpensePlanAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $employeeId}
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
          supervisorEmployeeId: {_eq: $employeeId}
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
`;

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
`;

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
`;
