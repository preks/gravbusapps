// GraphQL query for fetching dashboard data for a manager
export const GET_EXPENSE_DASHBOARD_BY_MANAGER = `
query GetExpenseDashboardByManager($managerId: uuid!, $startDate: timestamp, $yearStart: timestamp, $currentYear: Int, $currencyRef: String) {
  # Get team members count
  TeamMembersAggregate: EmployeeAggregate(
    where: {
      employeePosition: {
        supervisorEmployeeId: {_eq: $managerId}
      },
      isDeleted: {_eq: false}
    }
  ) {
    aggregate {
      count
    }
  }
  
  # Get team members list for debugging
  TeamMembers: Employee(
    where: {
      employeePosition: {
        supervisorEmployeeId: {_eq: $managerId}
      },
      isDeleted: {_eq: false}
    }
  ) {
    id
    fullName
  }

  # Get pending approvals count
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

  # Get monthly expenses total
  MonthlyExpensesAggregate: ExpenseRequestAggregate(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $managerId}
        }
      },
      status: {_eq: "APPROVED"},
      requestDate: {_gte: $startDate},
      isDeleted: {_eq: false},
      currencyRef: {_eq: $currencyRef}
    }
  ) {
    aggregate {
      sum {
        totalAmount
      }
    }
  }

  # Get total planned budget (Expense Plans) excluding draft/created, rejected, discarded
  ExpensePlansTotalAggregate: ExpensePlanAggregate(
    where: {
      employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
      status: { _nin: ["CREATED", "REJECTED", "DISCARDED"] },
      isDeleted: { _eq: false },
      currencyRef: { _eq: $currencyRef }
    }
  ) {
    aggregate {
      sum { totalAmount }
    }
  }

  # Get total used amount (Expense Requests) excluding draft/created, returned, rejected, discarded
  ExpenseRequestsUsedAggregate: ExpenseRequestAggregate(
    where: {
      employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
      status: { _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"] },
      isDeleted: { _eq: false },
      currencyRef: { _eq: $currencyRef }
    }
  ) {
    aggregate {
      sum { totalAmount }
    }
  }

  # Get recent expense requests
  RecentExpenseRequests: ExpenseRequest(
    limit: 5,
    orderBy: {requestDate: DESC},
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $managerId}
        }
      },
      status: {_nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"]},
      isDeleted: {_eq: false},
      currencyRef: {_eq: $currencyRef}
    }
  ) {
    id
    title
    totalAmount
    status
    requestDate
    employee {
      fullName
      firstName
      lastName  
    }
  }

  # Get distinct expense categories count
  DistinctExpenseCategories: ExpensePosition(
    where: {
      isDeleted: {_eq: false}
    },
    distinctOn: expenseGroupRef
  ) {
    expenseGroupRef
  }
  
  # Get expense categories for debugging
  ExpenseCategories: ExpensePosition(
    limit: 20,
    where: {
      isDeleted: {_eq: false}
    }
  ) {
    id
    expenseGroupRef
  }

  # Team budget query removed due to schema issues
  # Get monthly expense trends data
  MonthlyExpenseTrends: ExpenseRequest(
    where: {
      employee: {
        employeePosition: {
          supervisorEmployeeId: {_eq: $managerId}
        }
      },
      status: {_nin: ["CREATED", "PENDING", "REJECTED", "DISCARDED"]},
      requestDate: {_gte: $yearStart},
      isDeleted: {_eq: false},
      currencyRef: {_eq: $currencyRef}
    },
    orderBy: {requestDate: ASC}
  ) {
    requestDate
    totalAmount
  }
  }
`;

// GraphQL query for fetching all team employees under a manager
export const GET_ALL_TEAM_EMPLOYEES = `
  query GetAllTeamEmployees($managerId: uuid!, $activeStructure: uuid!) {
    Employee(
      where: {
        isDeleted: {_eq: false}
        employeePosition: {
          structureId: {_eq: $activeStructure}
          supervisorEmployeeId: {_eq: $managerId}
        }
      }
      orderBy: {firstName: ASC, lastName: ASC}
    ) {
      id
      userId
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
`;
