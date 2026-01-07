import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { TeamAllocation } from '../types'
import dayjs from 'dayjs'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { toast } from '@newwork/nw-design-system'

interface EmployeeMatrixUnitResponse {
  EmployeeMatrixUnit: Array<{
    id: string
    employeeId: string
    matrixUnitId: string
    percentage: number
    createdAt: string
    matrixUnit: {
      id: string
      name: string
      createdAt: string
    }
  }>
}

interface ProjectsByMatrixUnitResponse {
  Project: Array<{
    id: string
    name: string
    matrixUnitId: string
    status: string
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
 * Parse duration text into hours (decimal)
 * Supports formats:
 * - "HH:MM" (e.g., "04:30" -> 4.5)
 * - "Xh Ym" (e.g., "4h 30m" -> 4.5)
 * - "Xh" (e.g., "8h" -> 8)
 */
const parseEffectiveTimeToHours = (text?: string): number => {
  if (!text) return 0
  const trimmed = String(text).trim()

  // Try HH:MM format first
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':').map(Number)
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      return h + m / 60
    }
  }

  // Fall back to "Xh Ym" format
  let hours = 0
  let minutes = 0
  const tokens = trimmed.split(/\s+/)
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
      createdAt
      matrixUnit {
        id
        name
        createdAt
      }
    }
  }
`

/**
 * GraphQL query to get projects by matrix unit IDs
 */
const GET_PROJECTS_BY_MATRIX_UNITS = `
  query GetProjectsByMatrixUnits($matrixUnitIds: [uuid!]!) {
    Project(
      where: {
        matrixUnitId: {_in: $matrixUnitIds}
        isDeleted: {_eq: false}
      }
    ) {
      id
      name
      matrixUnitId
      status
    }
  }
`

/**
 * GraphQL query to get projects by IDs (for historical booked hours)
 */
const GET_PROJECTS_BY_IDS = `
  query GetProjectsByIds($projectIds: [uuid!]!) {
    Project(where: {id: {_in: $projectIds}}) {
      id
      name
      matrixUnitId
      status
    }
  }
`

interface ProjectsByIdsResponse {
  Project: Array<{
    id: string
    name: string
    matrixUnitId: string | null
    status: string
  }>
}

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

export interface HistoricalProject {
  projectId: string
  projectName: string
  isHistorical: true // Always true - these are projects from booked hours, not current allocations
}

export const useEmployeeTeamAllocations = ({
  accessToken,
  employeeId
}: {
  accessToken: string
  employeeId: string
}) => {
  const [allocations, setAllocations] = useState<TeamAllocation[]>([])
  const [historicalProjects, setHistoricalProjects] = useState<HistoricalProject[]>([])
  const [recordedHoursByDate, setRecordedHoursByDate] = useState<Record<string, number>>({})
  const [bookedHours, setBookedHours] = useState<
    Record<string, { id: string; version: number; hours: number; projectId: string }>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingWeekData, setIsLoadingWeekData] = useState(false)
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

      if (response.EmployeeMatrixUnit && response.EmployeeMatrixUnit.length > 0) {
        // Get all matrix unit IDs
        const matrixUnitIds = response.EmployeeMatrixUnit.map(item => item.matrixUnitId)

        // Fetch projects associated with these matrix units
        const projectsResponse = await graphqlClient.request<ProjectsByMatrixUnitResponse>(
          GET_PROJECTS_BY_MATRIX_UNITS,
          { matrixUnitIds }
        )

        // Create a map of matrixUnitId -> project
        const projectsByMatrixUnit = new Map<string, { id: string; name: string }>()
        if (projectsResponse.Project) {
          for (const project of projectsResponse.Project) {
            if (project.matrixUnitId) {
              projectsByMatrixUnit.set(project.matrixUnitId, {
                id: project.id,
                name: project.name
              })
            }
          }
        }

        // Transform allocations with project data
        const transformedAllocations: TeamAllocation[] = response.EmployeeMatrixUnit.map(item => {
          const project = projectsByMatrixUnit.get(item.matrixUnitId)
          return {
            teamId: item.matrixUnitId,
            teamName: item.matrixUnit.name,
            percentage: item.percentage,
            projectId: project?.id,
            projectName: project?.name,
            assignedAt: item.createdAt
          }
        })

        const allocationsWithProjects = transformedAllocations.filter(a => a.projectId)
        setAllocations(allocationsWithProjects)
      } else {
        setAllocations([])
      }
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
   * Fetch booked working hours and attendance for a specific week
   */
  const fetchBookedHours = useCallback(
    async (weekDays: Date[], currentAllocations: TeamAllocation[]) => {
      // Validate employeeId before making any requests
      if (!employeeId || employeeId === '') {
        setError('Employee ID is missing')
        return
      }

      setIsLoadingWeekData(true)
      setError(null)
      // Reset old data immediately to prevent flicker with stale data
      setBookedHours({})
      setRecordedHoursByDate({})
      setHistoricalProjects([])
      try {
        const workingDates = weekDays.map(day => dayjs(day).format('YYYY-MM-DD'))
        const weekStart = weekDays[0]
        const weekEnd = weekDays[weekDays.length - 1]

        // Fetch booked hours and attendance in parallel
        const [workingHoursResponse, attendanceResponse] = await Promise.all([
          graphqlClient.request<EmployeeProjectWorkingHoursResponse>(GET_EMPLOYEE_PROJECT_WORKING_HOURS, {
            employeeId,
            workingDates
          }),
          graphqlClient.request<EmployeeAttendanceResponse>(GET_EMPLOYEE_ATTENDANCE, {
            employeeId,
            dateFrom: dayjs(weekStart).format('YYYY-MM-DD'),
            dateTo: dayjs(weekEnd).format('YYYY-MM-DD')
          })
        ])

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

        const response = workingHoursResponse

        // Create a map: key = "projectId-workingDate", value = { id, version, hours, projectId }
        const bookedMap: Record<string, { id: string; version: number; hours: number; projectId: string }> = {}
        const projectIdsFromBookedHours = new Set<string>()

        if (response.EmployeeProjectWorkingHours) {
          for (const entry of response.EmployeeProjectWorkingHours) {
            const hours = parseEffectiveTimeToHours(entry.actualWorkingHours)
            const key = `${entry.projectId}-${entry.workingDate}`
            // Sum hours if multiple entries for same project-date
            if (bookedMap[key]) {
              bookedMap[key].hours += hours
            } else {
              bookedMap[key] = {
                id: entry.id,
                version: entry.version,
                hours,
                projectId: entry.projectId
              }
            }
            projectIdsFromBookedHours.add(entry.projectId)
          }
        }
        setBookedHours(bookedMap)

        // Find historical projects (projects with booked hours but not in current allocations)
        const currentProjectIds = new Set(currentAllocations.map(a => a.projectId).filter(Boolean))
        const historicalProjectIds = [...projectIdsFromBookedHours].filter(id => !currentProjectIds.has(id))

        if (historicalProjectIds.length > 0) {
          // Try to fetch project details for historical projects
          // Note: Hasura permissions might filter out deleted projects, so we handle missing ones
          const projectsMap = new Map<string, string>()

          try {
            const projectsResponse = await graphqlClient.request<ProjectsByIdsResponse>(GET_PROJECTS_BY_IDS, {
              projectIds: historicalProjectIds
            })

            for (const p of projectsResponse.Project || []) {
              projectsMap.set(p.id, p.name)
            }
          } catch (err) {
            console.warn('Could not fetch historical project details:', err)
            toast.error('Could not fetch historical project details')
          }

          // Create historical projects list - use project name if available, otherwise use ID
          const historicalProjectsList: HistoricalProject[] = historicalProjectIds.map(projectId => ({
            projectId,
            projectName: projectsMap.get(projectId) || `Project (${projectId.slice(0, 8)}...)`,
            isHistorical: true as const
          }))

          setHistoricalProjects(historicalProjectsList)
        } else {
          setHistoricalProjects([])
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load week data'
        console.error('Error fetching booked hours:', err)
        setError(errorMessage)
        setBookedHours({})
        setHistoricalProjects([])
        setRecordedHoursByDate({})
      } finally {
        setIsLoadingWeekData(false)
      }
    },
    [employeeId, graphqlClient]
  )

  useEffect(() => {
    if (structureId) {
      fetchTeamAllocations()
    }
  }, [employeeId, structureId, fetchTeamAllocations])

  /**
   * Submit working hours for a week
   * @param weekBookings - Array of bookings with days containing time strings in HH:MM format
   */
  const submitWorkingHours = useCallback(
    async (
      weekBookings: Array<{ teamId: string; projectId: string; days: Array<{ date: string; timeString: string }> }>
    ) => {
      setIsSubmitting(true)
      setError(null)

      try {
        // Prepare headers with access token
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        }
        if (accessToken) {
          headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
        }

        // Create promises for all days across all teams/projects
        const promises: Promise<any>[] = []

        for (const booking of weekBookings) {
          // Skip bookings without a projectId
          if (!booking.projectId) {
            console.warn(`Skipping booking for team ${booking.teamId} - no project associated`)
            continue
          }

          for (const day of booking.days) {
            const workingDate = dayjs(day.date).format('YYYY-MM-DD')
            // Send time directly in HH:MM format
            const timeValue = day.timeString || '00:00'

            promises.push(
              restClient.post(
                '/processes/employee-time/createEmployeeProjectWorkingHours',
                {
                  employeeProjectWorkingHours: {
                    employee: employeeId,
                    project: booking.projectId,
                    workingDate,
                    plannedWorkingHours: timeValue,
                    actualWorkingHours: timeValue
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
    historicalProjects,
    recordedHoursByDate,
    bookedHours,
    isLoading,
    isLoadingWeekData,
    isSubmitting,
    error,
    refetch: fetchTeamAllocations,
    fetchBookedHours,
    submitWorkingHours
  }
}
