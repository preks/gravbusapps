// GraphQL queries for team spending analytics data
export const GET_EXPENSE_ANALYTICS_DATA = `
  query GetExpenseAnalyticsData($managerId: uuid!, $startDate: timestamptz, $endDate: timestamptz, $currencyRef: String) {
    # Expense Items analytics
    expenseItems: ExpenseItem(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      id
      title
      expenseDate
      createdAt
      status
      totalAmount
      currencyRef
      employee {
        id
        fullName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          siteLocation {
            id
            name
          }
        }
      }
      expensePosition {
        expenseGroupRef
      }
    }
    
    # Expense Requests analytics
    expenseRequests: ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      id
      title
      createdAt
      status
      totalAmount
      currencyRef
      employee {
        id
        fullName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          siteLocation {
            id
            name
          }
        }
      }
    }
    
    # Expense Plans analytics
    expensePlans: ExpensePlan(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      id
      title
      code
      createdAt
      status
      totalAmount
      currencyRef
      employee {
        id
        fullName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          siteLocation {
            id
            name
          }
        }
      }
    }
    
    # Advance Payments analytics
    advancePayments: AdvancePayment(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          }
        },
        createdAt: {_gte: $startDate, _lte: $endDate},
        isDeleted: {_eq: false},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      id
      code
      amount
      status
      transactionDate
      createdAt
      currencyRef
      expensePlan {
        id
        title
        employee {
          id
          fullName
          employeePosition {
            organizationalUnit {
              id
              name
            }
            siteLocation {
              id
              name
            }
          }
        }
      }
    }
  }
`;
