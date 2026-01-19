// GraphQL query for fetching expense items for team members with pagination, search and filtering
export const GET_EXPENSE_ITEMS_BY_MANAGER = `
  query GetExpenseItemsByManager(
    $managerId: uuid!,
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String
  ) {
    ExpenseItemAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        _or: [
          {title: {_ilike: $searchTerm}},
          {expensePosition: {expenseGroupRef: {_ilike: $searchTerm}}},
          {employee: {fullName: {_ilike: $searchTerm}}},
          {employee: {firstName: {_ilike: $searchTerm}}},
          {employee: {lastName: {_ilike: $searchTerm}}},
          {expenseRequest: {code: {_ilike: $searchTerm}}},
          {expenseRequest: {status: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    ExpenseItem(
      limit: $limit,
      offset: $offset,
      orderBy: {expenseDate: DESC},
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        _or: [
          {title: {_ilike: $searchTerm}},
          {expensePosition: {expenseGroupRef: {_ilike: $searchTerm}}},
          {employee: {fullName: {_ilike: $searchTerm}}},
          {employee: {firstName: {_ilike: $searchTerm}}},
          {employee: {lastName: {_ilike: $searchTerm}}},
          {expenseRequest: {code: {_ilike: $searchTerm}}},
          {expenseRequest: {status: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      id
      title
      expensePosition {
        expenseGroupRef
      }
      expenseDate
      totalAmount
      expenseRequestId
      expenseRequest {
        id
        code
        createdAt
        startDate
        requestTypeRef
        currencyRef
        status
      }
      employee {
        id
        fullName
        firstName
        lastName
      }
    }
  }
`
