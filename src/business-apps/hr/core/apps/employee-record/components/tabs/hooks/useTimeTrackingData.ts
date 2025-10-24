'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export type TimeEntry = {
  id: string
  dateISO: string
  start?: string
  end?: string
  breakMinutes?: number
  totalMinutes?: number
  notes?: string
  status: 'approved' | 'pending' | 'rejected' | 'open'
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
  const [sortKey, setSortKey] = useState<keyof TimeEntry>('dateISO')
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

  const loadMock = useCallback(async () => {
    setError(null)
    await new Promise(r => setTimeout(r, 120))

    const base = new Date(currentMonth)
    const list: TimeEntry[] = Array.from({ length: 22 }).map((_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), i + 1)
      const id = `${d.toISOString().slice(0, 10)}-${i}`
      const isWeekend = d.getDay() === 0 || d.getDay() === 6
      if (isWeekend) {
        return { id, dateISO: d.toISOString(), status: 'approved', notes: 'Weekend', totalMinutes: 0, breakMinutes: 0 }
      }
      const start = '09:00'
      const end = '17:00'
      const breakMinutes = 30
      const totalMinutes = 7 * 60
      return { id, dateISO: d.toISOString(), start, end, breakMinutes, totalMinutes, notes: '', status: 'approved' }
    })

    // Persist as the base dataset for the selected month (no search filtering)
    setAllEntries(list)
  }, [currentMonth, locale, employeeId])

  useEffect(() => {
    loadMock().catch(() => setError('Failed to load time entries'))
  }, [loadMock])

  const clockIn = useCallback(async () => {
    setIsSubmitting(true)
    await new Promise(r => setTimeout(r, 200))
    setIsClockedIn(true)
    setClockInSince(new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }))
    setIsSubmitting(false)
    // Add an open entry for now (only if within visible month)
    const now = new Date()
    const sameMonth = now.getFullYear() === currentMonth.getFullYear() && now.getMonth() === currentMonth.getMonth()
    if (sameMonth) {
      const id = `manual-${now.toISOString()}`
      const newEntry: TimeEntry = {
        id,
        dateISO: now.toISOString(),
        start: now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
        status: 'open',
        breakMinutes: 0,
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
      const endLabel = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
      const openIndex = prev.findIndex(e => e.status === 'open' && !e.end)
      if (openIndex === -1) {
        return prev
      }
      const open = prev[openIndex]
      const startParts = (open.start || '00:00').split(':').map(Number)
      const startDate = new Date(now)
      startDate.setHours(startParts[0] || 0, startParts[1] || 0, 0, 0)
      const minutes = Math.max(0, Math.round((now.getTime() - startDate.getTime()) / 60000))
      const updated: TimeEntry = {
        ...open,
        end: endLabel,
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
