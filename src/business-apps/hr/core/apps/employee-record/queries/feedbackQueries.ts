/**
 * GraphQL queries for employee feedback data
 */

export const employeeFeedbackQuery = `
  query GetEmployeeFeedback($employeeId: uuid!) {
    EmployeeFeedback(where: {
      employeeId: {_eq: $employeeId}
    }, orderBy: {feedbackDate: DESC}) {
      id
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
        code
        value
      }
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
