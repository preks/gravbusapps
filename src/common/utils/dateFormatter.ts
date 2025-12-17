/**
 * Date formatting utilities for consistent date handling across the application
 */

import dayjs from 'dayjs'
import 'dayjs/locale/ro' // Romanian
import 'dayjs/locale/de' // German
import 'dayjs/locale/en' // English
import relativeTime from 'dayjs/plugin/relativeTime'
import calendar from 'dayjs/plugin/calendar'

// Load dayjs plugins
dayjs.extend(relativeTime)
dayjs.extend(calendar)

/**
 * Converts a date string to ISO format
 * @param dateString - Date string in various formats (YYYY-MM-DD, ISO string, etc.)
 * @returns ISO formatted date string or undefined if invalid
 */
export const toISOFormat = (dateString: string | undefined | null): string | undefined => {
  if (!dateString) return undefined

  const trimmed = String(dateString).trim()

  // If it already contains an explicit timezone (Z or +/-HH:mm), trust it
  if (trimmed.includes('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // Handle datetime-local (YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss) as local time → ISO UTC
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    try {
      const date = new Date(trimmed)
      if (Number.isNaN(date.getTime())) {
        console.error('Invalid datetime-local string:', trimmed)
        return undefined
      }
      return date.toISOString()
    } catch (error) {
      console.error('Error formatting datetime-local:', error)
      return undefined
    }
  }

  // Convert YYYY-MM-DD to ISO format
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      // Interpret as local midnight and convert to UTC
      const date = new Date(`${trimmed}T00:00`)
      if (Number.isNaN(date.getTime())) {
        console.error('Invalid date string:', trimmed)
        return undefined
      }
      return date.toISOString()
    }
    // Fallback: let Date parse and convert to ISO
    const date = new Date(trimmed)

    // Check if the date is valid
    if (Number.isNaN(date.getTime())) {
      console.error('Invalid date string:', trimmed)
      return undefined
    }

    return date.toISOString()
  } catch (error) {
    console.error('Error formatting date:', error)
    return undefined
  }
}

/**
 * Converts a date string to ISO format with a specific time
 * @param dateString - Date string in various formats
 * @param timeString - Time string in HH:mm format (defaults to 00:00)
 * @returns ISO formatted date string or undefined if invalid
 */
export const toISOFormatWithTime = (
  dateString: string | undefined | null,
  timeString: string = '00:00'
): string | undefined => {
  if (!dateString) return undefined

  // If it's already in ISO format, return as is
  if (dateString.includes('T') || dateString.includes('Z')) {
    return dateString
  }

  try {
    const date = new Date(`${dateString}T${timeString}:00.000Z`)

    // Check if the date is valid
    if (Number.isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return undefined
    }

    return date.toISOString()
  } catch (error) {
    console.error('Error formatting date with time:', error)
    return undefined
  }
}

/**
 * Formats a date for display in a user-friendly format
 * @param dateString - Date string or Date object
 * @param locale - Locale for formatting (defaults to 'en-US')
 * @returns Formatted date string
 */
export const formatForDisplay = (dateString: string | Date | undefined | null, locale: string = 'en-US'): string => {
  if (!dateString) return ''

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date for display:', error)
    return ''
  }
}

/**
 * Checks if a date string is valid
 * @param dateString - Date string to validate
 * @returns True if the date is valid, false otherwise
 */
export const isValidDate = (dateString: string | undefined | null): boolean => {
  if (!dateString) return false

  try {
    const date = new Date(dateString)
    return !Number.isNaN(date.getTime())
  } catch {
    return false
  }
}

/**
 * Formats a date for display using numeric format only (no month names)
 * Provides locale-aware formatting while avoiding translation issues
 * @param dateString - Date string or Date object
 * @param locale - Locale for formatting (defaults to 'en-US')
 * @returns Formatted date string with numeric month (e.g., 17.12.2025, 12/17/2025)
 */
export const formatForDisplayNumeric = (
  dateString: string | Date | undefined | null,
  locale: string = 'en-US'
): string => {
  if (!dateString) return ''

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date for display (numeric):', error)
    return ''
  }
}

/**
 * Format date and time with locale support and relative time (Today/Yesterday)
 * Useful for displaying user-friendly timestamps with relative time indicators
 *
 * Uses dayjs calendar plugin which automatically provides locale-specific
 * translations for "Today", "Yesterday", and date/time formats based on the locale.
 *
 * @param date - Date string or Date object
 * @param locale - Optional locale (e.g., 'ro', 'de', 'en', defaults to 'en')
 * @returns Formatted date and time string with locale support
 */
export const formatDateTime = (date: string | Date | undefined | null, locale: string = 'en'): string => {
  if (!date) return ''

  const d = dayjs(date)
  if (!d.isValid()) return ''

  // Set locale (support full locale codes like 'ro-RO', extract base)
  const baseLocale = locale.split('-')[0].toLowerCase()

  // Use dayjs calendar with built-in locale support
  // This automatically provides "Today", "Yesterday" in the correct language
  return d.locale(baseLocale).calendar()
}
