import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_ATTENDANCE_FOR_RANGE, GET_TEAM_ABSENCE_NET_FOR_RANGE } from '../queries/queries'
import { TeamMember, TeamAttendanceEntry, CapacityRow } from '../types/types'
import { toLocalDateKey, getPlannedMinutesForDate, parseDurationToMinutes } from '../utils/timeUtils'
import {
  fetchTeamDetailedAbsences,
  fetchTeamHolidayData,
  getActiveLocale,
  isSickAbsence,
  isVacationAbsence,
  isWorkAbsence
} from '../utils/teamTimeDomain'

interface UseTeamCapacityReturn {
  rows: CapacityRow[]
  currentMonth: Date
  prevMonth: () => void
  nextMonth: () => void
  isLoading: boolean
  error: string | null
}

export const useTeamCapacity = (
  accessToken: string | undefined,
  members: TeamMember[],
  memberIds: string[],
  sharedMonthAttendance?: TeamAttendanceEntry[]
): UseTeamCapacityReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [rows, setRows] = useState<CapacityRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const membersRef = useRef(members)
  membersRef.current = members

  const canUseSharedAttendance = (() => {
    const now = new Date()
    const sameMonth = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth()
    return sameMonth && !!sharedMonthAttendance && sharedMonthAttendance.length > 0
  })()

  const fetchCapacity = useCallback(async () => {
    if (!graphqlClient || memberIds.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      const fromStr = toLocalDateKey(monthStart)
      const toStr = toLocalDateKey(monthEnd)
      const locale = getActiveLocale()

      const monthAttendancePromise = canUseSharedAttendance
        ? Promise.resolve(sharedMonthAttendance ?? [])
        : graphqlClient.request<any>(GET_TEAM_ATTENDANCE_FOR_RANGE, {
            employeeIds: memberIds,
            dateFrom: fromStr,
            dateTo: toStr
          })
      const [absenceNetResult, detailedAbsences, holidayData, monthAttendanceResult] = await Promise.all([
        graphqlClient.request<any>(GET_TEAM_ABSENCE_NET_FOR_RANGE, {
          employeeIds: memberIds,
          from: fromStr,
          to: toStr
        }),
        fetchTeamDetailedAbsences(graphqlClient, memberIds, fromStr, toStr, locale),
        fetchTeamHolidayData(graphqlClient, memberIds, fromStr, toStr, locale),
        monthAttendancePromise
      ])

      const absenceNetRows: any[] = absenceNetResult?.DailyAbsenceNetView ?? []
      const attendanceRows: any[] = canUseSharedAttendance
        ? (monthAttendanceResult as TeamAttendanceEntry[])
        : (((monthAttendanceResult as any)?.EmployeeAttendance ?? []) as TeamAttendanceEntry[])

      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const isFetchingCurrentMonth =
        today.getFullYear() === currentMonth.getFullYear() && today.getMonth() === currentMonth.getMonth()
      const comparisonEndDate = isFetchingCurrentMonth
        ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
        : monthEnd
      const hasComparisonRange = comparisonEndDate >= monthStart
      const comparisonEndDateKey = hasComparisonRange ? toLocalDateKey(comparisonEndDate) : null
      const includeAllWorkedInComparison = !isFetchingCurrentMonth

      const currentMembers = membersRef.current
      const capacityRows: CapacityRow[] = currentMembers.map(member => {
        let contractTargetMinutes = 0
        const empAbsenceNet = absenceNetRows.filter((r: any) => r.employeeId === member.id)
        const timeOffByDay = new Map<string, number>()
        empAbsenceNet.forEach((r: any) => {
          const value = Number(r.netSignedEps ?? r.netConsumed) || 0
          if (value <= 0) return
          timeOffByDay.set(r.dayDate, Math.min(1, (timeOffByDay.get(r.dayDate) ?? 0) + value))
        })
        const holidayDates = holidayData.datesByEmployeeId.get(member.id) ?? new Set<string>()
        const cursor = new Date(monthStart)
        while (cursor <= monthEnd) {
          const dateKey = toLocalDateKey(cursor)
          const plannedMinutes = getPlannedMinutesForDate(dateKey, member.workingHours)
          const dailyAbsences = detailedAbsences.filter(
            (absence: any) =>
              absence.employeeId === member.id &&
              absence.status === 'APPROVED' &&
              dateKey >= absence.startDate &&
              dateKey <= absence.endDate
          )
          const hasNonWorkAbsence = dailyAbsences.some((absence: any) => !isWorkAbsence(absence))
          const dayFraction = hasNonWorkAbsence ? Math.min(timeOffByDay.get(dateKey) ?? 1, 1) : 0

          if (!holidayDates.has(dateKey)) {
            contractTargetMinutes += plannedMinutes * (1 - dayFraction)
          }
          cursor.setDate(cursor.getDate() + 1)
        }

        const empAttendance = attendanceRows.filter((r: any) => r.employeeId === member.id)

        let workedMinutes = 0
        let workedMinutesForComparison = 0
        let missingEntries = 0
        empAttendance.forEach((r: any) => {
          const effectiveMinutes = parseDurationToMinutes(r.effectiveTime)
          workedMinutes += effectiveMinutes
          if (includeAllWorkedInComparison || (comparisonEndDateKey && r.attendanceDate <= comparisonEndDateKey)) {
            workedMinutesForComparison += effectiveMinutes
          }
        })

        let targetUpToNow = 0
        const targetCursor = new Date(monthStart)
        while (targetCursor <= comparisonEndDate) {
          const dateStr = toLocalDateKey(targetCursor)
          const planned = getPlannedMinutesForDate(dateStr, member.workingHours)
          if (holidayDates.has(dateStr)) {
            targetCursor.setDate(targetCursor.getDate() + 1)
            continue
          }

          const dayAbsences = detailedAbsences.filter(
            (absence: any) =>
              absence.employeeId === member.id &&
              absence.status === 'APPROVED' &&
              dateStr >= absence.startDate &&
              dateStr <= absence.endDate
          )
          const nonWorkAbsence = dayAbsences.find((absence: any) => !isWorkAbsence(absence))
          const timeOffFraction = nonWorkAbsence ? Math.min(timeOffByDay.get(dateStr) ?? 1, 1) : 0
          const expectedMinutes = planned * (1 - timeOffFraction)

          targetUpToNow += expectedMinutes
          if (planned > 0 && timeOffFraction < 1) {
            const hasEntry = empAttendance.some((r: any) => r.attendanceDate === dateStr)
            if (!hasEntry && targetCursor < startOfToday) missingEntries++
          }
          targetCursor.setDate(targetCursor.getDate() + 1)
        }

        const netBalanceMinutes = workedMinutesForComparison - targetUpToNow
        const overtimeMinutes = Math.max(0, netBalanceMinutes)
        const deficitMinutes = Math.max(0, -netBalanceMinutes)

        let ptoUsedDays = 0
        let sickDays = 0
        const monthlyCursor = new Date(monthStart)
        while (monthlyCursor <= monthEnd) {
          const dateKey = toLocalDateKey(monthlyCursor)
          const dayAbsences = detailedAbsences.filter(
            (absence: any) =>
              absence.employeeId === member.id &&
              absence.status === 'APPROVED' &&
              dateKey >= absence.startDate &&
              dateKey <= absence.endDate
          )
          const nonWorkAbsence = dayAbsences.find((absence: any) => !isWorkAbsence(absence))

          if (nonWorkAbsence) {
            const dayFraction = Math.min(timeOffByDay.get(dateKey) ?? 1, 1)
            if (isSickAbsence(nonWorkAbsence)) {
              sickDays += dayFraction
            } else if (isVacationAbsence(nonWorkAbsence)) {
              ptoUsedDays += dayFraction
            }
          }

          monthlyCursor.setDate(monthlyCursor.getDate() + 1)
        }

        return {
          employee: member,
          contractTargetMinutes,
          workedMinutes,
          overtimeMinutes,
          deficitMinutes,
          ptoUsedDays: Math.round(ptoUsedDays * 10) / 10,
          sickDays: Math.round(sickDays * 10) / 10,
          netBalanceMinutes,
          missingEntries
        }
      })

      setRows(capacityRows)
    } catch (err) {
      console.error('Error fetching team capacity:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch capacity data')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, memberIds.join(','), currentMonth, canUseSharedAttendance])

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    fetchCapacity()
  }, [accessToken, fetchCapacity])

  const prevMonth = useCallback(() => {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }, [])

  const nextMonth = useCallback(() => {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }, [])

  return { rows, currentMonth, prevMonth, nextMonth, isLoading, error }
}
