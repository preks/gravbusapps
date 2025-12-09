import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)

/**
 * Format date to YYYY-MM-DD
 */
export const formatDateToISO = (date: Date | string): string => {
  return dayjs(date).format('YYYY-MM-DD')
}

/**
 * Get date range for preset
 */
export const getDateRangeForPreset = (
  preset: 'today' | 'this-week' | 'last-week' | 'last-30-days'
): { dateFrom: string; dateTo: string } => {
  const today = dayjs()

  switch (preset) {
    case 'today':
      return {
        dateFrom: today.format('YYYY-MM-DD'),
        dateTo: today.format('YYYY-MM-DD')
      }

    case 'this-week':
      return {
        dateFrom: today.startOf('isoWeek').format('YYYY-MM-DD'),
        dateTo: today.endOf('isoWeek').format('YYYY-MM-DD')
      }

    case 'last-week':
      return {
        dateFrom: today.subtract(1, 'week').startOf('isoWeek').format('YYYY-MM-DD'),
        dateTo: today.subtract(1, 'week').endOf('isoWeek').format('YYYY-MM-DD')
      }

    case 'last-30-days':
      return {
        dateFrom: today.subtract(30, 'days').format('YYYY-MM-DD'),
        dateTo: today.format('YYYY-MM-DD')
      }

    default:
      return {
        dateFrom: today.subtract(7, 'days').format('YYYY-MM-DD'),
        dateTo: today.format('YYYY-MM-DD')
      }
  }
}

/**
 * Get week identifier (YYYY-Www format)
 */
export const getWeekIdentifier = (date: Date | string): string => {
  const d = dayjs(date)
  return `${d.year()}-W${d.isoWeek().toString().padStart(2, '0')}`
}

/**
 * Get day of week name
 */
export const getDayOfWeekName = (date: Date | string): string => {
  return dayjs(date).format('dddd')
}

/**
 * Get all dates in range
 */
export const getDatesInRange = (dateFrom: string, dateTo: string): string[] => {
  const dates: string[] = []
  let current = dayjs(dateFrom)
  const end = dayjs(dateTo)

  while (current.isBefore(end) || current.isSame(end)) {
    dates.push(current.format('YYYY-MM-DD'))
    current = current.add(1, 'day')
  }

  return dates
}

/**
 * Get all weeks in range
 */
export const getWeeksInRange = (dateFrom: string, dateTo: string): string[] => {
  const weeks = new Set<string>()
  let current = dayjs(dateFrom)
  const end = dayjs(dateTo)

  while (current.isBefore(end) || current.isSame(end)) {
    weeks.add(getWeekIdentifier(current.toDate()))
    current = current.add(1, 'day')
  }

  return Array.from(weeks).sort()
}
