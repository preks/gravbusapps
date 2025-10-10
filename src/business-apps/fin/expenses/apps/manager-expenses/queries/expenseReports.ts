// Query to get monthly expense summary report data
export const GET_MONTHLY_EXPENSE_SUMMARY = `
  query GetMonthlyExpenseSummary($managerId: uuid!, $startDate: timestamptz, $endDate: timestamptz) {
    # Get expense categories with their counts and amounts
    ExpenseCategories: ExpenseItem(
      where: {
        isDeleted: {_eq: false}
      },
      distinctOn: expenseGroupRef
    ) {
      id
      expenseGroupRef
    }
    
    # Get expense positions grouped by category
    ExpensePositions: ExpenseItem(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false}
      }
    ) {
      id
      expenseGroupRef
      totalAmount
      expenseRequest {
        id
        createdAt
      }
    }
    
    # Get total counts by category
    CategoryCounts: ExpenseItemAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

// Query to get expense categories breakdown report data
export const GET_EXPENSE_CATEGORIES_BREAKDOWN = `
  query GetExpenseCategoriesBreakdown($managerId: uuid!, $startDate: timestamptz, $endDate: timestamptz) {
    # Get expense categories
    ExpenseCategories: ExpenseItem(
      where: {
        isDeleted: {_eq: false}
      },
      distinctOn: expenseGroupRef
    ) {
      id
      expenseGroupRef
    }
    
    # Get total expense amount for the period
    TotalExpenseAmount: ExpenseItemAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }
    
    # Get expense amounts grouped by category
    CategoryAmounts: ExpenseItem(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false}
      }
    ) {
      expenseGroupRef
      totalAmount
    }
  }
`

// Query to get team budget analysis report data
export const GET_TEAM_BUDGET_ANALYSIS = `
  query GetTeamBudgetAnalysis($managerId: uuid!, $startDate: timestamptz, $endDate: timestamptz) {
    # Get team members
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
    
    # Get expense requests by team members
    TeamExpenses: ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false}
      }
    ) {
      id
      employeeId
      totalAmount
      createdAt
      employee {
        fullName
      }
    }
    
    # Get expense amounts grouped by employee
    EmployeeExpenseAmounts: ExpenseRequestAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }
    
    # Get budget allocations for team members
    BudgetAllocations: EmployeeBudget(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        }
      }
    ) {
      employeeId
      allocatedAmount
      year
    }
  }
`
