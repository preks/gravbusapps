// GraphQL queries for expenses launcher statistics
export const GET_LAUNCHER_STATS_BY_EMPLOYEE = `
  query GetLauncherStatsByEmployee(
    $employeeId: uuid!, 
    $currentMonthStart: timestamp, 
    $currentMonthEnd: timestamp, 
    $currentMonthStartTz: timestamptz, 
    $currentMonthEndTz: timestamptz, 
    $now: timestamp,
    $currency: String
  ) {
    # Unassigned expense items count
    unassignedItems: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}},
        status: {_eq: "UNASSIGNED"}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Pending expense requests (status PENDING)
    pendingRequests: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Monthly expenses sum (match My Expenses: approved/verifiable requests by decision date & currency)
    monthlyExpenses: ExpenseRequestAggregate(
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
      }
    }
    
    # Team monthly expense requests sum (current month, all employees - for finance/manager)
    teamMonthlyExpenses: ExpenseRequestAggregate(
      where: {
        isDeleted: {_eq: false},
        createdAt: {_gte: $currentMonthStartTz, _lt: $currentMonthEndTz}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Pending team plans (Action Required status - for manager/finance)
    pendingTeamPlans: ExpensePlanAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"}
      }
    ) {
      aggregate {
        sum {
          deductibleAmount
        }
      }
    }
    
    # Pending team requests (Action Required status - for manager/finance)
    pendingTeamRequests: ExpenseRequestAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"}
      }
    ) {
      aggregate {
        sum {
          deductibleAmount
        }
      }
    }
    
    # Pending finance requests (Verification Required status - for finance)
    pendingFinanceRequests: ExpenseRequestAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "VERIFIED"}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Pending finance advances (Transfer Required status - for finance)
    pendingFinanceAdvances: AdvancePaymentAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "PREPARED"}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total expense items count (for cards)
    totalExpenseItems: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total plans count (for cards)
    totalPlans: ExpensePlanAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total advance payments count (for cards)
    totalAdvancePayments: AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total expense requests count (for cards)
    totalExpenseRequests: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Total spent this year (for cards)
    totalSpentYTD: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}},
        expenseDate: {_gte: "2025-01-01"}
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }
    
    # Pending approvals count (for cards)
    pendingApprovals: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false}, 
        status: {_in: ["PENDING", "SUBMITTED", "IN_REVIEW"]}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Upcoming expense plans (future business trips from now onwards)
    upcomingExpensePlans: ExpensePlanAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        startDate: {_gt: $now}
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Upcoming expense requests (future requests from now onwards)
    upcomingExpenseRequests: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        startDate: {_gt: $now}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
