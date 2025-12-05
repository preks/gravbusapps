/**
 * Shared calculation utilities for analytics
 * Used by both CRM and IRM analytics modules to reduce code duplication
 */

/**
 * Calculate percentage change between current and previous values
 * Returns 100 when previous is 0 and current > 0
 */
export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) {
    // If both are 0, no change
    if (current === 0) return 0
    // If previous is 0 but current is not, return 100% growth
    return 100
  }
  return ((current - previous) / previous) * 100
}

/**
 * Calculate percentage change as formatted string
 */
export const formatPercentChange = (current: number, previous: number): string => {
  const change = calculatePercentChange(current, previous)
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

/**
 * Calculate conversion rate percentage
 */
export const calculateConversionRate = (converted: number, total: number): number => {
  if (total === 0) return 0
  return (converted / total) * 100
}

/**
 * Calculate win rate percentage
 */
export const calculateWinRate = (won: number, total: number): number => {
  if (total === 0) return 0
  return (won / total) * 100
}

/**
 * Calculate average value
 */
export const calculateAverage = (sum: number, count: number): number => {
  if (count === 0) return 0
  return sum / count
}

/**
 * Calculate days between two dates
 */
export const calculateDaysBetween = (startDate: Date | string, endDate: Date | string = new Date()): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Safe GraphQL identifier: replace non-word characters with underscore
 */
export const toSafeGraphQLIdentifier = (str: string): string => {
  return str.replace(/\W/g, '_')
}

/**
 * Pad number to 2 digits (for date formatting)
 */
export const pad2 = (n: number): string => {
  return String(n).padStart(2, '0')
}

/**
 * Format ISO date for GraphQL queries
 */
export const toGraphQLDate = (date: Date): string => {
  return date.toISOString()
}

/**
 * Get start of month
 */
export const getMonthStart = (year: number, month: number): string => {
  return `${year}-${pad2(month)}-01T00:00:00Z`
}

/**
 * Get start of next month
 */
export const getNextMonthStart = (year: number, month: number): string => {
  if (month === 12) {
    return `${year + 1}-01-01T00:00:00Z`
  }
  return `${year}-${pad2(month + 1)}-01T00:00:00Z`
}

/**
 * Get start of previous month
 */
export const getPreviousMonthStart = (year: number, month: number): string => {
  if (month === 1) {
    return `${year - 1}-12-01T00:00:00Z`
  }
  return `${year}-${pad2(month - 1)}-01T00:00:00Z`
}

/**
 * Calculate health score category
 */
export const getHealthCategory = (score: number): 'excellent' | 'healthy' | 'warning' | 'critical' => {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'healthy'
  if (score >= 50) return 'warning'
  return 'critical'
}

/**
 * Extract currency code from various formats
 */
export const extractCurrencyFromRef = (currencyRef: string | null | undefined): string => {
  if (currencyRef && typeof currencyRef === 'string') {
    return currencyRef.split(':').pop() || 'EUR'
  }
  return 'EUR'
}
