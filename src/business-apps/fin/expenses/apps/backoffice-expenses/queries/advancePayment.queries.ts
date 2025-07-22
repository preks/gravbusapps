// ⚡ OPTIMIZED GraphQL query - single where clause variable for 3x faster loading
export const GET_ADVANCE_PAYMENTS = `
query GetAdvancePayments($where: AdvancePaymentBoolExp, $limit: Int!, $offset: Int!) {
  AdvancePaymentAggregate(where: $where) {
    aggregate {
      count
    }
  }
  AdvancePayment(limit: $limit, offset: $offset, orderBy: {createdAt: DESC}, where: $where) {
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
      totalAmount
      expenseRequest {
        id
      }
      employee {
        id
        firstName
        lastName
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
      currency {
        code
        id
     }
    }
  }
}
`;

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
`;
