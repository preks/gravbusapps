import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_ATTENDANCE_FOR_RANGE, GET_TEAM_ABSENCE_NET_FOR_RANGE } from '../queries/queries'
import { TeamMember, TeamAttendanceEntry, TeamAbsenceToday, AbsenceNetEntry, ViewMode } from '../types/types'
import { toLocalDateKey } from '../utils/timeUtils'
import {
  expandDateRange,
  fetchTeamDetailedAbsences,
  fetchTeamHolidayData,
  getActiveLocale
} from '../utils/teamTimeDomain'

interface UseTeamAttendanceReturn {
  attendance: TeamAttendanceEntry[]
  absences: TeamAbsenceToday[]
  absenceNet: AbsenceNetEntry[]
  holidayDatesByEmployeeId: Map<string, Set<string>>
  holidayNamesByEmployeeId: Map<string, Record<string, string>>
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
  const [absenceNet, setAbsenceNet] = useState<AbsenceNetEntry[]>([])
  const [holidayDatesByEmployeeId, setHolidayDatesByEmployeeId] = useState<Map<string, Set<string>>>(new Map())
  const [holidayNamesByEmployeeId, setHolidayNamesByEmployeeId] = useState<Map<string, Record<string, string>>>(
    new Map()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getDateRange = useCallback((): { from: string; to: string } => {
    const d = new Date(currentDate)
    if (viewMode === 'day') {
      const str = toLocalDateKey(d)
      return { from: str, to: str }
    }
    if (viewMode === 'week') {
      const dayOfWeek = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: toLocalDateKey(monday), to: toLocalDateKey(sunday) }
    }
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { from: toLocalDateKey(monthStart), to: toLocalDateKey(monthEnd) }
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
      const locale = getActiveLocale()

      const [attendanceResult, absenceNetResult, detailedAbsences, holidayData] = await Promise.all([
        graphqlClient.request<any>(GET_TEAM_ATTENDANCE_FOR_RANGE, {
          employeeIds: memberIds,
          dateFrom: from,
          dateTo: to
        }),
        graphqlClient.request<any>(GET_TEAM_ABSENCE_NET_FOR_RANGE, {
          employeeIds: memberIds,
          from,
          to
        }),
        fetchTeamDetailedAbsences(graphqlClient, memberIds, from, to, locale),
        fetchTeamHolidayData(graphqlClient, memberIds, from, to, locale)
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
        detailedAbsences.flatMap(absence =>
          expandDateRange(absence.startDate, absence.endDate, from, to).map(dayDate => ({
            employeeId: absence.employeeId,
            typeRef: absence.typeRef,
            status: absence.status,
            dayDate,
            employeeAbsenceId: absence.id,
            typeLabel: absence.typeLabel,
            parentEntryId: absence.parentEntryId,
            startDate: absence.startDate,
            endDate: absence.endDate,
            employeeName: absence.employeeName,
            pictureThumbnail: absence.pictureThumbnail
          }))
        )
      )

      setAbsenceNet(
        (absenceNetResult?.DailyAbsenceNetView ?? []).map((r: any) => ({
          employeeId: r.employeeId,
          typeRef: r.typeRef,
          dayDate: r.dayDate,
          netSignedEps: r.netSignedEps !== undefined && r.netSignedEps !== null ? Number(r.netSignedEps) : null,
          netConsumed: r.netConsumed !== undefined && r.netConsumed !== null ? Number(r.netConsumed) : null
        }))
      )
      setHolidayDatesByEmployeeId(holidayData.datesByEmployeeId)
      setHolidayNamesByEmployeeId(holidayData.namesByEmployeeId)
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
    absenceNet,
    holidayDatesByEmployeeId,
    holidayNamesByEmployeeId,
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
