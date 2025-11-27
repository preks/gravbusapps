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

export interface WorkingDaysOptions {
  holidays?: HolidayEntry[]
  year?: number
  excludeWeekends?: boolean
  halfDayDates?: Set<string>
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

const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6
}

const isHoliday = (date: Date, holidays: HolidayEntry[]): boolean => {
  if (!holidays || holidays.length === 0) return false

  const dateStr = dayjs(date).format('YYYY-MM-DD')

  return holidays.some(holiday => {
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
  const { holidays = [], excludeWeekends = true, halfDayDates = new Set<string>() } = options

  let workingDays = 0
  const start = dayjs(startDate).startOf('day')
  const end = dayjs(endDate).startOf('day')

  if (end.isBefore(start)) {
    return 0
  }

  let current = start
  while (current.isSameOrBefore(end)) {
    const currentDate = current.toDate()

    if (excludeWeekends && isWeekend(currentDate)) {
      current = current.add(1, 'day')
      continue
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

export const buildHalfDayDates = (startDate: Date, endDate: Date): Set<string> => {
  const halfDays = new Set<string>()
  const start = dayjs(startDate)
  const end = dayjs(endDate)

  const startYear = start.year()
  const endYear = end.year()

  for (let year = startYear; year <= endYear; year++) {
    const dec24 = dayjs(`${year}-12-24`)
    if (dec24.isSameOrAfter(start) && dec24.isSameOrBefore(end)) {
      halfDays.add(dec24.format('YYYY-MM-DD'))
    }

    const dec31 = dayjs(`${year}-12-31`)
    if (dec31.isSameOrAfter(start) && dec31.isSameOrBefore(end)) {
      halfDays.add(dec31.format('YYYY-MM-DD'))
    }
  }

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
  holidays: HolidayEntry[] = []
): DateRangeBreakdown => {
  const start = dayjs(startDate).startOf('day')
  const end = dayjs(endDate).startOf('day')

  const effectiveDays = end.diff(start, 'day') + 1
  const weekends: string[] = []
  const holidayDates: Array<{ date: string; name: string }> = []
  const halfDayDates = buildHalfDayDates(startDate, endDate)

  let workingDays = 0
  let current = start

  while (current.isSameOrBefore(end)) {
    const currentDate = current.toDate()
    const dateStr = current.format('YYYY-MM-DD')

    if (isWeekend(currentDate)) {
      weekends.push(dateStr)
      current = current.add(1, 'day')
      continue
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
      const holidayName = holiday.value || 'Public Holiday'
      holidayDates.push({ date: dateStr, name: holidayName })
      current = current.add(1, 'day')
      continue
    }

    if (halfDayDates.has(dateStr)) {
      workingDays += 0.5
    } else {
      workingDays += 1
    }

    current = current.add(1, 'day')
  }

  return {
    effectiveDays,
    workingDays: Math.round(workingDays * 100) / 100,
    weekends,
    holidays: holidayDates,
    halfDays: Array.from(halfDayDates).filter(date => {
      const dateObj = dayjs(date)
      return dateObj.isSameOrAfter(start) && dateObj.isSameOrBefore(end)
    })
  }
}
