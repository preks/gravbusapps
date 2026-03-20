import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import { Employee, WorkCommunication } from '../types/employee.types'

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
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface UseTeamAnniversariesProps {
  accessToken: string
  managerId: string
  daysAhead?: number // Default 30 days
}

/**
 * Hook to fetch upcoming company anniversaries for team members (direct reports)
 * Based on tenure data patterns and direct reports queries
 */
export const useTeamAnniversaries = ({
  accessToken,
  managerId,
  daysAhead = 30
}: UseTeamAnniversariesProps): UseTeamAnniversariesResult => {
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<TeamAnniversary[]>([])
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

      const response = await graphQLClient.request(anniversariesQuery, {
        managerId
      })

      if (response?.Employee) {
        const today = dayjs()

        const anniversariesWithCalculations: TeamAnniversary[] = response.Employee.filter(
          (employee: Employee) => employee.workingCondition?.[0]?.hireDate
        ) // Only employees with hire dates
          .map((employee: Employee) => {
            const hireDate = dayjs(employee.workingCondition?.[0]?.hireDate)
            const currentYear = today.year()

            // Get this year's anniversary
            let thisYearAnniversary = hireDate.year(currentYear)

            // If anniversary already passed this year, check next year
            if (thisYearAnniversary.isBefore(today)) {
              thisYearAnniversary = hireDate.year(currentYear + 1)
            }

            const daysUntilAnniversary = thisYearAnniversary.diff(today, 'day')

            // Calculate years of service (will be completed years on the anniversary)
            const yearsOfService = thisYearAnniversary.diff(hireDate, 'year')

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
              hireDate: employee.workingCondition?.[0]?.hireDate,
              pictureThumbnail: employee.pictureThumbnail,
              daysUntilAnniversary,
              yearsOfService,
              jobPositionName: employee.employeePosition?.[0]?.jobPosition?.name,
              anniversaryDate: thisYearAnniversary.format('MMM D, YYYY'), // Format: Jan 15, 2025
              email: emailComm?.value
            }
          })
          // Filter to only include anniversaries within the specified range
          .filter(
            (anniversary: TeamAnniversary) =>
              anniversary.daysUntilAnniversary >= 0 &&
              anniversary.daysUntilAnniversary <= daysAhead &&
              anniversary.yearsOfService > 0 // Don't include first-year employees
          )
          // Sort by days until anniversary
          .sort((a: TeamAnniversary, b: TeamAnniversary) => a.daysUntilAnniversary - b.daysUntilAnniversary)

        setUpcomingAnniversaries(anniversariesWithCalculations)
      } else {
        setUpcomingAnniversaries([])
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
  }, [managerId, accessToken, daysAhead])

  return {
    upcomingAnniversaries,
    loading,
    error,
    refetch: fetchTeamAnniversaries
  }
}
