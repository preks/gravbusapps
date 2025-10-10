/**
 * Date formatting utilities for investment forms
 */

/**
 * Formats a date value for HTML date input fields (YYYY-MM-DD format)
 * @param dateValue - Date value (string, Date object, or timestamp)
 * @returns Formatted date string in YYYY-MM-DD format, or empty string if invalid
 *
 * @example
 * formatDateForInput("2024-01-15T10:30:00Z") // "2024-01-15"
 * formatDateForInput(new Date()) // "2024-01-15"
 * formatDateForInput(null) // ""
 */
export const formatDateForInput = (dateValue: any): string => {
  if (!dateValue) return ''

  try {
    // Handle various date formats
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return ''

    // Convert to YYYY-MM-DD format
    return date.toISOString().split('T')[0]
  } catch (error) {
    console.warn('Failed to format date:', dateValue, error)
    return ''
  }
}
