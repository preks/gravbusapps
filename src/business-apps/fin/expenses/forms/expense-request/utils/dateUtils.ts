/**
 * Date utilities for the Expense Request module
 */
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * Formats a date string to DD.MM.YYYY format
 * @param dateString - ISO date string
 * @returns Formatted date string in DD.MM.YYYY format
 */
export const formatDateToDDMMYYYY = (dateString: string): string => {
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}.${month}.${year}`
}

/**
 * Gets the current date as an ISO string (YYYY-MM-DD)
 * @returns Current date in YYYY-MM-DD format
 */
export const getCurrentDateAsISOString = (): string => {
  return new Date().toISOString().split('T')[0]
}

/**
 * Formats a date object or string to ISO date string (YYYY-MM-DD)
 * @param date - Date object or string
 * @returns Formatted date in YYYY-MM-DD format or current date if input is invalid
 */
export const formatDateToISOString = (date: Date | string | undefined): string => {
  if (!date) {
    return getCurrentDateAsISOString()
  }

  if (date instanceof Date) {
    return date.toISOString().split('T')[0]
  }

  try {
    return new Date(date).toISOString().split('T')[0]
  } catch {
    return getCurrentDateAsISOString()
  }
}

/**
 * Formats a date for getEmployeeRule (allowanceDate). API expects calendar date at midnight UTC
 * (e.g. 2026-01-01T00:00:00.000+0000). Non-UTC offset can yield wrong UTC date for rule lookup.
 *
 * @param date - ISO date string (e.g. from toISOString() or YYYY-MM-DDTHH:mm:ss)
 * @returns Local calendar date at midnight UTC (YYYY-MM-DDT00:00:00.000+0000)
 */
export const formatDateWithTimezone = (date: string): string => {
  const parsedDate = dayjs(date)
  if (!parsedDate.isValid()) {
    return date
  }
  const localDate = parsedDate.format('YYYY-MM-DD')
  return `${localDate}T00:00:00.000+0000`
}
