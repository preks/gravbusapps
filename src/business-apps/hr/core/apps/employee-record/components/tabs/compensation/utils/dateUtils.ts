/**
 * Date utility functions for compensation feature
 */

/**
 * Get default start date (first day of next month)
 * Used for benefit start dates in request forms
 */
export const getDefaultStartDate = (): string => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  date.setDate(1)
  return date.toISOString().split('T')[0]
}

/**
 * Get default end date (last day of current month)
 * Used for benefit end dates in deactivation forms
 */
export const getDefaultEndDate = (): string => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  date.setDate(0) // Last day of current month
  return date.toISOString().split('T')[0]
}
