import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import { Employee } from '../types/employee.types'
import { filterEmployeesByStartedEmployment } from '../utils/hireDateFilters'
import { extractEmployeeEmail, WORK_COMMUNICATIONS_FRAGMENT } from '../utils/peopleMomentsHelpers'

export interface TeamAnniversary {
  id: string
  userId?: string
  firstName: string
  lastName: string
  fullName: string
  hireDate: string
  pictureThumbnail?: string
  daysUntilAnniversary: number
  yearsOfService: number
  jobPositionName?: string
  anniversaryDate: string // Formatted date of the anniversary
  email?: string
}

export interface UseTeamAnniversariesResult {
  upcomingAnniversaries: TeamAnniversary[]
  nextMonthAnniversaries: TeamAnniversary[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface UseTeamAnniversariesProps {
  accessToken: string
  managerId: string
}

/**
 * Hook to fetch upcoming company anniversaries for team members (direct reports)
 * Based on tenure data patterns and direct reports queries
 */
export const useTeamAnniversaries = ({
  accessToken,
  managerId
}: UseTeamAnniversariesProps): UseTeamAnniversariesResult => {
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<TeamAnniversary[]>([])
  const [nextMonthAnniversaries, setNextMonthAnniversaries] = useState<TeamAnniversary[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const fetchTeamAnniversaries = async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Query to get direct reports with hire dates and work communications
      const anniversariesQuery = `
        query GetTeamAnniversaries($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
            orderBy: [{ firstName: ASC }, { lastName: ASC }]
          ) {
            id
            userId
            firstName
            lastName
            pictureThumbnail
            employeePosition {
              jobPosition {
                name
              }
            }
            workingCondition {
              hireDate
            }
            ${WORK_COMMUNICATIONS_FRAGMENT}
          }
        }
      `

      const response = await graphQLClient.request(anniversariesQuery, {
        managerId
      })

      if (response?.Employee) {
        const employees = filterEmployeesByStartedEmployment(response.Employee)
        const today = dayjs()
        const currentMonth = today.month()
        const nextMonthDate = today.add(1, 'month')
        const nextMonth = nextMonthDate.month()
        const nextMonthYear = nextMonthDate.year()

        const currentMonthList: TeamAnniversary[] = []
        const nextMonthList: TeamAnniversary[] = []

        employees
          .filter((employee: Employee) => employee.workingCondition?.[0]?.hireDate)
          .forEach((employee: Employee) => {
            const hireDate = dayjs(employee.workingCondition?.[0]?.hireDate)
            if (!hireDate.isValid()) return

            const buildAnniversary = (targetYear: number): TeamAnniversary | null => {
              const anniversary = hireDate.year(targetYear)
              const yearsOfService = anniversary.diff(hireDate, 'year')
              if (yearsOfService <= 0) return null
              return {
                id: employee.id,
                userId: employee.userId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                fullName: `${employee.firstName} ${employee.lastName}`,
                hireDate: employee.workingCondition?.[0]?.hireDate,
                pictureThumbnail: employee.pictureThumbnail,
                daysUntilAnniversary: anniversary.diff(today, 'day'),
                yearsOfService,
                jobPositionName: employee.employeePosition?.[0]?.jobPosition?.name,
                anniversaryDate: anniversary.format('MMM D, YYYY'),
                email: extractEmployeeEmail(employee.workCommunications)
              }
            }

            const thisYearAnniversary = hireDate.year(today.year())
            if (thisYearAnniversary.month() === currentMonth) {
              const entry = buildAnniversary(today.year())
              if (entry) currentMonthList.push(entry)
            }

            const nextMonthAnniversary = hireDate.year(nextMonthYear)
            if (nextMonthAnniversary.month() === nextMonth) {
              const entry = buildAnniversary(nextMonthYear)
              if (entry) nextMonthList.push(entry)
            }
          })

        const sortByDay = (a: TeamAnniversary, b: TeamAnniversary) =>
          dayjs(a.hireDate).date() - dayjs(b.hireDate).date()
        setUpcomingAnniversaries(currentMonthList.toSorted(sortByDay))
        setNextMonthAnniversaries(nextMonthList.toSorted(sortByDay))
      } else {
        setUpcomingAnniversaries([])
        setNextMonthAnniversaries([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team anniversaries'))
      console.error('Error fetching team anniversaries:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamAnniversaries()
  }, [managerId, accessToken])

  return {
    upcomingAnniversaries,
    nextMonthAnniversaries,
    loading,
    error,
    refetch: fetchTeamAnniversaries
  }
}
