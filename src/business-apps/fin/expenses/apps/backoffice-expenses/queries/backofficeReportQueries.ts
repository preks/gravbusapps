/**
 * Backoffice report queries - global data (no supervisor/manager filter).
 * Used by BackofficeExpenseReportsPage for all 5 report types.
 */

export const GET_EMPLOYEE_POSITIONS_BY_IDENTIFIERS = `
  query GetEmployeePositionsByIdentifiers($where: EmployeePositionBoolExp!) {
    EmployeePosition(where: $where) {
      id
      userId
      employeeId
      firstName
      lastName
      organizationalUnit {
        id
        name
      }
    }
  }
`

export const GET_EMPLOYEES_BY_IDS = `
  query GetEmployeesByIds($ids: [uuid!]) {
    Employee(where: { id: { _in: $ids }, isDeleted: { _eq: false } }) {
      id
      fullName
      firstName
      lastName
      displayName
    }
  }
`

export const GET_EXPENSES_SLA_POLICY = `
  query GetExpensesSlaPolicy($searchTerm: String!) {
    ContentEntry(
      limit: 1
      orderBy: [{ updatedAt: DESC }]
      where: {
        isDeleted: { _eq: false }
        _or: [{ content: { _ilike: $searchTerm } }, { title: { _ilike: $searchTerm } }]
      }
    ) {
      id
      additionalProperties
      content
      updatedAt
      createdAt
    }
  }
`

export const GET_EXPENSE_ITEMS_BACKOFFICE = `
  query GetExpenseItemsBackoffice(
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String,
    $orderBy: [ExpenseItemOrderBy!]
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
          {expenseRequest: {status: {_ilike: $searchTerm}}},
          {employee: {firstName: {_ilike: $searchTerm}}},
          {employee: {lastName: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      aggregate { count }
    }
    ExpenseItem(
      limit: $limit,
      offset: $offset,
      orderBy: $orderBy,
      where: {
        isDeleted: {_eq: false},
        status: {_nin: ["CREATED", "DISCARDED"]},
        expenseRequest: {isDeleted: {_eq: false}, status: {_nin: ["CREATED", "DISCARDED"]}},
        _or: [
          {title: {_ilike: $searchTerm}},
          {expensePosition: {expenseGroupRef: {_ilike: $searchTerm}}},
          {expenseRequest: {code: {_ilike: $searchTerm}}},
          {expenseRequest: {status: {_ilike: $searchTerm}}},
          {employee: {firstName: {_ilike: $searchTerm}}},
          {employee: {lastName: {_ilike: $searchTerm}}}
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
      reimbursableAmount
      expenseRequestId
      expenseRequest {
        id code createdAt startDate requestTypeRef currencyRef status
      }
    }
  }
`

export const GET_EXPENSE_PLANS_BACKOFFICE = `
  query GetExpensePlansBackoffice(
    $where: ExpensePlanBoolExp,
    $limit: Int!,
    $offset: Int!,
    $orderBy: [ExpensePlanOrderBy!]
  ) {
    ExpensePlanAggregate(where: $where) { aggregate { count } }
    ExpensePlan(
      limit: $limit, offset: $offset, orderBy: $orderBy,
      where: $where
    ) {
      id code title employeeId requestType { value translations { value localeCode } }
      expenseRequest { id code requestType { value translations { value localeCode } } }
      advancePayment(where: { isDeleted: { _eq: false } }) {
        id
        amount
        status
      }
      startDate endDate status activeFrom activeTo totalAmount totalRemainingAmount currencyRef
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
      totalAmount reimbursableAmount totalRemainingAmount currencyRef status createdAt updatedAt
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
    $where: AdvancePaymentBoolExp,
    $limit: Int!,
    $offset: Int!,
    $orderBy: [AdvancePaymentOrderBy!]
  ) {
    AdvancePaymentAggregate(where: $where) { aggregate { count } }
    AdvancePayment(
      limit: $limit, offset: $offset, orderBy: $orderBy,
      where: $where
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

export const GET_SLA_KPI_COMMENTS = `
  query GetSlaKpiComments {
    ExpenseRequestComment(
      where: {
        isDeleted: { _eq: false },
        commentType: { _eq: "SYSTEM_COMMENT" },
        expenseRequest: { isDeleted: { _eq: false }, status: { _nin: ["CREATED", "DISCARDED"] } },
        _or: [
          { comment: { _ilike: "%to: PENDING%" } },
          { comment: { _ilike: "%to: APPROVED%" } },
          { comment: { _ilike: "%to: APPROVAL%" } },
          { comment: { _ilike: "%to: PAID%" } },
          { comment: { _ilike: "%to: CLOSED%" } }
        ]
      },
      orderBy: [{ commentDate: ASC }]
    ) {
      expenseRequestId
      commentDate
      comment
    }
  }
`

export const GET_SLA_KPI_PAYMENTS = `
  query GetSlaKpiPayments {
    AdvancePayment(
      where: {
        isDeleted: { _eq: false },
        status: { _in: ["PAID", "CLOSED"] },
        expensePlan: { expenseRequest: { isDeleted: { _eq: false }, status: { _nin: ["CREATED", "DISCARDED"] } } }
      }
    ) {
      status
      transactionDate
      decisionDate
      createdAt
      expensePlan {
        expenseRequest(where: { isDeleted: { _eq: false } }) { id }
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
      reimbursableAmount
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
