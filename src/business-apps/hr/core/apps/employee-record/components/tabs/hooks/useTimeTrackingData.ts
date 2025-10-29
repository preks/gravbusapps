'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  employeeAttendanceMonthlyQuery,
  employeeAttendanceForDateQuery,
  employeeAttendanceMonthlyAllQuery,
  employeeRegionLookupQuery,
  employmentRegionHolidaysQuery
} from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EmployeeTimeClient } from '@/common/network/employee-time/EmployeeTimeClient'

export type TimeEntry = {
  id: string
  version?: number
  // clockin table fields
  attendanceDateISO: string // LocalDate formatted as ISO string for UI
  startTimeISO?: string // Instant
  endTimeISO?: string // Instant
  recordedTime?: string // Text like "8h"
  breakTime?: string // Text like "0h 30m"
  effectiveTime?: string // Text like "7h 30m"
  plannedTime?: string // Text like "8h"
  differenceTime?: string // Text like "-30m" or "-1h"
  manualOverride?: boolean
  notes?: string
  // optional external workflow status (kept for UI badge if available)
  status?: 'approved' | 'pending' | 'rejected' | 'open'
  // derived for internal calculations (not rendered directly)
  totalMinutes?: number
}

export type SortDirection = 'asc' | 'desc'

export interface UseTimeTrackingDataOptions extends Pick<BusinessAppContextProps, 'accessToken'> {
  employeeId: string
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

export const useTimeTrackingData = ({ employeeId, accessToken, workingHours }: UseTimeTrackingDataOptions) => {
  const locale = getCurrentActiveUserLocale()
  const graphqlClient = useGraphQLClient(accessToken)

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInSince, setClockInSince] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search removed per requirements
  const [sortKey, setSortKey] = useState<keyof TimeEntry>('startTimeISO')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  // monthly totals (minutes)
  const [monthlyRequiredMinutes, setMonthlyRequiredMinutes] = useState(0)
  const [monthlyRequiredUntilYesterdayMinutes, setMonthlyRequiredUntilYesterdayMinutes] = useState(0)
  const [monthlyWorkedUntilYesterdayMinutes, setMonthlyWorkedUntilYesterdayMinutes] = useState(0)

  const prevMonth = useCallback(() => {
    setPage(1)
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }, [])

  const nextMonth = useCallback(() => {
    setPage(1)
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }, [])

  // very small helper to parse duration text like "7h 30m" or "0h" into minutes (no backtracking)
  const parseDurationToMinutes = (text?: string): number => {
    if (!text) return 0
    let hours = 0
    let minutes = 0
    const tokens = String(text).trim().split(/\s+/)
    for (const token of tokens) {
      if (/^\d+h$/i.test(token)) {
        hours = parseInt(token.slice(0, -1), 10) || 0
      } else if (/^\d+m$/i.test(token)) {
        minutes = parseInt(token.slice(0, -1), 10) || 0
      }
    }
    return hours * 60 + minutes
  }

  const formatMinutes = (minutes: number): string => {
    const sign = minutes < 0 ? '-' : ''
    const abs = Math.abs(minutes)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    if (m === 0) return `${sign}${h}h`
    return `${sign}${h}h ${m}m`
  }

  const getPlannedMinutesForDate = (dateIso: string): number => {
    if (!workingHours) return 0
    const d = new Date(dateIso)
    const day = d.getDay() // 0..6
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
    return typeof hours === 'number' ? Math.max(0, Math.round(hours * 60)) : 0
  }

  const toDateString = (d: Date) => d.toISOString().slice(0, 10)
  const toLocalDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const mapAttendanceToEntry = (row: any): TimeEntry => {
    // GraphQL returns ISO values already; ensure strings
    const startIso = row.startTime ? String(row.startTime) : undefined
    const endIso = row.endTime ? String(row.endTime) : undefined
    // Effective, planned, difference, break are returned as strings, keep them
    const totalMinutes = parseDurationToMinutes(row.effectiveTime)
    return {
      id: row.id,
      version: row.version,
      attendanceDateISO: new Date(row.attendanceDate).toISOString(),
      startTimeISO: startIso,
      endTimeISO: endIso,
      recordedTime: row.recordedTime,
      breakTime: '1h',
      effectiveTime: row.effectiveTime,
      plannedTime: row.plannedTime,
      differenceTime: row.differenceTime,
      manualOverride: Boolean(row.manualOverride),
      notes: row.notes ?? '',
      status: 'approved',
      totalMinutes
    }
  }

  const loadFromGraphql = useCallback(async () => {
    setError(null)
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const variables = {
      employeeId,
      dateFrom: toDateString(monthStart),
      dateTo: toDateString(monthEnd),
      limit: pageSize,
      offset: (page - 1) * pageSize
    }

    const result = await graphqlClient.request<any>(employeeAttendanceMonthlyQuery, variables)
    const rows = result?.EmployeeAttendance ?? []
    const list: TimeEntry[] = rows.map(mapAttendanceToEntry)
    setAllEntries(list)
    const count = result?.EmployeeAttendance_aggregate?.aggregate?.count ?? list.length
    setTotalCount(count)

    // derive open state from most recent row (ordered by startTime desc)
    const mostRecent = rows[0]
    const open = Boolean(mostRecent?.startTime) && !mostRecent?.endTime
    setIsClockedIn(open)
    setClockInSince(
      open && mostRecent?.startTime
        ? new Date(mostRecent.startTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
        : null
    )

    // Resolve region holidays and build a set of holiday dates for current month
    const activeLocale = locale || 'en-US'
    let holidayDateSet = new Set<string>()
    try {
      const regionRes = await graphqlClient.request<any>(employeeRegionLookupQuery, {
        employeeId,
        activeUserLocale: activeLocale
      })
      const regionCode: string | undefined = regionRes?.employee?.[0]?.workingCondition?.[0]?.region?.id
      if (regionCode) {
        const holidaysRes = await graphqlClient.request<any>(employmentRegionHolidaysQuery, {
          activeUserLocale: activeLocale,
          regionId: regionCode
        })
        const holidays: any[] = holidaysRes?.holidays || []
        const monthIndex = currentMonth.getMonth()
        const year = currentMonth.getFullYear()
        const yearStr = String(year)
        // First, filter by year using additionalValue3
        const holidaysForYear = holidays.filter(h => String(h?.additionalValue3 ?? '') === yearStr)
        const dates: string[] = holidaysForYear
          .map(h => String(h?.alternativeCode ?? h?.code ?? ''))
          .map(code => {
            // Codes come as YYYYMMDD, e.g., 20251010
            const dateCodeRegex = /^(\d{4})(\d{2})(\d{2})$/
            const parts = dateCodeRegex.exec(code)
            if (!parts) return null
            const y = parseInt(parts[1], 10)
            const m = parseInt(parts[2], 10) // 1-12
            const d = parseInt(parts[3], 10)
            if (y !== year || m !== monthIndex + 1) return null
            if (Number.isNaN(d) || d < 1 || d > 31) return null
            const date = new Date(year, monthIndex, d)
            if (date.getMonth() !== monthIndex || date.getFullYear() !== year) return null
            return toLocalDateKey(date)
          })
          .filter(Boolean) as string[]
        holidayDateSet = new Set(dates)
      }
    } catch (e) {
      // ignore holiday fetch errors for now
      console.error(e)
    }

    // Compute monthly required totals based on working hours pattern, excluding holidays
    const computeRequiredMinutesForRange = (from: Date, to: Date) => {
      let acc = 0
      const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
      while (cursor <= end) {
        const key = toLocalDateKey(cursor)
        if (!holidayDateSet.has(key)) {
          acc += getPlannedMinutesForDate(cursor.toISOString())
        }
        cursor.setDate(cursor.getDate() + 1)
      }
      return acc
    }

    const monthRequired = computeRequiredMinutesForRange(monthStart, monthEnd)
    setMonthlyRequiredMinutes(monthRequired)

    // until yesterday (inclusive)
    const today = new Date()
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
    const untilDate = yesterday < monthStart ? monthStart : yesterday > monthEnd ? monthEnd : yesterday
    const monthRequiredUntilYesterday =
      untilDate < monthStart ? 0 : computeRequiredMinutesForRange(monthStart, untilDate)
    setMonthlyRequiredUntilYesterdayMinutes(monthRequiredUntilYesterday)

    // Fetch all rows for the month to compute worked minutes until yesterday
    const allRes = await graphqlClient.request<any>(employeeAttendanceMonthlyAllQuery, {
      employeeId,
      dateFrom: toDateString(monthStart),
      dateTo: toDateString(monthEnd)
    })
    const allRows: any[] = allRes?.EmployeeAttendance ?? []
    // Use today's local date as the upper bound and exclude it (strictly <)
    const todayLocal = new Date()
    const untilDay = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(
      todayLocal.getDate()
    ).padStart(2, '0')}`
    const workedUntilYesterday = allRows.reduce((acc: number, r: any) => {
      const rowDay = String(r.attendanceDate) // format YYYY-MM-DD
      if (rowDay < untilDay) {
        const effective = parseDurationToMinutes(r?.effectiveTime ? String(r.effectiveTime) : undefined)
        // Only count effective time; ignore recorded time entirely
        return acc + Math.max(0, effective)
      }
      return acc
    }, 0)
    setMonthlyWorkedUntilYesterdayMinutes(workedUntilYesterday)
  }, [graphqlClient, employeeId, currentMonth, page, pageSize, locale])

  useEffect(() => {
    loadFromGraphql().catch(() => setError('Failed to load time entries'))
  }, [loadFromGraphql])

  const clockIn = useCallback(async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const now = new Date()
      const today = now.toISOString().slice(0, 10)
      const isoNow = now.toISOString()

      // Server-verified check: query today's attendance rows
      const todayRows = await graphqlClient.request<any>(employeeAttendanceForDateQuery, {
        employeeId,
        date: today
      })
      const rowsToday = todayRows?.EmployeeAttendance ?? []
      const hasOpenToday = rowsToday.some((r: any) => r.startTime && !r.endTime)
      const hasClosedToday = rowsToday.some((r: any) => r.startTime && r.endTime)
      if (isClockedIn || hasOpenToday || hasClosedToday) {
        setIsSubmitting(false)
        setError(
          hasOpenToday
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.open_clock_in_today',
                'You already have an open clock-in today.'
              )
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.already_recorded_today',
                'You already recorded attendance for today.'
              )
        )
        return
      }

      const client = new EmployeeTimeClient()
      if (accessToken) client.setAccessToken(accessToken)

      await client.createEmployeeAttendance({
        employeeAttendance: {
          version: 0,
          employeeAttendanceTypeRef: 'EmployeeAttendanceType:v1:WORKING_DAY',
          attendanceDate: today,
          startTime: isoNow,
          recordedTime: '0h',
          breakTime: '1h',
          effectiveTime: '0h',
          plannedTime: '8h',
          differenceTime: '0h',
          manualOverride: false,
          notes: 'Clock-in',
          employee: employeeId
        }
      })

      setIsClockedIn(true)
      setClockInSince(now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }))

      // Refresh current page
      await loadFromGraphql()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clock-in failed')
    } finally {
      setIsSubmitting(false)
    }
  }, [accessToken, employeeId, locale, loadFromGraphql])

  const clockOut = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const now = new Date()
      const isoNow = now.toISOString()

      // Most recent record is first; must be open (no endTime)
      const mostRecent = allEntries[0]
      if (!mostRecent || mostRecent.endTimeISO) {
        setIsSubmitting(false)
        return
      }

      const client = new EmployeeTimeClient()
      if (accessToken) client.setAccessToken(accessToken)

      const start = new Date(mostRecent.startTimeISO as string)
      const recordedMs = Math.max(0, now.getTime() - start.getTime())
      const recordedMinutes = Math.max(0, Math.round(recordedMs / 60000))
      const plannedMinutes = getPlannedMinutesForDate(mostRecent.attendanceDateISO)
      // hardcoded 1h break
      const breakMinutes = 60
      const effectiveMinutes = recordedMinutes + breakMinutes
      const diffMs = effectiveMinutes * 60000 - plannedMinutes * 60000
      const diffMinutes = diffMs === 0 ? 0 : Math.sign(diffMs) * Math.ceil(Math.abs(diffMs) / 60000)

      await client.updateEmployeeAttendance({
        employeeAttendance: {
          id: mostRecent.id,
          version: typeof mostRecent.version === 'number' ? mostRecent.version : 0,
          endTime: isoNow,
          recordedTime: formatMinutes(recordedMinutes),
          effectiveTime: formatMinutes(effectiveMinutes),
          breakTime: formatMinutes(breakMinutes),
          plannedTime: formatMinutes(plannedMinutes),
          differenceTime: formatMinutes(diffMinutes),
          notes: 'Clock-out'
        }
      })

      setIsClockedIn(false)
      setClockInSince(null)
      await loadFromGraphql()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clock-out failed')
    } finally {
      setIsSubmitting(false)
    }
  }, [accessToken, allEntries, loadFromGraphql])

  // Derive displayed entries from allEntries + controls
  useEffect(() => {
    const sorted = [...allEntries].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const cmp = String(va ?? '').localeCompare(String(vb ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
    // Server-side pagination used; just set received page
    setEntries(sorted)
  }, [allEntries, sortKey, sortDir, locale])

  const paginationInfo = useMemo(() => {
    const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
    const end = Math.min(page * pageSize, totalCount)
    return { start, end, totalCount }
  }, [page, pageSize, totalCount])

  return {
    // state
    currentMonth,
    isClockedIn,
    clockInSince,
    isSubmitting,
    error,
    entries,
    totalCount,
    page,
    pageSize,
    sortKey,
    sortDir,
    paginationInfo,
    monthlyRequiredMinutes,
    monthlyRequiredUntilYesterdayMinutes,
    monthlyWorkedUntilYesterdayMinutes,
    // actions
    setSort: (key: keyof TimeEntry, dir: SortDirection) => {
      setPage(1)
      setSortKey(key)
      setSortDir(dir)
    },
    setPage: (p: number) => setPage(p),
    setPageSize: (s: number) => {
      setPage(1)
      setPageSize(s)
    },
    prevMonth,
    nextMonth,
    clockIn,
    clockOut
  }
}
