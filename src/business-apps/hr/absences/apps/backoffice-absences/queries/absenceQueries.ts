/**
 * GraphQL queries for Absence List and Calendar functionality
 */

export interface GetEmployeeAbsencesVariables {
  where: any
  offset: number
  limit: number
  orderBy: any[]
}

export interface EmployeeAbsence {
  id: string
  startDate: string
  endDate: string
  status: string
  calendarDays: number
  effectiveDays: number
  createdAt: string
  type: {
    id: string
    value: string
    parentEntryId: string
    parentEntry: {
      objectValue: any
      translations: Array<{
        localeCode: string
        value: string
      }>
      id: string
      value: string
    }
  }
  employee: {
    id: string
    firstName: string
    lastName: string
    employeePosition: {
      id: string
      organizationalUnit: {
        id: string
        name: string
      }
    }
  }
}

export interface EmployeeAbsenceAggregate {
  aggregate: {
    count: number
  }
}

export interface GetEmployeeAbsencesResponse {
  EmployeeAbsence: EmployeeAbsence[]
  EmployeeAbsenceAggregate: EmployeeAbsenceAggregate
}

/**
 * Query to fetch employee absences with pagination, filtering, and sorting
 */
export const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences($where: EmployeeAbsenceBoolExp!, $offset: Int!, $limit: Int!, $orderBy: [EmployeeAbsenceOrderBy!]) {
    EmployeeAbsence(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
      id
      startDate
      endDate
      status
      calendarDays
      effectiveDays
      createdAt
      type {
        id
        value
        parentEntryId
        parentEntry {
          objectValue
          translations {
            localeCode
            value
          }
          id
          value
        }
      }
      employee {
        id
        firstName
        lastName
        employeePosition {
          id
          organizationalUnit {
            id
            name
          }
        }
      }
    }
    EmployeeAbsenceAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

/**
 * Query to fetch team employees for filter dropdown
 */
export const GET_TEAM_EMPLOYEES = `
  query GetTeamEmployees {
    EmployeePosition {
      employee {
        id
        firstName
        lastName
        displayName
      }
    }
  }
`

/**
 * Query to fetch organizational units from employees for department filter
 */
export const GET_ORGANIZATIONAL_UNITS_FROM_EMPLOYEES = `
  query GetOrganizationalUnitsFromEmployees {
    Employee(
      where: {
        isDeleted: { _eq: false }
      }
      limit: 1000
    ) {
      employeePosition {
        organizationalUnit {
          id
          name
        }
      }
    }
  }
`

/**
 * Calendar-specific queries
 */

export interface CalendarEmployeePositionResponse {
  EmployeePosition: Array<{
    employee: {
      id: string
      firstName: string
      lastName: string
      pictureThumbnail?: string
    }
    organizationalUnit: {
      name: string
    }
  }>
}

export interface CalendarAbsenceResponse {
  EmployeeAbsence: Array<{
    id: string
    startDate: string
    endDate: string
    status: string
    employee: {
      id: string
      lastName: string
      firstName: string
      pictureThumbnail: string
      employeePosition: {
        organizationalUnit: {
          id: string
          name: string
        }
      }
    }
    type: {
      objectValue: string
      id: string
      value: string
      parentEntryId: string
      translations: {
        localeCode: string
        value: string
      }[]
    }
    calendarDays: number
    effectiveDays: number
  }>
}

/**
 * Query all absences for the current year (calendar view)
 */
export const getGetAllAbsencesCurrentYearQuery = () => {
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01T00:00:00.000Z`
  const endOfYear = `${currentYear}-12-31T23:59:59.999Z`

  return `
  query GetAllAbsencesCurrentYear {
    EmployeeAbsence(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          {
            _or: [
              { startDate: { _gte: "${startOfYear}", _lte: "${endOfYear}" } },
              { endDate: { _gte: "${startOfYear}", _lte: "${endOfYear}" } },
              {
                _and: [
                  { startDate: { _lte: "${startOfYear}" } },
                  { endDate: { _gte: "${endOfYear}" } }
                ]
              }
            ]
          }
        ]
      }
      limit: 1000
      orderBy: { startDate: ASC }
    ) {
      id
      startDate
      endDate
      status
      employee {
        id
        lastName
        firstName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
      type {
        objectValue
        id
        value
        parentEntryId
        translations {
          localeCode
          value
        }
      }
      calendarDays
      effectiveDays
    }
  }
`
}

/**
 * Query all employees from EmployeePosition table for organizational units
 */
export const getGetAllEmployeesFromPositionsQuery = (currentDate: string) => `
  query GetAllEmployeesFromPositions {
    EmployeePosition(
      where: {
        _and: [
          { employee: { isDeleted: { _eq: false } } },
          { 
            _or: [
              { exitDate: { _isNull: true } },
              { exitDate: { _gte: "${currentDate}" } }
            ]
          }
        ]
      }
      limit: 1000
    ) {
      employee {
        id
        firstName
        lastName
        pictureThumbnail
      }
      organizationalUnit {
        name
      }
    }
  }
`

/**
 * Query all employees from EmployeePosition table (for calendar - all departments)
 */
export const getGetAllEmployeesFromPositionsForCalendarQuery = (currentDate: string) => `
  query GetAllEmployeesFromPositions {
    EmployeePosition(
      where: {
        _and: [
          { employee: { isDeleted: { _eq: false } } },
          { 
            _or: [
              { exitDate: { _isNull: true } },
              { exitDate: { _gte: "${currentDate}" } }
            ]
          }
        ]
      }
      limit: 1000
      orderBy: { employee: { lastName: ASC } }
    ) {
      employee {
        id
        firstName
        lastName
        pictureThumbnail
      }
      organizationalUnit {
        name
      }
    }
  }
`

/**
 * Query employees from EmployeePosition table filtered by specific departments (for calendar)
 */
export const getGetEmployeesByDepartmentsQuery = (currentDate: string, departmentNames: string[]) => {
  const departmentNamesString = departmentNames.map(dept => `"${dept}"`).join(', ')

  return `
  query GetEmployeesByDepartments {
    EmployeePosition(
      where: {
        _and: [
          { employee: { isDeleted: { _eq: false } } },
          { 
            _or: [
              { exitDate: { _isNull: true } },
              { exitDate: { _gte: "${currentDate}" } }
            ]
          },
          { organizationalUnit: { name: { _in: [${departmentNamesString}] } } }
        ]
      }
      limit: 1000
      orderBy: { employee: { lastName: ASC } }
    ) {
      employee {
        id
        firstName
        lastName
        pictureThumbnail
      }
      organizationalUnit {
        name
      }
    }
  }
`
}

/**
 * Query absences for specific employees within current year (for calendar)
 */
export const getGetAbsencesForEmployeesQuery = (employeeIds: string[]) => {
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01T00:00:00.000Z`
  const endOfYear = `${currentYear}-12-31T23:59:59.999Z`
  const employeeIdsString = employeeIds.map(id => `"${id}"`).join(', ')

  return `
  query GetAbsencesForEmployees {
    EmployeeAbsence(
      where: {
        _and: [
          { isDeleted: { _eq: false } },
          { employee: { id: { _in: [${employeeIdsString}] } } },
          {
            _or: [
              { startDate: { _gte: "${startOfYear}", _lte: "${endOfYear}" } },
              { endDate: { _gte: "${startOfYear}", _lte: "${endOfYear}" } },
              {
                _and: [
                  { startDate: { _lte: "${startOfYear}" } },
                  { endDate: { _gte: "${endOfYear}" } }
                ]
              }
            ]
          }
        ]
      }
      limit: 1000
      orderBy: { startDate: ASC }
    ) {
      id
      startDate
      endDate
      status
      employee {
        id
        lastName
        firstName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
      type {
        objectValue
        id
        value
        parentEntryId
        translations {
          localeCode
          value
        }
      }
      calendarDays
      effectiveDays
    }
  }
`
}
