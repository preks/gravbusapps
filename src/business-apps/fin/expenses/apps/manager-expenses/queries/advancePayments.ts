// GraphQL query for fetching expense plans with their associated advance payments for team members
export const GET_ADVANCE_PAYMENTS_BY_MANAGER = `
  query GetAdvancePaymentsByManager(
    $managerId: uuid!,
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String
  ) {
    ExpensePlanAggregate(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    ExpensePlan(
      limit: $limit,
      offset: $offset,
      orderBy: {planDate: DESC},
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {title: {_ilike: $searchTerm}},
          {employee: {fullName: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      id
      code
      title
      planDate
      startDate
      endDate
      status
      totalAmount
      currencyRef
      employee {
        id
        fullName
      }
      advancePayment(where: {isDeleted: {_eq: false}}) {
        id
        code
        amount
        status
        transactionDate
        currencyRef
      }
    }
  }
`;

export const GET_ADVANCE_PAYMENT_STATISTICS = `
  query GetAdvancePaymentStatistics($employeeId: uuid!) {
    advancePaymentStats: AdvancePaymentAggregate(
      where: {
        expensePlan: {
          employee: {
            employeePosition: { supervisorEmployeeId: { _eq: $employeeId } }
          }
        },
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
