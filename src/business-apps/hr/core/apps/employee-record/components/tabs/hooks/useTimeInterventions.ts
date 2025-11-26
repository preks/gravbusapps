'use client'

import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  employeeAttendanceMonthlyAllQuery,
  employeeRegionLookupQuery,
  employmentRegionHolidaysQuery
} from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'

export interface TimeInterventionItem {
  date: string // YYYY-MM-DD
  plannedMinutes: number
  workedMinutes: number
  reason: 'MISSING_HOURS' | 'NO_ATTENDANCE' | 'ABSENCE_WITH_ATTENDANCE'
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

  const parseMinutes = (text?: string): number => {
    if (!text) return 0
    let h = 0
    let m = 0
    const parts = String(text).trim().split(/\s+/)
    for (const p of parts) {
      if (/^\d+h$/i.test(p)) h = parseInt(p, 10)
      else if (/^\d+m$/i.test(p)) m = parseInt(p, 10)
    }
    return h * 60 + m
  }

  const load = useCallback(async () => {
    setIsLoading(true)
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

      // Build day map of worked minutes
      const workedByDay = attendanceRows.reduce<Record<string, number>>((acc, r) => {
        const day = String(r.attendanceDate)
        const eff = parseMinutes(r?.effectiveTime ? String(r.effectiveTime) : undefined)
        acc[day] = (acc[day] || 0) + Math.max(0, eff)
        return acc
      }, {})

      // For now, treat absence detection as "planned 0 because holiday/weekend" only.
      // Integrating full absence API can be added later.

      const itemsAcc: TimeInterventionItem[] = []
      const cursor = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)
      while (cursor <= monthEnd) {
        const key = toKey(cursor)
        // Skip holidays
        const planned = holidays.has(key) ? 0 : getPlannedMinutesForDate(cursor)
        const worked = workedByDay[key] || 0

        if (planned > 0) {
          if (worked === 0) {
            itemsAcc.push({ date: key, plannedMinutes: planned, workedMinutes: worked, reason: 'NO_ATTENDANCE' })
          } else if (worked < planned) {
            itemsAcc.push({ date: key, plannedMinutes: planned, workedMinutes: worked, reason: 'MISSING_HOURS' })
          }
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      setItems(itemsAcc)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load interventions')
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, employeeId, currentMonth, locale, workingHours])

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
    prevMonth
  }
}
