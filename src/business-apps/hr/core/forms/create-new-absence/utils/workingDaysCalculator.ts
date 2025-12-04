import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'

dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)

export interface HolidayEntry {
  id: string
  value: string
  code: string
  alternativeCode?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  objectValue?: any
}

export interface WorkingHours {
  mondayHours?: number | null
  tuesdayHours?: number | null
  wednesdayHours?: number | null
  thursdayHours?: number | null
  fridayHours?: number | null
  saturdayHours?: number | null
  sundayHours?: number | null
  weeklyHours?: number | null
  weeklyDays?: number | null
}

export interface WorkingDaysOptions {
  holidays?: HolidayEntry[]
  year?: number
  excludeWeekends?: boolean
  halfDayDates?: Set<string>
  workingHours?: WorkingHours | null
}

const parseHolidayDate = (code: string): Date | null => {
  if (!code || typeof code !== 'string') {
    return null
  }

  const trimmedCode = code.trim()
  const dateCodeRegex = /^(\d{4})(\d{2})(\d{2})$/
  const parts = dateCodeRegex.exec(trimmedCode)

  if (!parts) {
    return null
  }

  const y = parseInt(parts[1], 10)
  const m = parseInt(parts[2], 10)
  const d = parseInt(parts[3], 10)

  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return null
  }

  if (d < 1 || d > 31 || m < 1 || m > 12) {
    return null
  }

  const date = new Date(y, m - 1, d)
  if (date.getMonth() !== m - 1 || date.getFullYear() !== y || date.getDate() !== d) {
    return null
  }

  return date
}

const getDayOfWeekHours = (date: Date, workingHours?: WorkingHours | null): number => {
  if (!workingHours) {
    const day = date.getDay()
    return day === 0 || day === 6 ? 0 : 8
  }

  const day = date.getDay()
  switch (day) {
    case 0:
      return workingHours.sundayHours ?? 0
    case 1:
      return workingHours.mondayHours ?? 0
    case 2:
      return workingHours.tuesdayHours ?? 0
    case 3:
      return workingHours.wednesdayHours ?? 0
    case 4:
      return workingHours.thursdayHours ?? 0
    case 5:
      return workingHours.fridayHours ?? 0
    case 6:
      return workingHours.saturdayHours ?? 0
    default:
      return 0
  }
}

const isWorkingDay = (date: Date, workingHours?: WorkingHours | null): boolean => {
  const hours = getDayOfWeekHours(date, workingHours)
  return hours > 0
}

const isHoliday = (date: Date, holidays: HolidayEntry[]): boolean => {
  if (!holidays || holidays.length === 0) return false

  const dateStr = dayjs(date).format('YYYY-MM-DD')

  return holidays.some(holiday => {
    if (holiday.additionalValue1 === '05H') {
      return false
    }

    const code = holiday.alternativeCode || holiday.code || ''
    if (!code) {
      return false
    }

    const holidayDate = parseHolidayDate(code)
    if (!holidayDate) {
      return false
    }

    const holidayDateStr = dayjs(holidayDate).format('YYYY-MM-DD')
    return holidayDateStr === dateStr
  })
}

const isHalfDay = (date: Date, halfDayDates?: Set<string>): boolean => {
  if (!halfDayDates || halfDayDates.size === 0) return false

  const dateStr = dayjs(date).format('YYYY-MM-DD')
  return halfDayDates.has(dateStr)
}

/**
 * Calculates working days between two dates, excluding weekends and holidays
 * @param startDate Start date (inclusive)
 * @param endDate End date (inclusive)
 * @param options Options for calculation
 * @returns Number of working days (including half days counted as 0.5)
 */
export const calculateWorkingDays = (startDate: Date, endDate: Date, options: WorkingDaysOptions = {}): number => {
  const { holidays = [], excludeWeekends = true, halfDayDates = new Set<string>(), workingHours } = options

  let workingDays = 0
  const start = dayjs(startDate).startOf('day')
  const end = dayjs(endDate).startOf('day')

  if (end.isBefore(start)) {
    return 0
  }

  let current = start
  while (current.isSameOrBefore(end)) {
    const currentDate = current.toDate()

    if (workingHours) {
      if (!isWorkingDay(currentDate, workingHours)) {
        current = current.add(1, 'day')
        continue
      }
    } else if (excludeWeekends) {
      const day = currentDate.getDay()
      if (day === 0 || day === 6) {
        current = current.add(1, 'day')
        continue
      }
    }

    if (isHoliday(currentDate, holidays)) {
      current = current.add(1, 'day')
      continue
    }

    if (isHalfDay(currentDate, halfDayDates)) {
      workingDays += 0.5
    } else {
      workingDays += 1
    }

    current = current.add(1, 'day')
  }

  return workingDays
}

export const extractHalfDayDates = (holidays: HolidayEntry[], startDate: Date, endDate: Date): Set<string> => {
  const halfDays = new Set<string>()
  const start = dayjs(startDate).startOf('day')
  const end = dayjs(endDate).startOf('day')

  holidays.forEach(holiday => {
    if (holiday.additionalValue1 === '05H') {
      const code = holiday.alternativeCode || holiday.code || ''
      if (!code) return

      const holidayDate = parseHolidayDate(code)
      if (!holidayDate) return

      const holidayDateStr = dayjs(holidayDate).format('YYYY-MM-DD')
      const holidayDayjs = dayjs(holidayDate).startOf('day')

      if (holidayDayjs.isSameOrAfter(start) && holidayDayjs.isSameOrBefore(end)) {
        halfDays.add(holidayDateStr)
      }
    }
  })

  return halfDays
}

export interface DateRangeBreakdown {
  effectiveDays: number
  workingDays: number
  weekends: string[]
  holidays: Array<{ date: string; name: string }>
  halfDays: string[]
}

export const calculateDateRangeBreakdown = (
  startDate: Date,
  endDate: Date,
  holidays: HolidayEntry[] = [],
  workingHours?: WorkingHours | null
): DateRangeBreakdown => {
  const start = dayjs(startDate).startOf('day')
  const end = dayjs(endDate).startOf('day')

  const effectiveDays = end.diff(start, 'day') + 1
  const weekends: string[] = []
  const holidayDates: Array<{ date: string; name: string }> = []
  const halfDaysList: string[] = []

  let workingDays = 0
  let current = start

  while (current.isSameOrBefore(end)) {
    const currentDate = current.toDate()
    const dateStr = current.format('YYYY-MM-DD')

    if (workingHours) {
      if (!isWorkingDay(currentDate, workingHours)) {
        weekends.push(dateStr)
        current = current.add(1, 'day')
        continue
      }
    } else {
      const day = currentDate.getDay()
      if (day === 0 || day === 6) {
        weekends.push(dateStr)
        current = current.add(1, 'day')
        continue
      }
    }

    const holiday = holidays.find(h => {
      const code = h.alternativeCode || h.code || ''
      if (!code) return false
      const holidayDate = parseHolidayDate(code)
      if (!holidayDate) {
        return false
      }
      const holidayDateStr = dayjs(holidayDate).format('YYYY-MM-DD')
      return holidayDateStr === dateStr
    })

    if (holiday) {
      if (holiday.additionalValue1 === '05H') {
        workingDays += 0.5
        halfDaysList.push(dateStr)
      } else {
        const holidayName = holiday.value || 'Public Holiday'
        holidayDates.push({ date: dateStr, name: holidayName })
      }
      current = current.add(1, 'day')
      continue
    }

    workingDays += 1
    current = current.add(1, 'day')
  }

  return {
    effectiveDays,
    workingDays: Math.round(workingDays * 100) / 100,
    weekends,
    holidays: holidayDates,
    halfDays: halfDaysList
  }
}
