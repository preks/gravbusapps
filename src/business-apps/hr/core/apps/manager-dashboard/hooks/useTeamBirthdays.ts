import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import { Employee, WorkCommunication } from '../types/employee.types'
import { filterEmployeesByStartedEmployment } from '../utils/hireDateFilters'

export interface TeamBirthday {
  id: string
  userId?: string
  firstName: string
  lastName: string
  fullName: string
  birthDate: string
  pictureThumbnail?: string
  daysUntilBirthday: number
  jobPositionName?: string
  email?: string
}

export interface UseTeamBirthdaysResult {
  upcomingBirthdays: TeamBirthday[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface UseTeamBirthdaysProps {
  accessToken: string
  managerId: string
}

/**
 * Hook to fetch upcoming birthdays for team members (direct reports)
 * Based on demographic data patterns and direct reports queries
 */
export const useTeamBirthdays = ({ accessToken, managerId }: UseTeamBirthdaysProps): UseTeamBirthdaysResult => {
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<TeamBirthday[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const fetchTeamBirthdays = async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Query to get direct reports with birth dates and work communications
      const birthdaysQuery = `
        query GetTeamBirthdays($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false },
              birthDate: { _isNull: false }
            }
            orderBy: [{ firstName: ASC }, { lastName: ASC }]
          ) {
            id
            userId
            firstName
            lastName
            birthDate
            pictureThumbnail
            workingCondition {
              hireDate
            }
            employeePosition {
              jobPosition {
                name
              }
            }
            workCommunications: communication(
              where: {
                _and: [
                  { isDeleted: { _eq: false } }
                  { purpose: { _eq: "INTERNAL" } }
                  { value: { _neq: "" } }
                  { channelRef: { _eq: "CommunicationChannel:v1:e-mail" } }
                ]
              }
            ) {
              id
              value
              channel {
                value
              }
            }
          }
        }
      `

      const response = await graphQLClient.request(birthdaysQuery, {
        managerId
      })

      if (response?.Employee) {
        const employees = filterEmployeesByStartedEmployment(response.Employee)
        const today = dayjs()

        const birthdaysWithCalculations: TeamBirthday[] = employees
          .map((employee: Employee) => {
            const birthDate = dayjs(employee.birthDate)
            if (!birthDate.isValid()) return null

            const currentYear = today.year()
            const currentMonth = today.month()

            // Get this year's birthday
            const thisYearBirthday = birthDate.year(currentYear)
            if (thisYearBirthday.month() !== currentMonth) {
              return null
            }

            const daysUntilBirthday = thisYearBirthday.diff(today, 'day')

            // Extract email from work communications
            const emailComm = employee.workCommunications?.find(
              (c: WorkCommunication) =>
                c.channel?.value?.toLowerCase().includes('email') || c.channel?.value?.toLowerCase() === 'e-mail'
            )

            return {
              id: employee.id,
              userId: employee.userId,
              firstName: employee.firstName,
              lastName: employee.lastName,
              fullName: `${employee.firstName} ${employee.lastName}`,
              birthDate: employee.birthDate,
              pictureThumbnail: employee.pictureThumbnail,
              daysUntilBirthday,
              jobPositionName: employee.employeePosition?.[0]?.jobPosition?.name,
              email: emailComm?.value
            }
          })
          .filter((birthday): birthday is TeamBirthday => birthday !== null)
          // Sort by day in current month
          .sort((a: TeamBirthday, b: TeamBirthday) => dayjs(a.birthDate).date() - dayjs(b.birthDate).date())

        setUpcomingBirthdays(birthdaysWithCalculations)
      } else {
        setUpcomingBirthdays([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team birthdays'))
      console.error('Error fetching team birthdays:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamBirthdays()
  }, [managerId, accessToken])

  return {
    upcomingBirthdays,
    loading,
    error,
    refetch: fetchTeamBirthdays
  }
}
