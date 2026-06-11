import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { GET_TEAM_ATTENDANCE_FOR_RANGE } from '../queries/queries'
import { TeamMember, OperationalStatus, TeamAttendanceEntry, TeamAbsenceToday, Anomaly } from '../types/types'
import { toLocalDateKey, isWorkingDay, parseDurationToMinutes, toDateString } from '../utils/timeUtils'
import {
  fetchTeamDetailedAbsences,
  fetchTeamHolidayData,
  getActiveLocale,
  getApprovedAbsencesForDate,
  isSickAbsence,
  isWorkAbsence
} from '../utils/teamTimeDomain'

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

  const getAnomalyDescription = useCallback((key: 'missing_log' | 'no_clock_out'): string => {
    if (key === 'missing_log') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:my_team_time.anomaly_missing_log',
        'No attendance record for yesterday'
      )
    }

    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:my_team_time.anomaly_missing_clock_out',
      'Missing clock-out from yesterday'
    )
  }, [])

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
      const yesterdayDate = new Date(today)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayStr = toLocalDateKey(yesterdayDate)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthStartStr = toDateString(monthStart)
      const locale = getActiveLocale()

      const [attendanceResult, detailedAbsences, holidayData] = await Promise.all([
        graphqlClient.request<any>(GET_TEAM_ATTENDANCE_FOR_RANGE, {
          employeeIds: memberIds,
          dateFrom: monthStartStr,
          dateTo: todayStr
        }),
        fetchTeamDetailedAbsences(graphqlClient, memberIds, yesterdayStr, todayStr, locale),
        fetchTeamHolidayData(graphqlClient, memberIds, yesterdayStr, todayStr, locale)
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

      const absences: TeamAbsenceToday[] = detailedAbsences
        .filter(absence => absence.status === 'APPROVED')
        .flatMap(absence =>
          getApprovedAbsencesForDate([absence], absence.employeeId, todayStr).map(() => ({
            employeeId: absence.employeeId,
            typeRef: absence.typeRef,
            status: absence.status,
            dayDate: todayStr,
            employeeAbsenceId: absence.id,
            typeLabel: absence.typeLabel,
            parentEntryId: absence.parentEntryId,
            startDate: absence.startDate,
            endDate: absence.endDate,
            employeeName: absence.employeeName,
            pictureThumbnail: absence.pictureThumbnail
          }))
        )

      setMonthAttendance(allAttendance)
      const todayEntries = allAttendance.filter(a => a.attendanceDate === todayStr)
      setTodayAttendance(todayEntries)
      setTodayAbsences(absences)

      const currentMembers = membersRef.current
      const memberMap = new Map(currentMembers.map(m => [m.id, m]))
      const absentEmployeeIds = new Set(absences.filter(a => a.status === 'APPROVED').map(a => a.employeeId))
      const sickEmployeeIds = new Set(
        absences.filter(a => a.status === 'APPROVED' && isSickAbsence(a)).map(a => a.employeeId)
      )

      const clockedInIds = new Set<string>()
      const workingNow: TeamMember[] = []
      todayEntries.forEach(entry => {
        if (entry.startTime && !clockedInIds.has(entry.employeeId)) {
          clockedInIds.add(entry.employeeId)
          const member = memberMap.get(entry.employeeId)
          if (member?.timeRelevant && !entry.endTime) {
            workingNow.push(member)
          }
        }
      })

      const notClockedIn: TeamMember[] = currentMembers.filter(m => {
        if (!m.timeRelevant) return false
        if (clockedInIds.has(m.id)) return false
        if (absentEmployeeIds.has(m.id)) return false
        return isWorkingDay(todayStr, m.workingHours)
      })

      const onLeaveToday: TeamMember[] = Array.from(absentEmployeeIds)
        .filter(id => {
          if (sickEmployeeIds.has(id)) return false
          const employeeAbsences = absences.filter(absence => absence.employeeId === id)
          return employeeAbsences.some(absence => !isWorkAbsence(absence))
        })
        .reduce<TeamMember[]>((acc, id) => {
          const member = memberMap.get(id)
          if (member) acc.push(member)
          return acc
        }, [])

      const sickToday: TeamMember[] = Array.from(sickEmployeeIds).reduce<TeamMember[]>((acc, id) => {
        const member = memberMap.get(id)
        if (member) acc.push(member)
        return acc
      }, [])

      const timeRelevantIds = new Set(currentMembers.filter(m => m.timeRelevant).map(m => m.id))

      let overtimeMinutesMTD = 0
      allAttendance.forEach(entry => {
        if (!timeRelevantIds.has(entry.employeeId)) return
        const diff = parseDurationToMinutes(entry.differenceTime)
        if (diff > 0) overtimeMinutesMTD += diff
      })

      const anomalies: Anomaly[] = []

      currentMembers.forEach(m => {
        if (!m.timeRelevant) return
        if (!isWorkingDay(yesterdayStr, m.workingHours)) return
        if (holidayData.datesByEmployeeId.get(m.id)?.has(yesterdayStr)) return

        const yesterdayAbsences = getApprovedAbsencesForDate(detailedAbsences, m.id, yesterdayStr)
        if (yesterdayAbsences.some(absence => !isWorkAbsence(absence))) return

        const yesterdayEntries = allAttendance.filter(a => a.employeeId === m.id && a.attendanceDate === yesterdayStr)
        if (yesterdayEntries.length === 0) {
          anomalies.push({
            employeeId: m.id,
            employeeName: `${m.firstName} ${m.lastName}`,
            type: 'missing_log',
            description: getAnomalyDescription('missing_log'),
            date: yesterdayStr
          })
        } else {
          const hasOpen = yesterdayEntries.some(e => e.startTime && !e.endTime)
          if (hasOpen) {
            anomalies.push({
              employeeId: m.id,
              employeeName: `${m.firstName} ${m.lastName}`,
              type: 'no_clock_out',
              description: getAnomalyDescription('no_clock_out'),
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error fetching operational status:', errorMessage)
      setError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:my_team_time.operational_status_fetch_failed',
          'Failed to fetch operational status'
        )
      )
    } finally {
      setIsLoading(false)
    }
  }, [getAnomalyDescription, graphqlClient, memberIds])

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    fetchStatus()
  }, [accessToken, fetchStatus])

  return { status, todayAttendance, todayAbsences, monthAttendance, isLoading, error }
}
