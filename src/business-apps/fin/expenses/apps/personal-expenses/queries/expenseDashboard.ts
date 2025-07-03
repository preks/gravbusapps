// GraphQL query to get dashboard statistics for an employee
export const GET_EXPENSE_DASHBOARD_BY_EMPLOYEE = `
  query GetExpenseDashboardByEmployee(
    $employeeId: uuid!,
    $currentDate: timestamp!,
    $currentMonthStart: timestamptz!,
    $currentMonthEnd: timestamptz!,
    $previousMonthStart: timestamptz!,
    $previousMonthEnd: timestamptz!,
    $currentQuarterStart: timestamptz!,
    $currentQuarterEnd: timestamptz!,
    $previousQuarterStart: timestamptz!,
    $previousQuarterEnd: timestamptz!,
    $currentYearStart: timestamptz!,
    $currentYearEnd: timestamptz!,
    $previousYearStart: timestamptz!,
    $previousYearEnd: timestamptz!,
    $currency: String!
  ) {


    # Sum of BOOKED expense requests
    bookedExpenseRequests: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_eq: "BOOKED"},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }

    # Sum of PENDING advance payments
    pendingAdvancePayments: AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}},
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
    
    # This month's expenses
    currentMonthExpenses: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
        createdAt: {_gte: $currentMonthStart, _lt: $currentMonthEnd},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
        count
      }
    }
    
    # Last month's expenses
    previousMonthExpenses: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
        createdAt: {_gte: $previousMonthStart, _lt: $previousMonthEnd},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
        count
      }
    }

    # This quarter's expenses
    currentQuarterExpenses: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
        createdAt: {_gte: $currentQuarterStart, _lt: $currentQuarterEnd},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
        count
      }
    }

    # Last quarter's expenses
    previousQuarterExpenses: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
        createdAt: {_gte: $previousQuarterStart, _lt: $previousQuarterEnd},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
        count
      }
    }

    # This year's expenses
    currentYearExpenses: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
        createdAt: {_gte: $currentYearStart, _lt: $currentYearEnd},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
        count
      }
    }

    # Last year's expenses
    previousYearExpenses: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
        createdAt: {_gte: $previousYearStart, _lt: $previousYearEnd},
        currencyRef: {_eq: $currency}
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
        status: {_eq: "APPROVED"},
        startDate: {_gt: $currentDate}
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
        isDeleted: {_eq: false},
        currencyRef: {_eq: $currency}
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
    

    
    # Expenses by type for donut chart
    expensesByType: ExpensePosition(
      where: {
        expenseItem: {
          employeeId: {_eq: $employeeId},
          isDeleted: {_eq: false},
          status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
          createdAt: {_gte: $currentYearStart, _lt: $currentYearEnd},
          currencyRef: {_eq: $currency}
        }
      }
    ) {
      totalAmount
      expenseGroup {
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
