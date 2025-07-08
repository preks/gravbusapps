// GraphQL query for fetching expense items for the current employee with pagination, search and filtering
export const GET_EXPENSE_ITEMS_BY_EMPLOYEE = `
  query GetExpenseItemsByEmployee(
    $employeeId: uuid!, 
    $limit: Int, 
    $offset: Int, 
    $searchTerm: String,
    $status: [String], 
    $expenseDateStart: timestamp, 
    $expenseDateEnd: timestamp, 
    $totalAmountMin: numeric, 
    $totalAmountMax: numeric,
    $expenseClassValue: String,
    $currencyRef: String,
    $orderBy: [ExpenseItemOrderBy!]
  ) {
    ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        currencyRef: {_eq: $currencyRef},

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
        status: {_in: $status, _nin: ["DISCARDED"]},
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
      orderBy: $orderBy,
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        currencyRef: {_eq: $currencyRef},
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
        status: {_in: $status, _nin: ["DISCARDED"]},
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
      status
      expenseDate
      totalAmount
      reimbursableAmount
      nonReimbursableAmount
      deductibleAmount
      nonDeductibleAmount
      currencyRef
      currency {
        code
      }
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
        id
        fileUrl
        fileName
      }
      employee {
        fullName
        additionalProperties
      }
    }
  }
`;

export const GET_ITEMS_WITHOUT_RECEIPTS = `
  query GetItemsWithoutReceipts($employeeId: uuid!) {
    itemsWithoutReceipts: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}},
        _not: { expenseItemFile: {} }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_PENDING_ITEMS = `
  query GetPendingItems($employeeId: uuid!) {
    allPending: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"}
      }
    ) {
      aggregate {
        count
      }
    }
    pendingExcludingAllowance: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}}
      }
    ) {
      aggregate {
        sum {
          reimbursableAmount
        }
        count
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
      currency {
        code
      }
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
        id
        fileUrl
        fileName
      }
      employee {
        fullName
        additionalProperties
      }
    }
  }
`;

export const GET_EXPENSE_ITEM_STATISTICS = `
  query GetExpenseItemStatistics($employeeId: uuid!, $startDate: timestamptz, $endDate: timestamptz, $currencyRef: String!) {
    totalExpenses: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_in: ["PAID", "CLOSED"]},
        currencyRef: {_eq: $currencyRef},
        updatedAt: {
          _gte: $startDate,
          _lte: $endDate
        }
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }
    expenseItemsCount: ExpenseItemAggregate(
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
