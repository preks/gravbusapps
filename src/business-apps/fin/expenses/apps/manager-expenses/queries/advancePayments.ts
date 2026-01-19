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
      requestType {
        value
        translations {
          value
          localeCode
        }
      }
      employee {
        id
        code
        fullName
        displayName
        additionalProperties
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
      advancePayment(where: {isDeleted: {_eq: false}}) {
        id
        code
        amount
        status
        transactionDate
        currencyRef
        createdAt
        paymentMethod
        costCenter {
          id
          name
          code
        }
      }
    }
  }
`

// Payments-centric report query with server-side pagination and search
export const GET_ADVANCE_PAYMENTS_REPORT_BY_MANAGER = `
  query GetAdvancePaymentsReportByManager(
    $managerId: uuid!,
    $limit: Int!,
    $offset: Int!,
    $searchTerm: String
  ) {
    AdvancePaymentAggregate(
      where: {
        isDeleted: { _eq: false },
        expensePlan: {
          employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } }
        },
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } },
          { expensePlan: { employee: { fullName: { _ilike: $searchTerm } } } }
        ]
      }
    ) {
      aggregate { count }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: { createdAt: DESC },
      where: {
        isDeleted: { _eq: false },
        expensePlan: {
          employee: { employeePosition: { supervisorEmployeeId: { _eq: $managerId } } }
        },
        _or: [
          { code: { _ilike: $searchTerm } },
          { description: { _ilike: $searchTerm } },
          { expensePlan: { code: { _ilike: $searchTerm } } },
          { expensePlan: { title: { _ilike: $searchTerm } } },
          { expensePlan: { employee: { fullName: { _ilike: $searchTerm } } } }
        ]
      }
    ) {
      id
      code
      amount
      status
      createdAt
      paymentMethod
      currencyRef
      costCenter { id name code }
      expensePlan {
        code
        title
        requestType {
          value
          translations {
            value
            localeCode
          }
        }
        employee { 
          id
          code
          fullName 
          firstName 
          lastName
          displayName
          additionalProperties
          employeePosition {
            organizationalUnit {
              id
              name
            }
          }
        }
      }
    }
  }
`

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
`
