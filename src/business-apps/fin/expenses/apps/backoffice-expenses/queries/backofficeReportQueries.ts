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
      aggregate { count }
    }
    ExpenseItem(
      limit: $limit,
      offset: $offset,
      orderBy: {expenseDate: DESC},
      where: {
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
      expensePosition { expenseGroupRef }
      expenseDate
      totalAmount
      expenseRequestId
      expenseRequest {
        id code createdAt startDate requestTypeRef currencyRef status
      }
      employee { id fullName firstName lastName }
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
        _or: [
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ]
      }
    ) { aggregate { count } }
    ExpensePlan(
      limit: $limit, offset: $offset, orderBy: {planDate: DESC},
      where: {
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      id code title requestType { value translations { value localeCode } }
      expenseRequest { id code requestType { value translations { value localeCode } } }
      startDate endDate status activeFrom activeTo totalAmount currencyRef
      createdAt updatedAt decisionDate planDate
      employeeDocument { id file fileSize name mimeType }
      employee {
        id code displayName fullName pictureThumbnail additionalProperties
        employeePosition { organizationalUnit { id name } }
      }
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
      id code title requestDate startDate endDate description
      totalAmount currencyRef status createdAt updatedAt
      requestType { value translations { value localeCode } }
      expensePlan { code requestType { value translations { value localeCode } } }
      employeeDocument { file name }
      employee {
        id code displayName firstName lastName fullName pictureThumbnail additionalProperties
        employeePosition { organizationalUnit { id name } siteLocation { id name } }
      }
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
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } },
          { expensePlan: { employee: { fullName: { _ilike: $searchTerm } } } }
        ]
      }
    ) { aggregate { count } }
    AdvancePayment(
      limit: $limit, offset: $offset, orderBy: { createdAt: DESC },
      where: {
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } },
          { expensePlan: { employee: { fullName: { _ilike: $searchTerm } } } }
        ]
      }
    ) {
      id code amount status createdAt paymentMethod currencyRef
      costCenter { id name code }
      expensePlan {
        code title
        requestType { value translations { value localeCode } }
        employee {
          id code fullName firstName lastName displayName additionalProperties
          employeePosition { organizationalUnit { id name } }
        }
      }
    }
  }
`
