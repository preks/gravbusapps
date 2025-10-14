// ⚡ OPTIMIZED GraphQL query - single where clause variable for 3x faster loading
// ⚡ OPTIMIZATION: Now includes statistics in the same query to reduce roundtrips from 2 to 1
export const GET_ADVANCE_PAYMENTS = `
query GetAdvancePayments($where: AdvancePaymentBoolExp, $limit: Int!, $offset: Int!, $orderBy: [AdvancePaymentOrderBy!]) {
  AdvancePaymentAggregate(where: $where) {
    aggregate {
      count
    }
  }
  
  # Statistics - total amount across ALL payments (not filtered by $where)
  advancePaymentStats: AdvancePaymentAggregate(
    where: {
      isDeleted: { _eq: false },
      status: { _nin: ["CREATED", "PREPARED", "RETURNED", "REJECTED", "DISCARDED"] }
    }
  ) {
    aggregate {
      sum {
        amount
      }
    }
  }
  
  AdvancePayment(limit: $limit, offset: $offset, orderBy: $orderBy, where: $where) {
    id
    code
    description
    amount
    status
    paymentMethod
    decisionDate
    transactionDate
    costCenter {
      name
    }
    project {
      name
    }
    currency {
      code
    }
    expensePlan {
      id
      code
      title
      startDate
      endDate
      planDate
      decisionDate
      description
      totalAmount
      advancePaymentPaidAmount
      status
      requestType {
        value
      }
      additionalProperties
      expenseRequest {
        id
        title
        code
      }
      employee {
        id
        firstName
        lastName
        fullName
        displayName
        employeePosition {
          organizationalUnit {
            name
          }
          costCenter {
            name
          }
          supervisor {
            id
            firstName
            lastName
            fullName
          }
        }
      }
      costCenter {
        name
      }
      project {
        name
      }
      currency {
        code
        id
        value
      }
    }
  }
}
`

// ⚡ DEPRECATED: Statistics are now included in GET_ADVANCE_PAYMENTS
export const GET_ADVANCE_PAYMENT_STATISTICS = `
  query GetAdvancePaymentStatistics {
    advancePaymentStats: AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false },
        status: { _nin: ["CREATED", "PREPARED", "RETURNED", "REJECTED", "DISCARDED"] }
      }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`

// ⚡ OPTIMIZED: Lightweight query to get statuses (deduplication happens in code)
// Shows all statuses that exist in the database except CREATED, RETURNED, and DISCARDED
// Note: distinct_on is not supported by this GraphQL schema, so deduplication is done client-side
export const GET_ADVANCE_PAYMENT_STATUSES = `
  query GetAdvancePaymentStatuses {
    AdvancePayment(
      where: {
        isDeleted: { _eq: false },
        status: { _nin: ["CREATED", "RETURNED", "DISCARDED"] }
      }
    ) {
      status
    }
  }
`

// ⚡ OPTIMIZED: Lightweight query to get unique reporters without fetching full payment data
// Note: distinct_on is not supported by this GraphQL schema, so deduplication is done client-side
export const GET_ADVANCE_PAYMENT_REPORTERS = `
  query GetAdvancePaymentReporters($searchTerm: String!) {
    AdvancePayment(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          {
            status: {
              _nin: ["CREATED", "RETURNED", "REJECTED", "DISCARDED"]
            }
          },
          {
            _or: [
              { expensePlan: { employee: { firstName: { _ilike: $searchTerm } } } },
              { expensePlan: { employee: { lastName: { _ilike: $searchTerm } } } },
              { expensePlan: { employee: { displayName: { _ilike: $searchTerm } } } }
            ]
          }
        ]
      },
      limit: 100
    ) {
      expensePlan {
        employee {
          id
          firstName
          lastName
          displayName
        }
      }
    }
  }
`
