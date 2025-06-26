// GraphQL query to get dashboard statistics for an employee
export const GET_EXPENSE_DASHBOARD_BY_EMPLOYEE = `
  query GetExpenseDashboardByEmployee($employeeId: uuid!) {
    # Pending payouts (expense requests awaiting payment)
    pendingPayouts: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false}, 
        status: {_in: ["PENDING", "APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED"]}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }
    
    # This month's expenses
    currentMonthExpenses: ExpenseItemAggregate(
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
    flaggedItems: ExpenseItemAggregate(
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
    upcomingTrips: ExpensePlanAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
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
      limit: 10
    ) {
      id
      title
      description
      status
      updatedAt
      totalAmount
      expenseClass {
        value
      }
      expenseDate
    }
    
    # Last 6 months expense data for charts
    monthlyExpenses: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        createdAt: {_gte: "2024-12-01", _lt: "2025-07-01"}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
        count
      }
    }
    
    # Last month's expenses (for comparison)
    lastMonthExpenses: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        createdAt: {_gte: "2025-05-01", _lt: "2025-06-01"}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
        count
      }
    }
    
    # Expenses by type for donut chart
    expensesByType: ExpenseItem(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        createdAt: {_gte: "2025-01-01"}
      }
    ) {
      totalAmount
      expenseClass {
        value
      }
    }
    
    # Items without receipts
    itemsWithoutReceipts: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}},
        _not: { expenseItemFile: {} }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
