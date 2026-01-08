import { Employee } from '../hooks/useEmployeeData'
import { parseNumber, getCountryCallingCode } from 'libphonenumber-js'

export const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return ''

  const cleaned = phoneNumber.replace(/\D/g, '')

  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`
  } else if (cleaned.length > 10) {
    return `+${cleaned.substring(0, cleaned.length - 10)} (${cleaned.substring(cleaned.length - 10, cleaned.length - 7)}) ${cleaned.substring(cleaned.length - 7, cleaned.length - 4)}-${cleaned.substring(cleaned.length - 4)}`
  }

  return phoneNumber
}

export const formatPhoneNumberWithCountryCode = (phoneNumber: string): string => {
  if (!phoneNumber) return ''

  if (phoneNumber.startsWith('+') && phoneNumber.includes(' ')) {
    const parts = phoneNumber.split(' ')
    if (parts.length >= 2) {
      return `${parts[0]} ${parts.slice(1).join(' ')}`
    }
    return phoneNumber
  }

  if (phoneNumber.startsWith('+')) {
    try {
      const parsed = parseNumber(phoneNumber)
      if (parsed && 'country' in parsed && parsed.country) {
        const callingCode = getCountryCallingCode(parsed.country)
        const numberWithoutCode = phoneNumber.replace(`+${callingCode}`, '').trim()

        if (numberWithoutCode) {
          return `+${callingCode} ${numberWithoutCode}`
        }
      }
    } catch {}

    const withoutPlus = phoneNumber.substring(1).trim()

    if (withoutPlus.length >= 2) {
      if (withoutPlus.startsWith('1') || withoutPlus.startsWith('7')) {
        const rest = withoutPlus.substring(1)
        if (rest.length >= 1) {
          return `+${withoutPlus[0]} ${rest}`
        }
      }

      const twoDigitCode = withoutPlus.substring(0, 2)
      const rest = withoutPlus.substring(2)
      if (rest.length >= 1) {
        return `+${twoDigitCode} ${rest}`
      }
    }
  }

  return phoneNumber
}

export const getEmployeeFullName = (employee: Employee): string => {
  if (!employee) return ''

  if (employee.displayName) {
    return employee.displayName
  }

  const parts = []

  if (employee.firstName) {
    parts.push(employee.firstName)
  }

  if (employee.lastName) {
    parts.push(employee.lastName)
  }

  return parts.join(' ')
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

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
