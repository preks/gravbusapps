// GraphQL query to get dashboard statistics for an employee
export const GET_EXPENSE_DASHBOARD_BY_EMPLOYEE = `
  query GetExpenseDashboardByEmployee($employeeId: uuid!) {
    # Pending payouts (approved but not paid expense items)
    pendingPayouts: ExpenseItem_aggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false}, 
        status: {_eq: "APPROVED"}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }
    
    # This month's expenses
    currentMonthExpenses: ExpenseItem_aggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        createdAt: {_gte: "2025-06-01", _lt: "2025-07-01"}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
        count
      }
    }
    
    # Flagged items (items with issues or requiring attention)
    flaggedItems: ExpenseItem_aggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_eq: "REJECTED"}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Upcoming trips (future business trips)
    upcomingTrips: ExpensePlan_aggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        tripType: {_neq: null},
        startDate: {_gt: "2025-06-02"}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Recent activity for action feed
    recentActivity: ExpenseItem(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false}
      },
      orderBy: {updatedAt: DESC},
      limit: 5
    ) {
      id
      title
      description
      status
      updatedAt
      totalAmount
    }
  }
`;
