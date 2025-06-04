// GraphQL query for fetching dashboard data for a manager
export const GET_EXPENSE_DASHBOARD_BY_MANAGER = `
  query GetExpenseDashboardByManager($managerId: uuid!) {
    # Get team members count
    TeamMembersAggregate: EmployeeAggregate(
      where: {
        manager: {
          id: {_eq: $managerId}
        },
        isActive: {_eq: true}
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
          manager: {
            id: {_eq: $managerId}
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
          manager: {
            id: {_eq: $managerId}
          }
        },
        status: {_eq: "APPROVED"},
        requestDate: {_gte: "now() - interval '30 days'"},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
    
    # Get expense categories count
    ExpenseCategoriesAggregate: ExpenseClassAggregate(
      where: {
        isActive: {_eq: true}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Get recent expense requests
    RecentExpenseRequests: ExpenseRequest(
      limit: 5,
      orderBy: {requestDate: DESC},
      where: {
        employee: {
          manager: {
            id: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      id
      title
      amount
      status
      requestDate
      employee {
        fullName
      }
    }
    
    # Get team budget status
    TeamBudget: TeamBudget(
      where: {
        managerId: {_eq: $managerId},
        year: {_eq: "extract(year from current_date)"}
      }
    ) {
      total
      used
      remaining
    }
  }
`;
