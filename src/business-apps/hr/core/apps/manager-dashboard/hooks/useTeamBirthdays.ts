import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import { Employee, WorkCommunication } from '../types/employee.types'

export interface TeamBirthday {
  id: string
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
  daysAhead?: number // Default 30 days
}

/**
 * Hook to fetch upcoming birthdays for team members (direct reports)
 * Based on demographic data patterns and direct reports queries
 */
export const useTeamBirthdays = ({
  accessToken,
  managerId,
  daysAhead = 30
}: UseTeamBirthdaysProps): UseTeamBirthdaysResult => {
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
            firstName
            lastName
            birthDate
            pictureThumbnail
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
        const today = dayjs()

        const birthdaysWithCalculations: TeamBirthday[] = response.Employee.map((employee: Employee) => {
          const birthDate = dayjs(employee.birthDate)
          const currentYear = today.year()

          // Get this year's birthday
          let thisYearBirthday = birthDate.year(currentYear)

          // If birthday already passed this year, check next year
          if (thisYearBirthday.isBefore(today)) {
            thisYearBirthday = birthDate.year(currentYear + 1)
          }

          const daysUntilBirthday = thisYearBirthday.diff(today, 'day')

          // Extract email from work communications
          const emailComm = employee.workCommunications?.find(
            (c: WorkCommunication) =>
              c.channel?.value?.toLowerCase().includes('email') || c.channel?.value?.toLowerCase() === 'e-mail'
          )

          return {
            id: employee.id,
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
          // Filter to only include birthdays within the specified range
          .filter(
            (birthday: TeamBirthday) => birthday.daysUntilBirthday >= 0 && birthday.daysUntilBirthday <= daysAhead
          )
          // Sort by days until birthday
          .sort((a: TeamBirthday, b: TeamBirthday) => a.daysUntilBirthday - b.daysUntilBirthday)

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
  }, [managerId, accessToken, daysAhead])

  return {
    upcomingBirthdays,
    loading,
    error,
    refetch: fetchTeamBirthdays
  }
}
