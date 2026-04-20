/**
 * Backoffice Expenses Overview - global data (no supervisor/manager filter).
 * Split into KPI and TABLE queries for better performance.
 */

export const BACKOFFICE_EXPENSES_OVERVIEW_KPI = `
  query BackofficeExpensesOverviewKpi(
    $currencyRef: String,
    $monthStart: timestamp, $monthEnd: timestamp, $yearStart: timestamp,
    $reqCurrencyWhere: ExpenseRequestBoolExp = {},
    $planCurrencyWhere: ExpensePlanBoolExp = {}
  ) {
    DistinctCurrenciesFromItems: ExpenseItem(
      where: { isDeleted: { _eq: false }, currencyRef: { _neq: null } }
    ) { currencyRef }

    DistinctCurrenciesFromRequests: ExpenseRequest(
      where: { isDeleted: { _eq: false }, currencyRef: { _neq: null } }
    ) { currencyRef }

    DistinctCurrenciesFromPlans: ExpensePlan(
      where: { isDeleted: { _eq: false }, currencyRef: { _neq: null } }
    ) { currencyRef }

    DistinctCurrenciesFromPayments: AdvancePayment(
      where: { isDeleted: { _eq: false }, currencyRef: { _neq: null } }
    ) { currencyRef }

    TeamMembersAggregate: EmployeeAggregate(
      where: { isDeleted: { _eq: false } }
    ) { aggregate { count } }

    PendingApprovalsAggregate: ExpenseRequestAggregate(
      where: { status: { _eq: "PENDING" }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    PendingRequestsAllCountAggregate: ExpenseRequestAggregate(
      where: { status: { _eq: "PENDING" }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    PendingPlansAllCountAggregate: ExpensePlanAggregate(
      where: { status: { _eq: "PENDING" }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    PendingPaymentsAllCountAggregate: AdvancePaymentAggregate(
      where: { isDeleted: { _eq: false }, status: { _eq: "PENDING" } }
    ) { aggregate { count } }

    TotalRequestsAllCountAggregate: ExpenseRequestAggregate(
      where: {
        status: { _nin: ["CREATED","REJECTED","DISCARDED"] },
        isDeleted: { _eq: false }
      }
    ) { aggregate { count } }

    TotalPlansAllCountAggregate: ExpensePlanAggregate(
      where: {
        status: { _nin: ["CREATED","REJECTED","DISCARDED"] },
        isDeleted: { _eq: false }
      }
    ) { aggregate { count } }

    TotalPaymentsAllCountAggregate: AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false },
        status: { _nin: ["CREATED","RETURNED","REJECTED","DISCARDED"] }
      }
    ) { aggregate { count } }

    ExpensePlansTotalAggregate: ExpensePlanAggregate(
      where: {
        _and: [
          $planCurrencyWhere,
          { status: { _nin: ["CREATED","REJECTED","DISCARDED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { totalAmount } } }

    AllPlansAggregate: ExpensePlanAggregate(
      where: {
        _and: [
          $planCurrencyWhere,
          { status: { _nin: ["CREATED","REJECTED","DISCARDED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { count sum { totalAmount } } }

    PendingPlansCountAggregate: ExpensePlanAggregate(
      where: {
        _and: [
          $planCurrencyWhere,
          { status: { _eq: "PENDING" } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { count } }

    PendingPlansAmountAggregate: ExpensePlanAggregate(
      where: {
        _and: [
          $planCurrencyWhere,
          { status: { _eq: "PENDING" } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { totalAmount } } }

    ExpenseRequestsUsedAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { status: { _nin: ["CREATED","RETURNED","REJECTED","DISCARDED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { reimbursableAmount } } }

    RequestsPendingCountAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { status: { _eq: "PENDING" } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { count } }

    RequestsPendingAmountAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { status: { _eq: "PENDING" } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { reimbursableAmount } } }

    RequestsSubmittedCountAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { status: { _in: ["PENDING","APPROVED","VERIFIED","BOOKED","TRANSFERRED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { count } }

    RequestsSubmittedAmountAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { status: { _in: ["PENDING","APPROVED","VERIFIED","BOOKED","TRANSFERRED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { reimbursableAmount } } }

    MonthlyExpensesAggregate: ExpenseItemAggregate(
      where: {
        _and: [
          { status: { _in: ["PAID","CLOSED"] } },
          { isDeleted: { _eq: false } },
          { currencyRef: { _eq: $currencyRef } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $monthStart, _lt: $monthEnd } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ]},
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $monthStart, _lt: $monthEnd } } }
            ]}
          ]}
        ]
      }
    ) { aggregate { sum { reimbursableAmount } } }

    MonthlyExpenseItemsForTrends: ExpenseItem(
      orderBy: { expenseDate: ASC },
      where: {
        _and: [
          { status: { _in: ["PAID","CLOSED"] } },
          { isDeleted: { _eq: false } },
          { currencyRef: { _eq: $currencyRef } },
          { _or: [
            { _and: [
              { expenseDate: { _gte: $yearStart } },
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
            ]},
            { _and: [
              { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: $yearStart } } }
            ]}
          ]}
        ]
      }
    ) {
      expenseDate
      totalAmount
      reimbursableAmount
      expenseRequest { requestTypeRef startDate }
      expensePosition {
        expenseGroupRef
        expenseGroup { value objectValue translations { value localeCode } }
      }
    }

    AllPaymentsAggregate: AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false },
        currencyRef: { _eq: $currencyRef }
      }
    ) { aggregate { count sum { amount } } }

    PendingPaymentsAggregate: AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false }, status: { _eq: "PENDING" },
        currencyRef: { _eq: $currencyRef }
      }
    ) { aggregate { count sum { amount } } }
  }
`

export const BACKOFFICE_EXPENSES_OVERVIEW_TABLE = `
  query BackofficeExpensesOverviewTable(
    $searchTerm: String,
    $reqLimit: Int! = 20, $reqOffset: Int! = 0, $reqOrderBy: [ExpenseRequestOrderBy!] = [{ createdAt: DESC }],
    $planLimit: Int! = 20, $planOffset: Int! = 0, $planOrderBy: [ExpensePlanOrderBy!] = [{ createdAt: DESC }],
    $payLimit: Int! = 20, $payOffset: Int! = 0, $payOrderBy: [AdvancePaymentOrderBy!] = [{ createdAt: DESC }],
    $reqCurrencyWhere: ExpenseRequestBoolExp = {},
    $planCurrencyWhere: ExpensePlanBoolExp = {},
    $payCurrencyWhere: AdvancePaymentBoolExp = {},
    $reqStatusWhere: ExpenseRequestBoolExp = {},
    $planStatusWhere: ExpensePlanBoolExp = {},
    $payStatusWhere: AdvancePaymentBoolExp = {},
    $planDateWhere: ExpensePlanBoolExp = {},
    $reqDateWhere: ExpenseRequestBoolExp = {},
    $includeRequests: Boolean! = true,
    $includePlans: Boolean! = true,
    $includePayments: Boolean! = true
  ) {
    ExpenseRequestsAggregate: ExpenseRequestAggregate(
      where: {
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { title: { _ilike: $searchTerm } },
          { employee: { firstName: { _ilike: $searchTerm } } },
          { employee: { lastName: { _ilike: $searchTerm } } }
        ],
        _and: [ $reqCurrencyWhere, $reqStatusWhere, $reqDateWhere ]
      }
    ) @include(if: $includeRequests) { aggregate { count } }

    ExpenseRequests: ExpenseRequest(
      limit: $reqLimit, offset: $reqOffset, orderBy: $reqOrderBy,
      where: {
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { title: { _ilike: $searchTerm } },
          { employee: { firstName: { _ilike: $searchTerm } } },
          { employee: { lastName: { _ilike: $searchTerm } } }
        ],
        _and: [ $reqCurrencyWhere, $reqStatusWhere, $reqDateWhere ]
      }
    ) @include(if: $includeRequests) {
      id code title employeeId requestDate startDate endDate description
      totalAmount reimbursableAmount totalRemainingAmount currencyRef status createdAt updatedAt
      requestType { value translations { value localeCode } }
      expensePlan {
        code
        advancePaymentPaidAmount
        requestType { value translations { value localeCode } }
        advancePayment(where: { isDeleted: { _eq: false } }) {
          id
          amount
          status
        }
      }
    }

    ExpensePlansAggregate: ExpensePlanAggregate(
      where: {
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { title: { _ilike: $searchTerm } },
          { employee: { firstName: { _ilike: $searchTerm } } },
          { employee: { lastName: { _ilike: $searchTerm } } }
        ],
        _and: [ $planCurrencyWhere, $planStatusWhere, $planDateWhere ]
      }
    ) @include(if: $includePlans) { aggregate { count } }

    ExpensePlans: ExpensePlan(
      limit: $planLimit, offset: $planOffset, orderBy: $planOrderBy,
      where: {
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { title: { _ilike: $searchTerm } },
          { employee: { firstName: { _ilike: $searchTerm } } },
          { employee: { lastName: { _ilike: $searchTerm } } }
        ],
        _and: [ $planCurrencyWhere, $planStatusWhere, $planDateWhere ]
      }
    ) @include(if: $includePlans) {
      id code title employeeId startDate endDate status
      activeFrom activeTo totalAmount totalRemainingAmount advancePaymentPaidAmount currencyRef createdAt updatedAt decisionDate planDate
      requestType { value translations { value localeCode } }
      employeeDocument { id file fileSize name mimeType description type }
      expenseRequest(where: { isDeleted: { _eq: false } }) {
        id code requestType { value translations { value localeCode } }
      }
      advancePayment(where: { isDeleted: { _eq: false } }) {
        id code amount status transactionDate currencyRef createdAt paymentMethod
        costCenter { id name code }
      }
    }

    AdvancePaymentsAggregate: AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } },
          { expensePlan: { employee: { firstName: { _ilike: $searchTerm } } } },
          { expensePlan: { employee: { lastName: { _ilike: $searchTerm } } } },
          { expensePlan: { employee: { employeePosition: { organizationalUnit: { name: { _ilike: $searchTerm } } } } } },
          { expensePlan: { employee: { employeePosition: { costCenter: { name: { _ilike: $searchTerm } } } } } },
          { paymentMethod: { _ilike: $searchTerm } }
        ],
        _and: [ $payCurrencyWhere, $payStatusWhere ]
      }
    ) @include(if: $includePayments) { aggregate { count } }

    AdvancePayments: AdvancePayment(
      limit: $payLimit, offset: $payOffset, orderBy: $payOrderBy,
      where: {
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } },
          { expensePlan: { employee: { firstName: { _ilike: $searchTerm } } } },
          { expensePlan: { employee: { lastName: { _ilike: $searchTerm } } } },
          { expensePlan: { employee: { employeePosition: { organizationalUnit: { name: { _ilike: $searchTerm } } } } } },
          { expensePlan: { employee: { employeePosition: { costCenter: { name: { _ilike: $searchTerm } } } } } },
          { paymentMethod: { _ilike: $searchTerm } }
        ],
        _and: [ $payCurrencyWhere, $payStatusWhere ]
      }
    ) @include(if: $includePayments) {
      id code amount status createdAt paymentMethod currencyRef decisionDate transactionDate
      costCenter { id name code }
      project { id name }
      expensePlan {
        id code title employeeId startDate endDate totalAmount currencyRef
        costCenter { id name code }
        project { id name }
      }
    }
  }
`
