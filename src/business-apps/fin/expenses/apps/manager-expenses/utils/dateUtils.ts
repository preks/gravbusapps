/**
 * Date utilities for the Expense Manager module
 */
import dayjs from 'dayjs'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export type DateRangeTuple = [Date | null, Date | null] | null

/**
 * Converts a date range tuple to GraphQL filter shape (from/to in YYYY-MM-DD HH:mm:ss).
 * Returns null if the range is empty.
 */
export function convertDateRangeToGraphQL(
  dateRange: DateRangeTuple
): { from: string | null; to: string | null } | null {
  if (!dateRange || (!dateRange[0] && !dateRange[1])) return null
  return {
    from: dateRange[0] ? dayjs(dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss') : null,
    to: dateRange[1] ? dayjs(dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss') : null
  }
}

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
