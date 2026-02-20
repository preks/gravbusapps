// Total count for pagination controls. If the Aggregate type is unsupported
// by the backend, callers should gracefully fallback.
// COMPLETED filtering is done client-side (backend _neq excludes NULL statusRef).
export const EMPLOYEE_FEEDBACK_REQUESTS_COUNT_QUERY = `
  query GetEmployeeFeedbackRequestsCount($idEmployee: uuid!) {
    EmployeeFeedbackRequestAggregate(where: { employeeId: { _eq: $idEmployee } }) {
      aggregate { count }
    }
  }
`

// Combined query: fetch page and total count. COMPLETED rows are filtered client-side
// (backend cannot exclude only COMPLETED while keeping NULL statusRef).
export const EMPLOYEE_FEEDBACK_REQUESTS_QUERY_PAGED_WITH_COUNT = `
  query GetEmployeeFeedbackRequestsPagedWithCount($idEmployee: uuid!, $limit: Int!, $offset: Int!) {
    EmployeeFeedbackRequest(
      where: { employeeId: { _eq: $idEmployee } }
      orderBy: { createdAt: DESC }
      limit: $limit
      offset: $offset
    ) {
      id
      createdBy
      createdAt
      additionalProperties
      message
      recordState
      updatedBy
      updatedAt
      requesterEmployeeId
      employeeId
      statusRef
      dueDate
      typeRef
      requesterEmployee { displayName id }
    }
    EmployeeFeedbackRequestAggregate(where: { employeeId: { _eq: $idEmployee } }) {
      aggregate { count }
    }
  }
`

/** Requests sent by current user (requester_employee_id = currentUser). */
export const EMPLOYEE_FEEDBACK_REQUESTS_SENT_COUNT_QUERY = `
  query GetEmployeeFeedbackRequestsSentCount($requesterEmployeeId: uuid!) {
    EmployeeFeedbackRequestAggregate(where: { requesterEmployeeId: { _eq: $requesterEmployeeId } }) {
      aggregate { count }
    }
  }
`

export const EMPLOYEE_FEEDBACK_REQUESTS_SENT_QUERY_PAGED_WITH_COUNT = `
  query GetEmployeeFeedbackRequestsSentPagedWithCount($requesterEmployeeId: uuid!, $limit: Int!, $offset: Int!) {
    EmployeeFeedbackRequest(
      where: { requesterEmployeeId: { _eq: $requesterEmployeeId } }
      orderBy: { createdAt: DESC }
      limit: $limit
      offset: $offset
    ) {
      id
      createdBy
      createdAt
      message
      recordState
      updatedBy
      updatedAt
      requesterEmployeeId
      employeeId
      statusRef
      dueDate
      typeRef
      requesterEmployee { displayName id }
      employee { displayName id }
    }
    EmployeeFeedbackRequestAggregate(where: { requesterEmployeeId: { _eq: $requesterEmployeeId } }) {
      aggregate { count }
    }
  }
`
