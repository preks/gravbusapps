// GraphQL query for fetching advance payments for team members in the main view
// This query is specifically for the Advance Payments tab in the main view, not for analytics
export const GET_MAIN_VIEW_ADVANCE_PAYMENTS = `
  query GetMainViewAdvancePayments(
    $managerId: uuid!,
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String,
    $status: String
  ) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          },
          isDeleted: {_eq: false}
        },
        status: {_eq: $status},
        _or: [
          {expensePlan: {code: {_ilike: $searchTerm}}},
          {expensePlan: {title: {_ilike: $searchTerm}}},
          {expensePlan: {employee: {fullName: {_ilike: $searchTerm}}}}
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
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          },
          isDeleted: {_eq: false}
        },
        status: {_eq: $status},
        _or: [
          {expensePlan: {code: {_ilike: $searchTerm}}},
          {expensePlan: {title: {_ilike: $searchTerm}}},
          {expensePlan: {employee: {fullName: {_ilike: $searchTerm}}}}
        ]
      }
    ) {
      id
      code
      description
      status
      amount
      createdAt
      updatedAt
      expensePlan {
        id
        title
        startDate
        endDate
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
`;

// Query for advance payment statistics in the main view
export const GET_MAIN_VIEW_ADVANCE_PAYMENT_STATISTICS = `
  query GetMainViewAdvancePaymentStatistics($managerId: uuid!) {
    allPaymentsStats: AdvancePaymentAggregate(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          },
          isDeleted: {_eq: false}
        }
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
        status: {_eq: "PENDING"}
      }
    ) {
      aggregate {
        pendingCount: count
        sum {
          amount
        }
      }
    }
  }
`;
