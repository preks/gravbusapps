/**
 * ⚡ PERFORMANCE OPTIMIZATION: Combined Dashboard Query
 *
 * This file contains a single, optimized GraphQL query that fetches ALL dashboard statistics
 * in ONE request instead of making 10 separate queries.
 *
 * Pattern inspired by manager-expenses/queries/expenseDashboard.ts
 *
 * Benefits:
 * - Reduces network roundtrips from ~10 to 1
 * - Faster dashboard load times
 * - Lower server load
 * - Better user experience
 */

/**
 * Helper to generate department filter condition for entities with direct employee relationship
 */
const getDeptFilter = (hasDepartment: boolean) =>
  hasDepartment
    ? ',\n          { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } }'
    : ''

/**
 * Helper to generate department filter condition for AdvancePayment entities
 * Path: AdvancePayment -> expensePlan -> employee -> employeePosition -> organizationalUnitId
 */
const getAdvancePaymentDeptFilter = (hasDepartment: boolean) =>
  hasDepartment
    ? ',\n          { expensePlan: { employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } } }'
    : ''

/**
 * Combined dashboard query for MONTHLY period
 * Fetches all dashboard statistics in ONE request INCLUDING bulk monthly trends
 */
export const GET_COMBINED_DASHBOARD_STATS_MONTHLY = (hasDepartment: boolean) => {
  // Generate variables for 12 months
  const monthVars = Array.from({ length: 12 }, (_, i) => `$m${i + 1}Start: timestamp!, $m${i + 1}End: timestamp!`).join(
    ', '
  )

  return `
  query GetCombinedDashboardStatsMonthly(
    $selectedCurrency: String!${hasDepartment ? ',\n    $selectedDepartment: uuid!' : ''},
    $currentMonthStart: timestamp!,
    $currentMonthEnd: timestamp!,
    $previousMonthStart: timestamp!,
    $previousMonthEnd: timestamp!,
    $currentYearStart: timestamp!,
    $currentYTD: timestamp!,
    $previousYearStart: timestamp!,
    $previousYTD: timestamp!,
    ${monthVars}
  ) {
    # 1. Current Month Expenses (for monthly spend comparison)
    currentMonthExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    # 2. Previous Month Expenses (for comparison)
    previousMonthExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousMonthStart, _lt: $previousMonthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousMonthStart, _lt: $previousMonthEnd } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    # 3. Year-to-Date Current Year
    currentYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentYearStart, _lte: $currentYTD } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentYearStart, _lte: $currentYTD } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    # 4. Year-to-Date Previous Year
    previousYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousYearStart, _lte: $previousYTD } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousYearStart, _lte: $previousYTD } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    # 5. Transfer Required (BOOKED status - no department filter)
    transferRequired: ExpenseRequestAggregate(
      where: {
        status: { _eq: "BOOKED" },
        isDeleted: { _eq: false },
        currencyRef: { _eq: $selectedCurrency }
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }

    # 6. Pending Requests (PENDING status - no department or currency filter)
    pendingRequests: ExpenseRequestAggregate(
      where: {
        status: { _eq: "PENDING" },
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    # 7. Average Spend Per Trip (current month) - with mixed date logic
    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
              { expenseItem: { expenseDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
              { startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        avg {
          totalAmount
        }
      }
    }

    # 8. Advance Payments Approved/Booked (current month) - with mixed date logic
    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "BOOKED"] } },
          { isDeleted: { _eq: false } },
          { currencyRef: { _eq: $selectedCurrency } },
          { _or: [
            { _and: [
              { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" }, expensePlanItem: { expenseDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd }, isDeleted: { _eq: false } }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd }, isDeleted: { _eq: false } } }
            ] }
          ] }${getAdvancePaymentDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          amount
        }
      }
    }

    # 9. Actual Expenses (current month) - for actual vs planned
    actualExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    # 10. Planned Expenses (current month) - with mixed date logic
    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "REJECTED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
              { expensePlanItem: { expenseDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
              { startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          totalAmount
        }
      }
    }

    # 11. Bulk Monthly Trends (all 12 months in one request)
${Array.from({ length: 12 }, (_, i) => {
  const idx = i + 1
  return `    # Month ${idx}
    m${idx}_req: ExpenseRequestAggregate(
      where: {
        _and: [
          { currencyRef: { _eq: $selectedCurrency } },
          { totalAmount: { _isNull: false } },
          { totalAmount: { _gt: 0 } },
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { _or: [
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
              { expenseItem: { expenseDate: { _gte: $m${idx}Start, _lt: $m${idx}End }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
              { startDate: { _gte: $m${idx}Start, _lt: $m${idx}End } }
            ] }
          ] },
          { isDeleted: { _eq: false } }${getDeptFilter(hasDepartment)}
        ]
      }
    ) { aggregate { count sum { totalAmount } } }
    
    m${idx}_item: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $m${idx}Start, _lt: $m${idx}End } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $m${idx}Start, _lt: $m${idx}End } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) { aggregate { count sum { reimbursableAmount } } }`
}).join('\n\n')}
  }
  `
}

/**
 * Combined dashboard query for QUARTERLY period
 */
export const GET_COMBINED_DASHBOARD_STATS_QUARTERLY = (hasDepartment: boolean) => `
  query GetCombinedDashboardStatsQuarterly(
    $selectedCurrency: String!${hasDepartment ? ',\n    $selectedDepartment: uuid!' : ''},
    $currentQuarterStart: timestamp!,
    $currentQuarterEnd: timestamp!,
    $previousQuarterStart: timestamp!,
    $previousQuarterEnd: timestamp!,
    $currentYearStart: timestamp!,
    $currentYTD: timestamp!,
    $previousYearStart: timestamp!,
    $previousYTD: timestamp!
  ) {
    currentQuarterExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    previousQuarterExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousQuarterStart, _lt: $previousQuarterEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousQuarterStart, _lt: $previousQuarterEnd } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    currentYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentYearStart, _lte: $currentYTD } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentYearStart, _lte: $currentYTD } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    previousYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousYearStart, _lte: $previousYTD } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousYearStart, _lte: $previousYTD } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    transferRequired: ExpenseRequestAggregate(
      where: {
        status: { _eq: "BOOKED" },
        isDeleted: { _eq: false },
        currencyRef: { _eq: $selectedCurrency }
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }

    pendingRequests: ExpenseRequestAggregate(
      where: {
        status: { _eq: "PENDING" },
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
              { expenseItem: { expenseDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
              { startDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        avg {
          totalAmount
        }
      }
    }

    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "BOOKED"] } },
          { isDeleted: { _eq: false } },
          { currencyRef: { _eq: $selectedCurrency } },
          { _or: [
            { _and: [
              { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" }, expensePlanItem: { expenseDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd }, isDeleted: { _eq: false } }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd }, isDeleted: { _eq: false } } }
            ] }
          ] }${getAdvancePaymentDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          amount
        }
      }
    }

    actualExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "REJECTED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
              { expensePlanItem: { expenseDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
              { startDate: { _gte: $currentQuarterStart, _lt: $currentQuarterEnd } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          totalAmount
        }
      }
    }
  }
`

/**
 * Combined dashboard query for YEARLY period
 */
export const GET_COMBINED_DASHBOARD_STATS_YEARLY = (hasDepartment: boolean) => `
  query GetCombinedDashboardStatsYearly(
    $selectedCurrency: String!${hasDepartment ? ',\n    $selectedDepartment: uuid!' : ''},
    $currentYearStart: timestamp!,
    $currentYearEnd: timestamp!,
    $previousYearStart: timestamp!,
    $previousYearEnd: timestamp!,
    $currentYTD: timestamp!,
    $previousYTD: timestamp!
  ) {
    currentYearExpensesComparison: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentYearStart, _lt: $currentYearEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentYearStart, _lt: $currentYearEnd } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    previousYearExpensesComparison: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousYearStart, _lt: $previousYearEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousYearStart, _lt: $previousYearEnd } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    currentYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentYearStart, _lte: $currentYTD } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentYearStart, _lte: $currentYTD } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    previousYearExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $previousYearStart, _lte: $previousYTD } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $previousYearStart, _lte: $previousYTD } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    transferRequired: ExpenseRequestAggregate(
      where: {
        status: { _eq: "BOOKED" },
        isDeleted: { _eq: false },
        currencyRef: { _eq: $selectedCurrency }
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }

    pendingRequests: ExpenseRequestAggregate(
      where: {
        status: { _eq: "PENDING" },
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }

    avgSpendPerTrip: ExpenseRequestAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
              { expenseItem: { expenseDate: { _gte: $currentYearStart, _lt: $currentYearEnd }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
              { startDate: { _gte: $currentYearStart, _lt: $currentYearEnd } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        avg {
          totalAmount
        }
      }
    }

    advancePaymentsApproved: AdvancePaymentAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "BOOKED"] } },
          { isDeleted: { _eq: false } },
          { currencyRef: { _eq: $selectedCurrency } },
          { _or: [
            { _and: [
              { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" }, expensePlanItem: { expenseDate: { _gte: $currentYearStart, _lt: $currentYearEnd }, isDeleted: { _eq: false } }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { expensePlan: { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentYearStart, _lt: $currentYearEnd }, isDeleted: { _eq: false } } }
            ] }
          ] }${getAdvancePaymentDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          amount
        }
      }
    }

    actualExpenses: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $currentYearStart, _lt: $currentYearEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ] },
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $currentYearStart, _lt: $currentYearEnd } } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          reimbursableAmount
        }
      }
    }

    plannedExpenses: ExpensePlanAggregate(
      where: {
        _and: [
          { status: { _nin: ["CREATED", "REJECTED", "DISCARDED"] } },
          { currencyRef: { _eq: $selectedCurrency } },
          { isDeleted: { _eq: false } },
          { _or: [
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
              { expensePlanItem: { expenseDate: { _gte: $currentYearStart, _lt: $currentYearEnd }, isDeleted: { _eq: false } } }
            ] },
            { _and: [
              { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
              { startDate: { _gte: $currentYearStart, _lt: $currentYearEnd } }
            ] }
          ] }${getDeptFilter(hasDepartment)}
        ]
      }
    ) {
      aggregate {
        count
        sum {
          totalAmount
        }
      }
    }
  }
`
