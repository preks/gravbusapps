// Total count for pagination controls. If the Aggregate type is unsupported
// by the backend, callers should gracefully fallback.
export const EMPLOYEE_FEEDBACK_REQUESTS_COUNT_QUERY = `
  query GetEmployeeFeedbackRequestsCount($idEmployee: uuid!) {
    EmployeeFeedbackRequestAggregate(where: { employeeId: { _eq: $idEmployee } }) {
      aggregate { count }
    }
  }
`

// Combined query: fetch page and total count in one request
export const EMPLOYEE_FEEDBACK_REQUESTS_QUERY_PAGED_WITH_COUNT = `
  query GetEmployeeFeedbackRequestsPagedWithCount($idEmployee: uuid!, $limit: Int!, $offset: Int!) {
    EmployeeFeedbackRequest(
      where: { employeeId: { _eq: $idEmployee } }
      orderBy: { createdAt: DESC }
      limit: $limit
      offset: $offset
    ) {
      createdBy
      createdAt
      additionalProperties
      message
      recordState
      updatedBy
      updatedAt
      requesterEmployeeId
      employeeId
      requesterEmployee { displayName id }
    }
    EmployeeFeedbackRequestAggregate(where: { employeeId: { _eq: $idEmployee } }) {
      aggregate { count }
    }
  }
`
