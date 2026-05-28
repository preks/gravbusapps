export interface GetEmployeeAbsencesVariables {
  where: any
  offset: number
  limit: number
  orderBy: any[]
}

export interface EmployeeAbsence {
  description?: string | null
  id: string
  version?: number | null
  businessKey?: string | null
  recordState?: string | null
  activeTo?: string | null
  additionalProperties?: unknown | null
  employeeId?: string | null
  startDate: string
  endDate: string
  status: string
  typeRef?: string | null
  cutHalfDayStart?: boolean | null
  cutHalfDayEnd?: boolean | null
  workingDays?: number | null
  workingHours?: number | null
  calendarDays: number
  effectiveDays: number
  balance?: number | null
  reason?: string | null
  relative?: string | null
  attachment?: string | null
  approverId?: string | null
  approvalNote?: string | null
  substituteEmployeeId?: string | null
  employeeDocumentId?: string | null
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
    displayName?: string | null
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

export const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences($where: EmployeeAbsenceBoolExp!, $offset: Int!, $limit: Int!, $orderBy: [EmployeeAbsenceOrderBy!]) {
    EmployeeAbsence(where: $where, offset: $offset, limit: $limit, orderBy: $orderBy) {
      description
      id
      version
      businessKey
      recordState
      activeTo
      additionalProperties
      employeeId
      startDate
      endDate
      status
      typeRef
      cutHalfDayStart
      cutHalfDayEnd
      workingDays
      workingHours
      calendarDays
      effectiveDays
      balance
      reason
      relative
      attachment
      approverId
      approvalNote
      substituteEmployeeId
      employeeDocumentId
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
        displayName
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

export interface GetEmployeesByIdsResponse {
  Employee: Array<{
    id: string
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
  }>
}

export const GET_EMPLOYEES_BY_IDS = `
  query GetEmployeesByIds($employeeIds: [uuid!]!) {
    Employee(where: { id: { _in: $employeeIds }, isDeleted: { _eq: false } }) {
      id
      firstName
      lastName
      displayName
    }
  }
`

export const GET_TEAM_EMPLOYEES_AND_ORG_UNITS = `
  query GetTeamEmployeesAndOrgUnits {
    EmployeePosition {
      employee {
        id
        firstName
        lastName
        displayName
      }
      organizationalUnit {
        id
        name
      }
    }
  }
`

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

export interface CalendarEmployeesWithAbsencesResponse {
  employees: Array<{
    employee: {
      id: string
      firstName: string
      lastName: string
      pictureThumbnail?: string
      employeePosition: {
        organizationalUnit: {
          id: string
          name: string
        }
      }
    }
    organizationalUnit: {
      name: string
    }
  }>
  absences: Array<{
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

export const getGetAllEmployeesWithAbsencesQuery = (currentDate: string) => {
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01T00:00:00.000Z`
  const endOfYear = `${currentYear}-12-31T23:59:59.999Z`

  return `
  query GetAllEmployeesWithAbsences {
    employees: EmployeePosition(
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
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
      organizationalUnit {
        name
      }
    }
    absences: EmployeeAbsence(
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

export const getGetEmployeesWithAbsencesByDepartmentsQuery = (currentDate: string, departmentNames: string[]) => {
  const currentYear = new Date().getFullYear()
  const startOfYear = `${currentYear}-01-01T00:00:00.000Z`
  const endOfYear = `${currentYear}-12-31T23:59:59.999Z`
  const departmentNamesString = departmentNames.map(dept => `"${dept}"`).join(', ')

  return `
  query GetEmployeesWithAbsencesByDepartments {
    employees: EmployeePosition(
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
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
      organizationalUnit {
        name
      }
    }
    absences: EmployeeAbsence(
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
