// GraphQL query to get dashboard statistics for an employee
export const GET_EXPENSE_DASHBOARD_BY_EMPLOYEE = `
  query GetExpenseDashboardByEmployee(
    $employeeId: uuid!,
    $currentDate: timestamp!,
    $currentMonthStart: timestamp!,
    $currentMonthEnd: timestamp!,
    $previousMonthStart: timestamp!,
    $previousMonthEnd: timestamp!,
    $currentQuarterStart: timestamp!,
    $currentQuarterEnd: timestamp!,
    $previousQuarterStart: timestamp!,
    $previousQuarterEnd: timestamp!,
    $currentYearStart: timestamp!,
    $currentYearEnd: timestamp!,
    $previousYearStart: timestamp!,
    $previousYearEnd: timestamp!,
    $currentMonthStartTz: timestamptz!,
    $currentMonthEndTz: timestamptz!,
    $currentQuarterStartTz: timestamptz!,
    $currentQuarterEndTz: timestamptz!,
    $currentYearStartTz: timestamptz!,
    $currentYearEndTz: timestamptz!,
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
       count
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
        count
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
        decisionDate: {_gte: $currentMonthStart, _lt: $currentMonthEnd},
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
        decisionDate: {_gte: $previousMonthStart, _lt: $previousMonthEnd},
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

    # This month's BOOKED expenses (pending payout proxy)
    currentMonthBooked: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_eq: "BOOKED"},
        decisionDate: {_gte: $currentMonthStart, _lt: $currentMonthEnd},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }

    # This quarter's expenses
    currentQuarterExpenses: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
        decisionDate: {_gte: $currentQuarterStart, _lt: $currentQuarterEnd},
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

    # This quarter's BOOKED expenses (pending payout proxy)
    currentQuarterBooked: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_eq: "BOOKED"},
        decisionDate: {_gte: $currentQuarterStart, _lt: $currentQuarterEnd},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }

    # Last quarter's expenses
    previousQuarterExpenses: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
        decisionDate: {_gte: $previousQuarterStart, _lt: $previousQuarterEnd},
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
        decisionDate: {_gte: $currentYearStart, _lt: $currentYearEnd},
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

    # This year's BOOKED expenses (pending payout proxy)
    currentYearBooked: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_eq: "BOOKED"},
        decisionDate: {_gte: $currentYearStart, _lt: $currentYearEnd},
        currencyRef: {_eq: $currency}
      }
    ) {
      aggregate {
        sum { totalAmount }
        count
      }
    }

    # Last year's expenses
    previousYearExpenses: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
        decisionDate: {_gte: $previousYearStart, _lt: $previousYearEnd},
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
        currencyRef: {_eq: $currency},
        expenseDate: {_gte: $currentMonthStart, _lt: $currentMonthEnd},
        status: {_nin: ["DISCARDED"]}
      },
      orderBy: {updatedAt: DESC}
    ) {
      id
      title
      status
      updatedAt
      totalAmount
      expenseClass {
        value
         translations {
          value
          localeCode
        }
      }
      expenseDate
    }
    

    
    # Expenses by type for donut chart (monthly)
    expensesByTypeMonth: ExpensePosition(
      where: {
        expenseItem: {
          employeeId: {_eq: $employeeId},
          isDeleted: {_eq: false},
          status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
          updatedAt: {_gte: $currentMonthStartTz, _lt: $currentMonthEndTz},
          currencyRef: {_eq: $currency}
        }
      }
    ) {
      totalAmount
      expenseGroup {
        value
        translations {
          value
          localeCode
        }
      }
    }

    # Expenses by type for donut chart (quarterly)
    expensesByTypeQuarter: ExpensePosition(
      where: {
        expenseItem: {
          employeeId: {_eq: $employeeId},
          isDeleted: {_eq: false},
          status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
          updatedAt: {_gte: $currentQuarterStartTz, _lt: $currentQuarterEndTz},
          currencyRef: {_eq: $currency}
        }
      }
    ) {
      totalAmount
      expenseGroup {
        value
        translations {
          value
          localeCode
        }
      }
    }

    # Expenses by type for donut chart (yearly)
    expensesByTypeYear: ExpensePosition(
      where: {
        expenseItem: {
          employeeId: {_eq: $employeeId},
          isDeleted: {_eq: false},
          status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]},
          updatedAt: {_gte: $currentYearStartTz, _lt: $currentYearEndTz},
          currencyRef: {_eq: $currency}
        }
      }
    ) {
      totalAmount
      expenseGroup {
        value
        translations {
          value
          localeCode
        }
      }
    }
    pendingItems: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_eq: "CREATED"}
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}}
      }
    ) {
      aggregate {
        count
      }
    }

  }
`;
