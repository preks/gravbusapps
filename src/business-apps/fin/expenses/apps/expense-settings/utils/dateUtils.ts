import dayjs from 'dayjs'

/**
 * Formats a date string for input fields (YYYY-MM-DD format)
 * Handles ISO strings, date-only strings, and undefined/null values
 *
 * @param dateStr - Date string in various formats or undefined
 * @returns Formatted date string (YYYY-MM-DD) or undefined
 */
export const formatDateForInput = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  // Otherwise extract date portion using dayjs to handle ISO strings correctly
  return dayjs(dateStr).format('YYYY-MM-DD')
}

/**
 * Formats a date string for display (DD.MM.YYYY format)
 * Single source of truth for date display formatting across all tabs
 *
 * @param dateString - Date string in various formats
 * @returns Formatted date string (DD.MM.YYYY) or empty string if invalid
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  return dayjs(dateString).format('DD.MM.YYYY')
}
