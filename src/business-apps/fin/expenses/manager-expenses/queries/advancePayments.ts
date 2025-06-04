// GraphQL query for fetching advance payments for team members with pagination, search and filtering
export const GET_ADVANCE_PAYMENTS_BY_MANAGER = `
query GetAdvancePaymentsByManager($employeeId: uuid!, $limit: Int!, $offset: Int!, $searchTerm: String, $status: String) {
  AdvancePaymentAggregate(where: {expensePlan: {employee: {employeePosition: {supervisorEmployeeId: {_eq: $employeeId}}}}, isDeleted: {_eq: false}, _or: [{code: {_ilike: $searchTerm}}, {description: {_ilike: $searchTerm}}, {status: {_ilike: $searchTerm}}], status: {_eq: $status, _nin: ["CREATED", "PREPARED", "RETURNED", "REJECTED", "DISCARDED"]}}) {
    aggregate {
      count
    }
  }
  AdvancePayment(limit: $limit, offset: $offset, orderBy: {expensePlan: {startDate: DESC}}, where: {expensePlan: {employee: {employeePosition: {supervisorEmployeeId: {_eq: $employeeId}}}}, isDeleted: {_eq: false}, _or: [{code: {_ilike: $searchTerm}}, {description: {_ilike: $searchTerm}}, {status: {_ilike: $searchTerm}}], status: {_eq: $status, _nin: ["CREATED", "PREPARED", "RETURNED", "REJECTED", "DISCARDED"]}}) {
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
