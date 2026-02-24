/**
 * Backoffice report queries - global data (no supervisor/manager filter).
 * Used by BackofficeExpenseReportsPage for all 4 report types.
 */

export const GET_EXPENSE_ITEMS_BACKOFFICE = `
  query GetExpenseItemsBackoffice(
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String
  ) {
    ExpenseItemAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_nin: ["CREATED", "DISCARDED"]},
        expenseRequest: {isDeleted: {_eq: false}, status: {_nin: ["CREATED", "DISCARDED"]}},
        _or: [
          {title: {_ilike: $searchTerm}},
          {expensePosition: {expenseGroupRef: {_ilike: $searchTerm}}},
          {expenseRequest: {code: {_ilike: $searchTerm}}},
          {expenseRequest: {status: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      aggregate { count }
    }
    ExpenseItem(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        isDeleted: {_eq: false},
        status: {_nin: ["CREATED", "DISCARDED"]},
        expenseRequest: {isDeleted: {_eq: false}, status: {_nin: ["CREATED", "DISCARDED"]}},
        _or: [
          {title: {_ilike: $searchTerm}},
          {expensePosition: {expenseGroupRef: {_ilike: $searchTerm}}},
          {expenseRequest: {code: {_ilike: $searchTerm}}},
          {expenseRequest: {status: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      id
      employeeId
      createdBy
      title
      expensePosition { expenseGroupRef }
      expenseDate
      totalAmount
      expenseRequestId
      expenseRequest {
        id code createdAt startDate requestTypeRef currencyRef status
      }
    }
  }
`

export const GET_EXPENSE_PLANS_BACKOFFICE = `
  query GetExpensePlansBackoffice(
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String
  ) {
    ExpensePlanAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_nin: ["CREATED", "DISCARDED"]},
        _or: [
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}}
        ]
      }
    ) { aggregate { count } }
    ExpensePlan(
      limit: $limit, offset: $offset, orderBy: {createdAt: DESC},
      where: {
        isDeleted: {_eq: false},
        status: {_nin: ["CREATED", "DISCARDED"]},
        _or: [
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}}
        ]
      }
    ) {
      id code title employeeId requestType { value translations { value localeCode } }
      expenseRequest { id code requestType { value translations { value localeCode } } }
      advancePayment(where: { isDeleted: { _eq: false } }) {
        id
        amount
        status
      }
      startDate endDate status activeFrom activeTo totalAmount currencyRef
      createdAt updatedAt decisionDate planDate
      employeeDocument { id file fileSize name mimeType }
    }
  }
`

export const GET_EXPENSE_REQUESTS_BACKOFFICE = `
  query GetExpenseRequestsBackoffice(
    $where: ExpenseRequestBoolExp,
    $limit: Int!,
    $offset: Int!,
    $orderBy: [ExpenseRequestOrderBy!]
  ) {
    ExpenseRequestAggregate(where: $where) { aggregate { count } }
    ExpenseRequest(limit: $limit, offset: $offset, orderBy: $orderBy, where: $where) {
      id code title employeeId requestDate startDate endDate description
      totalAmount currencyRef status createdAt updatedAt
      requestType { value translations { value localeCode } }
      expensePlan {
        code
        requestType { value translations { value localeCode } }
        advancePayment(where: { isDeleted: { _eq: false } }) {
          id
          amount
          status
        }
      }
      employeeDocument { file name }
    }
  }
`

export const GET_ADVANCE_PAYMENTS_REPORT_BACKOFFICE = `
  query GetAdvancePaymentsReportBackoffice(
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String
  ) {
    AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false },
        status: { _nin: ["CREATED", "DISCARDED"] },
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } }
        ]
      }
    ) { aggregate { count } }
    AdvancePayment(
      limit: $limit, offset: $offset, orderBy: { createdAt: DESC },
      where: {
        isDeleted: { _eq: false },
        status: { _nin: ["CREATED", "DISCARDED"] },
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } }
        ]
      }
    ) {
      id code amount status createdAt paymentMethod currencyRef
      costCenter { id name code }
      expensePlan {
        code title employeeId
        requestType { value translations { value localeCode } }
      }
    }
  }
`

export const GET_APPROVAL_PAYOUT_CYCLE_BACKOFFICE = `
  query GetApprovalPayoutCycleBackoffice(
    $where: ExpenseRequestBoolExp,
    $limit: Int!,
    $offset: Int!,
    $orderBy: [ExpenseRequestOrderBy!]
  ) {
    ExpenseRequestAggregate(where: $where) { aggregate { count } }
    ExpenseRequest(limit: $limit, offset: $offset, orderBy: $orderBy, where: $where) {
      id
      code
      title
      employeeId
      createdBy
      createdAt
      decisionDate
      status
      totalAmount
      currencyRef
      expenseRequestComment(where: { isDeleted: { _eq: false } }, orderBy: { commentDate: ASC }) {
        commentDate
        commentType
        comment
      }
      expensePlan {
        id
        advancePayment(where: { isDeleted: { _eq: false } }) {
          id
          status
          createdAt
          decisionDate
          transactionDate
          advancePaymentComment(where: { isDeleted: { _eq: false } }, orderBy: { commentDate: ASC }) {
            commentDate
            commentType
            comment
          }
        }
      }
    }
  }
`
