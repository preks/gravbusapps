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

interface EmployeeAbsenceResponse {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  status: string
  type?: {
    value: string
  }
}

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

      const employeesQuery = `
        query GetTeamMembers($managerId: uuid!) {
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
          }
        }
      `

      const absencesQuery = `
        query GetTeamAbsences($employeeIds: [uuid!]!, $todayTimestamp: timestamp!) {
          EmployeeAbsence(
            where: {
              employeeId: { _in: $employeeIds },
              isDeleted: { _eq: false },
              status: { _eq: "APPROVED" },
              startDate: { _lte: $todayTimestamp },
              endDate: { _gte: $todayTimestamp }
            }
          ) {
            id
            employeeId
            startDate
            endDate
            status
            type {
              value
            }
          }
        }
      `

      const employeesResponse = await graphQLClient.request(employeesQuery, { managerId })

      if (employeesResponse?.Employee && employeesResponse.Employee.length > 0) {
        const employees = employeesResponse.Employee
        const employeeIds = employees.map((emp: { id: string }) => emp.id)

        let absencesData: EmployeeAbsenceResponse[] = []
        if (employeeIds.length > 0) {
          try {
            const absencesResponse = await graphQLClient.request(absencesQuery, {
              employeeIds,
              todayTimestamp
            })
            absencesData = absencesResponse?.EmployeeAbsence || []
          } catch (error_) {
            console.warn('Could not fetch absence data:', error_)
          }
        }

        const absencesByEmployee = absencesData.reduce(
          (acc: Record<string, EmployeeAbsenceResponse>, absence: EmployeeAbsenceResponse) => {
            if (!acc[absence.employeeId]) {
              acc[absence.employeeId] = absence
            }
            return acc
          },
          {}
        )

        const members: TeamMember[] = employees.map((employee: any) => {
          const currentAbsence = absencesByEmployee[employee.id]
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
