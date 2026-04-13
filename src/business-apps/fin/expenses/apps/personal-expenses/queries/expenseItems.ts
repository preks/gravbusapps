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
        value
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
`

// GraphQL query variant that accepts a dynamic where clause to allow optional filters (e.g., currency)
export const GET_EXPENSE_ITEMS_BY_EMPLOYEE_WHERE = `
  query GetExpenseItemsByEmployeeWhere(
    $limit: Int,
    $offset: Int,
    $orderBy: [ExpenseItemOrderBy!],
    $where: ExpenseItemBoolExp!
  ) {
    ExpenseItemAggregate(where: $where) {
      aggregate { count }
    }
    ExpenseItem(limit: $limit, offset: $offset, orderBy: $orderBy, where: $where) {
      id
      code
      title
      status
      expenseDate
      totalAmount
      reimbursableAmount
      nonReimbursableAmount
      deductibleAmount
      nonDeductibleAmount
      currencyRef
      currency { code value }
      costCenter { name }
      expenseClass {
        value
        translations { value localeCode }
      }
      additionalProperties
      status
      expenseItemFile { id fileUrl fileName }
      employee { fullName additionalProperties }
    }
  }
`

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
`

export const GET_PENDING_ITEMS = `
  query GetPendingItems($employeeId: uuid!, $currencyRef: String!) {
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
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}},
        currencyRef: {_eq: $currencyRef}
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
`

export const GET_PENDING_ITEMS_WITH_DATE_RANGE = `
  query GetPendingItemsWithDateRange($employeeId: uuid!, $startDate: timestamp, $endDate: timestamp, $currencyRef: String!) {
    pendingExcludingAllowance: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_eq: "PENDING",_nin: ["DISCARDED"]},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}},
        currencyRef: {_eq: $currencyRef},
        expenseDate: {
          _gte: $startDate,
          _lte: $endDate
        }
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
`

export const GET_EXPENSE_ITEM_BY_ID = `
  query GetExpenseItemById($id: uuid!) {
    ExpenseItem(where: {id: {_eq: $id}}) {
      id
      code
      title
      expenseDate
      reimbursableAmount
      nonReimbursableAmount
      deductibleAmount
      nonDeductibleAmount
      currencyRef
      currency {
        code
        value
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
`

export const GET_EXPENSE_ITEMS_STATUS_BY_IDS = `
  query GetExpenseItemsStatusByIds($ids: [uuid!]!) {
    ExpenseItem(where: { id: { _in: $ids } }) {
      id
      status
    }
  }
`

export const GET_EXPENSE_ITEM_STATISTICS = `
  query GetExpenseItemStatistics($employeeId: uuid!, $startDate: timestamp, $endDate: timestamp, $currencyRef: String!) {
    totalExpenses: ExpenseItemAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_eq: "PAID"},
        currencyRef: {_eq: $currencyRef},
        expenseDate: {
          _gte: $startDate,
          _lte: $endDate
        },
         expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}}
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
        isDeleted: {_eq: false},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

// Combined statistics for current and previous month in a single request
export const GET_EXPENSE_ITEM_STATS_OVERVIEW = `
  query GetExpenseItemStatsOverview(
    $employeeId: uuid!,
    $currencyRef: String!,
    $currentStart: timestamp!,
    $currentEnd: timestamp!,
    $previousStart: timestamp!,
    $previousEnd: timestamp!
  ) {
    currentMonthTotals: ExpenseItemAggregate(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        expenseClass: { _not: { code: { _eq: "ALLOWANCE" } } },
        status: { _eq: "PAID" },
        currencyRef: { _eq: $currencyRef },
        expenseDate: { _gte: $currentStart, _lte: $currentEnd }
      }
    ) { aggregate { sum { totalAmount } } }

    previousMonthTotals: ExpenseItemAggregate(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        expenseClass: { _not: { code: { _eq: "ALLOWANCE" } } },
        status: { _eq: "PAID" },
        currencyRef: { _eq: $currencyRef },
        expenseDate: { _gte: $previousStart, _lte: $previousEnd }
      }
    ) { aggregate { sum { totalAmount } } }

    currentMonthPending: ExpenseItemAggregate(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        expenseClass: { _not: { code: { _eq: "ALLOWANCE" } } },
        status: { _eq: "PENDING", _nin: ["DISCARDED"] },
        currencyRef: { _eq: $currencyRef },
        expenseDate: { _gte: $currentStart, _lte: $currentEnd }
      }
    ) { aggregate { sum { reimbursableAmount } count } }

    previousMonthPending: ExpenseItemAggregate(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        expenseClass: { _not: { code: { _eq: "ALLOWANCE" } } },
        status: { _eq: "PENDING", _nin: ["DISCARDED"] },
        currencyRef: { _eq: $currencyRef },
        expenseDate: { _gte: $previousStart, _lte: $previousEnd }
      }
    ) { aggregate { sum { reimbursableAmount } count } }
  }
`

export const GET_USED_CURRENCIES_BY_EMPLOYEE = `
  query GetUsedCurrenciesByEmployee($employeeId: uuid!, $limit: Int = 1000) {
    ExpenseItem(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        expenseClass: {_not: {code: {_eq: "ALLOWANCE"}}}
      },
      limit: $limit
    ) {
      currencyRef
      currency { code }
    }
  }
`
