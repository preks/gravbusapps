'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { employeeAttendanceMonthlyQuery } from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
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

  const prevMonth = useCallback(() => {
    setPage(1)
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }, [])

  const nextMonth = useCallback(() => {
    setPage(1)
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }, [])

  // very small helper to parse duration text like "7h 30m" or "0h" into minutes
  const parseDurationToMinutes = (text?: string): number => {
    if (!text) return 0
    const hMatch = text.match(/(\d+)\s*h/i)
    const mMatch = text.match(/(\d+)\s*m/i)
    const h = hMatch ? parseInt(hMatch[1], 10) : 0
    const m = mMatch ? parseInt(mMatch[1], 10) : 0
    return h * 60 + m
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
      breakTime: row.breakTime,
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

      // Prevent duplicate clock-in if there's an open or already closed entry for today
      const hasOpenToday = allEntries.some(e => toDateString(new Date(e.attendanceDateISO)) === today && !e.endTimeISO)
      const hasClosedToday = allEntries.some(
        e => toDateString(new Date(e.attendanceDateISO)) === today && Boolean(e.endTimeISO)
      )
      if (isClockedIn || hasOpenToday || hasClosedToday) {
        setIsSubmitting(false)
        setError(
          hasOpenToday ? 'You already have an open clock-in today.' : 'You already recorded attendance for today.'
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
          breakTime: '0h',
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
      // parse existing break time on the record if present
      const breakMinutes = parseDurationToMinutes(mostRecent.breakTime)
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
