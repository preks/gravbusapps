import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  fullName: string
  pictureThumbnail?: string
  jobPositionName?: string
  isAvailable: boolean
  currentAbsence?: {
    type: string
    startDate: string
    endDate: string
    status: string
  }
}

export interface TeamAvailabilityData {
  totalMembers: number
  availableCount: number
  unavailableCount: number
  availabilityPercentage: number
  members: TeamMember[]
}

interface UseTeamAvailabilityProps {
  accessToken: string
  managerId: string
}

interface UseTeamAvailabilityResult {
  data: TeamAvailabilityData | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to calculate team availability based on today's absences
 */
export const useTeamAvailability = ({
  accessToken,
  managerId
}: UseTeamAvailabilityProps): UseTeamAvailabilityResult => {
  const [data, setData] = useState<TeamAvailabilityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const fetchTeamAvailability = useCallback(async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const todayTimestamp = dayjs().startOf('day').toISOString()

      // Query to get direct reports with their absences
      const teamAvailabilityQuery = `
        query GetTeamAvailability($managerId: uuid!, $todayTimestamp: timestamp!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
            orderBy: [{ firstName: ASC }, { lastName: ASC }]
          ) {
            id
            firstName
            lastName
            pictureThumbnail
            employeePosition {
              jobPosition {
                name
              }
            }
            absences: employeeAbsence(
              where: {
                isDeleted: { _eq: false },
                status: { _eq: "APPROVED" },
                startDate: { _lte: $todayTimestamp },
                endDate: { _gte: $todayTimestamp }
              }
            ) {
              id
              startDate
              endDate
              status
              type {
                value
              }
            }
          }
        }
      `

      const response = await graphQLClient.request(teamAvailabilityQuery, {
        managerId,
        todayTimestamp
      })

      if (response?.Employee) {
        const members: TeamMember[] = response.Employee.map((employee: any) => {
          const currentAbsence = employee.absences?.[0]
          const isAvailable = !currentAbsence

          return {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            fullName: `${employee.firstName} ${employee.lastName}`,
            pictureThumbnail: employee.pictureThumbnail,
            jobPositionName: employee.employeePosition?.[0]?.jobPosition?.name,
            isAvailable,
            currentAbsence: currentAbsence
              ? {
                  type: currentAbsence.type?.value || 'Leave',
                  startDate: currentAbsence.startDate,
                  endDate: currentAbsence.endDate,
                  status: currentAbsence.status
                }
              : undefined
          }
        })

        const availableCount = members.filter(m => m.isAvailable).length
        const unavailableCount = members.length - availableCount
        const availabilityPercentage = members.length > 0 ? Math.round((availableCount / members.length) * 100) : 100

        setData({
          totalMembers: members.length,
          availableCount,
          unavailableCount,
          availabilityPercentage,
          members
        })
      } else {
        setData({
          totalMembers: 0,
          availableCount: 0,
          unavailableCount: 0,
          availabilityPercentage: 100,
          members: []
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team availability'))
      console.error('Error fetching team availability:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, graphQLClient])

  useEffect(() => {
    fetchTeamAvailability()
  }, [fetchTeamAvailability])

  return {
    data,
    loading,
    error,
    refetch: fetchTeamAvailability
  }
}
