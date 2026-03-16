// Single-call Manager Expenses Overview query (lists + aggregates + currencies + trends)
// Uses fallback collection for distinct currencies to avoid requiring a DB view.
// Status filters: reqStatus, planStatus, payStatus

export const MANAGER_EXPENSES_OVERVIEW = `
  query ManagerExpensesOverview(
    $managerId: uuid!,
    $currencyRef: String,
    $searchTerm: String,
    $reqLimit: Int! = 20, $reqOffset: Int! = 0, $reqOrderBy: [ExpenseRequestOrderBy!] = [{ requestDate: DESC }],
    $planLimit: Int! = 20, $planOffset: Int! = 0, $planOrderBy: [ExpensePlanOrderBy!] = [{ planDate: DESC }],
    $payLimit: Int! = 20, $payOffset: Int! = 0, $payOrderBy: [AdvancePaymentOrderBy!] = [{ createdAt: DESC }],
    $monthStart: timestamp, $monthEnd: timestamp, $yearStart: timestamp,
    $reqCurrencyWhere: ExpenseRequestBoolExp = {},
    $planCurrencyWhere: ExpensePlanBoolExp = {},
    $planStatsCurrencyWhere: ExpensePlanBoolExp = {},
    $payCurrencyWhere: AdvancePaymentBoolExp = {},
    $payStatsCurrencyWhere: AdvancePaymentBoolExp = {},
    $reqStatusWhere: ExpenseRequestBoolExp = {},
    $planStatusWhere: ExpensePlanBoolExp = {},
    $payStatusWhere: AdvancePaymentBoolExp = {},
    $planDateWhere: ExpensePlanBoolExp = {},
    $reqDateWhere: ExpenseRequestBoolExp = {}
  ) {
    # Distinct currencies fallback (collect from sources and dedupe client-side)
    DistinctCurrenciesFromItems: ExpenseItem(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        isDeleted: { _eq: false },
        currencyRef: { _neq: null }
      }
    ) { currencyRef }

    DistinctCurrenciesFromRequests: ExpenseRequest(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        isDeleted: { _eq: false },
        currencyRef: { _neq: null }
      }
    ) { currencyRef }

    DistinctCurrenciesFromPlans: ExpensePlan(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        isDeleted: { _eq: false },
        currencyRef: { _neq: null }
      }
    ) { currencyRef }

    DistinctCurrenciesFromPayments: AdvancePayment(
      where: {
        expensePlan: { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
        isDeleted: { _eq: false },
        currencyRef: { _neq: null }
      }
    ) { currencyRef }

    TeamMembersAggregate: EmployeeAggregate(
      where: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } }, isDeleted: { _eq: false } }
    ) { aggregate { count } }

    PendingApprovalsAggregate: ExpenseRequestAggregate(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        status: { _eq: "PENDING" }, isDeleted: { _eq: false }
      }
    ) { aggregate { count } }

    # Currency-agnostic pending aggregates
    PendingRequestsAllCountAggregate: ExpenseRequestAggregate(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        status: { _eq: "PENDING" }, isDeleted: { _eq: false }
      }
    ) { aggregate { count } }

    PendingPlansAllCountAggregate: ExpensePlanAggregate(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        status: { _eq: "PENDING" }, isDeleted: { _eq: false }
      }
    ) { aggregate { count } }

    PendingPaymentsAllCountAggregate: AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false }, status: { _eq: "PENDING" },
        expensePlan: { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } }
      }
    ) { aggregate { count } }

    # Currency-agnostic total counts for stats cards
    TotalRequestsAllCountAggregate: ExpenseRequestAggregate(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        status: { _nin: ["CREATED","REJECTED","DISCARDED"] },
        isDeleted: { _eq: false }
      }
    ) { aggregate { count } }

    TotalPlansAllCountAggregate: ExpensePlanAggregate(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        status: { _nin: ["CREATED","REJECTED","DISCARDED"] },
        isDeleted: { _eq: false }
      }
    ) { aggregate { count } }

    TotalPaymentsAllCountAggregate: AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false },
        status: { _nin: ["CREATED","REJECTED","DISCARDED"] },
        expensePlan: { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } }
      }
    ) { aggregate { count } }

    ExpensePlansTotalAggregate: ExpensePlanAggregate(
      where: {
        _and: [
          $planStatsCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _nin: ["CREATED","REJECTED","DISCARDED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { totalAmount } } }

    # Plans statistics (total and pending) - stats currency (e.g. most-used when list shows All)
    AllPlansAggregate: ExpensePlanAggregate(
      where: {
        _and: [
          $planStatsCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _nin: ["CREATED","REJECTED","DISCARDED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { count sum { totalAmount } } }

    PendingPlansCountAggregate: ExpensePlanAggregate(
      where: {
        _and: [
          $planStatsCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _eq: "PENDING" } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { count } }

    PendingPlansAmountAggregate: ExpensePlanAggregate(
      where: {
        _and: [
          $planStatsCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _eq: "PENDING" } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { totalAmount } } }

    ExpenseRequestsUsedAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _nin: ["CREATED","RETURNED","REJECTED","DISCARDED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { totalAmount } } }

    # Requests statistics (pending and submitted) - currency filtered
    RequestsPendingCountAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _eq: "PENDING" } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { count } }

    RequestsPendingAmountAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _eq: "PENDING" } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { totalAmount } } }

    RequestsSubmittedCountAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _in: ["PENDING","APPROVED","VERIFIED","BOOKED","TRANSFERRED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { count } }

    RequestsSubmittedAmountAggregate: ExpenseRequestAggregate(
      where: {
        _and: [
          $reqCurrencyWhere,
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
          { status: { _in: ["PENDING","APPROVED","VERIFIED","BOOKED","TRANSFERRED"] } },
          { isDeleted: { _eq: false } }
        ]
      }
    ) { aggregate { sum { totalAmount } } }

    # Monthly actual expenses (sum of ExpenseItem totalAmount) using correct period logic:
    # - EXPENSES type → use item.expenseDate
    # - TRIP type     → use expenseRequest.startDate
    MonthlyExpensesAggregate: ExpenseItemAggregate(
      where: {
        _and: [
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
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
    ) { aggregate { sum { totalAmount } } }

    # Monthly trends source rows from ExpenseItem using the same period logic; aggregation is done client-side
    MonthlyExpenseItemsForTrends: ExpenseItem(
      orderBy: { expenseDate: ASC },
      where: {
        _and: [
          { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
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
      expenseRequest { requestTypeRef startDate }
      expensePosition {
        expenseGroupRef
        expenseGroup { value objectValue translations { value localeCode } }
      }
    }

    ExpenseRequestsAggregate: ExpenseRequestAggregate(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { title: { _ilike: $searchTerm } },
          { employee: { fullName: { _ilike: $searchTerm } } }
        ],
        _and: [ $reqCurrencyWhere, $reqStatusWhere, $reqDateWhere ]
      }
    ) { aggregate { count } }

    ExpenseRequests: ExpenseRequest(
      limit: $reqLimit, offset: $reqOffset, orderBy: $reqOrderBy,
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { title: { _ilike: $searchTerm } },
          { employee: { fullName: { _ilike: $searchTerm } } }
        ],
        _and: [ 
          $reqCurrencyWhere,
          $reqStatusWhere,
          $reqDateWhere
        ]
      }
    ) {
      id code title requestDate startDate endDate description
      totalAmount currencyRef status createdAt updatedAt
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      expensePlan { 
        code
        requestType {
          value
          translations {
            value
            localeCode
          }
        }
      }
      employeeDocument { file name }
      employee {
        id code displayName firstName lastName fullName pictureThumbnail
        additionalProperties
        employeePosition { organizationalUnit { id name } siteLocation { id name } }
      }
    }

    ExpensePlansAggregate: ExpensePlanAggregate(
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { title: { _ilike: $searchTerm } },
          { employee: { fullName: { _ilike: $searchTerm } } }
        ],
        _and: [ $planCurrencyWhere, $planStatusWhere, $planDateWhere ]
      }
    ) { aggregate { count } }

    ExpensePlans: ExpensePlan(
      limit: $planLimit, offset: $planOffset, orderBy: $planOrderBy,
      where: {
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } },
        isDeleted: { _eq: false },
        _or: [
          { code: { _ilike: $searchTerm } },
          { title: { _ilike: $searchTerm } },
          { employee: { fullName: { _ilike: $searchTerm } } }
        ],
        _and: [ 
          $planCurrencyWhere,
          $planStatusWhere,
          $planDateWhere
        ]
      }
    ) {
      id code title startDate endDate status
      activeFrom activeTo totalAmount currencyRef createdAt updatedAt decisionDate planDate
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      employeeDocument { id file fileSize name mimeType description type }
      employee {
        id code displayName firstName lastName fullName pictureThumbnail
        additionalProperties
        employeePosition { organizationalUnit { id name } siteLocation { id name } }
      }
      expenseRequest(where: { isDeleted: { _eq: false } }) {
        id code
        requestType {
          value
          translations {
            value
            localeCode
          }
        }
      }
      advancePayment(where: { isDeleted: { _eq: false } }) {
        id code amount status transactionDate currencyRef createdAt paymentMethod
        costCenter { id name code }
      }
    }

    AdvancePaymentsAggregate: AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false },
        expensePlan: { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } },
          { expensePlan: { employee: { fullName: { _ilike: $searchTerm } } } }
        ],
        _and: [ $payCurrencyWhere, $payStatusWhere ]
      }
    ) { aggregate { count } }

    AdvancePayments: AdvancePayment(
      limit: $payLimit, offset: $payOffset, orderBy: $payOrderBy,
      where: {
        isDeleted: { _eq: false },
        expensePlan: { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } },
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } },
          { expensePlan: { employee: { fullName: { _ilike: $searchTerm } } } }
        ],
        _and: [ 
          $payCurrencyWhere,
          $payStatusWhere
        ]
      }
    ) {
      id code amount status createdAt paymentMethod currencyRef decisionDate transactionDate
      costCenter { id name code }
      project { id name }
      expensePlan { 
        id code title startDate endDate totalAmount currencyRef
        costCenter { id name code }
        project { id name }
        employee { 
          id code fullName displayName firstName lastName pictureThumbnail
          additionalProperties
          employeePosition { 
            organizationalUnit { id name }
            costCenter { id name code }
            supervisor { id fullName }
          }
        }
      }
    }

    # Advance payments statistics (total and pending) - stats currency (e.g. selected currency for cards)
    AllPaymentsAggregate: AdvancePaymentAggregate(
      where: {
        _and: [
          $payStatsCurrencyWhere,
          { isDeleted: { _eq: false } },
          { expensePlan: { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } } }
        ]
      }
    ) { aggregate { count sum { amount } } }

    PendingPaymentsAggregate: AdvancePaymentAggregate(
      where: {
        _and: [
          $payStatsCurrencyWhere,
          { isDeleted: { _eq: false } },
          { status: { _eq: "PENDING" } },
          { expensePlan: { employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } } } }
        ]
      }
    ) { aggregate { count sum { amount } } }
  }
`
