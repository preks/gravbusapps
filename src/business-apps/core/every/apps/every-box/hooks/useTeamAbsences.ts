/**
 * Hook for fetching team absences for the current user's direct reports
 * Used in EveryBox task details to show team coverage during absence approvals
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface TeamAbsence {
  id: string
  startDate: string
  endDate: string
  status: string
  effectiveDays?: number
  type: {
    value: string
    objectValue?: any
    translations?: Array<{
      localeCode: string
      value: string
    }>
  }
  employee: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface TeamEmployee {
  id: string
  firstName: string
  lastName: string
  displayName?: string
  employeePosition?: {
    organizationalUnit?: {
      name: string
    }
  }
}

interface UseTeamAbsencesProps {
  accessToken: string
  supervisorId?: string
  startDate?: string
  endDate?: string
}

interface UseTeamAbsencesReturn {
  employees: TeamEmployee[]
  absences: TeamAbsence[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetch team members and their absences within a date range
 */
export const useTeamAbsences = ({
  accessToken,
  supervisorId,
  startDate,
  endDate
}: UseTeamAbsencesProps): UseTeamAbsencesReturn => {
  const [employees, setEmployees] = useState<TeamEmployee[]>([])
  const [absences, setAbsences] = useState<TeamAbsence[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchTeamAbsences = useCallback(async () => {
    if (!supervisorId || !accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = `
    query GetTeamAbsences($supervisorId: uuid!) {
      Employee(
        where: { 
          employeePosition: { supervisorEmployeeId: { _eq: $supervisorId } },
          isDeleted: { _eq: false }
        }
        orderBy: { firstName: ASC }
        limit: 100
      ) {
        id
        firstName
        lastName
        displayName
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
        limit: 200
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

      const result = await graphqlClient.request<{
        Employee: TeamEmployee[]
        EmployeeAbsence: TeamAbsence[]
      }>(query, {
        supervisorId
      })

      setEmployees(result.Employee || [])
      setAbsences(result.EmployeeAbsence || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team absences')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, supervisorId, startDate, endDate, accessToken])

  useEffect(() => {
    fetchTeamAbsences()
  }, [fetchTeamAbsences])

  return {
    employees,
    absences,
    isLoading,
    error,
    refetch: fetchTeamAbsences
  }
}
