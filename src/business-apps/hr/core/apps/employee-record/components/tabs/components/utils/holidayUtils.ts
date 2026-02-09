import dayjs from 'dayjs'

/**
 * Checks if a single day is a holiday
 * @param holidayDates - Array of holiday dates in 'YYYY-MM-DD' format
 * @param date - The date to check
 * @returns true if the date is a holiday, false otherwise
 */
export const isHoliday = (holidayDates: string[] | undefined, date: dayjs.Dayjs): boolean => {
  try {
    if (!Array.isArray(holidayDates) || holidayDates.length === 0) return false
    const key = date.format('YYYY-MM-DD')
    return holidayDates.includes(key)
  } catch {
    return false
  }
}

/**
 * Checks if any day in a date range has a holiday
 * @param holidayDates - Array of holiday dates in 'YYYY-MM-DD' format
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @returns true if any day in the range is a holiday, false otherwise
 */
export const hasHolidayInRange = (
  holidayDates: string[] | undefined,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
): boolean => {
  try {
    if (!Array.isArray(holidayDates) || holidayDates.length === 0) return false
    // Check each day in the range for holidays
    let currentCheckDay = startDate
    while (currentCheckDay.isBefore(endDate, 'day') || currentCheckDay.isSame(endDate, 'day')) {
      if (isHoliday(holidayDates, currentCheckDay)) {
        return true
      }
      currentCheckDay = currentCheckDay.add(1, 'day')
    }
    return false
  } catch {
    return false
  }
}
