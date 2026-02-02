// GraphQL Queries for Project Analytics

/**
 * Query to get all projects with basic info
 */
export const GET_PROJECTS = `
  query GetProjects($structureId: uuid!, $limit: Int, $offset: Int) {
    Project(
      where: {
        structureId: {_eq: $structureId}
        isDeleted: {_eq: false}
      }
      orderBy: {name: ASC}
      limit: $limit
      offset: $offset
    ) {
      id
      name
      description
      structureId
      projectType
      customerId
      validTo
      validFrom
    }
    ProjectAggregate(
      where: {
        structureId: {_eq: $structureId}
        isDeleted: {_eq: false}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

/**
 * Query to get project working hours aggregated by project
 */
export const GET_PROJECT_WORKING_HOURS_AGGREGATE = `
  query GetProjectWorkingHoursAggregate($projectIds: [uuid!]!, $dateFrom: date, $dateTo: date) {
    EmployeeProjectWorkingHoursAggregate(
      where: {
        projectId: {_in: $projectIds}
        isDeleted: {_eq: false}
        _and: [
          {workingDate: {_gte: $dateFrom}}
          {workingDate: {_lte: $dateTo}}
        ]
      }
    ) {
      aggregate {
        sum {
          actualWorkingHours
        }
        count
      }
    }
  }
`

/**
 * Query to get detailed working hours by project
 */
export const GET_PROJECT_WORKING_HOURS_DETAILS = `
  query GetProjectWorkingHoursDetails($projectId: uuid!, $dateFrom: date, $dateTo: date) {
    EmployeeProjectWorkingHours(
      where: {
        projectId: {_eq: $projectId}
        isDeleted: {_eq: false}
        _and: [
          {workingDate: {_gte: $dateFrom}}
          {workingDate: {_lte: $dateTo}}
        ]
      }
      orderBy: {workingDate: DESC}
    ) {
      id
      projectId
      employeeId
      workingDate
      actualWorkingHours
      employee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
    }
  }
`

/**
 * Query to get working hours grouped by employee for a project
 */
export const GET_PROJECT_CONTRIBUTORS = `
  query GetProjectContributors($projectId: uuid!, $dateFrom: date, $dateTo: date) {
    EmployeeProjectWorkingHours(
      where: {
        projectId: {_eq: $projectId}
        isDeleted: {_eq: false}
        _and: [
          {workingDate: {_gte: $dateFrom}}
          {workingDate: {_lte: $dateTo}}
        ]
      }
    ) {
      id
      employeeId
      actualWorkingHours
      employee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
      }
    }
  }
`

/**
 * Query to get working hours by week for burn rate trends
 */
export const GET_WEEKLY_WORKING_HOURS = `
  query GetWeeklyWorkingHours($projectId: uuid!, $dateFrom: date, $dateTo: date) {
    EmployeeProjectWorkingHours(
      where: {
        projectId: {_eq: $projectId}
        isDeleted: {_eq: false}
        _and: [
          {workingDate: {_gte: $dateFrom}}
          {workingDate: {_lte: $dateTo}}
        ]
      }
      orderBy: {workingDate: ASC}
    ) {
      id
      workingDate
      actualWorkingHours
    }
  }
`

/**
 * Query to get all working hours for multiple projects (for portfolio view)
 */
export const GET_ALL_PROJECTS_WORKING_HOURS = `
  query GetAllProjectsWorkingHours($projectIds: [uuid!]!, $dateFrom: date, $dateTo: date) {
    EmployeeProjectWorkingHours(
      where: {
        projectId: {_in: $projectIds}
        isDeleted: {_eq: false}
        _and: [
          {workingDate: {_gte: $dateFrom}}
          {workingDate: {_lte: $dateTo}}
        ]
      }
    ) {
      id
      projectId
      employeeId
      workingDate
      actualWorkingHours
    }
  }
`

/**
 * Query to get project managers (employees)
 */
export const GET_PROJECT_MANAGERS = `
  query GetProjectManagers($structureId: uuid!) {
    Employee(
      where: {
        isDeleted: {_eq: false}
        employeePosition: {
          structureId: {_eq: $structureId}
        }
      }
      orderBy: {lastName: ASC}
      limit: 100
    ) {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
    }
  }
`
