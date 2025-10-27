'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export type TimeEntry = {
  id: string
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

export interface UseTimeTrackingDataOptions {
  employeeId: string
}

export const useTimeTrackingData = ({ employeeId }: UseTimeTrackingDataOptions) => {
  const locale = getCurrentActiveUserLocale()

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [clockInSince, setClockInSince] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search removed per requirements
  const [sortKey, setSortKey] = useState<keyof TimeEntry>('attendanceDateISO')
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

  const loadMock = useCallback(async () => {
    setError(null)
    await new Promise(r => setTimeout(r, 120))

    const base = new Date(currentMonth)
    const list: TimeEntry[] = Array.from({ length: 22 }).map((_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), i + 1)
      const id = `${d.toISOString().slice(0, 10)}-${i}`
      const isWeekend = d.getDay() === 0 || d.getDay() === 6
      if (isWeekend) {
        return {
          id,
          attendanceDateISO: d.toISOString(),
          status: 'approved',
          notes: 'Weekend',
          recordedTime: '0h',
          breakTime: '0h',
          effectiveTime: '0h',
          plannedTime: '0h',
          differenceTime: '0h',
          manualOverride: false,
          totalMinutes: 0
        }
      }
      const startTimeISO = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0).toISOString()
      const endTimeISO = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17, 0).toISOString()
      const recordedTime = '8h'
      const breakTime = '0h 30m'
      const effectiveTime = '7h 30m'
      const plannedTime = '8h'
      const differenceTime = '-30m'
      const totalMinutes = parseDurationToMinutes(effectiveTime)
      return {
        id,
        attendanceDateISO: d.toISOString(),
        startTimeISO,
        endTimeISO,
        recordedTime,
        breakTime,
        effectiveTime,
        plannedTime,
        differenceTime,
        manualOverride: false,
        notes: '',
        status: 'approved',
        totalMinutes
      }
    })

    // Persist as the base dataset for the selected month (no search filtering)
    setAllEntries(list)
  }, [currentMonth, locale, employeeId])

  useEffect(() => {
    loadMock().catch(() => setError('Failed to load time entries'))
  }, [loadMock])

  const clockIn = useCallback(async () => {
    setError(null)
    setIsSubmitting(true)
    const now = new Date()
    const todayKey = now.toISOString().slice(0, 10)
    const hasClockInToday = allEntries.some(e => {
      const key = new Date(e.attendanceDateISO).toISOString().slice(0, 10)
      return key === todayKey && Boolean(e.startTimeISO)
    })
    if (hasClockInToday) {
      setIsSubmitting(false)
      setError('You cannot clock in more than once on the same day.')
      return
    }
    await new Promise(r => setTimeout(r, 200))
    setIsClockedIn(true)
    setClockInSince(now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }))
    setIsSubmitting(false)
    // Add an open entry for now (only if within visible month)
    const sameMonth = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth()
    if (sameMonth) {
      const id = `manual-${now.toISOString()}`
      const newEntry: TimeEntry = {
        id,
        attendanceDateISO: now.toISOString(),
        startTimeISO: now.toISOString(),
        status: 'open',
        recordedTime: '0h',
        breakTime: '0h',
        effectiveTime: '0h',
        plannedTime: '8h',
        differenceTime: '0h',
        manualOverride: true,
        totalMinutes: 0,
        notes: 'Clocked in'
      }
      setAllEntries(prev => [newEntry, ...prev])
    }
  }, [locale])

  const clockOut = useCallback(async () => {
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 200))
    setIsClockedIn(false)
    setClockInSince(null)
    setIsSubmitting(false)
    // Close the latest open entry and compute totals
    setAllEntries(prev => {
      const now = new Date()
      const openIndex = prev.findIndex(e => e.status === 'open' && !e.endTimeISO)
      if (openIndex === -1) {
        return prev
      }
      const open = prev[openIndex]
      const startDate = new Date(open.startTimeISO || now)
      const minutes = Math.max(0, Math.round((now.getTime() - startDate.getTime()) / 60000))
      const effectiveTime = `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}`
      const updated: TimeEntry = {
        ...open,
        endTimeISO: now.toISOString(),
        recordedTime: `${Math.floor((now.getTime() - startDate.getTime()) / 3600000)}h`,
        effectiveTime,
        differenceTime: '0h',
        totalMinutes: minutes,
        status: 'approved'
      }
      const copy = [...prev]
      copy[openIndex] = updated
      return copy
    })
  }, [locale])

  // Derive displayed entries from allEntries + controls
  useEffect(() => {
    const sorted = [...allEntries].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const cmp = String(va ?? '').localeCompare(String(vb ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
    // No search filtering
    setTotalCount(sorted.length)
    const startIdx = (page - 1) * pageSize
    setEntries(sorted.slice(startIdx, startIdx + pageSize))
  }, [allEntries, sortKey, sortDir, page, pageSize, locale])

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
    setPage,
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
