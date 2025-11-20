import { Employee } from '../hooks/useEmployeeData'
import { parseNumber, getCountryCallingCode } from 'libphonenumber-js'

/**
 * Format a phone number for display
 * @param phoneNumber The raw phone number string
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Basic formatting - in a real implementation, this would handle
  // different country formats, extensions, etc.
  if (!phoneNumber) return ''

  // Remove non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '')

  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`
  } else if (cleaned.length > 10) {
    return `+${cleaned.substring(0, cleaned.length - 10)} (${cleaned.substring(cleaned.length - 10, cleaned.length - 7)}) ${cleaned.substring(cleaned.length - 7, cleaned.length - 4)}-${cleaned.substring(cleaned.length - 4)}`
  }

  // If we can't format it, return the original
  return phoneNumber
}

/**
 * Format a phone number for display with country code separated: +{countryCode} {rest}
 * @param phoneNumber The raw phone number string (typically in E.164 format)
 * @returns Formatted phone number with country code separated by space
 */
export const formatPhoneNumberWithCountryCode = (phoneNumber: string): string => {
  if (!phoneNumber) return ''

  // If already formatted with space after country code, return as is
  if (phoneNumber.startsWith('+') && phoneNumber.includes(' ')) {
    // Normalize: ensure single space after country code
    const parts = phoneNumber.split(' ')
    if (parts.length >= 2) {
      return `${parts[0]} ${parts.slice(1).join(' ')}`
    }
    return phoneNumber
  }

  // Try to parse with libphonenumber-js
  if (phoneNumber.startsWith('+')) {
    try {
      const parsed = parseNumber(phoneNumber)
      if (parsed && 'country' in parsed && parsed.country) {
        const callingCode = getCountryCallingCode(parsed.country)
        // Remove the country code from the number
        const numberWithoutCode = phoneNumber.replace(`+${callingCode}`, '').trim()

        // If we successfully extracted the rest, format it
        if (numberWithoutCode) {
          return `+${callingCode} ${numberWithoutCode}`
        }
      }
    } catch {
      // Fall through to heuristic parsing
    }

    // Heuristic fallback: try to detect country code (1-3 digits)
    const withoutPlus = phoneNumber.substring(1).trim()

    // Try 1-digit country code (US, Canada) - typically 11 digits total
    if (withoutPlus.length >= 11 && withoutPlus.startsWith('1')) {
      const rest = withoutPlus.substring(1).trim()
      if (rest.length >= 10) {
        return `+1 ${rest}`
      }
    }

    // Try 2-digit country code (most common: +40, +69, etc.)
    if (withoutPlus.length >= 10) {
      const twoDigitCode = withoutPlus.substring(0, 2)
      const rest = withoutPlus.substring(2).trim()
      // Validate: rest should be reasonable length for a phone number
      if (rest.length >= 6 && rest.length <= 15) {
        return `+${twoDigitCode} ${rest}`
      }
    }

    // Try 3-digit country code (less common)
    if (withoutPlus.length >= 11) {
      const threeDigitCode = withoutPlus.substring(0, 3)
      const rest = withoutPlus.substring(3).trim()
      if (rest.length >= 6 && rest.length <= 15) {
        return `+${threeDigitCode} ${rest}`
      }
    }
  }

  // If we can't format it, return the original
  return phoneNumber
}

/**
 * Get the full name of an employee
 * @param employee The employee object
 * @returns Formatted full name
 */
export const getEmployeeFullName = (employee: Employee): string => {
  if (!employee) return ''

  // If displayName is available, use it directly
  if (employee.displayName) {
    return employee.displayName
  }

  // Fallback to constructing name from parts if displayName is not available
  const parts = []

  if (employee.firstName) {
    parts.push(employee.firstName)
  }

  if (employee.lastName) {
    parts.push(employee.lastName)
  }

  return parts.join(' ')
}

/**
 * Format file size for display
 * @param bytes Size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Calculate time since a given date
 * @param date The date to calculate from
 * @returns Formatted time since string
 */
export const getTimeSince = (date: string): string => {
  const now = new Date()
  const then = new Date(date)

  const diffYears = now.getFullYear() - then.getFullYear()
  const diffMonths = now.getMonth() - then.getMonth()

  if (diffYears > 0) {
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'}`
  } else if (diffMonths > 0) {
    return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'}`
  } else {
    return 'Less than a month'
  }
}

/**
 * Get the appropriate status color class for a status
 * @param status The status string
 * @returns CSS class for the status
 */
export const getStatusColorClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    APPROVED: 'gba:bg-success-secondary gba:text-success',
    PENDING: 'gba:bg-warning-secondary gba:text-warning',
    REJECTED: 'gba:bg-destructive-secondary gba:text-destructive',
    COMPLETED: 'gba:bg-info-secondary gba:text-info',
    IN_PROGRESS: 'gba:bg-info-secondary gba:text-info',
    ON_TRACK: 'gba:bg-success-secondary gba:text-success',
    BEHIND_TARGET: 'gba:bg-warning-secondary gba:text-warning',
    AT_RISK: 'gba:bg-destructive-secondary gba:text-destructive',
    ACHIEVED: 'gba:bg-info-secondary gba:text-info',
    NOT_ACHIEVED: 'gba:bg-muted gba:text-muted-foreground'
  }

  return statusMap[status] || 'gba:bg-muted gba:text-muted-foreground'
}

export const getTranslatedValue = (localeObject?: {
  id?: string
  value?: string
  translations?: { localeCode?: string; value: string }[]
}): string => localeObject?.translations?.[0]?.value || localeObject?.value || ''
