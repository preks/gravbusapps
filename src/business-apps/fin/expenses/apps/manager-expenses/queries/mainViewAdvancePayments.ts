// GraphQL query for fetching advance payments for team members in the main view
// This query is specifically for the Advance Payments tab in the main view, not for analytics
export const GET_MAIN_VIEW_ADVANCE_PAYMENTS = `
  query GetMainViewAdvancePayments(
    $managerId: uuid!,
    $limit: Int!,
    $offset: Int!,
    $where: AdvancePaymentBoolExp!,
    $orderBy: [AdvancePaymentOrderBy!]
  ) {
    AdvancePaymentAggregate(
      where: {
        _and: [
          {
            expensePlan: {
              _and: [
                {
                  employee: {
                    employeePosition: {
                      supervisorEmployeeId: {_eq: $managerId}
                    }
                  },
                  isDeleted: {_eq: false}
                }
              ]
            }
          },
          $where
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: $orderBy,
      where: {
        _and: [
          {
            expensePlan: {
              _and: [
                {
                  employee: {
                    employeePosition: {
                      supervisorEmployeeId: {_eq: $managerId}
                    }
                  },
                  isDeleted: {_eq: false}
                }
              ]
            }
          },
          $where
        ]
      }
    ) {
      id
      code
      description
      status
      amount
      currencyRef
      createdAt
      updatedAt
      expensePlan {
        id
        code
        title
        startDate
        endDate
        currencyRef
        expenseRequest(where: { isDeleted: { _eq: false } }) {
          id
          code
        }
        employee {
          id
          displayName
          fullName
          pictureThumbnail
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
`

// Query for advance payment statistics in the main view
export const GET_MAIN_VIEW_ADVANCE_PAYMENT_STATISTICS = `
  query GetMainViewAdvancePaymentStatistics($managerId: uuid!, $currencyRef: String) {
    allPaymentsStats: AdvancePaymentAggregate(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          },
          isDeleted: {_eq: false}
        },
        status: {_nin: ["CREATED", "REJECTED"]},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      aggregate {
        totalCount: count
        sum {
          amount
        }
      }
    }
    pendingPaymentsStats: AdvancePaymentAggregate(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          },
          isDeleted: {_eq: false}
        },
        status: {_in: ["PENDING", "PREPARED"]},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      aggregate {
        pendingCount: count
        sum {
          amount
        }
      }
    }
    # Currency stats are now handled at the app level via useAppCurrency
  }
`
