export const EMPLOYEE_FEEDBACK_REQUESTS_QUERY = `
  query MyQuery($idEmployee: uuid!) {
    EmployeeFeedbackRequest(where: {employeeId: {_eq: $idEmployee}}, orderBy: {createdAt: DESC}) {
      createdBy
      createdAt
      additionalProperties
      message
      recordState
      updatedBy
      updatedAt
      requesterEmployeeId
      employeeId
      requesterEmployee {
        displayName
        id
      }
    }
  }
`
