// GraphQL query for fetching expense plans for team members in the main view
// This query is specifically for the Expense Plans tab in the main view, not for analytics
export const GET_MAIN_VIEW_EXPENSE_PLANS = `
  query GetMainViewExpensePlans(
    $where: ExpensePlanBoolExp,
    $limit: Int!,
    $offset: Int!,
    $orderBy: [ExpensePlanOrderBy!]
  ) {
    ExpensePlanAggregate(where: $where) {
      aggregate {
        count
      }
    }
    ExpensePlan(
      limit: $limit,
      offset: $offset,
      orderBy: $orderBy,
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
      employeeDocument {
        file
        fileSize
        id
        description
        mimeType
        name
        type
        employee {
          id
        }
      }
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      employee {
        id
        code
        displayName
        fullName
        pictureThumbnail
        additionalProperties
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
      expenseRequest { 
        id 
        code
        requestType {
          value
          translations {
            value
            localeCode
          }
        }
      }
    }
  }
`

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
        isDeleted: {_eq: false},
        status: {_nin: ["CREATED", "DISCARDED", "REJECTED"]},
        currencyRef: {_eq: $currencyRef}
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
      }
    }
    pendingAmountStats: ExpensePlanAggregate(
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
        sum {
          totalAmount
        }
      }
    }
    # Debug: Get all pending plans without filters to see if any exist
    allPendingPlansDebug: ExpensePlanAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
