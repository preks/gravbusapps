import { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface HrStats {
  totalEmployees: number
  totalJobPositions: number
  totalOrganizationalUnits: number
  uniqueEmploymentTypes: number
  myPendingAbsences: number
  teamPendingAbsences: number
}

export interface UseHrStatsResult {
  stats: HrStats
  isLoading: boolean
  error: string | null
  refetch: () => void
}

// GraphQL queries for HR stats
const GET_TOTAL_EMPLOYEES = `
  query GetTotalEmployees {
    EmployeePositionAggregate(
      where: {
        _and: [
          { jobPositionId: { _isNull: false } },
          { employeeId: { _isNull: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

const GET_TOTAL_JOB_POSITIONS = `
  query GetTotalJobPositions($structureId: uuid!) {
    JobPositionAggregate(
      where: {
        _and: [
          {
            organizationalUnitEmployees: {
              structureId: { _eq: $structureId }
            }
          },
          { isDeleted: { _eq: false } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

const GET_TOTAL_ORGANIZATIONAL_UNITS = `
  query GetTotalOrganizationalUnits($structureId: uuid!) {
    OrganizationalUnitAggregate(
      where: {
        isDeleted: {_eq: false},
        structureId: {_eq: $structureId}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

const GET_UNIQUE_EMPLOYMENT_TYPES = `
  query GetUniqueEmploymentTypes {
    EmployeeWorkingConditionAggregate(
      where: {
        isDeleted: {_eq: false},
        employmentTypeRef: {_isNull: false}
      },
      distinctOn: employmentTypeRef
    ) {
      aggregate {
        count
      }
    }
  }
`

const GET_MY_PENDING_ABSENCES = `
  query GetMyPendingAbsences($employeeId: uuid!) {
    EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"},
        employee: {id: {_eq: $employeeId}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

const GET_TEAM_PENDING_ABSENCES = `
  query GetTeamPendingAbsences($supervisorId: uuid!) {
    EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const useHrStats = (context: BusinessAppContextProps): UseHrStatsResult => {
  const [stats, setStats] = useState<HrStats>({
    totalEmployees: 0,
    totalJobPositions: 0,
    totalOrganizationalUnits: 0,
    uniqueEmploymentTypes: 0,
    myPendingAbsences: 0,
    teamPendingAbsences: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchStats = async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    const employeeId = context.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      setError('Employee ID is required')
      setIsLoading(false)
      return
    }

    const structureId = getCurrentActiveStructureId()
    if (!structureId) {
      setError('Structure ID is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Execute all queries in parallel
      const [
        totalEmployeesResult,
        totalJobPositionsResult,
        totalOrganizationalUnitsResult,
        uniqueEmploymentTypesResult,
        myPendingAbsencesResult,
        teamPendingAbsencesResult
      ] = await Promise.all([
        graphqlClient.request<{ EmployeePositionAggregate: { aggregate: { count: number } } }>(GET_TOTAL_EMPLOYEES),
        graphqlClient.request<{ JobPositionAggregate: { aggregate: { count: number } } }>(GET_TOTAL_JOB_POSITIONS, {
          structureId
        }),
        graphqlClient.request<{ OrganizationalUnitAggregate: { aggregate: { count: number } } }>(
          GET_TOTAL_ORGANIZATIONAL_UNITS,
          { structureId }
        ),
        graphqlClient.request<{ EmployeeWorkingConditionAggregate: { aggregate: { count: number } } }>(
          GET_UNIQUE_EMPLOYMENT_TYPES
        ),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(GET_MY_PENDING_ABSENCES, {
          employeeId
        }),
        graphqlClient.request<{ EmployeeAbsenceAggregate: { aggregate: { count: number } } }>(
          GET_TEAM_PENDING_ABSENCES,
          { supervisorId: employeeId }
        )
      ])

      // Extract counts from results
      const totalEmployees = totalEmployeesResult.EmployeePositionAggregate?.aggregate?.count || 0
      const totalJobPositions = totalJobPositionsResult.JobPositionAggregate?.aggregate?.count || 0
      const totalOrganizationalUnits = totalOrganizationalUnitsResult.OrganizationalUnitAggregate?.aggregate?.count || 0
      const uniqueEmploymentTypes = uniqueEmploymentTypesResult.EmployeeWorkingConditionAggregate?.aggregate?.count || 0
      const myPendingAbsences = myPendingAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0
      const teamPendingAbsences = teamPendingAbsencesResult.EmployeeAbsenceAggregate?.aggregate?.count || 0

      setStats({
        totalEmployees,
        totalJobPositions,
        totalOrganizationalUnits,
        uniqueEmploymentTypes,
        myPendingAbsences,
        teamPendingAbsences
      })
    } catch (err) {
      console.error('Error fetching HR statistics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load HR statistics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (context.accessToken) {
      fetchStats()
    }
  }, [context.accessToken])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  }
}
