import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

dayjs.extend(weekday)
dayjs.extend(localeData)

const HOURS_PER_DAY = 8

/**
 * Get the start of the week (Monday) for a given date
 */
export const getWeekStart = (date: Date | string): Date => {
  const d = dayjs(date)
  return d.startOf('week').add(1, 'day').toDate() // Monday
}

/**
 * Get the end of the week (Sunday) for a given date
 */
export const getWeekEnd = (date: Date | string): Date => {
  const d = dayjs(date)
  return d.endOf('week').toDate() // Sunday
}

/**
 * Get all 7 days of the week starting from Monday
 */
export const getWeekDays = (weekStart: Date | string): Date[] => {
  const start = dayjs(weekStart)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    days.push(start.add(i, 'day').toDate())
  }
  return days
}

/**
 * Get only weekdays (Monday to Friday) - 5 days
 */
export const getWeekdays = (weekStart: Date | string): Date[] => {
  const start = dayjs(weekStart)
  const days: Date[] = []
  for (let i = 0; i < 5; i++) {
    days.push(start.add(i, 'day').toDate())
  }
  return days
}

/**
 * Calculate pre-filled hours based on allocation percentage
 * Formula: (percentage / 100) * HOURS_PER_DAY
 */
export const calculateHoursFromPercentage = (percentage: number): number => {
  return (percentage / 100) * HOURS_PER_DAY
}

/**
 * Format date to display format (e.g., "Mon, Jan 15")
 */
export const formatDayLabel = (date: Date | string): string => {
  const d = dayjs(date)
  const dayName = d.format('ddd') // Mon, Tue, etc.
  const dayNumber = d.format('D') // 15
  const month = d.format('MMM') // Jan
  return `${dayName}, ${month} ${dayNumber}`
}

/**
 * Format date to short format (e.g., "Mon 15")
 */
export const formatDayShort = (date: Date | string): string => {
  const d = dayjs(date)
  return d.format('ddd D')
}

/**
 * Get day name (Monday, Tuesday, etc.)
 */
export const getDayName = (date: Date | string): string => {
  return dayjs(date).format('dddd')
}
