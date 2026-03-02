/**
 * Date utilities for the Expense Item module
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

  try {
    const parsed = dayjs(date)
    if (!parsed.isValid()) {
      return getCurrentDateAsISOString()
    }
    return parsed.format('YYYY-MM-DD')
  } catch {
    return getCurrentDateAsISOString()
  }
}

/**
 * Formats a date for getEmployeeRule (allowanceDate) so the backend finds the rule.
 * The API expects the calendar date at midnight UTC (e.g. 2026-01-01T00:00:00.000+0000).
 * Sending local midnight with a non-UTC offset (e.g. +0200) is parsed as a different
 * instant and can yield the wrong UTC date for rule lookup (e.g. 2025-12-31).
 *
 * @param date - ISO date string (e.g. from toISOString() or YYYY-MM-DDTHH:mm:ss)
 * @returns Formatted date string: local calendar date at midnight UTC (YYYY-MM-DDT00:00:00.000+0000)
 */
export const formatDateWithTimezone = (date: string): string => {
  const parsedDate = dayjs(date)
  if (!parsedDate.isValid()) {
    return date
  }
  // User's calendar date (local), then midnight UTC so backend rule lookup matches Swagger
  const localDate = parsedDate.format('YYYY-MM-DD')
  return `${localDate}T00:00:00.000+0000`
}
