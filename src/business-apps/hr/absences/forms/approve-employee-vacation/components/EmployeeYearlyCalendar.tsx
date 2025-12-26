/**
 * EmployeeYearlyCalendar Component
 * Displays a monthly calendar with color-coded approved absence indicators
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardContent, Spinner, Alert, Button, useTranslation } from '@newwork/nw-design-system'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import dayjs from 'dayjs'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCatalogValue, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { usePublicHolidays } from '../../../hooks/usePublicHolidays'
import translations from '../_i18n'

interface EmployeeYearlyCalendarProps {
  accessToken: string
  employeeId?: string
  currentRequestStartDate?: string
  currentRequestEndDate?: string
}

interface DayAbsence {
  type: string
  status: string
  color: string
  isCurrentRequest?: boolean
  isHoliday?: boolean
  isHolidayAndAbsence?: boolean
  isHalfDay?: boolean
  halfDayPeriod?: 'morning' | 'afternoon'
  hasMultipleHalves?: boolean
  // For split rendering
  morningData?: DayAbsence | null
  afternoonData?: DayAbsence | null
  // NEW: Flag for full-day overlap (vacation + holiday both full-day)
  isFullDayOverlap?: boolean
}

interface CalendarDay {
  date: dayjs.Dayjs
  dayOfMonth: number
  isWeekend: boolean
  isToday: boolean
  absence: DayAbsence | null
}

const getAbsenceColor = (typeRef: string, status: string): string => {
  // Pending requests - Orange/Yellow
  if (status === 'PENDING' || status === 'PENDING_APPROVAL') {
    return 'gba:bg-orange-400'
  }

  // Sick leave - Red
  if (typeRef?.includes('A002') || typeRef?.toLowerCase()?.includes('sick')) {
    return 'gba:bg-red-500'
  }

  // Annual leave/Vacation - Blue (approved)
  if (
    typeRef?.includes('A001') ||
    typeRef?.toLowerCase()?.includes('annual') ||
    typeRef?.toLowerCase()?.includes('vacation')
  ) {
    return 'gba:bg-blue-500'
  }

  // Other absences (business trip, special leave, etc.) - Teal
  return 'gba:bg-teal-500'
}

export const EmployeeYearlyCalendar: React.FC<EmployeeYearlyCalendarProps> = ({
  accessToken,
  employeeId,
  currentRequestStartDate,
  currentRequestEndDate
}) => {
  const { t } = useTranslation(translations)
  const [absences, setAbsences] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true) // Start expanded

  // Initialize month index - use function to ensure it's only calculated once
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => {
    return currentRequestStartDate ? dayjs(currentRequestStartDate).month() : dayjs().month()
  })

  // Fetch public holidays for the employee
  const {
    holidayDateSet,
    holidays,
    isLoading: holidaysLoading
  } = usePublicHolidays({
    accessToken,
    employeeId
  })

  const graphqlClient = useGraphqlClient(accessToken)
  const currentYear = dayjs().year()

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentMonthIndex(prev => (prev === 0 ? 11 : prev - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonthIndex(prev => (prev === 11 ? 0 : prev + 1))
  }

  const goToRequestMonth = () => {
    if (currentRequestStartDate) {
      setCurrentMonthIndex(dayjs(currentRequestStartDate).month())
    } else {
      setCurrentMonthIndex(dayjs().month())
    }
  }

  useEffect(() => {
    const abortController = new AbortController()
    let isMounted = true

    const fetchYearlyAbsences = async () => {
      if (!accessToken || !employeeId) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const yearStart = dayjs().startOf('year').format('YYYY-MM-DD')
        const yearEnd = dayjs().endOf('year').format('YYYY-MM-DD')

        const query = `
          query GetEmployeeYearlyAbsences($employeeId: uuid!, $yearStart: timestamp!, $yearEnd: timestamp!) {
            EmployeeAbsence(
              where: {
                employeeId: { _eq: $employeeId }
                startDate: { _lte: $yearEnd }
                endDate: { _gte: $yearStart }
                status: { _in: ["APPROVED", "PENDING", "PENDING_APPROVAL"] }
                isDeleted: { _eq: false }
              }
              orderBy: { startDate: ASC }
            ) {
              id
              startDate
              endDate
              status
              typeRef
              workingHours
              type {
                id
                value
                translations {
                  value
                  localeCode
                }
              }
            }
          }
        `

        // Check if already aborted before making request
        if (abortController.signal.aborted) {
          return
        }

        const response = await graphqlClient.request<{ EmployeeAbsence: any[] }>(query, {
          employeeId,
          yearStart,
          yearEnd
        })

        // Only update state if component is still mounted and not aborted
        if (isMounted && !abortController.signal.aborted) {
          setAbsences(response.EmployeeAbsence || [])
        }
      } catch (err) {
        // Only set error if component is still mounted and not aborted
        if (isMounted && !abortController.signal.aborted) {
          console.error('Error fetching yearly absences:', err)
          setError('Failed to load yearly calendar')
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchYearlyAbsences()

    // Cleanup function to abort request and prevent state updates on unmounted component
    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [accessToken, employeeId])

  // Helper function to determine if an absence is half-day and which period
  const getAbsenceHalfDayInfo = (absence: any): { isHalfDay: boolean; period?: 'morning' | 'afternoon' } => {
    // If workingHours is approximately 4 hours (half of 8-hour day), it's a half-day
    // Typical values: 4h = morning or afternoon half-day
    if (absence.workingHours && absence.workingHours > 0 && absence.workingHours <= 4.5) {
      // For now, we'll need additional logic or data to determine morning vs afternoon
      // This could come from start time or additional fields
      // Default to morning for now
      return { isHalfDay: true, period: 'morning' }
    }
    return { isHalfDay: false }
  }

  // Helper: Process holiday overlap with existing full-day absence
  const processFullDayHolidayOverlap = (
    existingDay: { morning: DayAbsence | null; afternoon: DayAbsence | null },
    holidayData: DayAbsence
  ) => {
    const hasBothHalvesSameAbsence =
      existingDay.morning &&
      existingDay.afternoon &&
      existingDay.morning === existingDay.afternoon &&
      !existingDay.morning.isHoliday

    if (hasBothHalvesSameAbsence) {
      // FULL-DAY absence + FULL-DAY holiday = show both with diagonal stripe overlay
      const absenceData = existingDay.morning!
      const overlappedData: DayAbsence = {
        ...absenceData,
        isFullDayOverlap: true,
        isHolidayAndAbsence: true,
        morningData: absenceData,
        afternoonData: holidayData
      }
      existingDay.morning = overlappedData
      existingDay.afternoon = overlappedData
    } else if (existingDay.morning && !existingDay.afternoon) {
      existingDay.afternoon = holidayData
    } else if (!existingDay.morning && existingDay.afternoon) {
      existingDay.morning = holidayData
    } else if (existingDay.morning && existingDay.afternoon) {
      const morningIsSameAsAfternoon = existingDay.morning === existingDay.afternoon
      if (!morningIsSameAsAfternoon && !existingDay.morning.isHoliday && !existingDay.afternoon.isHoliday) {
        const overlappedData: DayAbsence = {
          ...existingDay.morning,
          isFullDayOverlap: true,
          isHolidayAndAbsence: true,
          morningData: existingDay.morning,
          afternoonData: holidayData
        }
        existingDay.morning = overlappedData
        existingDay.afternoon = overlappedData
      }
    }
  }

  // Helper: Process half-day holiday overlap
  const processHalfDayHolidayOverlap = (
    existingDay: { morning: DayAbsence | null; afternoon: DayAbsence | null },
    holidayData: DayAbsence,
    period: 'morning' | 'afternoon'
  ) => {
    if (existingDay[period]) {
      // Period occupied - check if both halves have the SAME full-day item
      const hasSameFullDayItem =
        existingDay.morning && existingDay.afternoon && existingDay.morning === existingDay.afternoon

      if (hasSameFullDayItem) {
        // Full-day vacation + half-day holiday = create overlap on that half ONLY
        const fullDayItem = existingDay.morning!
        const overlappedHalf: DayAbsence = {
          ...fullDayItem,
          isFullDayOverlap: true,
          isHolidayAndAbsence: true,
          morningData: fullDayItem,
          afternoonData: holidayData
        }
        existingDay[period] = overlappedHalf
        const otherPeriod = period === 'morning' ? 'afternoon' : 'morning'
        existingDay[otherPeriod] = { ...fullDayItem }
      } else {
        // Period has different item (half-day vacation/absence)
        const existingItem = existingDay[period]
        const overlappedHalfDay: DayAbsence = {
          ...existingItem,
          isFullDayOverlap: true,
          isHolidayAndAbsence: true,
          morningData: existingItem,
          afternoonData: holidayData
        }
        existingDay[period] = overlappedHalfDay
      }
    } else {
      // Period is free - add holiday to that half
      existingDay[period] = holidayData
    }
  }

  // Helper: Parse holiday code to date components
  const parseHolidayCode = (code: string, currentYear: number) => {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(code)
    if (!match) return null

    const year = Number.parseInt(match[1], 10)
    const month = Number.parseInt(match[2], 10)
    const day = Number.parseInt(match[3], 10)

    if (year !== currentYear) return null

    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return { dateKey, year, month, day }
  }

  // Helper function to check if holiday is half-day and determine period
  const getHolidayHalfDayInfo = (holiday: any): { isHalfDay: boolean; period?: 'morning' | 'afternoon' } => {
    const isHalfDay = holiday.additionalValue1 === '05H'
    if (!isHalfDay) return { isHalfDay: false }

    // Check holiday name for common afternoon holidays
    const holidayName = (holiday.value || '').toLowerCase()

    // Common afternoon half-day holidays in Germany
    const afternoonHolidays = [
      'eve',
      'heiligabend',
      'silvester',
      'christmas eve',
      "new year's eve",
      'holy eve',
      'new years eve'
    ]

    // Check if this is a known afternoon holiday
    const isAfternoonHoliday = afternoonHolidays.some(pattern => holidayName.includes(pattern))

    if (isAfternoonHoliday) {
      return { isHalfDay: true, period: 'afternoon' }
    }

    // Check additionalValue2 or additionalValue3 for period information
    const value2 = holiday.additionalValue2?.toLowerCase() || ''
    const value3 = holiday.additionalValue3?.toLowerCase() || ''

    // Try to detect afternoon from additional values
    if (
      value2.includes('afternoon') ||
      value2.includes('pm') ||
      value2.includes('13:') ||
      value2.includes('14:') ||
      value3.includes('afternoon') ||
      value3.includes('pm') ||
      value3.includes('13:') ||
      value3.includes('14:')
    ) {
      return { isHalfDay: true, period: 'afternoon' }
    }

    // Default to morning for other half-day holidays
    return { isHalfDay: true, period: 'morning' }
  }

  // Build absence map by date with half-day support
  const absenceMap = useMemo(() => {
    // Use a more complex structure to track both halves of each day
    const dayData: Record<
      string,
      {
        morning: DayAbsence | null
        afternoon: DayAbsence | null
      }
    > = {}

    // Helper to set half or full day
    const setDayAbsence = (
      dateKey: string,
      absenceData: DayAbsence,
      isHalfDay: boolean,
      period?: 'morning' | 'afternoon'
    ) => {
      if (!dayData[dateKey]) {
        dayData[dateKey] = { morning: null, afternoon: null }
      }

      if (isHalfDay && period) {
        // Set specific half
        dayData[dateKey][period] = absenceData
      } else {
        // Set both halves
        dayData[dateKey].morning = absenceData
        dayData[dateKey].afternoon = absenceData
      }
    }

    // Add employee absences
    absences.forEach(absence => {
      if (!absence.startDate || !absence.endDate) return

      const start = dayjs(absence.startDate)
      const end = dayjs(absence.endDate)
      const color = getAbsenceColor(absence.typeRef, absence.status)
      const typeName = getCatalogValue(absence.type) || absence.type?.value || 'Absence'
      const halfDayInfo = getAbsenceHalfDayInfo(absence)

      let current = start
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dateKey = current.format('YYYY-MM-DD')

        const absenceData: DayAbsence = {
          type: typeName,
          status: absence.status,
          color,
          isCurrentRequest: false,
          isHoliday: false,
          isHolidayAndAbsence: false,
          isHalfDay: halfDayInfo.isHalfDay,
          halfDayPeriod: halfDayInfo.period
        }

        setDayAbsence(dateKey, absenceData, halfDayInfo.isHalfDay, halfDayInfo.period)
        current = current.add(1, 'day')
      }
    })

    // Add public holidays and mark overlaps
    if (holidayDateSet && holidays) {
      holidays.forEach(holiday => {
        const code = holiday.alternativeCode || holiday.code || ''
        if (!code) return

        const parsedDate = parseHolidayCode(code, currentYear)
        if (!parsedDate) return

        const { dateKey } = parsedDate
        const holidayHalfDayInfo = getHolidayHalfDayInfo(holiday)
        const isHalfDayHoliday = holidayHalfDayInfo.isHalfDay

        const holidayData: DayAbsence = {
          type: holiday.value || 'Public Holiday',
          status: 'HOLIDAY',
          color: 'gba:bg-purple-500',
          isCurrentRequest: false,
          isHoliday: true,
          isHolidayAndAbsence: false,
          isHalfDay: isHalfDayHoliday,
          halfDayPeriod: holidayHalfDayInfo.period
        }

        const existingDay = dayData[dateKey]

        if (existingDay) {
          // Day already has absence(s)
          if (isHalfDayHoliday) {
            processHalfDayHolidayOverlap(existingDay, holidayData, holidayData.halfDayPeriod!)
          } else {
            processFullDayHolidayOverlap(existingDay, holidayData)
          }
        } else {
          // No existing absence, add the holiday
          setDayAbsence(dateKey, holidayData, isHalfDayHoliday, holidayData.halfDayPeriod)
        }
      })
    }

    // Mark current request days and preserve holiday information
    if (currentRequestStartDate && currentRequestEndDate) {
      const start = dayjs(currentRequestStartDate)
      const end = dayjs(currentRequestEndDate)

      let current = start
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const dateKey = current.format('YYYY-MM-DD')
        const existingDay = dayData[dateKey]

        // Check if current request overlaps with holiday
        const wasHoliday =
          existingDay?.morning?.isHoliday ||
          existingDay?.afternoon?.isHoliday ||
          existingDay?.morning?.isHolidayAndAbsence ||
          existingDay?.afternoon?.isHolidayAndAbsence

        const requestData: DayAbsence = {
          type: t('vacation-calendar-current-request'),
          status: 'PENDING',
          color: 'gba:bg-yellow-400',
          isCurrentRequest: true,
          isHoliday: false,
          isHolidayAndAbsence: wasHoliday,
          isHalfDay: false
        }

        setDayAbsence(dateKey, requestData, false)
        current = current.add(1, 'day')
      }
    }

    // Convert to final map format
    // Preserve morning and afternoon data for split rendering
    const finalMap: Record<string, DayAbsence> = {}

    Object.keys(dayData).forEach(dateKey => {
      const day = dayData[dateKey]
      const morning = day.morning
      const afternoon = day.afternoon

      if (!morning && !afternoon) return

      if (morning && afternoon) {
        // Check if BOTH halves have full-day overlap (full-day vacation + full-day holiday)
        const isBothHalvesOverlap = morning.isFullDayOverlap && afternoon.isFullDayOverlap
        // Check if ONLY ONE half has overlap (full-day vacation + half-day holiday)
        const isOneHalfOverlap =
          (morning.isFullDayOverlap && !afternoon.isFullDayOverlap) ||
          (!morning.isFullDayOverlap && afternoon.isFullDayOverlap)

        // Check if both halves are EXACTLY the same object (not just similar)
        // Compare all properties including isHoliday to detect overlaps
        // IMPORTANT: Exclude cases where there's ANY overlap marker on either half
        const areSameType =
          morning.type === afternoon.type &&
          morning.status === afternoon.status &&
          morning.color === afternoon.color &&
          morning.isHoliday === afternoon.isHoliday &&
          !morning.isFullDayOverlap && // Morning doesn't have overlap marker
          !afternoon.isFullDayOverlap && // Afternoon doesn't have overlap marker
          !isOneHalfOverlap // Neither half has overlap

        // CRITICAL: Check overlaps FIRST before checking areSameType
        if (isBothHalvesOverlap) {
          // Both halves have overlap (full-day vacation + full-day holiday)
          // Show as single item with diagonal overlay
          finalMap[dateKey] = {
            ...morning,
            hasMultipleHalves: false, // Not split, just overlaid
            isFullDayOverlap: true, // Full-day overlap
            morningData: morning.morningData, // Vacation
            afternoonData: morning.afternoonData, // Holiday
            isHolidayAndAbsence: true
          }
        } else if (isOneHalfOverlap) {
          // One half has overlap (full-day vacation + half-day holiday)
          // Need split rendering with overlay on the overlapping half
          finalMap[dateKey] = {
            ...morning,
            hasMultipleHalves: true, // Split required
            morningData: morning,
            afternoonData: afternoon,
            isHolidayAndAbsence: true,
            isFullDayOverlap: false // Not a full-day overlap, just half-day
          }
        } else if (areSameType) {
          // Truly same item in both halves - show as full day
          // This check comes AFTER overlaps because overlaps take precedence
          finalMap[dateKey] = morning
        } else {
          // Different halves (half-day vacation + half-day holiday, or morning/afternoon different items)
          // Show split for better UX
          finalMap[dateKey] = {
            ...morning,
            hasMultipleHalves: true,
            morningData: morning,
            afternoonData: afternoon,
            isHolidayAndAbsence: morning.isHoliday || afternoon.isHoliday
          }
        }
      } else {
        // Only one half filled - show as half-day
        const singleHalf = morning || afternoon!
        finalMap[dateKey] = {
          ...singleHalf,
          morningData: morning,
          afternoonData: afternoon
        }
      }
    })

    return finalMap
  }, [absences, currentRequestStartDate, currentRequestEndDate, holidayDateSet, holidays, currentYear, t])

  // Generate current month data
  const currentMonth = useMemo(() => {
    const monthStart = dayjs().year(currentYear).month(currentMonthIndex).startOf('month')
    const monthEnd = monthStart.endOf('month')
    const monthName = monthStart.format('MMMM YYYY')

    // Get first day of week (0 = Sunday, 1 = Monday, etc.)
    const startDayOfWeek = monthStart.day()

    // Calculate days to show (including leading/trailing days from other months)
    const daysInMonth = monthEnd.date()
    const leadingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 // Start week on Monday

    const days: CalendarDay[] = []

    // Add leading days from previous month (grayed out)
    for (let i = leadingDays - 1; i >= 0; i--) {
      const date = monthStart.subtract(i + 1, 'day')
      days.push({
        date,
        dayOfMonth: date.date(),
        isWeekend: date.day() === 0 || date.day() === 6,
        isToday: date.isSame(dayjs(), 'day'),
        absence: null
      })
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = monthStart.date(day)
      const dateKey = date.format('YYYY-MM-DD')

      days.push({
        date,
        dayOfMonth: day,
        isWeekend: date.day() === 0 || date.day() === 6,
        isToday: date.isSame(dayjs(), 'day'),
        absence: absenceMap[dateKey] || null
      })
    }

    // Add trailing days to complete the grid (up to 6 weeks)
    const totalCells = Math.ceil(days.length / 7) * 7
    const trailingDays = totalCells - days.length

    for (let i = 1; i <= trailingDays; i++) {
      const date = monthEnd.add(i, 'day')
      days.push({
        date,
        dayOfMonth: date.date(),
        isWeekend: date.day() === 0 || date.day() === 6,
        isToday: date.isSame(dayjs(), 'day'),
        absence: null
      })
    }

    return {
      monthName,
      monthIndex: currentMonthIndex,
      days
    }
  }, [currentYear, currentMonthIndex, absenceMap])

  // Calculate quick stats for collapsed state - MUST be before early returns
  const absenceStats = useMemo(() => {
    const vacation = absences.filter(a => a.typeRef?.includes('A001')).length
    const sick = absences.filter(a => a.typeRef?.includes('A002')).length
    const other = absences.filter(a => !a.typeRef?.includes('A001') && !a.typeRef?.includes('A002')).length
    return { vacation, sick, other, total: absences.length }
  }, [absences])

  // Helper: Build tooltip text for day absences
  const buildTooltipText = (
    day: CalendarDay,
    morningData: DayAbsence | null | undefined,
    afternoonData: DayAbsence | null | undefined,
    isFullDayOverlap: boolean,
    hasMultipleHalves: boolean,
    isCurrentRequest: boolean
  ): string => {
    if (!day.absence) return ''

    if (isFullDayOverlap && morningData && afternoonData) {
      return `${morningData.type} + ${afternoonData.type} ${t('vacation-calendar-tooltip-full-day')}`
    }

    if (hasMultipleHalves && morningData && afternoonData) {
      return `${t('vacation-calendar-tooltip-morning')} ${morningData.type} | ${t('vacation-calendar-tooltip-afternoon')} ${afternoonData.type}`
    }

    if (morningData && !afternoonData) {
      return `${t('vacation-calendar-tooltip-morning')} ${morningData.type}`
    }

    if (!morningData && afternoonData) {
      return `${t('vacation-calendar-tooltip-afternoon')} ${afternoonData.type}`
    }

    let text = day.absence.type
    if (isCurrentRequest) text += ` ${t('vacation-calendar-tooltip-current-request')}`
    return text
  }

  // Helper: Determine render mode for calendar day
  const getDayRenderMode = (
    hasAbsence: boolean,
    hasMultipleHalves: boolean,
    morningData: DayAbsence | null | undefined,
    afternoonData: DayAbsence | null | undefined,
    isFullDayOverlap: boolean
  ) => {
    const needsSplitRender = hasMultipleHalves && morningData && afternoonData && !isFullDayOverlap
    const needsHalfRender = hasAbsence && ((morningData && !afternoonData) || (!morningData && afternoonData))
    const needsOverlayRender = isFullDayOverlap && morningData && afternoonData && !hasMultipleHalves
    const needsHalfOverlayRender =
      hasMultipleHalves &&
      morningData &&
      afternoonData &&
      (morningData.isFullDayOverlap || afternoonData.isFullDayOverlap)

    return { needsSplitRender, needsHalfRender, needsOverlayRender, needsHalfOverlayRender }
  }

  // Helper: Build CSS classes for calendar day container
  const buildDayContainerClasses = (
    day: CalendarDay,
    isCurrentMonthDay: boolean,
    hasAbsence: boolean,
    isCurrentRequest: boolean,
    renderMode: ReturnType<typeof getDayRenderMode>
  ): string => {
    const { needsSplitRender, needsHalfRender, needsOverlayRender, needsHalfOverlayRender } = renderMode

    return [
      'gba:h-10 gba:flex gba:items-center gba:justify-center gba:text-xs gba:rounded-md gba:relative gba:transition-all gba:font-medium gba:overflow-hidden',
      !isCurrentMonthDay && 'gba:opacity-25 gba:pointer-events-none',
      isCurrentMonthDay && !hasAbsence && 'gba:cursor-pointer hover:gba:bg-muted/50',
      day.isToday && !hasAbsence && 'gba:ring-2 gba:ring-primary/30 gba:bg-primary/5',
      day.isWeekend && !hasAbsence && 'gba:bg-muted/85',
      !day.isWeekend && !hasAbsence && 'gba:bg-muted/50',
      !needsSplitRender &&
        !needsHalfRender &&
        !needsOverlayRender &&
        !needsHalfOverlayRender &&
        hasAbsence &&
        day.absence?.color,
      hasAbsence && 'gba:text-white gba:shadow-sm',
      isCurrentRequest &&
        !needsSplitRender &&
        !needsOverlayRender &&
        !needsHalfOverlayRender &&
        'gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background gba:scale-105 gba:z-10'
    ]
      .filter(Boolean)
      .join(' ')
  }

  // Generate localized weekday names using Intl.DateTimeFormat
  const weekDays = useMemo(() => {
    const locale = getCurrentActiveUserLocale() || 'en-US'
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })

    // Create dates for each weekday (starting from Monday)
    // Using a known Monday date: 2024-01-01 is a Monday
    const weekdayDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2024, 0, 1 + i) // Jan 1-7, 2024 (Mon-Sun)
      return formatter.format(date)
    })

    return weekdayDates
  }, [])

  const isRequestMonth = currentRequestStartDate
    ? currentMonthIndex === dayjs(currentRequestStartDate).month()
    : currentMonthIndex === dayjs().month()

  // Early returns AFTER all hooks
  if (isLoading || holidaysLoading) {
    return (
      <Card data-testid="yearly-calendar-card" className="gba:shadow-sm">
        <CardContent className="gba:flex gba:justify-center gba:items-center gba:py-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="yearly-calendar-error">
        {error}
      </Alert>
    )
  }

  return (
    <Card data-testid="yearly-calendar-card" className="gba:shadow-none gba:border-none">
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="gba:w-full gba:flex gba:items-center gba:justify-between gba:p-2.5 gba:bg-muted/50 gba:rounded-lg hover:gba:bg-muted gba:transition-colors gba:-m-2.5"
          data-testid="toggle-calendar"
        >
          <div className="gba:flex gba:items-center gba:gap-3">
            <CalendarDays className="gba:h-4 gba:w-4 gba:text-primary gba:flex-shrink-0" />
            <div>
              <div className="gba:font-semibold gba:text-sm gba:text-left">
                {t('vacation-calendar-title')} {currentYear}
              </div>
              {!isExpanded && absenceStats.total > 0 && (
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                  {[
                    absenceStats.vacation > 0 && `${absenceStats.vacation} ${t('vacation-calendar-summary-vacation')}`,
                    absenceStats.sick > 0 && `${absenceStats.sick} ${t('vacation-calendar-summary-sick')}`,
                    absenceStats.other > 0 && `${absenceStats.other} ${t('vacation-calendar-summary-other')}`
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              )}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
          ) : (
            <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0" />
          )}
        </button>

        {isExpanded && (
          <>
            {/* Inline Legend - Only show relevant colors */}
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-1.5 gba:mt-3 gba:text-xs gba:text-muted-foreground">
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-blue-500" />
                <span>{t('vacation-calendar-legend-vacation')}</span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-red-500" />
                <span>{t('vacation-calendar-legend-sick')}</span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-purple-500" />
                <span>{t('vacation-calendar-legend-holiday')}</span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-orange-400" />
                <span>{t('vacation-calendar-legend-pending')}</span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-teal-500" />
                <span>{t('vacation-calendar-legend-other')}</span>
              </div>
              {currentRequestStartDate && (
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:font-medium">
                  <div className="gba:w-2.5 gba:h-2.5 gba:rounded-sm gba:bg-yellow-400 gba:ring-1 gba:ring-primary gba:ring-offset-1" />
                  <span>{t('vacation-calendar-legend-current-request')}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="gba:pt-3 gba:pb-4 gba:px-4">
          {/* Compact Month View */}
          <div className="gba:max-w-2xl gba:mx-auto gba:w-full">
            {/* Navigation Bar with Month Name */}
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousMonth}
                data-testid="prev-month-button"
                className="gba:h-8 gba:w-8 gba:p-0 hover:gba:bg-muted"
              >
                <ChevronLeft className="gba:h-4 gba:w-4" />
              </Button>

              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:font-semibold gba:text-base gba:text-center">{currentMonth.monthName}</div>
                {!isRequestMonth && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToRequestMonth}
                    data-testid="request-month-button"
                    className="gba:h-7 gba:px-2 gba:text-xs gba:text-primary hover:gba:bg-primary/10"
                  >
                    {t('vacation-calendar-request-month')}
                  </Button>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                data-testid="next-month-button"
                className="gba:h-8 gba:w-8 gba:p-0 hover:gba:bg-muted"
              >
                <ChevronRight className="gba:h-4 gba:w-4" />
              </Button>
            </div>

            {/* Week Day Headers */}
            <div className="gba:grid gba:grid-cols-7 gba:gap-1 gba:mb-1.5">
              {weekDays.map(day => (
                <div
                  key={day}
                  className="gba:text-[11px] gba:text-center gba:text-muted-foreground gba:font-semibold gba:uppercase gba:tracking-wide"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Improved Calendar Days */}
            <div className="gba:grid gba:grid-cols-7 gba:gap-1.5">
              {currentMonth.days.map((day, dayIndex) => {
                const isCurrentMonthDay = day.date.month() === currentMonth.monthIndex
                const hasAbsence = !!day.absence
                const isCurrentRequest = day.absence?.isCurrentRequest
                const hasMultipleHalves = day.absence?.hasMultipleHalves
                const isFullDayOverlap = day.absence?.isFullDayOverlap
                const morningData = day.absence?.morningData
                const afternoonData = day.absence?.afternoonData

                // Build tooltip text
                const tooltipText = buildTooltipText(
                  day,
                  morningData,
                  afternoonData,
                  isFullDayOverlap || false,
                  hasMultipleHalves || false,
                  isCurrentRequest || false
                )

                // Determine render mode
                const renderMode = getDayRenderMode(
                  hasAbsence,
                  hasMultipleHalves || false,
                  morningData,
                  afternoonData,
                  isFullDayOverlap || false
                )

                // Build container classes
                const containerClasses = buildDayContainerClasses(
                  day,
                  isCurrentMonthDay,
                  hasAbsence,
                  isCurrentRequest || false,
                  renderMode
                )

                return (
                  <div
                    key={`${day.date.format('YYYY-MM-DD')}-${dayIndex}`}
                    className={containerClasses}
                    title={tooltipText || undefined}
                  >
                    {/* Full-day overlap: Vacation + Holiday (diagonal stripe pattern) */}
                    {renderMode.needsOverlayRender && morningData && afternoonData && (
                      <>
                        {/* Base vacation color */}
                        <div className={`gba:absolute gba:inset-0 ${morningData.color}`} />
                        {/* Diagonal stripes for holiday */}
                        <div
                          className="gba:absolute gba:inset-0"
                          style={{
                            background: `repeating-linear-gradient(
                              45deg,
                              transparent,
                              transparent 6px,
                              rgb(168 85 247 / 0.8) 6px,
                              rgb(168 85 247 / 0.8) 12px
                            )`
                          }}
                        />
                      </>
                    )}

                    {/* Split background for different morning/afternoon */}
                    {renderMode.needsSplitRender && morningData && afternoonData && (
                      <>
                        {/* Morning half */}
                        <div
                          className={`gba:absolute gba:inset-0 gba:w-1/2 ${morningData.color}`}
                          style={{ left: 0 }}
                        />
                        {/* Afternoon half */}
                        <div
                          className={`gba:absolute gba:inset-0 gba:w-1/2 ${afternoonData.color}`}
                          style={{ left: '50%' }}
                        />
                        {/* Vertical divider */}
                        <div className="gba:absolute gba:inset-y-0 gba:left-1/2 gba:w-px gba:bg-white/30" />
                      </>
                    )}

                    {/* NEW: Half-day overlay (one half solid, other half with diagonal overlay) */}
                    {renderMode.needsHalfOverlayRender && morningData && afternoonData && (
                      <>
                        {/* Morning half - check if it has overlay */}
                        {morningData.isFullDayOverlap ? (
                          <>
                            {/* Base color for morning (vacation) */}
                            <div
                              className={`gba:absolute gba:inset-0 gba:w-1/2 ${morningData.morningData?.color || morningData.color}`}
                              style={{ left: 0 }}
                            />
                            {/* Diagonal stripes overlay for morning (holiday) */}
                            <div
                              className="gba:absolute gba:inset-0 gba:w-1/2"
                              style={{
                                left: 0,
                                background: `repeating-linear-gradient(
                                  45deg,
                                  transparent,
                                  transparent 6px,
                                  rgb(168 85 247 / 0.8) 6px,
                                  rgb(168 85 247 / 0.8) 12px
                                )`
                              }}
                            />
                          </>
                        ) : (
                          <div
                            className={`gba:absolute gba:inset-0 gba:w-1/2 ${morningData.color}`}
                            style={{ left: 0 }}
                          />
                        )}

                        {/* Afternoon half - check if it has overlay */}
                        {afternoonData.isFullDayOverlap ? (
                          <>
                            {/* Base color for afternoon (vacation) */}
                            <div
                              className={`gba:absolute gba:inset-0 gba:w-1/2 ${afternoonData.morningData?.color || afternoonData.color}`}
                              style={{ left: '50%' }}
                            />
                            {/* Diagonal stripes overlay for afternoon (holiday) */}
                            <div
                              className="gba:absolute gba:inset-0 gba:w-1/2"
                              style={{
                                left: '50%',
                                background: `repeating-linear-gradient(
                                  45deg,
                                  transparent,
                                  transparent 6px,
                                  rgb(168 85 247 / 0.8) 6px,
                                  rgb(168 85 247 / 0.8) 12px
                                )`
                              }}
                            />
                          </>
                        ) : (
                          <div
                            className={`gba:absolute gba:inset-0 gba:w-1/2 ${afternoonData.color}`}
                            style={{ left: '50%' }}
                          />
                        )}

                        {/* Vertical divider */}
                        <div className="gba:absolute gba:inset-y-0 gba:left-1/2 gba:w-px gba:bg-white/30" />
                      </>
                    )}

                    {/* Half-day background (only morning or only afternoon) */}
                    {renderMode.needsHalfRender && (
                      <>
                        {morningData && !afternoonData && (
                          <>
                            {/* Check if morning has overlap */}
                            {morningData.isFullDayOverlap ? (
                              <>
                                {/* Morning half with diagonal overlay */}
                                <div
                                  className={`gba:absolute gba:inset-0 gba:w-1/2 ${morningData.morningData?.color || morningData.color}`}
                                  style={{ left: 0 }}
                                />
                                <div
                                  className="gba:absolute gba:inset-0 gba:w-1/2"
                                  style={{
                                    left: 0,
                                    background: `repeating-linear-gradient(
                                      45deg,
                                      transparent,
                                      transparent 6px,
                                      rgb(168 85 247 / 0.8) 6px,
                                      rgb(168 85 247 / 0.8) 12px
                                    )`
                                  }}
                                />
                              </>
                            ) : (
                              /* Morning half solid color */
                              <div
                                className={`gba:absolute gba:inset-0 gba:w-1/2 ${morningData.color}`}
                                style={{ left: 0 }}
                              />
                            )}
                            {/* Afternoon half muted */}
                            <div
                              className="gba:absolute gba:inset-0 gba:w-1/2 gba:bg-muted/50"
                              style={{ left: '50%' }}
                            />
                          </>
                        )}
                        {!morningData && afternoonData && (
                          <>
                            {/* Morning half muted */}
                            <div className="gba:absolute gba:inset-0 gba:w-1/2 gba:bg-muted/50" style={{ left: 0 }} />
                            {/* Check if afternoon has overlap */}
                            {afternoonData.isFullDayOverlap ? (
                              <>
                                {/* Afternoon half with diagonal overlay */}
                                <div
                                  className={`gba:absolute gba:inset-0 gba:w-1/2 ${afternoonData.morningData?.color || afternoonData.color}`}
                                  style={{ left: '50%' }}
                                />
                                <div
                                  className="gba:absolute gba:inset-0 gba:w-1/2"
                                  style={{
                                    left: '50%',
                                    background: `repeating-linear-gradient(
                                      45deg,
                                      transparent,
                                      transparent 6px,
                                      rgb(168 85 247 / 0.8) 6px,
                                      rgb(168 85 247 / 0.8) 12px
                                    )`
                                  }}
                                />
                              </>
                            ) : (
                              /* Afternoon half solid color */
                              <div
                                className={`gba:absolute gba:inset-0 gba:w-1/2 ${afternoonData.color}`}
                                style={{ left: '50%' }}
                              />
                            )}
                          </>
                        )}
                        {/* Vertical divider */}
                        <div className="gba:absolute gba:inset-y-0 gba:left-1/2 gba:w-px gba:bg-white/30" />
                      </>
                    )}

                    {/* Day number - always on top with shadow for visibility */}
                    <span
                      className={`gba:relative gba:z-10 gba:font-bold gba:text-sm ${
                        hasAbsence ? 'gba:text-white' : 'gba:text-foreground'
                      }`}
                      style={
                        hasAbsence
                          ? {
                              textShadow: '0 0 3px rgba(0,0,0,0.5), 0 0 6px rgba(0,0,0,0.3)'
                            }
                          : undefined
                      }
                    >
                      {day.dayOfMonth}
                    </span>

                    {/* Current request ring indicator */}
                    {isCurrentRequest && (
                      <div className="gba:absolute gba:inset-0 gba:rounded-md gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background gba:pointer-events-none" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
