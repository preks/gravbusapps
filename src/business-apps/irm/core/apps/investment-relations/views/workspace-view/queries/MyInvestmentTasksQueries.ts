/**
 * IRM Task Queries for Personal Investment Manager
 */
export const GET_MY_INVESTMENT_TASKS = `
  query GetMyInvestmentTasks(
    $employeeId: uuid!
    $limit: Int
    $offset: Int
    $statusFilter: [String!]
  ) {
    InvestmentTask(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { taskStatus: { code: { _in: $statusFilter } } }
        ]
      }
      orderBy: [{ dueDate: ASC_NULLS_LAST }, { taskPriority: { value: DESC } }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      description
      createdAt
      dueDate
      startDate
      taskStatus {
        value
        code
      }
      taskPriority {
        value
      }
      creatorEmployee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
      }
      taskAssignees {
        assignedEmployee {
          id
          displayName
          fullName
          pictureThumbnail
        }
      }
      lead {
        id
        code
        firstName
        lastName
        companyName
      }
      account {
        id
        name
      }
      contact {
        id
        firstName
        lastName
      }
      opportunity {
        id
        name
      }
    }
    InvestmentTaskAggregate(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { taskStatus: { code: { _in: $statusFilter } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`
