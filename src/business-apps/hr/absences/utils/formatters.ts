/**
 * Shared utilities for formatting absence-related data
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
    if (t) {
      parts.push(t('working-days-format', { days: workingDays }))
    } else {
      parts.push(`${workingDays} ${workingDays === 1 ? 'day' : 'days'}`)
    }
  }

  if (workingHours !== undefined) {
    if (t) {
      const hoursText = t('working-hours-format', { hours: workingHours })
      parts.push(parts.length > 0 ? ` ${hoursText}` : hoursText)
    } else {
      const hoursText = `(${workingHours} ${workingHours === 1 ? 'hour' : 'hours'})`
      parts.push(parts.length > 0 ? ` ${hoursText}` : hoursText)
    }
  }

  return parts.join('')
}

/**
 * Format date and time with locale support and relative time (Today/Yesterday)
 * @param date - Date string or Date object
 * @param locale - Optional locale (e.g., 'ro', 'de', 'en', defaults to 'en')
 * @param t - Optional translation function for i18n support
 * @returns Formatted date and time string with locale support
 */
export const formatDateTime = (
  date: string | Date,
  locale: string = 'en',
  t?: (key: string, defaultValue: string) => string
): string => {
  if (!date) return ''

  const d = dayjs(date)
  if (!d.isValid()) return ''

  // Set locale (support full locale codes like 'ro-RO', extract base)
  const baseLocale = locale.split('-')[0].toLowerCase()
  const localized = d.locale(baseLocale)

  // Get locale-specific date and time formats
  const timeFormat = localized.localeData().longDateFormat('LT')
  const dateFormat = localized.localeData().longDateFormat('LL')

  // Get translated labels for Today/Yesterday
  const todayLabel = t ? t('date-today', 'Today') : getLocalizedToday(baseLocale)
  const yesterdayLabel = t ? t('date-yesterday', 'Yesterday') : getLocalizedYesterday(baseLocale)

  // Calendar format with locale-specific labels, date and time formats
  return localized.calendar(null, {
    sameDay: `[${todayLabel}] ${timeFormat}`,
    lastDay: `[${yesterdayLabel}] ${timeFormat}`,
    lastWeek: `${dateFormat} ${timeFormat}`,
    sameElse: `${dateFormat} ${timeFormat}`
  })
}

/**
 * Get localized "Today" label (fallback when i18n not available)
 */
const getLocalizedToday = (locale: string): string => {
  const labels: Record<string, string> = {
    ro: 'Astăzi',
    de: 'Heute',
    en: 'Today'
  }
  return labels[locale] || labels['en']
}

/**
 * Get localized "Yesterday" label (fallback when i18n not available)
 */
const getLocalizedYesterday = (locale: string): string => {
  const labels: Record<string, string> = {
    ro: 'Ieri',
    de: 'Gestern',
    en: 'Yesterday'
  }
  return labels[locale] || labels['en']
}
