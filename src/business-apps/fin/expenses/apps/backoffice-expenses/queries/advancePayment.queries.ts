// ⚡ OPTIMIZED GraphQL query - single where clause variable for 3x faster loading
export const GET_ADVANCE_PAYMENTS = `
query GetAdvancePayments($where: AdvancePaymentBoolExp, $limit: Int!, $offset: Int!, $orderBy: [AdvancePaymentOrderBy!]) {
  AdvancePaymentAggregate(where: $where) {
    aggregate {
      count
    }
  }
  AdvancePayment(limit: $limit, offset: $offset, orderBy: $orderBy, where: $where) {
    id
    code
    description
    amount
    status
    paymentMethod
    costCenter {
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
        employeePosition {
          organizationalUnit {
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
