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
      senderEmployeeId
      employeeId
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
`;
