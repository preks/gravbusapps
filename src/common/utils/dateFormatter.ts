/**
 * Date formatting utilities for consistent date handling across the application
 */

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
