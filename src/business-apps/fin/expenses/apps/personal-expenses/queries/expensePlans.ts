// GraphQL query to get expense plans filtered by employee ID with pagination, search, and dynamic sorting
export const GET_EXPENSE_PLANS_BY_EMPLOYEE = `
  query GetExpensePlansByEmployee($employeeId: uuid!, $limit: Int, $offset: Int, $filters: ExpensePlanBoolExp!, $activeUserLocale: String = "en", $orderBy: [ExpensePlanOrderBy!]) {
    ExpensePlanAggregate(
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        _and: [$filters]
      }
    ) {
      aggregate {
        count
      }
    }
    ExpensePlan(
      limit: $limit,
      offset: $offset,
      orderBy: $orderBy,
      where: {
        employeeId: {_eq: $employeeId}, 
        isDeleted: {_eq: false},
        _and: [$filters]
      }
    ) {
      id
      code
      reimbursableAmount
      startDate
      endDate
      planDate
      decisionDate
      status    
      title
      totalAmount  
      requestTypeRef
      createdAt
      employeeDocumentId
      advancePaymentPaidAmount
      advancePaymentInTransitAmount 
      expenseRequest {
        id
        code
        title
        description
        startDate
        endDate
        requestDate
        decisionDate
        totalAmount
        currencyRef
        status
        reimbursableAmount
        nonReimbursableAmount
        additionalProperties
        currency {
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
        }
        requestType {
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
        }
        costCenter {
          name
        }
        project {
          name
        }
        employee {
          fullName
          employeePosition {
            supervisor {
              fullName
            }
          }
        }
      } 
      employeeDocument {
        file
        fileSize
        id
        description
        mimeType
        name
        type
        employee {
          id
        }
      }
      currency {
        type
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        catalog {
          defaultLocale
        }
        value
        id
        code
      }
      currencyRef
      description
      requestType {
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        catalog {
          defaultLocale
        }
      }
      expensePlanItem {
        title
        status
        totalAmount
        expenseDate
      }
      advancePayment{
        id
        amount
        status
        currency {
          code
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
        }
      }
      expenseRequestTrip {
        tripDateTime
      }  
      expenseRequest {
        id
        code
        title
        description
        startDate
        endDate
        requestDate
        decisionDate
        totalAmount
        currencyRef
        status
        reimbursableAmount
        nonReimbursableAmount
        additionalProperties
        currency {
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
        }
        requestType {
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
        }
        costCenter {
          name
        }
        project {
          name
        }
        employee {
          fullName
          employeePosition {
            supervisor {
              fullName
            }
          }
        }
      }
      employee {
        id
        code
        firstName
        lastName
        employeePosition {
          siteLocation {
            name
          }
          organizationalUnit {
            name
          }
          firstName
          lastName
        }
      }
    }
  }
`

// Query to discover which currencies are used by the employee's expense plans
// Used to build currency filter options and to preselect the most-used currency once
export const GET_USED_PLAN_CURRENCIES_BY_EMPLOYEE = `
  query GetUsedPlanCurrenciesByEmployee($employeeId: uuid!, $limit: Int = 1000) {
    ExpensePlan(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        status: {_nin: ["DISCARDED"]}
      },
      limit: $limit
    ) {
      currencyRef
      currency { code }
      expenseRequest(limit: 1) {
        currencyRef
        currency { code }
      }
    }
  }
`

export const GET_EXPENSE_PLAN_BY_ID = `
  query GetExpensePlanById($id: uuid!) {
    ExpensePlan(where: {id: {_eq: $id}}) {
      id
      code
      title
      description
      startDate
      endDate
      planDate
      totalAmount
      advancePaymentPaidAmount
      advancePaymentTotalAmount
      costCenter {
        name
        id
      }
      status
      employee {
        fullName
      }
      additionalProperties
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      currency {
        value
        translations {
          value
          localeCode
        }
      }
    }
  }
`

// New query specifically for closed plans statistics
export const GET_CLOSED_PLANS_STATISTICS = `
  query GetClosedPlansStatistics($employeeId: uuid!, $startDate: timestamp!, $endDate: timestamp!) {
    ClosedPlans: ExpensePlanAggregate(
      where: {
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_in: ["CLOSED", "PAID"]} },
          { _or: [
              { _and: [
                  { expensePlanItem: { expenseDate: { _gte: $startDate, _lte: $endDate } } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $startDate, _lte: $endDate } }
                ] }
            ] }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_EXPENSE_PLAN_STATISTICS = `
  query GetExpensePlanStatistics($employeeId: uuid!, $startDate: timestamp!, $endDate: timestamp!, $currencyRef: String!) {
    ExpensePlanAggregate(
      where: {
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { _or: [
              { _and: [
                  { expensePlanItem: { expenseDate: { _gte: $startDate, _lte: $endDate } } },
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $startDate, _lte: $endDate } }
                ] }
            ] }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    TotalEstimated: ExpensePlanAggregate(
      where: {
        _and: [
          { employeeId: {_eq: $employeeId} },
          { isDeleted: {_eq: false} },
          { status: {_nin: ["DRAFT", "PAID", "CLOSED", "DISCARDED"]} },
          { currencyRef: {_eq: $currencyRef} },
          { _or: [
              { _and: [
                 { requestTypeRef: {_eq: "ExpenseRequestType:v1:EXPENSES"} }
                 { expensePlanItem: { expenseDate: { _gte: $startDate, _lte: $endDate } } },
                ] },
              { _and: [
                  { requestTypeRef: {_eq: "ExpenseRequestType:v1:TRIP"} },
                  { startDate: { _gte: $startDate, _lte: $endDate } }
                ] }
            ] }
        ]
      }
    ) {
      aggregate {
        sum {
          totalAmount
        }
      }
    }
    PendingApproval: ExpensePlanAggregate(
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
    Destinations: ExpensePlan(
      where: {
        employeeId: {_eq: $employeeId},
        isDeleted: {_eq: false},
        expenseRequestTrip: {pointType: {_eq: "DESTINATION_POINT"}}
      }
    ) {
      expenseRequestTrip(orderBy: {tripDateTime: ASC}, where: {isDeleted: {_eq: false}, pointType: {_eq: "DESTINATION_POINT"}}) {
        travelRegion {
          value
          translations {
            localeCode
            value
          }
        }
      }
    }
  }
`

// Combined list + stats in one call for the Plans tab
export const GET_EXPENSE_PLANS_OVERVIEW = `
  query GetExpensePlansOverview(
    $employeeId: uuid!,
    $filters: ExpensePlanBoolExp!,
    $limit: Int,
    $offset: Int,
    $orderBy: [ExpensePlanOrderBy!],
    $currentStart: timestamp!,
    $currentEnd: timestamp!,
    $previousStart: timestamp!,
    $previousEnd: timestamp!,
    $currencyRef: String!
  ) {
    plansAggregate: ExpensePlanAggregate(where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, _and: [$filters] }) {
      aggregate { count }
    }
    plans: ExpensePlan(limit: $limit, offset: $offset, orderBy: $orderBy, where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, _and: [$filters] }) {
      id
      code
      title
      status
      planDate
      startDate
      endDate
      totalAmount
      reimbursableAmount
      advancePaymentPaidAmount
      currencyRef
      currency { code }
      requestType { value }
      employeeDocument {
        id
        file
        name
        employee { id }
      }
      employee { id }
      expenseRequest { id }
    }

    currentMonthTotal: ExpensePlanAggregate(
      where: {
        employeeId: { _eq: $employeeId }, isDeleted: { _eq: false },
        _or: [
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } }, { expensePlanItem: { expenseDate: { _gte: $currentStart, _lte: $currentEnd } } } ] },
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $currentStart, _lte: $currentEnd } } ] }
        ]
      }
    ) { aggregate { count } }

    previousMonthTotal: ExpensePlanAggregate(
      where: {
        employeeId: { _eq: $employeeId }, isDeleted: { _eq: false },
        _or: [
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } }, { expensePlanItem: { expenseDate: { _gte: $previousStart, _lte: $previousEnd } } } ] },
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $previousStart, _lte: $previousEnd } } ] }
        ]
      }
    ) { aggregate { count } }

    totalEstimated: ExpensePlanAggregate(
      where: {
        employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, status: { _nin: ["DRAFT", "PAID", "CLOSED", "DISCARDED"] }, currencyRef: { _eq: $currencyRef },
        _or: [
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } }, { expensePlanItem: { expenseDate: { _gte: $currentStart, _lte: $currentEnd } } } ] },
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $currentStart, _lte: $currentEnd } } ] }
        ]
      }
    ) { aggregate { sum { totalAmount } } }

    pendingApproval: ExpensePlanAggregate(
      where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, status: { _eq: "PENDING" }, currencyRef: { _eq: $currencyRef } }
    ) { aggregate { count } }

    destinations: ExpensePlan(
      where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, expenseRequestTrip: { pointType: { _eq: "DESTINATION_POINT" } } }
    ) {
      expenseRequestTrip(orderBy: { tripDateTime: ASC }, where: { isDeleted: { _eq: false }, pointType: { _eq: "DESTINATION_POINT" } }) {
        travelRegion { 
          value 
          translations { 
            localeCode 
            value 
          } 
        }
      }
    }

    currentMonthClosedPlans: ExpensePlanAggregate(
      where: {
        _and: [
          { employeeId: { _eq: $employeeId } },
          { isDeleted: { _eq: false } },
          { status: { _in: ["CLOSED", "PAID"] } },
          { _or: [
              { _and: [ { expensePlanItem: { expenseDate: { _gte: $currentStart, _lte: $currentEnd } } }, { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } ] },
              { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $currentStart, _lte: $currentEnd } } ] }
          ] }
        ]
      }
    ) { aggregate { count } }

    previousMonthClosedPlans: ExpensePlanAggregate(
      where: {
        _and: [
          { employeeId: { _eq: $employeeId } },
          { isDeleted: { _eq: false } },
          { status: { _in: ["CLOSED", "PAID"] } },
          { _or: [
              { _and: [ { expensePlanItem: { expenseDate: { _gte: $previousStart, _lte: $previousEnd } } }, { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } ] },
              { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $previousStart, _lte: $previousEnd } } ] }
          ] }
        ]
      }
    ) { aggregate { count } }
  }
`

// Separate query for fetching only destination statistics (independent loading)
export const GET_EXPENSE_PLANS_DESTINATIONS = `
  query GetExpensePlansDestinations($employeeId: uuid!) {
    destinations: ExpensePlan(
      where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, expenseRequestTrip: { pointType: { _eq: "DESTINATION_POINT" } } }
    ) {
      expenseRequestTrip(orderBy: { tripDateTime: ASC }, where: { isDeleted: { _eq: false }, pointType: { _eq: "DESTINATION_POINT" } }) {
        travelRegion { 
          value 
          translations { 
            localeCode 
            value 
          } 
        }
      }
    }
  }
`

// Separate list query - faster, no statistics
export const GET_EXPENSE_PLANS_LIST = `
  query GetExpensePlansList(
    $employeeId: uuid!,
    $filters: ExpensePlanBoolExp!,
    $limit: Int,
    $offset: Int,
    $orderBy: [ExpensePlanOrderBy!]
  ) {
    plansAggregate: ExpensePlanAggregate(where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, _and: [$filters] }) {
      aggregate { count }
    }
    plans: ExpensePlan(limit: $limit, offset: $offset, orderBy: $orderBy, where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, _and: [$filters] }) {
      id
      code
      title
      status
      planDate
      startDate
      endDate
      totalAmount
      reimbursableAmount
      advancePaymentPaidAmount
      currencyRef
      currency { code }
      requestType { value }
      employeeDocument {
        id
        file
        employee { id }
      }
      employee { id }
      expenseRequest { id }
    }
  }
`

// Separate statistics query - can be debounced/lazy-loaded
export const GET_EXPENSE_PLANS_STATISTICS = `
  query GetExpensePlansStatistics(
    $employeeId: uuid!,
    $currentStart: timestamp!,
    $currentEnd: timestamp!,
    $previousStart: timestamp!,
    $previousEnd: timestamp!,
    $currencyRef: String!
  ) {
    currentMonthTotal: ExpensePlanAggregate(
      where: {
        employeeId: { _eq: $employeeId }, isDeleted: { _eq: false },
        _or: [
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } }, { expensePlanItem: { expenseDate: { _gte: $currentStart, _lte: $currentEnd } } } ] },
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $currentStart, _lte: $currentEnd } } ] }
        ]
      }
    ) { aggregate { count } }

    previousMonthTotal: ExpensePlanAggregate(
      where: {
        employeeId: { _eq: $employeeId }, isDeleted: { _eq: false },
        _or: [
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } }, { expensePlanItem: { expenseDate: { _gte: $previousStart, _lte: $previousEnd } } } ] },
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $previousStart, _lte: $previousEnd } } ] }
        ]
      }
    ) { aggregate { count } }

    totalEstimated: ExpensePlanAggregate(
      where: {
        employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, status: { _nin: ["DRAFT", "PAID", "CLOSED", "DISCARDED"] }, currencyRef: { _eq: $currencyRef },
        _or: [
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } }, { expensePlanItem: { expenseDate: { _gte: $currentStart, _lte: $currentEnd } } } ] },
          { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $currentStart, _lte: $currentEnd } } ] }
        ]
      }
    ) { aggregate { sum { totalAmount } } }

    pendingApproval: ExpensePlanAggregate(
      where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false }, status: { _eq: "PENDING" }, currencyRef: { _eq: $currencyRef } }
    ) { aggregate { count } }

    currentMonthClosedPlans: ExpensePlanAggregate(
      where: {
        _and: [
          { employeeId: { _eq: $employeeId } },
          { isDeleted: { _eq: false } },
          { status: { _in: ["CLOSED", "PAID"] } },
          { _or: [
              { _and: [ { expensePlanItem: { expenseDate: { _gte: $currentStart, _lte: $currentEnd } } }, { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } ] },
              { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $currentStart, _lte: $currentEnd } } ] }
          ] }
        ]
      }
    ) { aggregate { count } }

    previousMonthClosedPlans: ExpensePlanAggregate(
      where: {
        _and: [
          { employeeId: { _eq: $employeeId } },
          { isDeleted: { _eq: false } },
          { status: { _in: ["CLOSED", "PAID"] } },
          { _or: [
              { _and: [ { expensePlanItem: { expenseDate: { _gte: $previousStart, _lte: $previousEnd } } }, { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } ] },
              { _and: [ { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } }, { startDate: { _gte: $previousStart, _lte: $previousEnd } } ] }
          ] }
        ]
      }
    ) { aggregate { count } }
  }
`
