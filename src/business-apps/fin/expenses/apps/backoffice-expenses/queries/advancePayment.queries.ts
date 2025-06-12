// GraphQL query for fetching all advance payments with pagination, search and filtering
export const GET_ADVANCE_PAYMENTS = `
query GetAdvancePayments($limit: Int!, $offset: Int!, $searchTerm: String, $status: String) {
  AdvancePaymentAggregate(where: {isDeleted: {_eq: false}, _or: [{code: {_ilike: $searchTerm}}, {description: {_ilike: $searchTerm}}, {status: {_ilike: $searchTerm}}], status: {_eq: $status, _nin: ["CREATED", "PREPARED", "RETURNED", "REJECTED", "DISCARDED"]}}) {
    aggregate {
      count
    }
  }
  AdvancePayment(limit: $limit, offset: $offset, orderBy: {expensePlan: {startDate: DESC}}, where: {isDeleted: {_eq: false}, _or: [{code: {_ilike: $searchTerm}}, {description: {_ilike: $searchTerm}}, {status: {_ilike: $searchTerm}}], status: {_eq: $status, _nin: ["CREATED", "PREPARED", "RETURNED", "REJECTED", "DISCARDED"]}}) {
    id
    code
    description
    amount
    status
    expensePlan {
      title
      startDate
      endDate
      employee {
        id
        displayName
        fullName
        pictureThumbnail
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
