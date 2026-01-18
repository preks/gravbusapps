/**
 * Shared utilities for formatting absence-related data
 */

/**
 * Format working days text
 */
const formatDaysText = (days: number, t?: (key: string, vars?: Record<string, unknown>) => string): string => {
  if (t) {
    return t('working-days-format', { days })
  }
  return `${days} ${days === 1 ? 'day' : 'days'}`
}

/**
 * Format working hours text
 */
const formatHoursText = (
  hours: number,
  hasPrefix: boolean,
  t?: (key: string, vars?: Record<string, unknown>) => string
): string => {
  if (t) {
    const hoursText = t('working-hours-format', { hours })
    return hasPrefix ? ` ${hoursText}` : hoursText
  }
  const hoursText = `(${hours} ${hours === 1 ? 'hour' : 'hours'})`
  return hasPrefix ? ` ${hoursText}` : hoursText
}

/**
 * Formats working days and hours into a readable string
 * @param workingDays - Number of working days
 * @param workingHours - Number of working hours
 * @param t - Translation function (optional)
 * @returns Formatted string combining days and hours
 */
export const formatWorkingDaysAndHours = (
  workingDays?: number,
  workingHours?: number,
  t?: (key: string, vars?: Record<string, unknown>) => string
): string => {
  const parts: string[] = []

  if (workingDays !== undefined) {
    parts.push(formatDaysText(workingDays, t))
  }

  if (workingHours !== undefined) {
    const hasPrefix = parts.length > 0
    parts.push(formatHoursText(workingHours, hasPrefix, t))
  }

  return parts.join('')
}
