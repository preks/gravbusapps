import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import { Employee } from '../types/employee.types'
import { filterEmployeesByStartedEmployment } from '../utils/hireDateFilters'
import { extractEmployeeEmail, WORK_COMMUNICATIONS_FRAGMENT } from '../utils/peopleMomentsHelpers'

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
  nextMonthBirthdays: TeamBirthday[]
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
  const [nextMonthBirthdays, setNextMonthBirthdays] = useState<TeamBirthday[]>([])
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
            ${WORK_COMMUNICATIONS_FRAGMENT}
          }
        }
      `

      const response = await graphQLClient.request(birthdaysQuery, {
        managerId
      })

      if (response?.Employee) {
        const employees = filterEmployeesByStartedEmployment(response.Employee)
        const today = dayjs()
        const currentMonth = today.month()
        const nextMonth = today.add(1, 'month').month()
        const nextMonthYear = today.add(1, 'month').year()

        const currentMonthList: TeamBirthday[] = []
        const nextMonthList: TeamBirthday[] = []

        employees.forEach((employee: Employee) => {
          const birthDate = dayjs(employee.birthDate)
          if (!birthDate.isValid()) return

          const baseBirthday: TeamBirthday = {
            id: employee.id,
            userId: employee.userId,
            firstName: employee.firstName,
            lastName: employee.lastName,
            fullName: `${employee.firstName} ${employee.lastName}`,
            birthDate: employee.birthDate,
            pictureThumbnail: employee.pictureThumbnail,
            daysUntilBirthday: 0,
            jobPositionName: employee.employeePosition?.[0]?.jobPosition?.name,
            email: extractEmployeeEmail(employee.workCommunications)
          }

          const thisYearBirthday = birthDate.year(today.year())
          if (thisYearBirthday.month() === currentMonth) {
            currentMonthList.push({ ...baseBirthday, daysUntilBirthday: thisYearBirthday.diff(today, 'day') })
          }

          const nextMonthBirthday = birthDate.year(nextMonthYear)
          if (nextMonthBirthday.month() === nextMonth) {
            nextMonthList.push({ ...baseBirthday, daysUntilBirthday: nextMonthBirthday.diff(today, 'day') })
          }
        })

        const sortByDay = (a: TeamBirthday, b: TeamBirthday) => dayjs(a.birthDate).date() - dayjs(b.birthDate).date()
        setUpcomingBirthdays(currentMonthList.toSorted(sortByDay))
        setNextMonthBirthdays(nextMonthList.toSorted(sortByDay))
      } else {
        setUpcomingBirthdays([])
        setNextMonthBirthdays([])
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
    nextMonthBirthdays,
    loading,
    error,
    refetch: fetchTeamBirthdays
  }
}
