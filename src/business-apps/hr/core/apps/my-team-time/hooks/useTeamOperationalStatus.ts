import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_ATTENDANCE_FOR_RANGE, GET_TEAM_ABSENCES_CALENDAR_TODAY } from '../queries/queries'
import { TeamMember, OperationalStatus, TeamAttendanceEntry, TeamAbsenceToday, Anomaly } from '../types/types'
import { toLocalDateKey, isWorkingDay, parseDurationToMinutes, toDateString } from '../utils/timeUtils'

interface UseTeamOperationalStatusReturn {
  status: OperationalStatus
  todayAttendance: TeamAttendanceEntry[]
  todayAbsences: TeamAbsenceToday[]
  monthAttendance: TeamAttendanceEntry[]
  isLoading: boolean
  error: string | null
}

export const useTeamOperationalStatus = (
  accessToken: string | undefined,
  members: TeamMember[],
  memberIds: string[]
): UseTeamOperationalStatusReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [status, setStatus] = useState<OperationalStatus>({
    workingNow: [],
    notClockedIn: [],
    onLeaveToday: [],
    sickToday: [],
    overtimeMinutesMTD: 0,
    anomalies: []
  })
  const [todayAttendance, setTodayAttendance] = useState<TeamAttendanceEntry[]>([])
  const [monthAttendance, setMonthAttendance] = useState<TeamAttendanceEntry[]>([])
  const [todayAbsences, setTodayAbsences] = useState<TeamAbsenceToday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const membersRef = useRef(members)
  membersRef.current = members

  const fetchStatus = useCallback(async () => {
    if (!graphqlClient || memberIds.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const today = new Date()
      const todayStr = toLocalDateKey(today)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthStartStr = toDateString(monthStart)

      const [attendanceResult, absenceResult] = await Promise.all([
        graphqlClient.request<any>(GET_TEAM_ATTENDANCE_FOR_RANGE, {
          employeeIds: memberIds,
          dateFrom: monthStartStr,
          dateTo: todayStr
        }),
        graphqlClient.request<any>(GET_TEAM_ABSENCES_CALENDAR_TODAY, {
          employeeIds: memberIds,
          today: todayStr
        })
      ])

      const allAttendance: TeamAttendanceEntry[] = (attendanceResult?.EmployeeAttendance ?? []).map((r: any) => ({
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

      const absences: TeamAbsenceToday[] = (absenceResult?.EmployeeAbsenceCalendarView ?? []).map((r: any) => ({
        employeeId: r.employeeId,
        typeRef: r.typeRef,
        status: r.status,
        dayDate: r.dayDate,
        employeeAbsenceId: r.employeeAbsenceId
      }))

      setMonthAttendance(allAttendance)
      const todayEntries = allAttendance.filter(a => a.attendanceDate === todayStr)
      setTodayAttendance(todayEntries)
      setTodayAbsences(absences)

      const currentMembers = membersRef.current
      const memberMap = new Map(currentMembers.map(m => [m.id, m]))
      const absentEmployeeIds = new Set(absences.filter(a => a.status === 'APPROVED').map(a => a.employeeId))
      const sickEmployeeIds = new Set(
        absences
          .filter(a => {
            if (a.status !== 'APPROVED') return false
            const upper = (a.typeRef || '').toUpperCase()
            return upper.includes('ILLNESS') || upper.includes('SICK')
          })
          .map(a => a.employeeId)
      )

      const clockedInIds = new Set<string>()
      const workingNow: TeamMember[] = []
      todayEntries.forEach(entry => {
        if (entry.startTime && !clockedInIds.has(entry.employeeId)) {
          clockedInIds.add(entry.employeeId)
          const member = memberMap.get(entry.employeeId)
          if (member && !entry.endTime) {
            workingNow.push(member)
          }
        }
      })

      const notClockedIn: TeamMember[] = currentMembers.filter(m => {
        if (clockedInIds.has(m.id)) return false
        if (absentEmployeeIds.has(m.id)) return false
        return isWorkingDay(todayStr, m.workingHours)
      })

      const onLeaveToday = Array.from(absentEmployeeIds)
        .filter(id => !sickEmployeeIds.has(id))
        .map(id => memberMap.get(id))
        .filter(Boolean) as TeamMember[]

      const sickToday = Array.from(sickEmployeeIds)
        .map(id => memberMap.get(id))
        .filter(Boolean) as TeamMember[]

      let overtimeMinutesMTD = 0
      allAttendance.forEach(entry => {
        const diff = parseDurationToMinutes(entry.differenceTime)
        if (diff > 0) overtimeMinutesMTD += diff
      })

      const anomalies: Anomaly[] = []
      const yesterdayDate = new Date(today)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayStr = toLocalDateKey(yesterdayDate)

      currentMembers.forEach(m => {
        if (absentEmployeeIds.has(m.id)) return
        if (!isWorkingDay(yesterdayStr, m.workingHours)) return

        const yesterdayEntries = allAttendance.filter(a => a.employeeId === m.id && a.attendanceDate === yesterdayStr)
        if (yesterdayEntries.length === 0) {
          anomalies.push({
            employeeId: m.id,
            employeeName: `${m.firstName} ${m.lastName}`,
            type: 'missing_log',
            description: 'No attendance record for yesterday',
            date: yesterdayStr
          })
        } else {
          const hasOpen = yesterdayEntries.some(e => e.startTime && !e.endTime)
          if (hasOpen) {
            anomalies.push({
              employeeId: m.id,
              employeeName: `${m.firstName} ${m.lastName}`,
              type: 'no_clock_out',
              description: 'Missing clock-out from yesterday',
              date: yesterdayStr
            })
          }
        }
      })

      setStatus({
        workingNow,
        notClockedIn,
        onLeaveToday,
        sickToday,
        overtimeMinutesMTD,
        anomalies
      })
    } catch (err) {
      console.error('Error fetching operational status:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch operational status')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, memberIds.join(',')])

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    fetchStatus()
  }, [accessToken, fetchStatus])

  return { status, todayAttendance, todayAbsences, monthAttendance, isLoading, error }
}
