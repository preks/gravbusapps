/**
 * GraphQL queries for employee performance data
 */

export const employeePerformanceQuery = `
  query GetEmployeePerformance($employeeId: uuid!) {
    EmployeePerformanceGoal(where: {
      employeeId: {_eq: $employeeId}
    }, orderBy: {progressPercent: DESC}) {
      id
      title
      startDate
      dueDate
      completionDate
      progressPercent
      status
      employeeId
      createdAt
      updatedAt
    }
    
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
`
