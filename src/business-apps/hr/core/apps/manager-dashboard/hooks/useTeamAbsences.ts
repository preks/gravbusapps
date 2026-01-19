import { useCallback, useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { Teammate } from '@/common/hooks/useTeammates'

interface UseTeamAbsencesProps {
  teammates: Teammate[]
  accessToken: string
}

export interface TeamAbsence {
  id: string
  description?: string
  startDate: string
  endDate: string
  status?: string
  type: {
    value: string
    objectValue?: unknown // Can be various types based on catalog configuration
  }
  employee: {
    id: string
    firstName: string
    lastName: string
  }
}

/**
 * Custom hook for fetching absences for multiple employees (teammates)
 * @param teammates - Array of teammates to fetch absences for
 * @param accessToken - Access token for authorization
 * @returns Object containing team absences data, loading state, and error state
 */
export function useTeamAbsences({ teammates, accessToken }: UseTeamAbsencesProps) {
  const client = useGraphqlClient(accessToken)
  const [absences, setAbsences] = useState<TeamAbsence[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Define the fetch function for reuse
  const fetchTeamAbsences = useCallback(async () => {
    if (!teammates?.length || !client) return

    const employeeIds = teammates.map(teammate => teammate.id)
    employeeIds.push('fc3e39df-db3b-4f17-b64e-0f4aac2c35ba')
    if (employeeIds.length === 0) {
      setAbsences([])
      return
    }

    setLoading(true)
    setError(null)

    // GraphQL query that supports multiple employee IDs using _in operator
    // Based on working query example, with limit instead of order_by
    const TEAM_ABSENCES_QUERY = `
      query GetTeamAbsences($employeeIds: [uuid!]!) {
        EmployeeAbsence(
          where: { 
            employee: { id: { _in: $employeeIds } }
          },
          limit: 50
        ) {
          id
          description
          startDate
          endDate
          status
          type {
            value
            objectValue
          }
          employee {
            id
            firstName
            lastName
          }
        }
      }
    `

    try {
      const data = await client.request(TEAM_ABSENCES_QUERY, { employeeIds })

      if (data && data.EmployeeAbsence) {
        // Sort absences by startDate since we can't use order_by in the query
        const sortedAbsences = [...data.EmployeeAbsence].sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
        setAbsences(sortedAbsences)
      } else {
        setAbsences([])
      }
    } catch (err) {
      console.error('Error fetching team absences:', err)
      setError(err as Error)
      setAbsences([])
    } finally {
      setLoading(false)
    }
  }, [client, teammates])

  // Initial fetch
  useEffect(() => {
    fetchTeamAbsences()
  }, [fetchTeamAbsences])

  return {
    absences,
    loading,
    error,
    refetch: fetchTeamAbsences
  }
}
