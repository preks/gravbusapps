// GraphQL query for fetching dashboard data for a manager
export const GET_EXPENSE_DASHBOARD_BY_MANAGER = `
query GetExpenseDashboardByManager($managerId: uuid!, $startDate: timestamp) {
  # Get team members count
  TeamMembersAggregate: EmployeeAggregate(
    where: {
      employeePosition: {
        supervisorEmployeeId: {_eq: $managerId}
      }
    }
  ) {
    aggregate {
      count
    }
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
}

`;
