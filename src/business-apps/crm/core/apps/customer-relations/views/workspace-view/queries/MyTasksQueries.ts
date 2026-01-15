export const GET_MY_TASKS = `
  query GetMyTasks(
    $employeeId: uuid!
    $limit: Int
    $offset: Int
    $statusFilter: [String!]
  ) {
    SalesTask(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { status: { value: { _in: $statusFilter } } }
        ]
      }
      orderBy: [{ dueDate: ASC_NULLS_LAST }, { priority: { value: DESC } }]
      limit: $limit
      offset: $offset
    ) {
      id
      name
      description
      createdAt
      dueDate
      startDate
      status {
        value
        code
      }
      priority {
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
        name
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
    SalesTaskAggregate(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { status: { value: { _in: $statusFilter } } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_UPCOMING_TASKS = `
  query GetUpcomingTasks($employeeId: uuid!, $limit: Int!) {
    SalesTask(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { taskAssignees: { assignedEmployeeId: { _eq: $employeeId } } }
          { status: { value: { _in: ["PENDING", "IN_PROGRESS"] } } }
        ]
      }
      orderBy: [{ dueDate: ASC_NULLS_LAST }]
      limit: $limit
    ) {
      id
      name
      dueDate
      priority {
        value
      }
      status {
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
    }
  }
`
