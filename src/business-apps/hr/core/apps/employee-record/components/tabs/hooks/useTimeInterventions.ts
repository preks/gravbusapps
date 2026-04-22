'use client'

import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  employeeAttendanceMonthlyAllQuery,
  employeeRegionLookupQuery,
  employmentRegionHolidaysQuery
} from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
import { parseDurationToMinutes } from '@/business-apps/hr/core/apps/my-time/utils/duration'
import { GET_EMPLOYEE_ABSENCES } from '@/business-apps/hr/absences/apps/personal-absences/queries/graphql'

export interface TimeInterventionEntry {
  id: string
  version?: number
  startTime?: string
  endTime?: string
  recordedTime?: string
  breakTime?: string
  effectiveTime?: string
  plannedTime?: string
  differenceTime?: string
  notes?: string
}

export interface TimeInterventionItem {
  date: string // YYYY-MM-DD
  plannedMinutes: number
  workedMinutes: number
  reason: 'MISSING_HOURS' | 'NO_ATTENDANCE' | 'ABSENCE_WITH_ATTENDANCE'
  pendingCorrection?: boolean
  entry?: TimeInterventionEntry
}

export interface UseTimeInterventionsParams {
  employeeId: string
  accessToken: string
  workingHours?: {
    sundayHours?: number
    mondayHours?: number
    tuesdayHours?: number
    wednesdayHours?: number
    thursdayHours?: number
    fridayHours?: number
    saturdayHours?: number
  }
}

export const useTimeInterventions = ({ employeeId, accessToken, workingHours }: UseTimeInterventionsParams) => {
  const [items, setItems] = useState<TimeInterventionItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const graphqlClient = useGraphQLClient(accessToken)
  const locale = getCurrentActiveUserLocale() || 'en-US'

  const toDate = (d: Date) => d.toISOString().slice(0, 10)
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const getPlannedMinutesForDate = (date: Date): number => {
    if (!workingHours) return 0
    const day = date.getDay()
    const hoursByDay = [
      workingHours.sundayHours,
      workingHours.mondayHours,
      workingHours.tuesdayHours,
      workingHours.wednesdayHours,
      workingHours.thursdayHours,
      workingHours.fridayHours,
      workingHours.saturdayHours
    ]
    const hours = hoursByDay[day] ?? 0
    const numericHours = typeof hours === 'number' ? hours : typeof hours === 'string' ? parseFloat(hours) || 0 : 0
    return Math.max(0, Math.round(numericHours * 60))
  }

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true)
      setError(null)
      try {
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

        // Attendance for the entire month
        const attRes = await graphqlClient.request<any>(employeeAttendanceMonthlyAllQuery, {
          employeeId,
          dateFrom: toDate(monthStart),
          dateTo: toDate(monthEnd)
        })
        const attendanceRows: any[] = attRes?.EmployeeAttendance ?? []

        // Resolve region holidays -> set of YYYY-MM-DD
        let holidays = new Set<string>()
        try {
          const regionRes = await graphqlClient.request<any>(employeeRegionLookupQuery, {
            employeeId,
            activeUserLocale: locale
          })
          const regionId: string | undefined = regionRes?.employee?.[0]?.workingCondition?.[0]?.region?.id
          if (regionId) {
            const holidaysRes = await graphqlClient.request<any>(employmentRegionHolidaysQuery, {
              activeUserLocale: locale,
              regionId
            })
            const list: any[] = holidaysRes?.holidays || []
            const monthIndex = currentMonth.getMonth()
            const year = currentMonth.getFullYear()
            const yearStr = String(year)
            const forYear = list.filter(h => String(h?.additionalValue3 ?? '') === yearStr)
            const dates = forYear
              .map(h => String(h?.alternativeCode ?? h?.code ?? ''))
              .map(code => {
                const m = /^(\d{4})(\d{2})(\d{2})$/.exec(code)
                if (!m) return null
                const y = parseInt(m[1], 10)
                const mo = parseInt(m[2], 10)
                const d = parseInt(m[3], 10)
                if (y !== year || mo !== monthIndex + 1) return null
                const dt = new Date(year, monthIndex, d)
                if (dt.getMonth() !== monthIndex) return null
                return toKey(dt)
              })
              .filter(Boolean) as string[]
            holidays = new Set(dates)
          }
        } catch {}

        // Build day map of worked minutes and keep track of attendance entry per date
        const workedByDay: Record<string, number> = {}
        const entryByDay: Record<string, TimeInterventionEntry> = {}
        for (const r of attendanceRows) {
          const day = String(r.attendanceDate)
          const eff = parseDurationToMinutes(r?.effectiveTime ? String(r.effectiveTime) : undefined)
          workedByDay[day] = (workedByDay[day] || 0) + Math.max(0, eff)
          if (r.id && !entryByDay[day]) {
            entryByDay[day] = {
              id: String(r.id),
              version: r.version,
              startTime: r.startTime ? String(r.startTime) : undefined,
              endTime: r.endTime ? String(r.endTime) : undefined,
              recordedTime: r.recordedTime ? String(r.recordedTime) : undefined,
              breakTime: r.breakTime ? String(r.breakTime) : undefined,
              effectiveTime: r.effectiveTime ? String(r.effectiveTime) : undefined,
              plannedTime: r.plannedTime ? String(r.plannedTime) : undefined,
              differenceTime: r.differenceTime ? String(r.differenceTime) : undefined,
              notes: r.notes ? String(r.notes) : undefined
            }
          }
        }

        // Fetch approved absences to exclude days covered by non-work absences (vacation, sick, etc.)
        const nonWorkAbsenceDates = new Set<string>()
        try {
          const absRes = await graphqlClient.request<any>(GET_EMPLOYEE_ABSENCES, {
            where: { employee: { id: { _eq: employeeId } }, isDeleted: { _eq: false } },
            orderBy: [{ createdAt: 'DESC' }],
            limit: 1000,
            offset: 0,
            activeUserLocale: locale
          })
          const absences: any[] = absRes?.EmployeeAbsence || []
          const WORK_ABSENCE_GROUP = 'AbsenceGroup:v1:WORK'
          for (const a of absences) {
            if (String(a.status).toUpperCase() !== 'APPROVED') continue
            const isWork = a.type?.parentEntryId === WORK_ABSENCE_GROUP
            if (isWork || !a.startDate || !a.endDate) continue
            const from = new Date(String(a.startDate))
            const to = new Date(String(a.endDate))
            const absCursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
            const absEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate())
            while (absCursor <= absEnd) {
              if (absCursor >= monthStart && absCursor <= monthEnd) {
                nonWorkAbsenceDates.add(toKey(absCursor))
              }
              absCursor.setDate(absCursor.getDate() + 1)
            }
          }
        } catch {
          // If absence query fails, proceed without absence data
        }

        const itemsAcc: TimeInterventionItem[] = []
        const cursor = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)
        while (cursor <= monthEnd) {
          const key = toKey(cursor)
          const isOff = holidays.has(key) || nonWorkAbsenceDates.has(key)
          const planned = isOff ? 0 : getPlannedMinutesForDate(cursor)
          const worked = workedByDay[key] || 0

          if (planned > 0) {
            const entry = entryByDay[key]
            const hasClockIn = Boolean(entry?.startTime)
            const hasClockOut = Boolean(entry?.endTime)
            if (hasClockIn && hasClockOut) {
              // Day is complete (both clock-in and clock-out) — no intervention needed
            } else if (worked === 0) {
              itemsAcc.push({
                date: key,
                plannedMinutes: planned,
                workedMinutes: worked,
                reason: 'NO_ATTENDANCE',
                entry
              })
            } else {
              itemsAcc.push({
                date: key,
                plannedMinutes: planned,
                workedMinutes: worked,
                reason: 'MISSING_HOURS',
                entry
              })
            }
          }
          cursor.setDate(cursor.getDate() + 1)
        }

        try {
          const { employeeAttendanceCorrectionsForRangeQuery } = await import(
            '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
          )
          const corRes = await graphqlClient.request<any>(employeeAttendanceCorrectionsForRangeQuery, {
            employeeId,
            dateFrom: toDate(monthStart),
            dateTo: toDate(monthEnd)
          })
          const terminalStatuses = new Set(['APPROVED_CORRECTION_REQUEST', 'REJECTED_CORRECTION_REQUEST'])
          const pendingDates = new Set(
            (corRes?.EmployeeAttendanceCorrectionRequest ?? [])
              .filter((r: any) => !terminalStatuses.has(String(r?.status)))
              .map((r: any) => String(r.attendanceDate))
          )
          if (pendingDates.size > 0) {
            for (const item of itemsAcc) {
              if (pendingDates.has(item.date)) {
                item.pendingCorrection = true
              }
            }
          }
        } catch {
          // If correction query fails, items keep default (no pending flag)
        }

        setItems(itemsAcc)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load interventions')
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient, employeeId, currentMonth, locale, workingHours]
  )

  useEffect(() => {
    load()
  }, [load])

  const nextMonth = useCallback(() => {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }, [])
  const prevMonth = useCallback(() => {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }, [])

  return {
    items,
    isLoading,
    error,
    currentMonth,
    nextMonth,
    prevMonth,
    refresh: () => load(true)
  }
}
