'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  employeeAttendanceMonthlyQuery,
  employeeAttendanceForDateQuery,
  employeeAttendanceMonthlyAllQuery,
  employeeRegionLookupQuery,
  employmentRegionHolidaysQuery,
  employeeAttendanceMonthlyAllQuery as allQuery
} from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EmployeeTimeClient } from '@/common/network/employee-time/EmployeeTimeClient'
import { fetchOfficeAndGeoLocation } from '../../../services/service-geo-location/geoLocationService'

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
  // persisted location enum from BE
  attendanceLocation?: 'UNKNOWN_LOCATION' | 'IS_NEAR_HOME' | 'IS_NEAR_OFFICE' | 'IS_OTHER_LOCATION'
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
  const [workedDaysUntilYesterdayCount, setWorkedDaysUntilYesterdayCount] = useState(0)
  const [dailyAverageWorkedMinutesUntilYesterday, setDailyAverageWorkedMinutesUntilYesterday] = useState(0)
  const [overtimeMinutesUntilYesterday, setOvertimeMinutesUntilYesterday] = useState(0)
  // today's totals
  const [todaysWorkedMinutes, setTodaysWorkedMinutes] = useState(0)
  const [todaysProjectMinutes, setTodaysProjectMinutes] = useState(0)
  const [todaysPlannedMinutes, setTodaysPlannedMinutes] = useState(0)
  const [todayRecordedMinutes, setTodayRecordedMinutes] = useState(0)
  // proximity info parsed from notes of most recent entry (today)
  const [isNearHome, setIsNearHome] = useState<boolean>(false)
  const [isNearOffice, setIsNearOffice] = useState<boolean>(false)
  // whether there is any attendance record (open or closed) for today
  const [hasTodayAttendanceRecord, setHasTodayAttendanceRecord] = useState<boolean>(false)
  // transient message shown after user confirms a new location from modal
  const [locationBanner, setLocationBanner] = useState<null | 'home' | 'office' | 'remote'>(null)

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
        hours = Number.parseInt(token.slice(0, -1), 10) || 0
      } else if (/^\d+m$/i.test(token)) {
        minutes = Number.parseInt(token.slice(0, -1), 10) || 0
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
      attendanceLocation: row?.attendanceLocation ?? undefined,
      status: 'open',
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

    // Enhancement: if open entry is from a past day, allow new clock-in (treat as not clocked in)
    let isOpenAndToday = open
    if (open && mostRecent?.attendanceDate) {
      const todayKey = toLocalDateKey(new Date())
      const rowKey = toLocalDateKey(new Date(mostRecent.attendanceDate))
      if (rowKey !== todayKey) {
        isOpenAndToday = false
      }
    }

    setIsClockedIn(isOpenAndToday)
    setClockInSince(
      isOpenAndToday && mostRecent?.startTime ? String(formatDate(mostRecent.startTime, 'time.short')) : null
    )

    // Parse proximity flags from attendanceLocation field when it's from today
    try {
      const attLoc: string = String(mostRecent?.attendanceLocation ?? 'UNKNOWN_LOCATION')
      setIsNearHome(attLoc === 'IS_NEAR_HOME')
      setIsNearOffice(attLoc === 'IS_NEAR_OFFICE')
    } catch {
      setIsNearHome(false)
      setIsNearOffice(false)
    }

    // compute today's worked minutes
    try {
      const todayKeyLocal = toLocalDateKey(new Date())
      let todayMinutes = 0
      let todayRecordedMinutes = 0
      const todayRow = rows.find((r: any) => String(r?.attendanceDate) === todayKeyLocal)
      setHasTodayAttendanceRecord(Boolean(todayRow?.startTime || todayRow?.endTime))
      if (todayRow?.effectiveTime) {
        todayMinutes = parseDurationToMinutes(String(todayRow.effectiveTime))
        todayRecordedMinutes = parseDurationToMinutes(String(todayRow.recordedTime))
      }
      if (isOpenAndToday && mostRecent?.startTime) {
        const now = new Date()
        const start = new Date(mostRecent.startTime)
        const recorded = Math.max(0, Math.round((now.getTime() - start.getTime()) / 60000))
        // assume 1h break for simplicity, capped at recorded
        const effective = Math.max(0, recorded - 60)
        todayMinutes = Math.max(todayMinutes, effective)
        todayRecordedMinutes = Math.max(todayRecordedMinutes, recorded)
      }
      setTodaysWorkedMinutes(todayMinutes)
      setTodayRecordedMinutes(todayRecordedMinutes)
    } catch {
      setTodaysWorkedMinutes(0)
    }
    // no project tracking yet in this screen
    setTodaysProjectMinutes(0)

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
    let workedUntilYesterday = 0
    const daysWithEntries = new Set<string>()
    for (const r of allRows) {
      const rowDay = String(r.attendanceDate)
      // Exclude today from daily average; consider strictly earlier days
      if (rowDay < untilDay) {
        const effective = parseDurationToMinutes(r?.effectiveTime ? String(r.effectiveTime) : undefined)
        const eff = Math.max(0, effective)
        workedUntilYesterday += eff
        // Count days that have any attendance entry, regardless of effective minutes
        daysWithEntries.add(rowDay)
      }
    }
    setMonthlyWorkedUntilYesterdayMinutes(workedUntilYesterday)
    const workedDaysCount = daysWithEntries.size
    setWorkedDaysUntilYesterdayCount(workedDaysCount)
    setDailyAverageWorkedMinutesUntilYesterday(
      workedDaysCount > 0 ? Math.round(workedUntilYesterday / workedDaysCount) : 0
    )
    setOvertimeMinutesUntilYesterday(Math.max(0, workedUntilYesterday - (monthRequiredUntilYesterday || 0)))

    // planned minutes for today from working hours
    try {
      const todayIso = new Date().toISOString()
      setTodaysPlannedMinutes(getPlannedMinutesForDate(todayIso))
    } catch {
      setTodaysPlannedMinutes(0)
    }
  }, [graphqlClient, employeeId, currentMonth, page, pageSize, locale, workingHours])

  useEffect(() => {
    loadFromGraphql().catch(() => setError('Failed to load time entries'))
  }, [loadFromGraphql])

  // Ensure planned minutes for today are recalculated when workingHours arrive later
  useEffect(() => {
    try {
      const todayIso = new Date().toISOString()
      setTodaysPlannedMinutes(getPlannedMinutesForDate(todayIso))
    } catch {
      // ignore
    }
  }, [workingHours])
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

      // Determine proximity and set attendanceLocation
      let attendanceLocation: 'UNKNOWN_LOCATION' | 'IS_NEAR_HOME' | 'IS_NEAR_OFFICE' | 'IS_OTHER_LOCATION' =
        'UNKNOWN_LOCATION'
      try {
        const geo = await fetchOfficeAndGeoLocation(graphqlClient, employeeId)
        const nearHome = Boolean(geo?.comparisons?.isNearHome)
        const nearOffice = Boolean(geo?.comparisons?.isNearOffice)
        attendanceLocation = nearHome ? 'IS_NEAR_HOME' : nearOffice ? 'IS_NEAR_OFFICE' : 'IS_OTHER_LOCATION'
      } catch {
        // Ignore geo errors; leave UNKNOWN_LOCATION
      }

      await client.createEmployeeAttendance({
        employeeAttendance: {
          version: 0,
          employeeAttendanceTypeRef: 'EmployeeAttendanceType:v1:WORKING_DAY',
          attendanceDate: today,
          startTime: isoNow,
          recordedTime: '0h',
          breakTime: '1h',
          effectiveTime: '0h',
          plannedTime: formatMinutes(getPlannedMinutesForDate(isoNow)),
          differenceTime: '0h',
          manualOverride: false,
          notes: 'Clock-in',
          attendanceLocation,
          employee: employeeId
        }
      })

      setIsClockedIn(true)
      setClockInSince(String(formatDate(now, 'time.short')))
      setHasTodayAttendanceRecord(true)
      // show welcome banner in right panel for 5s based on detected location
      try {
        const banner =
          attendanceLocation === 'IS_NEAR_HOME' ? 'home' : attendanceLocation === 'IS_NEAR_OFFICE' ? 'office' : 'remote'
        setIsNearHome(banner === 'home')
        setIsNearOffice(banner === 'office')
        setLocationBanner(banner)
        setTimeout(() => setLocationBanner(null), 5000)
      } catch {
        // ignore banner errors
      }

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
      // Use existing break time if present; otherwise 0
      const breakMinutes = parseDurationToMinutes(mostRecent.breakTime || '0h')
      const effectiveMinutes = Math.max(0, recordedMinutes - breakMinutes)
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

  /**
   * Update today's attendance location and show a short welcome banner
   */
  const updateLocationSelection = useCallback(
    async (selection: 'home' | 'office' | 'remote') => {
      try {
        const newLoc =
          selection === 'home' ? 'IS_NEAR_HOME' : selection === 'office' ? 'IS_NEAR_OFFICE' : 'IS_OTHER_LOCATION'

        const today = new Date()
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

        const allRes = await graphqlClient.request<any>(allQuery, {
          employeeId,
          dateFrom: toDateString(monthStart),
          dateTo: toDateString(monthEnd)
        })
        const allRows: any[] = allRes?.EmployeeAttendance ?? []
        const todayStr = toLocalDateKey(today)
        const todays = allRows.filter(r => String(r.attendanceDate) === todayStr)
        const target = todays[todays.length - 1] || todays[0]
        if (target?.id) {
          const client = new EmployeeTimeClient()
          if (accessToken) client.setAccessToken(accessToken)
          await client.updateEmployeeAttendance({
            employeeAttendance: {
              id: target.id,
              version: typeof target.version === 'number' ? target.version : 0,
              attendanceLocation: newLoc
            }
          })
        }

        // Update local flags immediately and show banner for 5s
        setIsNearHome(selection === 'home')
        setIsNearOffice(selection === 'office')
        setLocationBanner(selection)
        setTimeout(() => setLocationBanner(null), 5000)
      } catch {
        // still update local state for UX
        setIsNearHome(selection === 'home')
        setIsNearOffice(selection === 'office')
        setLocationBanner(selection)
        setTimeout(() => setLocationBanner(null), 5000)
      }
    },
    [accessToken, employeeId, graphqlClient]
  )

  return {
    // state
    currentMonth,
    isClockedIn,
    clockInSince,
    isSubmitting,
    error,
    isNearHome,
    isNearOffice,
    hasTodayAttendanceRecord,
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
    workedDaysUntilYesterdayCount,
    dailyAverageWorkedMinutesUntilYesterday,
    overtimeMinutesUntilYesterday,
    todaysWorkedMinutes,
    todaysProjectMinutes,
    todaysPlannedMinutes,
    todayRecordedMinutes,
    locationBanner,
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
    clockOut,
    updateLocationSelection
  }
}
