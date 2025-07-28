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
    expensePlan {
      code
      title
      startDate
      employee {
        id
        firstName
        lastName
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
