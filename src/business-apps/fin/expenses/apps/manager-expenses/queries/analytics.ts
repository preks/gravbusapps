// GraphQL queries for team spending analytics data

/**
 * Query to get all currencies used across expense entities
 * We'll use a single query for both distinct currencies and most used currency
 * and handle the processing client-side for better efficiency
 */
export const GET_ALL_CURRENCIES = `
  query GetAllCurrencies($managerId: uuid!) {
    # Get currencies from ExpenseItems
    expenseItems: ExpenseItem(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        currencyRef: {_neq: null}
      }
    ) {
      currencyRef
    }
    
    # Get currencies from ExpenseRequests
    expenseRequests: ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        currencyRef: {_neq: null}
      }
    ) {
      currencyRef
    }
    
    # Get currencies from ExpensePlans
    expensePlans: ExpensePlan(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        currencyRef: {_neq: null}
      }
    ) {
      currencyRef
    }
    
    # Get currencies from AdvancePayments
    advancePayments: AdvancePayment(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          }
        },
        isDeleted: {_eq: false},
        currencyRef: {_neq: null}
      }
    ) {
      currencyRef
    }
  }
`;

// For backward compatibility, we'll keep these exports but they'll use the same query
export const GET_DISTINCT_CURRENCIES = GET_ALL_CURRENCIES;
export const GET_MOST_USED_CURRENCY = GET_ALL_CURRENCIES;
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
