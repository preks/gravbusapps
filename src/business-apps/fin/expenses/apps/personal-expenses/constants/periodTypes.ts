/**
 * Period type constants for Personal Expenses
 *
 * These constants define the period types used for filtering and displaying
 * expense data across different time ranges (monthly, quarterly, yearly).
 */

export const PERIOD_TYPE = {
  YEARLY: 'yearly',
  QUARTERLY: 'quarterly',
  MONTHLY: 'monthly'
} as const

export type PeriodType = (typeof PERIOD_TYPE)[keyof typeof PERIOD_TYPE]
