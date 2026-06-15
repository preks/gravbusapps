// GraphQL query to get expense requests filtered by employee ID with pagination and search
export const GET_EXPENSE_REQUESTS_BY_EMPLOYEE = `
  query GetExpenseRequestsByEmployee(
    $limit: Int,
    $offset: Int,
    $where: ExpenseRequestBoolExp,
    $orderBy: [ExpenseRequestOrderBy!]
  ) {
    ExpenseRequestAggregate(
      where: $where
    ) {
      aggregate {
        count
      }
    }
    ExpenseRequest(
      limit: $limit,
      offset: $offset,
      orderBy: $orderBy,
      where: $where
    ) {
      id
      employeeId
      code
      title
      description
      startDate
      endDate
      requestDate
      totalAmount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      reimbursableAmount
      nonReimbursableAmount
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      expensePlan {
        advancePaymentTotalAmount
        code
        advancePaymentAggregate {
          aggregate {
            sum {
              amount
            }
          }
        }
        currency {
          code
        }
      }
      employeeDocumentId
      employeeDocument {
        file
        name
      }
    }
  }
`

export const GET_USED_REQUEST_CURRENCIES_BY_EMPLOYEE = `
  query GetUsedRequestCurrenciesByEmployee($employeeId: uuid!, $limit: Int = 2000) {
    ExpenseRequest(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
      }
      limit: $limit
    ) {
      currencyRef
      currency { code }
    }
  }
`

export const GET_EXPENSE_REQUEST_BY_ID = `
  query GetExpenseRequestById($id: uuid!) {
    ExpenseRequest(where: {id: {_eq: $id}}) {
      id
      employeeId
      code
      title
      description
      startDate
      endDate
      requestDate
      totalAmount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      reimbursableAmount
      nonReimbursableAmount
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      expensePlan {
        advancePaymentTotalAmount
        code
        advancePaymentAggregate {
          aggregate {
            sum {
              amount
            }
          }
        }
        currency {
          code
        }
      }
      employeeDocumentId
      employeeDocument {
        file
        name
      }
    }
  }
`

export const GET_EXPENSE_REQUEST_STATISTICS = `
  query GetExpenseRequestStatistics($employeeId: uuid!, $startDate: timestamp!, $endDate: timestamp!, $currencyRef: String!) {
    ExpenseRequestAggregate(
      where: {
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_in: ["PAID", "CLOSED", "TRANSFERRED"]} },
          { currencyRef: {_eq: $currencyRef} },
          { _or: [
              { _and: [
                  { expenseItem: { expenseDate: { _gte: $startDate, _lt: $endDate } } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $startDate, _lt: $endDate } }
                ] }
            ] }
        ]
      }
    ) {
      aggregate {
        count
        sum {
          totalAmount
        }
      }
    }
    PendingApproval: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      aggregate {
        count
      }
    }
    ReimbursableAmount: ExpenseRequestAggregate(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_nin: ["PAID", "CLOSED", "TRANSFERRED"]},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      aggregate {
        sum {
          reimbursableAmount
        }
      }
    }
  }
`

export const GET_EXPENSE_REQUEST_STATISTICS_CONSOLIDATED = `
  query GetExpenseRequestStatisticsConsolidated(
    $employeeId: uuid!,
    $currentStart: timestamp!,
    $currentEnd: timestamp!,
    $previousStart: timestamp!,
    $previousEnd: timestamp!,
    $currencyRef: String!
  ) {
    Current: ExpenseRequestAggregate(
      where: {
        _and: [
          { employeeId: { _eq: $employeeId } },
          { isDeleted: { _eq: false } },
          { status: { _in: ["PAID", "CLOSED", "TRANSFERRED"] } },
          { currencyRef: { _eq: $currencyRef } },
          { _or: [
              { _and: [
                  { expenseItem: { expenseDate: { _gte: $currentStart, _lt: $currentEnd } } },
                  { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } }
                ] },
              { _and: [
                  { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
                  { startDate: { _gte: $currentStart, _lt: $currentEnd } }
                ] }
            ] }
        ]
      }
    ) {
      aggregate {
        count
        sum { totalAmount }
      }
    }
    Previous: ExpenseRequestAggregate(
      where: {
        _and: [
          { employeeId: { _eq: $employeeId } },
          { isDeleted: { _eq: false } },
          { status: { _in: ["PAID", "CLOSED", "TRANSFERRED"] } },
          { currencyRef: { _eq: $currencyRef } },
          { _or: [
              { _and: [
                  { expenseItem: { expenseDate: { _gte: $previousStart, _lt: $previousEnd } } },
                  { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } }
                ] },
              { _and: [
                  { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
                  { startDate: { _gte: $previousStart, _lt: $previousEnd } }
                ] }
            ] }
        ]
      }
    ) {
      aggregate {
        count
        sum { totalAmount }
      }
    }
    PendingApproval: ExpenseRequestAggregate(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        status: { _eq: "PENDING" },
        currencyRef: { _eq: $currencyRef }
      }
    ) {
      aggregate { count }
    }
    ReimbursableAmount: ExpenseRequestAggregate(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        status: { _nin: ["PAID", "CLOSED", "TRANSFERRED"] },
        currencyRef: { _eq: $currencyRef }
      }
    ) {
      aggregate { sum { reimbursableAmount } }
    }
  }
`
