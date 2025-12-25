/**
 * Centralized GraphQL Queries for Vacation Approval
 * All queries related to vacation entitlement, absences, and team data
 */

/**
 * Fetch employee vacation entitlement for annual leave
 */
export const GET_EMPLOYEE_VACATION_ENTITLEMENT = `
  query GetEmployeeVacationEntitlement($employeeId: uuid!, $today: timestamp!) {
    EmployeeAbsenceEntitlement(
      where: {
        employeeId: { _eq: $employeeId }
        type: { id: { _ilike: "%A001%" } }
        validFrom: { _lte: $today }
        validTo: { _gte: $today }
        isDeleted: { _eq: false }
      }
      limit: 1
    ) {
      id
      employeeId
      total
      approved
      pending
      available
      validFrom
      validTo
      type {
        id
        value
        translations {
          value
          localeCode
        }
      }
    }
  }
`

/**
 * Fetch all employee absences for a specific year
 */
export const GET_EMPLOYEE_ABSENCES_BY_YEAR = `
  query GetEmployeeAbsencesByYear($employeeId: uuid!, $yearStart: timestamp!, $yearEnd: timestamp!) {
    EmployeeAbsence(
      where: {
        employeeId: { _eq: $employeeId }
        startDate: { _gte: $yearStart }
        endDate: { _lte: $yearEnd }
        isDeleted: { _eq: false }
      }
      orderBy: { startDate: DESC }
    ) {
      id
      employeeId
      startDate
      endDate
      workingDays
      effectiveDays
      calendarDays
      status
      typeRef
      description
      type {
        id
        value
        translations {
          value
          localeCode
        }
      }
    }
  }
`

/**
 * Fetch pending employee absences (excluding specific absence)
 */
export const GET_EMPLOYEE_PENDING_ABSENCES = `
  query GetEmployeePendingAbsences($employeeId: uuid!, $excludeAbsenceId: uuid) {
    EmployeeAbsence(
      where: {
        employeeId: { _eq: $employeeId }
        status: { _in: ["PENDING", "PENDING_APPROVAL"] }
        id: { _neq: $excludeAbsenceId }
        isDeleted: { _eq: false }
      }
      orderBy: { startDate: ASC }
    ) {
      id
      employeeId
      startDate
      endDate
      workingDays
      effectiveDays
      calendarDays
      status
      typeRef
      description
      type {
        id
        value
        translations {
          value
          localeCode
        }
      }
    }
  }
`

/**
 * Fetch team absences for a specific date range
 */
export const GET_TEAM_CURRENT_ABSENCES = `
  query GetTeamCurrentAbsences($supervisorId: uuid!, $startDate: timestamp!, $endDate: timestamp!) {
    Employee(
      where: {
        employeePosition: {
          organizationalUnit: {
            supervisor: {
              supervisorId: { _eq: $supervisorId }
            }
          }
        }
        isDeleted: { _eq: false }
      }
    ) {
      id
      firstName
      lastName
      displayName
      employeePosition {
        organizationalUnit {
          name
        }
        jobPosition {
          name
        }
      }
      absences: employeeAbsences(
        where: {
          startDate: { _lte: $endDate }
          endDate: { _gte: $startDate }
          isDeleted: { _eq: false }
        }
      ) {
        id
        startDate
        endDate
        status
        typeRef
        type {
          id
          value
          translations {
            value
            localeCode
          }
        }
      }
    }
  }
`

/**
 * Fetch team sick leaves for current period
 */
export const GET_TEAM_SICK_LEAVES = `
  query GetTeamSickLeaves($supervisorId: uuid!, $startDate: timestamp!, $endDate: timestamp!) {
    Employee(
      where: {
        employeePosition: {
          organizationalUnit: {
            supervisor: {
              supervisorId: { _eq: $supervisorId }
            }
          }
        }
        isDeleted: { _eq: false }
      }
    ) {
      id
      firstName
      lastName
      displayName
      absences: employeeAbsences(
        where: {
          startDate: { _lte: $endDate }
          endDate: { _gte: $startDate }
          typeRef: { _ilike: "%A002%" }
          status: { _in: ["APPROVED", "PENDING"] }
          isDeleted: { _eq: false }
        }
      ) {
        id
        startDate
        endDate
        status
        workingDays
        type {
          id
          value
        }
      }
    }
  }
`

/**
 * Fetch approved absences for an employee in current year
 */
export const GET_APPROVED_ABSENCES_CURRENT_YEAR = `
  query GetApprovedAbsencesCurrentYear($employeeId: uuid!, $yearStart: timestamp!, $yearEnd: timestamp!) {
    EmployeeAbsence(
      where: {
        employeeId: { _eq: $employeeId }
        status: { _eq: "APPROVED" }
        startDate: { _gte: $yearStart }
        endDate: { _lte: $yearEnd }
        isDeleted: { _eq: false }
      }
      orderBy: { startDate: DESC }
    ) {
      id
      startDate
      endDate
      workingDays
      effectiveDays
      status
      typeRef
      description
      type {
        id
        value
        translations {
          value
          localeCode
        }
      }
    }
  }
`

/**
 * Fetch employee details for vacation approval
 */
export const GET_EMPLOYEE_FOR_VACATION_APPROVAL = `
  query GetEmployeeForVacationApproval($employeeId: uuid!) {
    Employee(where: { id: { _eq: $employeeId } }, limit: 1) {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
      employeePosition {
        jobPosition {
          name
        }
        organizationalUnit {
          name
        }
      }
      workingCondition {
        vacationDays
      }
    }
  }
`

/**
 * Fetch absence type details
 */
export const GET_ABSENCE_TYPE = `
  query GetAbsenceType($code: String!) {
    CatalogEntry(
      where: {
        catalog: {
          identifier: { _eq: "AbsenceType" }
          version: { _eq: "v1" }
        }
        code: { _eq: $code }
      }
      limit: 1
    ) {
      id
      value
      code
      translations {
        localeCode
        value
      }
    }
  }
`
