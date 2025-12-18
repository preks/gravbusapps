/**
 * Utility functions for deactivate employee benefit form
 */

import dayjs from 'dayjs'

/**
 * Gets the default end date (last day of current month)
 * @returns ISO date string (YYYY-MM-DD)
 */
export const getDefaultEndDate = (): string => {
  return dayjs().endOf('month').format('YYYY-MM-DD')
}
