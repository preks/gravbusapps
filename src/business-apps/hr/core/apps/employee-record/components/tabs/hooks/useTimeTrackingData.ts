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
import { GET_EMPLOYEE_ABSENCES } from '@/business-apps/hr/absences/apps/personal-absences/queries/graphql'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EmployeeTimeClient } from '@/common/network/employee-time/EmployeeTimeClient'
import {
  fetchOfficeAndGeoLocation,
  fetchEmployeeLocationCoords
} from '../../../services/service-geo-location/geoLocationService'
import {
  parseDurationToMinutes,
  minutesToHHMM,
  minutesToSignedHHMM
} from '@/business-apps/hr/core/apps/my-time/utils/duration'
import { getActiveWorkingHours } from '@/business-apps/hr/core/utils/workingHoursUtils'

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
  // derived attendance status for UI badge
  status?: 'in_progress' | 'completed' | 'incomplete' | 'under_review'
  // derived for internal calculations (not rendered directly)
  totalMinutes?: number
  isPlaceholder?: boolean
  dayType?: 'holiday' | 'non_working' | 'weekend'
  /** Holiday display name from catalog (e.g. "Easter Monday") when dayType is holiday */
  holidayLabel?: string
  /** Absence type label (e.g. "Vacation", "Relocation") when day has personal absence */
  absenceLabel?: string
  /** True when the date is before the employee hire date and should not count toward time obligations */
  isBeforeHireDate?: boolean
}

export type SortDirection = 'asc' | 'desc'

type WorkingHoursSchedule = {
  activeFrom?: string | null
  activeTo?: string | null
  sundayHours?: number
  mondayHours?: number
  tuesdayHours?: number
  wednesdayHours?: number
  thursdayHours?: number
  fridayHours?: number
  saturdayHours?: number
}

export interface UseTimeTrackingDataOptions extends Pick<BusinessAppContextProps, 'accessToken'> {
  employeeId: string
  hireDate?: string
  clockInBeforeHireDateMessage?: string
  workingHours?: WorkingHoursSchedule | WorkingHoursSchedule[]
}

export const useTimeTrackingData = ({
  employeeId,
  accessToken,
  hireDate,
  clockInBeforeHireDateMessage,
  workingHours
}: UseTimeTrackingDataOptions) => {
  const locale = getCurrentActiveUserLocale()
  const graphqlClient = useGraphQLClient(accessToken)

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInSince, setClockInSince] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search removed per requirements
  const [sortKey, setSortKey] = useState<keyof TimeEntry>('attendanceDateISO')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([])
  const [allMonthEntries, setAllMonthEntries] = useState<TimeEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [holidayDates, setHolidayDates] = useState<string[]>([])
  const [holidayNamesByDate, setHolidayNamesByDate] = useState<Record<string, string>>({})
  const [absenceLabelsByDate, setAbsenceLabelsByDate] = useState<Record<string, string>>({})
  const [workAbsenceDates, setWorkAbsenceDates] = useState<Set<string>>(new Set())
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
  // Whether the employee's home/office records carry stored latitude+longitude. Used by
  // the location card to surface a "address needs review" warning when either side is
  // missing (legacy data, or pre-backfill). Pre-fetched on mount so the warning is
  // visible BEFORE the user attempts to clock in. Default to true so we don't flash a
  // bogus warning during the initial fetch.
  const [homeHasCoords, setHomeHasCoords] = useState<boolean>(true)
  const [officeHasCoords, setOfficeHasCoords] = useState<boolean>(true)
  // whether there is any attendance record (open or closed) for today
  const [hasTodayAttendanceRecord, setHasTodayAttendanceRecord] = useState<boolean>(false)
  // transient message shown after user confirms a new location from modal
  const [locationBanner, setLocationBanner] = useState<null | 'home' | 'office' | 'remote'>(null)

  // Pre-fetch home + office coord availability on mount so the location card can show
  // the "address needs review" warning before the user attempts to clock in. We do
  // this without requesting the device geolocation — that prompt is reserved for the
  // actual clock-in action so users don't see a permission popup on page open.
  useEffect(() => {
    if (!employeeId) return
    let cancelled = false
    void (async () => {
      try {
        const availability = await fetchEmployeeLocationCoords(graphqlClient, employeeId)
        if (cancelled) return
        setHomeHasCoords(availability.homeHasCoords)
        setOfficeHasCoords(availability.officeHasCoords)
      } catch {
        // Leave the defaults as-is on failure — the hook will just not show the
        // warning. The clock-in path will surface the missing coords again at submit
        // time and the enum will fall through to IS_OTHER_LOCATION.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [graphqlClient, employeeId])

  const prevMonth = useCallback(() => {
    setPage(1)
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }, [])

  const nextMonth = useCallback(() => {
    setPage(1)
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }, [])

  // parseDurationToMinutes / minutesToHHMM from shared My Time utils

  const getPlannedMinutesForDate = (dateIso: string): number => {
    if (!workingHours) return 0
    const workingHoursForDate = Array.isArray(workingHours)
      ? getActiveWorkingHours(workingHours, dateIso)
      : workingHours
    if (!workingHoursForDate) return 0

    const d = new Date(dateIso)
    const day = d.getDay() // 0..6
    const hoursByDay = [
      workingHoursForDate.sundayHours,
      workingHoursForDate.mondayHours,
      workingHoursForDate.tuesdayHours,
      workingHoursForDate.wednesdayHours,
      workingHoursForDate.thursdayHours,
      workingHoursForDate.fridayHours,
      workingHoursForDate.saturdayHours
    ]
    const hours = hoursByDay[day] ?? 0
    return typeof hours === 'number' ? Math.max(0, Math.round(hours * 60)) : 0
  }

  const toLocalDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const hireDateKey = useMemo(() => {
    if (!hireDate) return undefined
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(hireDate)
    if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`

    const parsed = new Date(hireDate)
    if (Number.isNaN(parsed.getTime())) return undefined
    return toLocalDateKey(parsed)
  }, [hireDate])

  const isBeforeHireDate = useCallback(
    (dateKey: string) => Boolean(hireDateKey && dateKey < hireDateKey),
    [hireDateKey]
  )

  const isBeforeHireDateToday = useMemo(
    () => Boolean(hireDateKey && toLocalDateKey(new Date()) < hireDateKey),
    [hireDateKey]
  )

  const getPlannedMinutesForActiveDate = (dateIso: string): number => {
    const key = toLocalDateKey(new Date(dateIso))
    if (isBeforeHireDate(key)) return 0
    return getPlannedMinutesForDate(dateIso)
  }

  const deriveAttendanceStatus = (
    startIso?: string,
    endIso?: string,
    attendanceDateISO?: string
  ): TimeEntry['status'] => {
    if (!startIso && !endIso) return undefined
    if (startIso && endIso) return 'completed'
    const todayKey = toLocalDateKey(new Date())
    const entryKey = attendanceDateISO ? toLocalDateKey(new Date(attendanceDateISO)) : ''
    if (startIso && !endIso) {
      return entryKey === todayKey ? 'in_progress' : 'incomplete'
    }
    return 'incomplete'
  }

  const mapAttendanceToEntry = (row: any): TimeEntry => {
    const startIso = row.startTime ? String(row.startTime) : undefined
    const endIso = row.endTime ? String(row.endTime) : undefined
    const totalMinutes = parseDurationToMinutes(row.effectiveTime)
    const attendanceDateISO = new Date(row.attendanceDate).toISOString()
    return {
      id: row.id,
      version: row.version,
      attendanceDateISO,
      startTimeISO: startIso,
      endTimeISO: endIso,
      recordedTime: row.recordedTime,
      breakTime: row.breakTime ?? '1h',
      effectiveTime: row.effectiveTime,
      plannedTime: row.plannedTime,
      differenceTime: row.differenceTime,
      manualOverride: Boolean(row.manualOverride),
      notes: row.notes ?? '',
      attendanceLocation: row?.attendanceLocation ?? undefined,
      status: deriveAttendanceStatus(startIso, endIso, attendanceDateISO),
      totalMinutes
    }
  }

  const loadFromGraphql = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const variables = {
      employeeId,
      dateFrom: toLocalDateKey(monthStart),
      dateTo: toLocalDateKey(monthEnd),
      limit: pageSize,
      offset: (page - 1) * pageSize
    }

    const result = await graphqlClient.request<any>(employeeAttendanceMonthlyQuery, variables)
    const rows = result?.EmployeeAttendance ?? []
    const list: TimeEntry[] = rows.map(mapAttendanceToEntry)

    let correctionDates: Set<string> = new Set()
    try {
      const { employeeAttendanceCorrectionsForRangeQuery } = await import(
        '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
      )
      const corRes = await graphqlClient.request<any>(employeeAttendanceCorrectionsForRangeQuery, {
        employeeId,
        dateFrom: variables.dateFrom,
        dateTo: variables.dateTo
      })
      const terminalStatuses = new Set(['APPROVED_CORRECTION_REQUEST', 'REJECTED_CORRECTION_REQUEST'])
      correctionDates = new Set(
        (corRes?.EmployeeAttendanceCorrectionRequest ?? [])
          .filter((r: any) => !terminalStatuses.has(String(r?.status)))
          .map((r: any) => String(r.attendanceDate))
      )
      if (correctionDates.size > 0) {
        for (const entry of list) {
          const entryDay = toLocalDateKey(new Date(entry.attendanceDateISO))
          if (correctionDates.has(entryDay)) {
            entry.status = 'under_review'
          }
        }
      }
    } catch {
      // If the correction query fails, keep default statuses
    }

    setAllEntries(list)

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

    // Resolve region holidays and build a set of holiday dates + names for current month
    const activeLocale = locale || 'en-US'
    const holidayDateSet = new Set<string>()
    const namesByDate: Record<string, string> = {}
    try {
      const regionRes = await graphqlClient.request<any>(employeeRegionLookupQuery, {
        employeeId,
        activeUserLocale: activeLocale,
        today: new Date().toISOString()
      })
      const regionCodeRaw: string | undefined = regionRes?.employee?.[0]?.workingCondition?.[0]?.region?.id
      if (regionCodeRaw) {
        let regionCode = regionCodeRaw
        try {
          const seg = String(regionCodeRaw).split(':').pop() || ''
          if (seg.startsWith('RO') && seg !== 'ROU') {
            regionCode = 'EmploymentRegion:v1:ROU'
          }
        } catch {}
        const holidaysRes = await graphqlClient.request<any>(employmentRegionHolidaysQuery, {
          activeUserLocale: activeLocale,
          regionId: regionCode
        })
        const holidays: any[] = holidaysRes?.holidays || []
        const monthIndex = currentMonth.getMonth()
        const year = currentMonth.getFullYear()
        const yearStr = String(year)
        const holidaysForYear = holidays.filter(h => String(h?.additionalValue3 ?? '') === yearStr)
        holidaysForYear.forEach((h: any) => {
          const code = String(h?.alternativeCode ?? h?.code ?? '')
          const dateCodeRegex = /^(\d{4})(\d{2})(\d{2})$/
          const parts = dateCodeRegex.exec(code)
          if (!parts) return
          const y = parseInt(parts[1], 10)
          const m = parseInt(parts[2], 10) // 1-12
          const d = parseInt(parts[3], 10)
          if (y !== year || m !== monthIndex + 1) return
          if (Number.isNaN(d) || d < 1 || d > 31) return
          const date = new Date(year, monthIndex, d)
          if (date.getMonth() !== monthIndex || date.getFullYear() !== year) return
          const dateKey = toLocalDateKey(date)
          holidayDateSet.add(dateKey)
          const label = h.translations?.[0]?.value || h.value || ''
          namesByDate[dateKey] = (label && String(label).trim()) || 'Holiday'
        })
      }
    } catch (e) {
      // ignore holiday fetch errors for now
      console.error(e)
    }
    setHolidayNamesByDate(namesByDate)
    setHolidayDates(Array.from(holidayDateSet))

    // Fetch personal absences (Vacation, Relocation, Health Cure, etc.) — same query as Personal Absences calendar
    const absenceLabelsByDateMap: Record<string, string> = {}
    const workAbsenceDateSet = new Set<string>()
    try {
      const absRes = await graphqlClient.request<any>(GET_EMPLOYEE_ABSENCES, {
        where: { employee: { id: { _eq: employeeId } }, isDeleted: { _eq: false } },
        orderBy: [{ createdAt: 'DESC' }],
        limit: 1000,
        offset: 0,
        activeUserLocale: activeLocale
      })
      const absences: any[] = absRes?.EmployeeAbsence || []
      const WORK_ABSENCE_GROUP = 'AbsenceGroup:v1:WORK'
      const addAbsenceRange = (fromIso: string, toIso: string, label: string, isWork: boolean) => {
        const from = new Date(fromIso)
        const to = new Date(toIso)
        const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
        const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
        while (cursor <= end) {
          const key = toLocalDateKey(cursor)
          if (cursor >= monthStart && cursor <= monthEnd) {
            const existing = absenceLabelsByDateMap[key]
            absenceLabelsByDateMap[key] = existing ? `${existing}, ${label}` : label
            if (isWork) workAbsenceDateSet.add(key)
          }
          cursor.setDate(cursor.getDate() + 1)
        }
      }
      for (const a of absences) {
        if (String(a.status).toUpperCase() !== 'APPROVED') continue
        const isWork = a.type?.parentEntryId === WORK_ABSENCE_GROUP
        const translation = (a.type?.translations as { localeCode?: string; value?: string }[] | undefined)?.find(
          tr => tr.localeCode === activeLocale
        )
        const label = translation?.value ?? a.type?.translations?.[0]?.value ?? a.type?.objectValue ?? ''
        const trimmed = (label && String(label).trim()) || 'Absence'
        if (a.startDate && a.endDate) {
          addAbsenceRange(String(a.startDate), String(a.endDate), trimmed, isWork)
        }
      }
    } catch (e) {
      console.error(e)
    }
    setAbsenceLabelsByDate(absenceLabelsByDateMap)
    setWorkAbsenceDates(workAbsenceDateSet)

    // Compute monthly required totals based on working hours pattern, excluding holidays and non-work absences
    const computeRequiredMinutesForRange = (from: Date, to: Date) => {
      let acc = 0
      const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
      while (cursor <= end) {
        const key = toLocalDateKey(cursor)
        const hasNonWorkAbsence = absenceLabelsByDateMap[key] && !workAbsenceDateSet.has(key)
        if (!isBeforeHireDate(key) && !holidayDateSet.has(key) && !hasNonWorkAbsence) {
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
      dateFrom: toLocalDateKey(monthStart),
      dateTo: toLocalDateKey(monthEnd)
    })
    const allRows: any[] = allRes?.EmployeeAttendance ?? []
    const allMapped = allRows.map(mapAttendanceToEntry)
    if (correctionDates.size > 0) {
      for (const entry of allMapped) {
        const entryDay = toLocalDateKey(new Date(entry.attendanceDateISO))
        if (correctionDates.has(entryDay)) {
          entry.status = 'under_review'
        }
      }
    }
    setAllMonthEntries(allMapped)
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
      if (rowDay < untilDay && !isBeforeHireDate(rowDay)) {
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
      setTodaysPlannedMinutes(getPlannedMinutesForActiveDate(todayIso))
    } catch {
      setTodaysPlannedMinutes(0)
    }
    setIsLoading(false)
  }, [graphqlClient, employeeId, currentMonth, page, pageSize, locale, workingHours, isBeforeHireDate])

  useEffect(() => {
    loadFromGraphql().catch(() => {
      setError('Failed to load time entries')
      setIsLoading(false)
    })
  }, [loadFromGraphql])

  // Ensure planned minutes for today are recalculated when workingHours arrive later
  useEffect(() => {
    try {
      const todayIso = new Date().toISOString()
      setTodaysPlannedMinutes(getPlannedMinutesForActiveDate(todayIso))
    } catch {
      // ignore
    }
  }, [workingHours, hireDateKey])
  const clockIn = useCallback(async () => {
    setError(null)
    const now = new Date()
    const todayKey = toLocalDateKey(now)
    if (isBeforeHireDate(todayKey)) {
      setError(clockInBeforeHireDateMessage ?? 'Clock-in is available from your hire date.')
      return
    }

    setIsSubmitting(true)
    try {
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
        // Refresh the missing-coords flags from the live result. They may differ from
        // the mount-time prefetch if an admin updated the address records in the meantime.
        setHomeHasCoords(geo.homeHasCoords)
        setOfficeHasCoords(geo.officeHasCoords)
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
          recordedTime: minutesToHHMM(0),
          breakTime: '01:00',
          effectiveTime: minutesToHHMM(0),
          plannedTime: minutesToHHMM(getPlannedMinutesForDate(isoNow)),
          differenceTime: minutesToHHMM(0),
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
  }, [
    accessToken,
    clockInBeforeHireDateMessage,
    employeeId,
    graphqlClient,
    isBeforeHireDate,
    isClockedIn,
    loadFromGraphql
  ])

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
          recordedTime: minutesToHHMM(recordedMinutes),
          effectiveTime: minutesToHHMM(effectiveMinutes),
          breakTime: minutesToHHMM(breakMinutes),
          plannedTime: minutesToHHMM(plannedMinutes),
          differenceTime: minutesToSignedHHMM(diffMinutes),
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

  const filledMonthEntries = useMemo(() => {
    const existingDates = new Set(allMonthEntries.map(e => toLocalDateKey(new Date(e.attendanceDateISO))))
    const holidaySet = new Set(holidayDates)
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const getDayType = (key: string): 'holiday' | 'non_working' | 'weekend' | undefined => {
      if (holidaySet.has(key)) return 'holiday'
      const [y, m, d] = key.split('-').map(Number)
      if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return undefined
      const date = new Date(y, m - 1, d, 12)
      const planned = getPlannedMinutesForDate(date.toISOString())
      if (planned !== 0) return undefined
      const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
      return dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'non_working'
    }

    const isNonWorkAbsence = (key: string) => absenceLabelsByDate[key] && !workAbsenceDates.has(key)

    const filled: TimeEntry[] = allMonthEntries.map(e => {
      const key = toLocalDateKey(new Date(e.attendanceDateISO))
      const beforeHireDate = isBeforeHireDate(key)
      const dayType = getDayType(key)
      const holidayLabel = dayType === 'holiday' ? holidayNamesByDate[key] : undefined
      const absenceLabel = dayType !== 'holiday' && absenceLabelsByDate[key] ? absenceLabelsByDate[key] : undefined

      let plannedTime: string | undefined
      if (beforeHireDate || dayType === 'holiday' || isNonWorkAbsence(key)) {
        plannedTime = minutesToHHMM(0)
      } else {
        const backendPlannedMinutes = parseDurationToMinutes(e.plannedTime)
        const useComputedPlanned =
          backendPlannedMinutes == null || Number.isNaN(backendPlannedMinutes) || backendPlannedMinutes <= 0
        plannedTime = useComputedPlanned ? minutesToHHMM(getPlannedMinutesForDate(e.attendanceDateISO)) : e.plannedTime
      }

      return { ...e, dayType, holidayLabel, absenceLabel, plannedTime, isBeforeHireDate: beforeHireDate }
    })
    const cursor = new Date(monthStart)
    while (cursor <= monthEnd) {
      const key = toLocalDateKey(cursor)
      if (!existingDates.has(key)) {
        const beforeHireDate = isBeforeHireDate(key)
        const isHoliday = holidaySet.has(key)
        const plannedMinutes =
          beforeHireDate || isHoliday || isNonWorkAbsence(key)
            ? 0
            : getPlannedMinutesForDate(
                new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 12).toISOString()
              )
        const dayType = getDayType(key)
        const holidayLabel = dayType === 'holiday' ? holidayNamesByDate[key] : undefined
        const absenceLabel = dayType !== 'holiday' && absenceLabelsByDate[key] ? absenceLabelsByDate[key] : undefined
        filled.push({
          id: `empty-${key}`,
          attendanceDateISO: new Date(`${key}T00:00:00.000Z`).toISOString(),
          plannedTime: minutesToHHMM(plannedMinutes),
          isPlaceholder: true,
          dayType,
          holidayLabel,
          absenceLabel,
          isBeforeHireDate: beforeHireDate
        })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    return filled
  }, [
    allMonthEntries,
    currentMonth,
    workingHours,
    holidayDates,
    holidayNamesByDate,
    absenceLabelsByDate,
    workAbsenceDates,
    isBeforeHireDate
  ])

  const durationSortKeys = new Set<keyof TimeEntry>([
    'differenceTime',
    'recordedTime',
    'breakTime',
    'effectiveTime',
    'plannedTime'
  ])

  const statusWeight: Record<string, number> = {
    in_progress: 0,
    under_review: 1,
    incomplete: 2,
    completed: 3
  }

  const emptyLastKeys = new Set<keyof TimeEntry>([...durationSortKeys, 'status'])

  const sortedFilledEntries = useMemo(() => {
    const hasValue = (e: TimeEntry) => {
      if (!emptyLastKeys.has(sortKey)) return true
      const raw = e[sortKey] as string | undefined
      return raw != null && raw !== ''
    }
    return [...filledMonthEntries].sort((a, b) => {
      const aHas = hasValue(a)
      const bHas = hasValue(b)
      if (aHas !== bHas) return aHas ? -1 : 1

      let cmp: number
      if (durationSortKeys.has(sortKey)) {
        const ma = parseDurationToMinutes(a[sortKey] as string | undefined)
        const mb = parseDurationToMinutes(b[sortKey] as string | undefined)
        cmp = ma - mb
      } else if (sortKey === 'status') {
        const wa = statusWeight[a.status ?? ''] ?? 99
        const wb = statusWeight[b.status ?? ''] ?? 99
        cmp = wa - wb
      } else {
        cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filledMonthEntries, sortKey, sortDir])

  useEffect(() => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    setEntries(sortedFilledEntries.slice(start, end))
    setTotalCount(sortedFilledEntries.length)
  }, [sortedFilledEntries, page, pageSize])

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
          dateFrom: toLocalDateKey(monthStart),
          dateTo: toLocalDateKey(monthEnd)
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
    isLoading,
    error,
    isNearHome,
    isNearOffice,
    homeHasCoords,
    officeHasCoords,
    hasTodayAttendanceRecord,
    entries,
    entriesForReport: sortedFilledEntries,
    allMonthEntries,
    holidayDates,
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
    isBeforeHireDateToday,
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
    updateLocationSelection,
    // expose refresh for external triggers (e.g., after AppAction completes)
    refresh: loadFromGraphql
  }
}
