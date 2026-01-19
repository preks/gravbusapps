// GraphQL query for fetching expense plans for the calendar view
export const GET_CALENDAR_EXPENSE_PLANS = `
  query GetCalendarExpensePlans(
    $managerId: uuid!,
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String
  ) {
    ExpensePlanAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    ExpensePlan(
      limit: $limit,
      offset: $offset,
      orderBy: {planDate: DESC},
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      id
      code
      title
      startDate
      endDate
      status
      activeFrom
      activeTo
      totalAmount
      createdAt
      updatedAt
      decisionDate
      planDate
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
        }
      }
    }
  }
`
