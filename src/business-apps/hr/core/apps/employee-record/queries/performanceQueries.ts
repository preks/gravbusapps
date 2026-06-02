/**
 * GraphQL queries for employee performance data
 */

export const latestGoalByEmployeeAndTitleQuery = `
  query GetLatestGoalByEmployeeAndTitle($employeeId: uuid!, $title: String!) {
    EmployeePerformanceGoal(
      where: { employeeId: { _eq: $employeeId }, title: { _eq: $title } }
      orderBy: { createdAt: DESC }
      limit: 1
    ) {
      id
    }
  }
`

export const employeePerformanceQuery = `
  query GetEmployeePerformance($employeeId: uuid!) {
    EmployeePerformanceGoal(where: {
      employeeId: {_eq: $employeeId}
    }) {
      id
      title
      startDate
      dueDate
      completionDate
      status
      objectiveType
      startValue
      targetValue
      employeeId
      createdAt
      updatedAt
      version
      additionalProperties
      employeePerformanceGoalMilestone(orderBy: {sortOrder: ASC}) {
        id
        title
        done
        doneAt
        sortOrder
        version
      }
      employeePerformanceGoalUpdate(orderBy: {updateTime: ASC}) {
        id
        comment
        updateTime
        updateDelta
        employee {
          firstName
          lastName
        }
      }
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
