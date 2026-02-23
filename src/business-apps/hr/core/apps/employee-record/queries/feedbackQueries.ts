/**
 * GraphQL queries for employee feedback data
 */

export const employeeFeedbackQuery = `
  query GetEmployeeFeedback($employeeId: uuid!, $activeUserLocale: String!) {
    EmployeeFeedback(where: {
      employeeId: {_eq: $employeeId},
      isDeleted: {_neq: true}
    }, orderBy: {feedbackDate: DESC}) {
      id
      createdAt
      feedback
      feedbackDate
      feedbackPublic
      senderEmployeeId
      employeeId
      rating
      feedbackPublic
      typeRef
      type {
        id
        value
        objectValue
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
      }
      additionalProperties
      senderEmployee {
        firstName
        lastName
        employeePosition {
          employee {
            pictureThumbnail
          }
        }
      }
    }
  }
`

/** Feedback given by current user (sender_employee_id = currentUser). */
export const employeeFeedbackGivenQuery = `
  query GetEmployeeFeedbackGiven($senderEmployeeId: uuid!, $activeUserLocale: String!) {
    EmployeeFeedback(
      where: { senderEmployeeId: { _eq: $senderEmployeeId }, isDeleted: { _neq: true } }
      orderBy: { feedbackDate: DESC }
    ) {
      id
      createdAt
      feedback
      feedbackDate
      feedbackPublic
      senderEmployeeId
      employeeId
      rating
      typeRef
      additionalProperties
      type {
        id
        value
        objectValue
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
      }
      senderEmployee {
        firstName
        lastName
        employeePosition { employee { pictureThumbnail } }
      }
      employee {
        id
        firstName
        lastName
        displayName
        employeePosition { employee { pictureThumbnail } }
      }
    }
  }
`

// Fetch feedback requests for an employee with reviewers
export const employeeFeedbackRequestsQuery = `
  query GetEmployeeFeedbackRequests($employeeId: uuid!) {
    EmployeeFeedbackRequest(
      where: { employeeId: { _eq: $employeeId } }
      orderBy: { requestedOn: DESC }
    ) {
      id
      employeeId
      message
      requestedOn
      dueDate
      recordState
      employeeFeedbackRequestReviewer(orderBy: { createdAt: DESC }) {
        id
        reviewerEmployeeId
        reviewerEmployee {
          id
          firstName
          lastName
          employeePosition {
            employee { pictureThumbnail }
          }
        }
      }
    }
  }
`
