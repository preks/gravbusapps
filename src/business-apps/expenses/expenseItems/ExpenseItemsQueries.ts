// GraphQL queries for the ExpenseItems component

export const GET_ALL_EXPENSE_ITEMS = `
  query GetAllExpenseItems {
    ExpenseItem(
      orderBy: {createdAt: DESC},
      limit: 10
    ) {
      id
      code
      title
      description
      createdAt
      totalAmount
      deductibleAmount
      currencyRef
      costCenter {
        name
      }
      expenseClassRef
      additionalProperties
      status
      employee {
        fullName
        additionalProperties
      }
      employeeId
    }
  }
`;

// Query to get expense items filtered by employee ID
export const GET_EXPENSE_ITEMS_BY_EMPLOYEE = `
  query GetExpenseItemsByEmployee($employeeId: uuid!) {
    ExpenseItem(
      orderBy: {createdAt: DESC}, 
      where: {employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}}
    ) {
      id
      code
      title
      description
      createdAt
      totalAmount
      deductibleAmount
      currencyRef
      costCenter {
        name
      }
      expenseClassRef
      additionalProperties
      status
      employee {
        fullName
        additionalProperties
      }
    }
  }
`;

// Query to get all expense item files
export const GET_EXPENSE_ITEM_FILES = `
  query GetExpenseItemFiles {
    ExpenseItemFile(where: {isDeleted: {_eq: false}}) {
      id
      expenseItemId
      fileName
      fileType
      fileUrl
      isDeleted
    }
  }
`;
