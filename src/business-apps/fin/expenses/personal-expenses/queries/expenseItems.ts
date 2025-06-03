// GraphQL query for fetching expense items for the current employee with pagination, search and filtering
export const GET_EXPENSE_ITEMS_BY_EMPLOYEE = `
  query GetExpenseItemsByEmployee(
    $employeeId: uuid!, 
    $limit: Int, 
    $offset: Int, 
    $searchTerm: String,
    $status: String, 
    $expenseDateStart: timestamp, 
    $expenseDateEnd: timestamp, 
    $totalAmountMin: numeric, 
    $totalAmountMax: numeric
  ) {
    ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}},
        _or: [
          {title: {_ilike: $searchTerm}},
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {expenseClass: {value: {_ilike: $searchTerm}}},
          {expenseClass: {translations: {value: {_ilike: $searchTerm}}}},
          {costCenter: {name: {_ilike: $searchTerm}}}
        ],
        status: {_eq: $status},
        expenseDate: {
          _gte: $expenseDateStart,
          _lte: $expenseDateEnd
        },
        totalAmount: {
          _gte: $totalAmountMin,
          _lte: $totalAmountMax
        }
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
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}},
        _or: [
          {title: {_ilike: $searchTerm}},
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {expenseClass: {value: {_ilike: $searchTerm}}},
          {expenseClass: {translations: {value: {_ilike: $searchTerm}}}},
          {costCenter: {name: {_ilike: $searchTerm}}}
        ],
        status: {_eq: $status},
        expenseDate: {
          _gte: $expenseDateStart,
          _lte: $expenseDateEnd
        },
        totalAmount: {
          _gte: $totalAmountMin,
          _lte: $totalAmountMax
        }
      }
    ) {
      id
      code
      title
      description
      expenseDate
      totalAmount
      reimbursableAmount
      nonReimbursableAmount
      deductibleAmount
      nonDeductibleAmount
      currencyRef
      costCenter {
        name
      }
      expenseClass {
        value
        translations {
          value
          localeCode
        }
      }
      additionalProperties
      status
      expenseItemFile {
        fileUrl
      }
      employee {
        fullName
        additionalProperties
      }
    }
  }
`;

export const GET_EXPENSE_ITEM_BY_ID = `
  query GetExpenseItemById($id: uuid!) {
    ExpenseItem(where: {id: {_eq: $id}}) {
      id
      code
      title
      description
      expenseDate
      reimbursableAmount
      nonReimbursableAmount
      deductibleAmount
      nonDeductibleAmount
      currencyRef
      costCenter {
        name
      }
      expenseClass {
        value
        translations {
          value
          localeCode
        }
      }
      additionalProperties
      status
      expenseItemFile {
        fileUrl
      }
      employee {
        fullName
        additionalProperties
      }
    }
  }
`;

export const GET_EXPENSE_ITEM_STATISTICS = `
  query GetExpenseItemStatistics($employeeId: uuid!) {
    ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
