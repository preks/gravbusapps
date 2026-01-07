/**
 * @module shared/utils/dateUtils
 * @description Date formatting, duration calculations, and date utilities for analytics views.
 * Provides consistent date handling across all analytics components.
 */

import dayjs from 'dayjs'

/**
 * @function calculateDurationYears
 * @description Calculates the duration in years between two dates.
 *
 * @param {string | Date} startDate - The start date
 * @param {string | Date} [endDate] - The end date (defaults to current date)
 * @returns {number} Duration in years (decimal)
 *
 * @example
 * calculateDurationYears("2020-01-01", "2023-01-01") // Returns: 3.0
 * calculateDurationYears("2020-01-01") // Returns: years since 2020
 * calculateDurationYears(new Date(2020, 0, 1), new Date(2022, 6, 1)) // Returns: 2.5
 */
export function calculateDurationYears(startDate: string | Date, endDate?: string | Date): number {
  const start = dayjs(startDate)
  const end = endDate ? dayjs(endDate) : dayjs()

  if (!start.isValid()) return 0

  return end.diff(start, 'year', true)
}

/**
 * @function calculateInvestmentDuration
 * @description Calculates the duration of an investment in days.
 * If no exit date is provided, calculates from acquisition to current date.
 *
 * @param {string | null} acquisitionDate - The acquisition date
 * @param {string | null} [exitDate] - The exit date (optional)
 * @returns {number} Duration in days, or 0 if acquisition date is invalid
 *
 * @example
 * calculateInvestmentDuration("2020-01-01", "2023-01-01") // Returns: 1096 (3 years)
 * calculateInvestmentDuration("2022-01-01") // Returns: days since 2022-01-01
 * calculateInvestmentDuration(null) // Returns: 0
 */
export function calculateInvestmentDuration(acquisitionDate: string | null, exitDate?: string | null): number {
  if (!acquisitionDate) return 0

  const start = dayjs(acquisitionDate)
  if (!start.isValid()) return 0

  const end = exitDate && dayjs(exitDate).isValid() ? dayjs(exitDate) : dayjs()

  return end.diff(start, 'day')
}

// Helper function to format time unit
function formatTimeUnit(value: number, unit: string, format: 'short' | 'long', shortForm: string): string {
  if (format === 'short') {
    return `${value}${shortForm}`
  }
  const unitText = value === 1 ? unit : `${unit}s`
  return `${value} ${unitText}`
}

/**
 * @function formatDuration
 * @description Formats a duration in days to a human-readable string.
 *
 * @param {number} days - The duration in days
 * @param {object} [options] - Formatting options
 * @param {'short' | 'long'} [options.format='short'] - Output format (e.g., "2y 3m" vs "2 years, 3 months")
 * @param {boolean} [options.showDays=false] - Whether to include days in the output
 * @returns {string} Formatted duration string
 *
 * @example
 * formatDuration(730) // Returns: "2y"
 * formatDuration(730, { format: 'long' }) // Returns: "2 years"
 * formatDuration(395, { showDays: true }) // Returns: "1y 1m"
 * formatDuration(395, { format: 'long', showDays: true }) // Returns: "1 year, 1 month"
 * formatDuration(45) // Returns: "1m"
 * formatDuration(45, { format: 'long' }) // Returns: "1 month"
 */
export function formatDuration(
  days: number,
  options: {
    format?: 'short' | 'long'
    showDays?: boolean
  } = {}
): string {
  const { format = 'short', showDays = false } = options

  if (days === 0) return format === 'short' ? '0d' : '0 days'

  const years = Math.floor(days / 365)
  const remainingAfterYears = days % 365
  const months = Math.floor(remainingAfterYears / 30)
  const remainingDays = remainingAfterYears % 30

  const parts: string[] = []

  if (years > 0) {
    parts.push(formatTimeUnit(years, 'year', format, 'y'))
  }

  if (months > 0) {
    parts.push(formatTimeUnit(months, 'month', format, 'm'))
  }

  if (showDays && remainingDays > 0) {
    parts.push(formatTimeUnit(remainingDays, 'day', format, 'd'))
  }

  if (parts.length === 0) {
    // Less than a month
    return formatTimeUnit(days, 'day', format, 'd')
  }

  return format === 'short' ? parts.join(' ') : parts.join(', ')
}

/**
 * @function formatYearsDuration
 * @description Formats a duration in years to a human-readable string.
 * Useful for displaying investment holding periods.
 *
 * @param {number} years - The duration in years (can be decimal)
 * @param {object} [options] - Formatting options
 * @param {number} [options.precision=1] - Decimal precision
 * @param {'short' | 'long'} [options.format='short'] - Output format
 * @returns {string} Formatted duration string
 *
 * @example
 * formatYearsDuration(2.5) // Returns: "2.5y"
 * formatYearsDuration(2.5, { format: 'long' }) // Returns: "2.5 years"
 * formatYearsDuration(1.0, { format: 'long' }) // Returns: "1 year"
 * formatYearsDuration(3.456, { precision: 2 }) // Returns: "3.46y"
 */
export function formatYearsDuration(
  years: number,
  options: {
    precision?: number
    format?: 'short' | 'long'
  } = {}
): string {
  const { precision = 1, format = 'short' } = options

  const roundedYears = Number(years.toFixed(precision))

  if (format === 'short') {
    return `${roundedYears}y`
  } else {
    return `${roundedYears} ${roundedYears === 1 ? 'year' : 'years'}`
  }
}

/**
 * @function formatDate
 * @description Formats a date to a standard display format.
 *
 * @param {string | Date} date - The date to format
 * @param {string} [format='YYYY-MM-DD'] - The output format (dayjs format string)
 * @returns {string} Formatted date string, or empty string if invalid
 *
 * @example
 * formatDate("2023-01-15") // Returns: "2023-01-15"
 * formatDate("2023-01-15", "MMM DD, YYYY") // Returns: "Jan 15, 2023"
 * formatDate("2023-01-15", "DD/MM/YYYY") // Returns: "15/01/2023"
 * formatDate(null) // Returns: ""
 */
export function formatDate(date: string | Date | null, format: string = 'YYYY-MM-DD'): string {
  if (!date) return ''

  const d = dayjs(date)
  if (!d.isValid()) return ''

  return d.format(format)
}

/**
 * @function isDateInRange
 * @description Checks if a date falls within a specified range.
 *
 * @param {string | Date} date - The date to check
 * @param {string | Date} startDate - The start of the range
 * @param {string | Date} endDate - The end of the range
 * @returns {boolean} True if date is within range, false otherwise
 *
 * @example
 * isDateInRange("2023-06-15", "2023-01-01", "2023-12-31") // Returns: true
 * isDateInRange("2024-01-15", "2023-01-01", "2023-12-31") // Returns: false
 */
export function isDateInRange(date: string | Date, startDate: string | Date, endDate: string | Date): boolean {
  const d = dayjs(date)
  const start = dayjs(startDate)
  const end = dayjs(endDate)

  if (!d.isValid() || !start.isValid() || !end.isValid()) return false

  return (d.isAfter(start) && d.isBefore(end)) || d.isSame(start) || d.isSame(end)
}

/**
 * @function getDateRange
 * @description Gets a date range for common periods (e.g., "last 30 days", "this year").
 *
 * @param {'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear'} period - The period to get
 * @returns {{ start: Date, end: Date }} The date range
 *
 * @example
 * getDateRange('last30days')
 * // Returns: { start: Date (30 days ago), end: Date (today) }
 *
 * getDateRange('thisYear')
 * // Returns: { start: Date (Jan 1 of current year), end: Date (today) }
 */
export function getDateRange(
  period:
    | 'today'
    | 'yesterday'
    | 'last7days'
    | 'last30days'
    | 'last90days'
    | 'thisMonth'
    | 'lastMonth'
    | 'thisYear'
    | 'lastYear'
): { start: Date; end: Date } {
  const now = dayjs()

  switch (period) {
    case 'today':
      return {
        start: now.startOf('day').toDate(),
        end: now.endOf('day').toDate()
      }
    case 'yesterday':
      return {
        start: now.subtract(1, 'day').startOf('day').toDate(),
        end: now.subtract(1, 'day').endOf('day').toDate()
      }
    case 'last7days':
      return {
        start: now.subtract(7, 'day').startOf('day').toDate(),
        end: now.endOf('day').toDate()
      }
    case 'last30days':
      return {
        start: now.subtract(30, 'day').startOf('day').toDate(),
        end: now.endOf('day').toDate()
      }
    case 'last90days':
      return {
        start: now.subtract(90, 'day').startOf('day').toDate(),
        end: now.endOf('day').toDate()
      }
    case 'thisMonth':
      return {
        start: now.startOf('month').toDate(),
        end: now.endOf('month').toDate()
      }
    case 'lastMonth':
      return {
        start: now.subtract(1, 'month').startOf('month').toDate(),
        end: now.subtract(1, 'month').endOf('month').toDate()
      }
    case 'thisYear':
      return {
        start: now.startOf('year').toDate(),
        end: now.endOf('year').toDate()
      }
    case 'lastYear':
      return {
        start: now.subtract(1, 'year').startOf('year').toDate(),
        end: now.subtract(1, 'year').endOf('year').toDate()
      }
  }
}
