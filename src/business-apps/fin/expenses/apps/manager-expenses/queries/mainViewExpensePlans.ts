// GraphQL query for fetching expense plans for team members in the main view
// This query is specifically for the Expense Plans tab in the main view, not for analytics
export const GET_MAIN_VIEW_EXPENSE_PLANS = `
  query GetMainViewExpensePlans(
    $where: ExpensePlanBoolExp,
    $limit: Int!,
    $offset: Int!
  ) {
    ExpensePlanAggregate(where: $where) {
      aggregate {
        count
      }
    }
    ExpensePlan(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: $where
    ) {
      id
      code
      title
      description
      status
      startDate
      endDate
      planDate
      totalAmount
      currencyRef
      createdAt
      updatedAt
      status
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
`;

// Query for expense plan statistics in the main view
export const GET_MAIN_VIEW_EXPENSE_PLAN_STATISTICS = `
  query GetMainViewExpensePlanStatistics($managerId: uuid!, $currencyRef: String) {
    allPlansStats: ExpensePlanAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        totalCount: count
        sum {
          totalAmount
        }
      }
    }
    pendingPlansStats: ExpensePlanAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      aggregate {
        pendingCount: count
        sum {
          totalAmount
        }
      }
    }
  }
`;
