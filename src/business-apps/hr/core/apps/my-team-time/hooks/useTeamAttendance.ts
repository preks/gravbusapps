import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_ATTENDANCE_FOR_RANGE, GET_TEAM_ABSENCES_CALENDAR_RANGE } from '../queries/queries'
import { TeamMember, TeamAttendanceEntry, TeamAbsenceToday, ViewMode } from '../types/types'
import { toDateString } from '../utils/timeUtils'

interface UseTeamAttendanceReturn {
  attendance: TeamAttendanceEntry[]
  absences: TeamAbsenceToday[]
  currentDate: Date
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  goToDate: (date: Date) => void
  goToPrev: () => void
  goToNext: () => void
  goToToday: () => void
  isLoading: boolean
  error: string | null
}

export const useTeamAttendance = (
  accessToken: string | undefined,
  members: TeamMember[],
  memberIds: string[]
): UseTeamAttendanceReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [attendance, setAttendance] = useState<TeamAttendanceEntry[]>([])
  const [absences, setAbsences] = useState<TeamAbsenceToday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getDateRange = useCallback((): { from: string; to: string } => {
    const d = new Date(currentDate)
    if (viewMode === 'day') {
      const str = toDateString(d)
      return { from: str, to: str }
    }
    if (viewMode === 'week') {
      const dayOfWeek = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: toDateString(monday), to: toDateString(sunday) }
    }
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { from: toDateString(monthStart), to: toDateString(monthEnd) }
  }, [currentDate, viewMode])

  const fetchData = useCallback(async () => {
    if (!graphqlClient || memberIds.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { from, to } = getDateRange()

      const [attendanceResult, absenceResult] = await Promise.all([
        graphqlClient.request<any>(GET_TEAM_ATTENDANCE_FOR_RANGE, {
          employeeIds: memberIds,
          dateFrom: from,
          dateTo: to
        }),
        graphqlClient.request<any>(GET_TEAM_ABSENCES_CALENDAR_RANGE, {
          employeeIds: memberIds,
          from,
          to
        })
      ])

      setAttendance(
        (attendanceResult?.EmployeeAttendance ?? []).map((r: any) => ({
          id: r.id,
          employeeId: r.employeeId,
          attendanceDate: r.attendanceDate,
          startTime: r.startTime,
          endTime: r.endTime,
          recordedTime: r.recordedTime,
          breakTime: r.breakTime,
          effectiveTime: r.effectiveTime,
          plannedTime: r.plannedTime,
          differenceTime: r.differenceTime,
          manualOverride: r.manualOverride,
          attendanceLocation: r.attendanceLocation
        }))
      )

      setAbsences(
        (absenceResult?.EmployeeAbsenceCalendarView ?? []).map((r: any) => ({
          employeeId: r.employeeId,
          typeRef: r.typeRef,
          status: r.status,
          dayDate: r.dayDate,
          employeeAbsenceId: r.employeeAbsenceId
        }))
      )
    } catch (err) {
      console.error('Error fetching team attendance:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch attendance')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, memberIds.join(','), getDateRange])

  useEffect(() => {
    if (accessToken && memberIds.length > 0) {
      fetchData()
    }
  }, [accessToken, memberIds.join(','), fetchData])

  const goToPrev = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (viewMode === 'day') d.setDate(d.getDate() - 1)
      else if (viewMode === 'week') d.setDate(d.getDate() - 7)
      else d.setMonth(d.getMonth() - 1)
      return d
    })
  }, [viewMode])

  const goToNext = useCallback(() => {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (viewMode === 'day') d.setDate(d.getDate() + 1)
      else if (viewMode === 'week') d.setDate(d.getDate() + 7)
      else d.setMonth(d.getMonth() + 1)
      return d
    })
  }, [viewMode])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  return {
    attendance,
    absences,
    currentDate,
    viewMode,
    setViewMode,
    goToDate: setCurrentDate,
    goToPrev,
    goToNext,
    goToToday,
    isLoading,
    error
  }
}
