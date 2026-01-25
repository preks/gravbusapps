import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

// Use UTC to prevent timezone conversion (9999-12-31 UTC becoming 10000-01-01 in local time)
dayjs.extend(utc)

/**
 * Formats a date string for input fields (YYYY-MM-DD format)
 * Handles ISO strings, date-only strings, and undefined/null values
 * Uses UTC to prevent timezone-related date shifts
 *
 * @param dateStr - Date string in various formats or undefined
 * @returns Formatted date string (YYYY-MM-DD) or undefined
 */
export const formatDateForInput = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  // Use UTC to prevent timezone conversion
  const formatted = dayjs.utc(dateStr).format('YYYY-MM-DD')
  // Return undefined if dayjs returns invalid date
  return formatted === 'Invalid Date' ? undefined : formatted
}

/**
 * Formats a date string for display (DD.MM.YYYY format)
 * Single source of truth for date display formatting across all tabs
 * Uses UTC to prevent timezone-related date shifts
 *
 * @param dateString - Date string in various formats
 * @returns Formatted date string (DD.MM.YYYY) or empty string if invalid
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  // Use UTC to prevent timezone conversion
  return dayjs.utc(dateString).format('DD.MM.YYYY')
}
