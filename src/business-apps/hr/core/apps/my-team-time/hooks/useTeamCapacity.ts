import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_ATTENDANCE_FOR_RANGE, GET_TEAM_ABSENCE_NET_FOR_RANGE } from '../queries/queries'
import { TeamMember, TeamAttendanceEntry, CapacityRow } from '../types/types'
import { toLocalDateKey, getPlannedMinutesForDate, parseDurationToMinutes } from '../utils/timeUtils'

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

      const queries: Promise<any>[] = [
        graphqlClient.request<any>(GET_TEAM_ABSENCE_NET_FOR_RANGE, {
          employeeIds: memberIds,
          from: fromStr,
          to: toStr
        })
      ]

      if (!canUseSharedAttendance) {
        queries.push(
          graphqlClient.request<any>(GET_TEAM_ATTENDANCE_FOR_RANGE, {
            employeeIds: memberIds,
            dateFrom: fromStr,
            dateTo: toStr
          })
        )
      }

      const results = await Promise.all(queries)
      const absenceNetRows: any[] = results[0]?.DailyAbsenceNetView ?? []
      const attendanceRows: any[] = canUseSharedAttendance
        ? sharedMonthAttendance!
        : (results[1]?.EmployeeAttendance ?? [])

      const today = new Date()
      const isFetchingCurrentMonth =
        today.getFullYear() === currentMonth.getFullYear() && today.getMonth() === currentMonth.getMonth()
      const endDate = isFetchingCurrentMonth ? today : monthEnd

      const currentMembers = membersRef.current
      const capacityRows: CapacityRow[] = currentMembers.map(member => {
        let contractTargetMinutes = 0
        const cursor = new Date(monthStart)
        while (cursor <= monthEnd) {
          contractTargetMinutes += getPlannedMinutesForDate(toLocalDateKey(cursor), member.workingHours)
          cursor.setDate(cursor.getDate() + 1)
        }

        const empAttendance = attendanceRows.filter((r: any) => r.employeeId === member.id)
        let workedMinutes = 0
        let missingEntries = 0
        empAttendance.forEach((r: any) => {
          workedMinutes += parseDurationToMinutes(r.effectiveTime)
        })

        let targetUpToNow = 0
        const targetCursor = new Date(monthStart)
        while (targetCursor <= endDate) {
          const planned = getPlannedMinutesForDate(toLocalDateKey(targetCursor), member.workingHours)
          targetUpToNow += planned
          if (planned > 0) {
            const dateStr = toLocalDateKey(targetCursor)
            const hasEntry = empAttendance.some((r: any) => r.attendanceDate === dateStr)
            if (!hasEntry && targetCursor < today) missingEntries++
          }
          targetCursor.setDate(targetCursor.getDate() + 1)
        }

        const overtimeMinutes = Math.max(0, workedMinutes - targetUpToNow)
        const deficitMinutes = Math.max(0, targetUpToNow - workedMinutes)

        const empAbsenceNet = absenceNetRows.filter((r: any) => r.employeeId === member.id)
        let ptoUsedDays = 0
        let sickDays = 0
        empAbsenceNet.forEach((r: any) => {
          const value = Number(r.netSignedEps ?? r.netConsumed) || 0
          if (value <= 0) return
          const typeRef = (r.typeRef || '').toUpperCase()
          if (typeRef.includes('ILLNESS') || typeRef.includes('SICK')) {
            sickDays += value
          } else if (typeRef.includes('VACATION') || typeRef.includes('HOLIDAY')) {
            ptoUsedDays += value
          }
        })

        const netBalanceMinutes = workedMinutes - targetUpToNow

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
    if (accessToken && memberIds.length > 0) {
      fetchCapacity()
    }
  }, [accessToken, memberIds.join(','), fetchCapacity])

  const prevMonth = useCallback(() => {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }, [])

  const nextMonth = useCallback(() => {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }, [])

  return { rows, currentMonth, prevMonth, nextMonth, isLoading, error }
}
