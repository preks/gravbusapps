/**
 * Date utilities for the Expense Manager module
 */
import dayjs from 'dayjs'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

/**
 * Ensures consistent date formatting in DD.MM.YYYY format
 * This acts as a wrapper around formatDate to ensure consistent formatting
 * while keeping the door open for future integration with the global function
 *
 * @param dateValue - Date value to format
 * @returns Formatted date string in DD.MM.YYYY format or fallback value
 */
export const ensureShortDateFormat = (dateValue: string | Date | undefined | null): string => {
  if (!dateValue) return '-'

  try {
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return '-'
    const userLocale = getCurrentActiveUserLocale()
    return date.toLocaleDateString(userLocale, {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    })
  } catch {
    const d = dayjs(dateValue)
    return d.isValid() ? d.format('DD.MM.YYYY') : '-'
  }
}
