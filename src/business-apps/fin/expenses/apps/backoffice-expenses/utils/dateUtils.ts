/**
 * Date utility functions for formatting dates with locale support
 */
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/it'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { TranslateFn } from './utils'

// Extend dayjs with localized format plugin
dayjs.extend(localizedFormat)

/**
 * Format date using user's locale
 * @param dateValue - Date string or Date object
 * @param t - Translation function
 * @param format - dayjs format string (default: 'L' for localized short date)
 * @returns Formatted date string
 *
 * Examples:
 * - en-US: "01/15/2025"
 * - de-DE: "15.01.2025"
 * - ro-RO: "15.01.2025"
 */
export const formatDateLocalized = (
  dateValue: string | Date | null | undefined,
  t: TranslateFn,
  format: string = 'L'
): string => {
  if (!dateValue) {
    return t('common-not-available')
  }

  try {
    const userLocale = getCurrentActiveUserLocale()
    const baseLocale = userLocale?.split('-')[0] || 'en'
    return dayjs(dateValue).locale(baseLocale).format(format)
  } catch (error) {
    console.error('Error formatting date:', error)
    return t('common-not-available')
  }
}

/**
 * Format date with time using user's locale
 * @param dateValue - Date string or Date object
 * @param t - Translation function
 * @returns Formatted date and time string
 *
 * Examples:
 * - en-US: "01/15/2025 10:30 AM"
 * - de-DE: "15.01.2025 10:30"
 * - ro-RO: "15.01.2025 10:30"
 */
export const formatDateTimeLocalized = (dateValue: string | Date | null | undefined, t: TranslateFn): string => {
  return formatDateLocalized(dateValue, t, 'L LT')
}
