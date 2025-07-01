// GraphQL query for fetching dashboard data for a manager
export const GET_EXPENSE_DASHBOARD_BY_MANAGER = `
query GetExpenseDashboardByManager($managerId: uuid!, $startDate: timestamp, $yearStart: timestamp, $currentYear: Int) {
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
      isDeleted: {_eq: false}
    }
  ) {
    aggregate {
      sum {
        totalAmount
      }
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
      isDeleted: {_eq: false}
    }
  ) {
    id
    title
    totalAmount
    status
    requestDate
    employee {
      fullName
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
      status: {_eq: "APPROVED"},
      requestDate: {_gte: $yearStart},
      isDeleted: {_eq: false}
    },
    orderBy: {requestDate: ASC}
  ) {
    requestDate
    totalAmount
  }
}
`;
