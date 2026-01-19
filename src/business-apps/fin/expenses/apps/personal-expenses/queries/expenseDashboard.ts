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
    # Action feed from plan/request comments (approved/returned), sorted by date desc within selected period
    requestActivity: ExpenseRequestComment(
      where: {
        expenseRequest: { employeeId: {_eq: $employeeId}, isDeleted: {_eq: false} },
        commentType: { _in: ["APPROVE_COMMENT", "REJECT_COMMENT"] },
        commentDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd }
      },
      orderBy: { commentDate: DESC }
    ) {
      id
      comment
      commentType
      commentDate
      expenseRequest { 
        id 
        title 
        code 
        status 
      }
    }

    planActivity: ExpensePlanComment(
      where: {
        expensePlan: { employeeId: {_eq: $employeeId}, isDeleted: {_eq: false} },
        commentType: { _in: ["APPROVE_COMMENT", "REJECT_COMMENT"] },
        commentDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd }
      },
      orderBy: { commentDate: DESC }
    ) {
      id
      comment
      commentType
      commentDate
      expensePlan { 
        id 
        title 
        code 
        status
      }
    }


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
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]} },
          { currencyRef: {_eq: $currency} },
          { _or: [
              { _and: [
                  { requestDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } }
                ] }
            ] }
        ]
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
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]} },
          { currencyRef: {_eq: $currency} },
          { _or: [
              { _and: [
                  { requestDate: { _gte: $previousMonthStart, _lt: $previousMonthEnd } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $previousMonthStart, _lt: $previousMonthEnd } }
                ] }
            ] }
        ]
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
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_eq: "BOOKED"} },
          { currencyRef: {_eq: $currency} },
          { _or: [
              { _and: [
                  { requestDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } }
                ] }
            ] }
        ]
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
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]} },
          { currencyRef: {_eq: $currency} },
          { _or: [
              { _and: [
                  { requestDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } }
                ] }
            ] }
        ]
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
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_eq: "BOOKED"} },
          { currencyRef: {_eq: $currency} },
          { _or: [
              { _and: [
                  { requestDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } }
                ] }
            ] }
        ]
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
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]} },
          { currencyRef: {_eq: $currency} },
          { _or: [
              { _and: [
                  { expenseItem: { expenseDate: { _gte: $previousQuarterStart, _lt: $previousQuarterEnd } } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $previousQuarterStart, _lt: $previousQuarterEnd } }
                ] }
            ] }
        ]
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
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]} },
          { currencyRef: {_eq: $currency} },
          { _or: [
              { _and: [
                  { expenseItem: { expenseDate: { _gte: $currentYearStart, _lt: $currentYearEnd } } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $currentYearStart, _lt: $currentYearEnd } }
                ] }
            ] }
        ]
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
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_eq: "BOOKED"} },
          { currencyRef: {_eq: $currency} },
          { _or: [
              { _and: [
                  { expenseItem: { expenseDate: { _gte: $currentYearStart, _lt: $currentYearEnd } } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $currentYearStart, _lt: $currentYearEnd } }
                ] }
            ] }
        ]
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
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_in: ["APPROVED", "VERIFIED", "BOOKED", "TRANSFERRED", "PAID"]} },
          { currencyRef: {_eq: $currency} },
          { _or: [
              { _and: [
                  { expenseItem: { expenseDate: { _gte: $previousYearStart, _lte: $previousYearEnd } } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} } 
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} } ,
                  { startDate: { _gte: $previousYearStart, _lte: $previousYearEnd } }
                ] }
            ] }
        ]
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
        status: {_eq: "CREATED"},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}}
      }
    ) {
      aggregate {
        count
      }
    }

  }
`
