import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { TeamAllocation } from '../types'
import dayjs from 'dayjs'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'

interface EmployeeMatrixUnitResponse {
  EmployeeMatrixUnit: Array<{
    id: string
    employeeId: string
    matrixUnitId: string
    percentage: number
    matrixUnit: {
      id: string
      name: string
    }
  }>
}

interface EmployeeAttendanceResponse {
  EmployeeAttendance: Array<{
    id: string
    attendanceDate: string
    effectiveTime: string
  }>
}

interface EmployeeProjectWorkingHoursResponse {
  EmployeeProjectWorkingHours: Array<{
    id: string
    workingDate: string
    projectId: string
    version: number
    actualWorkingHours: string
  }>
}

/**
 * Parse duration text like "4h 15m" or "8h" into hours (decimal)
 */
const parseEffectiveTimeToHours = (text?: string): number => {
  if (!text) return 0
  let hours = 0
  let minutes = 0
  const tokens = String(text).trim().split(/\s+/)
  for (const token of tokens) {
    if (/^\d+h$/i.test(token)) {
      hours = Number.parseInt(token.slice(0, -1), 10) || 0
    } else if (/^\d+m$/i.test(token)) {
      minutes = Number.parseInt(token.slice(0, -1), 10) || 0
    }
  }
  return hours + minutes / 60
}

/**
 * GraphQL query to get employee's team allocations
 */
const GET_EMPLOYEE_TEAM_ALLOCATIONS = `
  query GetEmployeeTeamAllocations($employeeId: uuid!, $structureId: uuid!) {
    EmployeeMatrixUnit(
      where: {
        employeeId: {_eq: $employeeId}
        structureId: {_eq: $structureId}
      }
    ) {
      id
      employeeId
      matrixUnitId
      percentage
      matrixUnit {
        id
        name
      }
    }
  }
`

/**
 * GraphQL query to get employee attendance for current month
 */
const GET_EMPLOYEE_ATTENDANCE = `
  query GetEmployeeAttendance($employeeId: uuid!, $dateFrom: date!, $dateTo: date!) {
    EmployeeAttendance(
      where: {
        employeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
        attendanceDate: {_gte: $dateFrom, _lte: $dateTo}
        endTime: {_isNull: false}
      }
      orderBy: {startTime: DESC, attendanceDate: DESC}
    ) {
      id
      attendanceDate
      effectiveTime
    }
  }
`

/**
 * GraphQL query to get employee project working hours for a week
 */
const GET_EMPLOYEE_PROJECT_WORKING_HOURS = `
  query GetEmployeeProjectWorkingHours($employeeId: uuid!, $workingDates: [date!]!) {
    EmployeeProjectWorkingHours(
      where: {
        employeeId: {_eq: $employeeId}
        workingDate: {_in: $workingDates}
        isDeleted: {_eq: false}
      }
    ) {
      id
      workingDate
      projectId
      version
      actualWorkingHours
    }
  }
`

/**
 * Hook to fetch employee's team allocations (matrix units)
 * In the future, this will also filter by projectAssignmentId when team-project relationship is implemented
 */
export const useEmployeeTeamAllocations = ({
  accessToken,
  employeeId
}: {
  accessToken: string
  employeeId: string
}) => {
  const [allocations, setAllocations] = useState<TeamAllocation[]>([])
  const [recordedHoursByDate, setRecordedHoursByDate] = useState<Record<string, number>>({})
  const [bookedHours, setBookedHours] = useState<
    Record<string, { id: string; version: number; hours: number; projectId: string }>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphqlClient(accessToken)
  const restClient = useRestClient(env('NEXT_PUBLIC_BASE_URL') || '')

  const structureId = getCurrentActiveStructureId()

  const fetchTeamAllocations = useCallback(async () => {
    if (!employeeId || !structureId) {
      setError('Employee ID or Structure ID is missing')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch team allocations
      const response = await graphqlClient.request<EmployeeMatrixUnitResponse>(GET_EMPLOYEE_TEAM_ALLOCATIONS, {
        employeeId,
        structureId
      })

      if (response.EmployeeMatrixUnit) {
        const transformedAllocations: TeamAllocation[] = response.EmployeeMatrixUnit.map(item => ({
          teamId: item.matrixUnitId,
          teamName: item.matrixUnit.name,
          percentage: item.percentage,
          // projectId and projectName will be added when BE implements team-project relationship
          projectId: undefined,
          projectName: undefined
        }))

        setAllocations(transformedAllocations)
      } else {
        setAllocations([])
      }

      // Fetch attendance for current month
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      const attendanceResponse = await graphqlClient.request<EmployeeAttendanceResponse>(GET_EMPLOYEE_ATTENDANCE, {
        employeeId,
        dateFrom: dayjs(monthStart).format('YYYY-MM-DD'),
        dateTo: dayjs(monthEnd).format('YYYY-MM-DD')
      })

      // Group attendance by date and sum effective hours
      const hoursByDate: Record<string, number> = {}
      if (attendanceResponse.EmployeeAttendance) {
        for (const attendance of attendanceResponse.EmployeeAttendance) {
          const date = attendance.attendanceDate
          const hours = parseEffectiveTimeToHours(attendance.effectiveTime)
          if (hoursByDate[date]) {
            hoursByDate[date] += hours
          } else {
            hoursByDate[date] = hours
          }
        }
      }
      setRecordedHoursByDate(hoursByDate)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team allocations'
      setError(errorMessage)
      console.error('Error fetching employee team allocations:', err)
      setAllocations([])
      setRecordedHoursByDate({})
    } finally {
      setIsLoading(false)
    }
  }, [employeeId, structureId, graphqlClient])

  /**
   * Fetch booked working hours for a specific week
   */
  const fetchBookedHours = useCallback(
    async (weekDays: Date[]) => {
      try {
        const workingDates = weekDays.map(day => dayjs(day).format('YYYY-MM-DD'))
        const response = await graphqlClient.request<EmployeeProjectWorkingHoursResponse>(
          GET_EMPLOYEE_PROJECT_WORKING_HOURS,
          {
            employeeId,
            workingDates
          }
        )

        // Create a map: key = "projectId-workingDate", value = { id, version, hours, projectId }
        const bookedMap: Record<string, { id: string; version: number; hours: number; projectId: string }> = {}
        if (response.EmployeeProjectWorkingHours) {
          for (const entry of response.EmployeeProjectWorkingHours) {
            const hours = parseEffectiveTimeToHours(entry.actualWorkingHours)
            const key = `${entry.projectId}-${entry.workingDate}`
            bookedMap[key] = {
              id: entry.id,
              version: entry.version,
              hours,
              projectId: entry.projectId
            }
          }
        }
        setBookedHours(bookedMap)
      } catch (err) {
        console.error('Error fetching booked hours:', err)
        setBookedHours({})
      }
    },
    [employeeId, graphqlClient]
  )

  useEffect(() => {
    if (employeeId && structureId) {
      fetchTeamAllocations()
    }
  }, [employeeId, structureId, fetchTeamAllocations])

  /**
   * Format hours to text format (e.g., 8.5 -> "8h 30m", 8 -> "8h")
   */
  const formatHoursToText = (hours: number): string => {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    if (minutes === 0) {
      return `${wholeHours}h`
    }
    return `${wholeHours}h ${minutes}m`
  }

  /**
   * Submit working hours for a week
   * @param weekBookings - Array of bookings with days containing hours
   */
  const submitWorkingHours = useCallback(
    async (weekBookings: Array<{ teamId: string; days: Array<{ date: string; hours: number }> }>) => {
      setIsSubmitting(true)
      setError(null)

      try {
        const PROJECT_ID = 'c9e04233-02bd-46f9-90b2-b2a72e017371'

        // Prepare headers with access token
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        if (accessToken) {
          headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
        }

        // Create promises for all days across all teams
        const promises: Promise<any>[] = []

        for (const booking of weekBookings) {
          for (const day of booking.days) {
            const workingDate = dayjs(day.date).format('YYYY-MM-DD')
            const actualHours = day.hours
            const plannedHours = actualHours // For now, use actual hours as planned

            promises.push(
              restClient.post(
                '/processes/employee-time/createEmployeeProjectWorkingHours',
                {
                  employeeProjectWorkingHours: {
                    employee: employeeId,
                    project: PROJECT_ID,
                    workingDate,
                    plannedWorkingHours: formatHoursToText(plannedHours),
                    actualWorkingHours: formatHoursToText(actualHours)
                  }
                },
                { headers }
              )
            )
          }
        }

        // Execute all calls in parallel
        await Promise.all(promises)

        // Refetch data after successful submission
        await fetchTeamAllocations()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit working hours'
        setError(errorMessage)
        console.error('Error submitting working hours:', err)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [accessToken, employeeId, fetchTeamAllocations, restClient]
  )

  return {
    allocations,
    recordedHoursByDate,
    bookedHours,
    isLoading,
    isSubmitting,
    error,
    refetch: fetchTeamAllocations,
    fetchBookedHours,
    submitWorkingHours
  }
}
