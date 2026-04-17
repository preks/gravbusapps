// Moved dynamic query builder to utils/advancePaymentsQueryBuilder for SRP

// Hook for using the dynamic query
import {
  buildAdvancePaymentsQuery,
  validateFilters,
  AdvancePaymentFilters
} from '../../personal-expenses/utils/advancePaymentsQueryBuilder'
import { TOTAL_PAYMENTS_CARD_STATUSES } from '../utils/totalPaymentsCardStatuses'

/** GraphQL `_in` list for Total Payments card (must match TOTAL_PAYMENTS_CARD_STATUSES) */
const GQL_IN_TOTAL_PAYMENTS_CARD_STATUSES = JSON.stringify(TOTAL_PAYMENTS_CARD_STATUSES)

export const useAdvancePaymentsQuery = (filters: AdvancePaymentFilters) => {
  const query = buildAdvancePaymentsQuery(filters)
  const filterState = validateFilters(filters)

  return {
    query,
    filterState,
    hasActiveFilters: filterState.hasStatusFilter || filterState.hasAmountRange || filterState.hasAdvanceRange
  }
}

// GraphQL query to get advance payments with status filtering
export const GET_ADVANCE_PAYMENTS_BY_EMPLOYEE_WITH_STATUS = `
  query GetAdvancePaymentsByEmployeeWithStatus($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String, $statusFilter: [String!]) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter}
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter}
      }
    ) {
      id
      code
      description
      amount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
        totalAmount
        currency {
          code
        }
      }
      expensePlanId
    }
  }
`

// GraphQL query to get advance payments with amount range filtering
export const GET_ADVANCE_PAYMENTS_BY_EMPLOYEE_WITH_AMOUNT_RANGE = `
  query GetAdvancePaymentsByEmployeeWithAmountRange($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String, $statusFilter: [String!], $amountMin: numeric, $amountMax: numeric) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter},
        expensePlan: {
          totalAmount: {
            _gte: $amountMin,
            _lte: $amountMax
          }
        }
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter},
        expensePlan: {
          totalAmount: {
            _gte: $amountMin,
            _lte: $amountMax
          }
        }
      }
    ) {
      id
      code
      description
      amount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
        totalAmount
        currency {
          code
        }
      }
      expensePlanId
    }
  }
`

// GraphQL query to get advance payments with advance range filtering
export const GET_ADVANCE_PAYMENTS_BY_EMPLOYEE_WITH_ADVANCE_RANGE = `
  query GetAdvancePaymentsByEmployeeWithAdvanceRange($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String, $statusFilter: [String!], $advanceMin: numeric, $advanceMax: numeric) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter},
        amount: {
          _gte: $advanceMin,
          _lte: $advanceMax
        }
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter},
        amount: {
          _gte: $advanceMin,
          _lte: $advanceMax
        }
      }
    ) {
      id
      code
      description
      amount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
        totalAmount
        currency {
          code
        }
      }
      expensePlanId
    }
  }
`

// GraphQL query to get advance payments by employee (basic query without filters)
export const GET_ADVANCE_PAYMENTS_BY_EMPLOYEE = `
  query GetAdvancePaymentsByEmployee($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      id
      code
      description
      amount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        id
        code
        title
        totalAmount
        currency {
          code
        }
        id
        code
        reimbursableAmount
        startDate
        endDate
        planDate
        decisionDate
        status    
        requestTypeRef
        createdAt
        employeeDocumentId
        advancePaymentPaidAmount
        advancePaymentInTransitAmount 
        expenseRequest {
          id
          code
          status
          totalAmount
        }
      }
      expensePlanId
    }
  }
`

export const GET_ADVANCE_PAYMENT_BY_ID = `
  query GetAdvancePaymentById($id: uuid!) {
    AdvancePayment(where: {id: {_eq: $id}}) {
      id
      code
      description
      amount
      currencyRef
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
      }
      expensePlanId
    }
  }
`

export const GET_ADVANCE_PAYMENT_STATISTICS = `
  query GetAdvancePaymentStatistics($employeeId: uuid!, $startDate: timestamptz!, $endDate: timestamptz!, $currencyRef: String!) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}},
        isDeleted: {_eq: false},
        createdAt: {_gte: $startDate, _lte: $endDate}
        status: {_in: ["APPROVED", "PAID", "BOOKED"]},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      aggregate {
        count
        sum {
          amount
        }
      }
    }
    PendingAdvancePayments: AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}},
        isDeleted: {_eq: false},
        status: {_in: ["PENDING", "PREPARED"]},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      aggregate {
        count
      }
    }
    ApprovedAdvancePayments: AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}},
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "PAID", "BOOKED"]},
        currencyRef: {_eq: $currencyRef}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

// Consolidated statistics in a single request
export const GET_ADVANCE_PAYMENT_STATISTICS_CONSOLIDATED = `
  query GetAdvancePaymentStatisticsConsolidated(
    $employeeId: uuid!,
    $currentStart: timestamptz!,
    $currentEnd: timestamptz!,
    $previousStart: timestamptz!,
    $previousEnd: timestamptz!,
    $currencyRef: String!
  ) {
    TotalPaymentsCardCountCurrentMonth: AdvancePaymentAggregate(
      where: {
        expensePlan: { employeeId: { _eq: $employeeId } },
        isDeleted: { _eq: false },
        createdAt: { _gte: $currentStart, _lte: $currentEnd },
        status: { _in: ${GQL_IN_TOTAL_PAYMENTS_CARD_STATUSES} },
        currencyRef: { _eq: $currencyRef }
      }
    ) {
      aggregate {
        count
      }
    }
    TotalPaymentsCardCountPreviousMonth: AdvancePaymentAggregate(
      where: {
        expensePlan: { employeeId: { _eq: $employeeId } },
        isDeleted: { _eq: false },
        createdAt: { _gte: $previousStart, _lte: $previousEnd },
        status: { _in: ${GQL_IN_TOTAL_PAYMENTS_CARD_STATUSES} },
        currencyRef: { _eq: $currencyRef }
      }
    ) {
      aggregate {
        count
      }
    }
    Current: AdvancePaymentAggregate(
      where: {
        expensePlan: { employeeId: { _eq: $employeeId } },
        isDeleted: { _eq: false },
        createdAt: { _gte: $currentStart, _lte: $currentEnd },
        status: { _in: ["APPROVED", "PAID", "BOOKED"] },
        currencyRef: { _eq: $currencyRef }
      }
    ) {
      aggregate {
        sum { amount }
      }
    }
    Previous: AdvancePaymentAggregate(
      where: {
        expensePlan: { employeeId: { _eq: $employeeId } },
        isDeleted: { _eq: false },
        createdAt: { _gte: $previousStart, _lte: $previousEnd },
        status: { _in: ["APPROVED", "PAID", "BOOKED"] },
        currencyRef: { _eq: $currencyRef }
      }
    ) {
      aggregate {
        sum { amount }
      }
    }
    PendingAdvancePayments: AdvancePaymentAggregate(
      where: {
        expensePlan: { employeeId: { _eq: $employeeId } },
        isDeleted: { _eq: false },
        status: { _in: ["PENDING", "PREPARED"] },
        currencyRef: { _eq: $currencyRef }
      }
    ) {
      aggregate { count }
    }
    ApprovedAdvancePayments: AdvancePaymentAggregate(
      where: {
        expensePlan: { employeeId: { _eq: $employeeId } },
        isDeleted: { _eq: false },
        status: { _in: ["APPROVED", "PAID", "BOOKED"] },
        currencyRef: { _eq: $currencyRef }
      }
    ) {
      aggregate { count }
    }
  }
`

// Distinct currencies used by the employee in advance payments
export const GET_USED_ADVANCE_PAYMENT_CURRENCIES = `
  query GetUsedAdvancePaymentCurrencies($employeeId: uuid!, $limit: Int = 2000) {
    AdvancePayment(limit: $limit, where: {
      isDeleted: {_eq: false},
      expensePlan: { employeeId: {_eq: $employeeId} }
    }) {
      currencyRef
      currency { code }
    }
  }
`
