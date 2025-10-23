import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AbsenceQueryVariables, AbsenceOverviewResponse, AbsenceListResponse, EmployeeAbsence } from '../types'

// Base GraphQL query fragments for reusability
const EMPLOYEE_ABSENCE_FRAGMENT = `
  fragment EmployeeAbsenceDetails on EmployeeAbsence {
    id
    startDate
    endDate
    calendarDays
    effectiveDays
    status
    createdAt
    employee {
      id
      lastName
      firstName
      pictureThumbnail
      employeePosition {
        organizationalUnit {
          name
        }
      }
    }
    type {
      objectValue
      translations {
        localeCode
        value
      }
      id
      value
      parentEntryId
    }
  }
`

// Absence Overview Query (for dashboard statistics)
export const GET_ABSENCE_OVERVIEW = (): string => {
  return `
    query GetAbsenceOverview($orgUnitId: uuid!, $todayDate: timestamp!, $lastDayOfYear: timestamp!) {
      allAbsencesFromToday: EmployeeAbsence(
        orderBy: {startDate: ASC}, 
        limit: 5, 
        where: {
          status: {_in: ["PENDING", "APPROVED"]}, 
          startDate: {_gte: $todayDate}, 
          endDate: {_lte: $lastDayOfYear}, 
          isDeleted: {_eq: false},
          employee: {employeePosition: {organizationalUnitId: {_eq: $orgUnitId}}}
        }
      ) {
        ...EmployeeAbsenceDetails
      }
      membersAway: EmployeeAbsence(
        orderBy: {startDate: ASC}, 
        where: {
          status: {_in: ["PENDING", "APPROVED"]}, 
          startDate: {_lte: $todayDate}, 
          endDate: {_gte: $todayDate},
          isDeleted: {_eq: false},
          employee: {employeePosition: {organizationalUnitId: {_eq: $orgUnitId}}}
        }
      ) {
        ...EmployeeAbsenceDetails
      }
      approvedAbsences: EmployeeAbsenceAggregate(
        where: {
          isDeleted: {_eq: false}, 
          status: {_in: ["APPROVED"]}, 
          startDate: {_lte: $todayDate},
          endDate: {_gte: $todayDate},
          employee: {employeePosition: {organizationalUnitId: {_eq: $orgUnitId}}}
        }
      ) {
        aggregate {
          sum {
            effectiveDays
          }
        }
      }
      pendingRequests: EmployeeAbsenceAggregate(
        where: {
          isDeleted: {_eq: false}, 
          status: {_in: ["PENDING"]}, 
          employee: {employeePosition: {organizationalUnitId: {_eq: $orgUnitId}}}
        }
      ) {
        aggregate {
          sum {
            effectiveDays
          }
        }
      }
    }
    ${EMPLOYEE_ABSENCE_FRAGMENT}
  `
}

// Employee Absences List Query (for table view)
export const GET_EMPLOYEE_ABSENCES = (): string => {
  return `
    query GetEmployeeAbsences($offset: Int!, $limit: Int!, $orgUnitId: uuid!, $where: EmployeeAbsenceBoolExp, $orderBy: [EmployeeAbsenceOrderBy!]) {
      EmployeeAbsence(
        offset: $offset
        limit: $limit
        where: $where
        orderBy: $orderBy
      ) {
        ...EmployeeAbsenceDetails
      }
      EmployeeAbsenceAggregate(
        where: $where
      ) {
        aggregate {
          count
        }
      }
    }
    ${EMPLOYEE_ABSENCE_FRAGMENT}
  `
}

// Calendar Absences Query (for supervisor view)
export const GET_SUPERVISOR_ABSENCES = (): string => {
  return `
    query GetSupervisorAbsences($offset: Int!, $limit: Int!, $supervisorId: uuid!) {
      EmployeeAbsenceAggregate(
        where: {employee: {employeePosition: {supervisorEmployeeId: {_eq: $supervisorId}}}}
      ) {
        aggregate {
          count
        }
      }
      EmployeeAbsence(
        offset: $offset
        limit: $limit
        where: {employee: {employeePosition: {supervisorEmployeeId: {_eq: $supervisorId}}}}
        orderBy: {startDate: ASC}
      ) {
        ...EmployeeAbsenceDetails
      }
    }
    ${EMPLOYEE_ABSENCE_FRAGMENT}
  `
}

// Supervisor Absences List Query with filtering and sorting (for table view)
export const GET_SUPERVISOR_ABSENCES_WITH_FILTERS = (): string => {
  return `
    query GetSupervisorAbsencesWithFilters($offset: Int!, $limit: Int!, $where: EmployeeAbsenceBoolExp, $orderBy: [EmployeeAbsenceOrderBy!]) {
      EmployeeAbsence(
        offset: $offset
        limit: $limit
        where: $where
        orderBy: $orderBy
      ) {
        ...EmployeeAbsenceDetails
      }
      EmployeeAbsenceAggregate(
        where: $where
      ) {
        aggregate {
          count
        }
      }
    }
    ${EMPLOYEE_ABSENCE_FRAGMENT}
  `
}

// Simple query for calendar timeline (matches your provided structure)
export const GET_ABSENCES_FOR_CALENDAR = (): string => {
  return `
    query GetAbsences($supervisorId: uuid!) {
      Employee(
        where: { employeePosition: { supervisorEmployeeId: { _eq: $supervisorId } } }
        orderBy: { firstName: ASC }
      ) {
        id
        firstName
        lastName
        employeePosition {
          organizationalUnit {
            name
          }
        }
      }
      EmployeeAbsence(
        where: {
          _and: [
            { employee: { employeePosition: { supervisorEmployeeId: { _eq: $supervisorId } } } },
            { isDeleted: { _eq: false } }
          ]
        }
        orderBy: { startDate: ASC }
      ) {
        id
        startDate
        endDate
        status
        effectiveDays
        employee {
          id
          firstName
          lastName
        }
        type {
          value
          objectValue
          translations {
            localeCode
            value
          }
        }
      }
    }
  `
}

// KPI Data Query (for charts and analytics)
export const GET_ABSENCE_KPI_DATA = (): string => {
  return `
    query GetAbsenceKPIData($orgUnitId: uuid!) {
      EmployeeAbsence(
        limit: 1000
        where: {
          employee: {employeePosition: {organizationalUnitId: {_eq: $orgUnitId}}}
          isDeleted: {_eq: false}
        }
        orderBy: {startDate: ASC}
      ) {
        ...EmployeeAbsenceDetails
      }
    }
    ${EMPLOYEE_ABSENCE_FRAGMENT}
  `
}

// Hook for fetching absence overview data
export const useGetAbsenceOverview = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAbsenceOverview = async (orgUnitId: string): Promise<AbsenceOverviewResponse> => {
    const todayDate = new Date().toISOString().split('T')[0] + ' 00:00:00+00'
    const currentYear = new Date().getFullYear()
    const lastDayOfYear = `${currentYear}-12-31 23:59:59+00`

    const query = GET_ABSENCE_OVERVIEW()
    try {
      const result = await graphqlClient.request<AbsenceOverviewResponse>(query, {
        orgUnitId,
        todayDate,
        lastDayOfYear
      })
      return result
    } catch (error) {
      console.error('Error fetching absence overview:', error)
      throw error
    }
  }

  return { fetchAbsenceOverview }
}

// Hook for fetching employee absences list
export const useGetEmployeeAbsences = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEmployeeAbsences = async (variables: AbsenceQueryVariables): Promise<AbsenceListResponse> => {
    // Build where clause
    const baseWhere = {
      isDeleted: { _eq: false },
      employee: { employeePosition: { organizationalUnitId: { _eq: variables.orgUnitId } } }
    }

    const whereClause = variables.where ? { _and: [baseWhere, variables.where] } : baseWhere

    const query = GET_EMPLOYEE_ABSENCES()
    try {
      const result = await graphqlClient.request<AbsenceListResponse>(query, {
        ...variables,
        where: whereClause,
        orderBy: variables.orderBy || [{ startDate: 'DESC_NULLS_LAST' }]
      })
      return result
    } catch (error) {
      console.error('Error fetching employee absences:', error)
      throw error
    }
  }

  return { fetchEmployeeAbsences }
}

// Hook for fetching supervisor absences (calendar view)
export const useGetSupervisorAbsences = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchSupervisorAbsences = async (
    variables: AbsenceQueryVariables
  ): Promise<{
    EmployeeAbsenceAggregate: { aggregate: { count: number } }
    EmployeeAbsence: EmployeeAbsence[]
  }> => {
    const query = GET_SUPERVISOR_ABSENCES()
    try {
      const result = await graphqlClient.request<{
        EmployeeAbsenceAggregate: { aggregate: { count: number } }
        EmployeeAbsence: EmployeeAbsence[]
      }>(query, variables)
      return result
    } catch (error) {
      console.error('Error fetching supervisor absences:', error)
      throw error
    }
  }

  return { fetchSupervisorAbsences }
}

// Hook for fetching KPI data
export const useGetAbsenceKPIData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAbsenceKPIData = async (orgUnitId: string): Promise<{ EmployeeAbsence: EmployeeAbsence[] }> => {
    const query = GET_ABSENCE_KPI_DATA()
    try {
      const result = await graphqlClient.request<{ EmployeeAbsence: EmployeeAbsence[] }>(query, {
        orgUnitId
      })
      return result
    } catch (error) {
      console.error('Error fetching absence KPI data:', error)
      throw error
    }
  }

  return { fetchAbsenceKPIData }
}
