/**
 * Color constants for backoffice expenses application
 * Using design tokens from @newwork/nw-design-system for consistency and theming support
 *
 * ✅ MIGRATED: All hardcoded hex values replaced with design system tokens
 */

export const EXPENSE_COLORS = {
  // Primary colors used in statistics and KPI cards - using design tokens
  PRIMARY_BLUE: 'var(--nw-color-primary-500)', // Main accent color for primary metrics
  SUCCESS_GREEN: 'var(--nw-color-success-500)', // Success, positive trends, within budget
  ERROR_RED: 'var(--nw-color-destructive-500)', // Errors, negative trends, over budget
  WARNING_ORANGE: 'var(--nw-color-warning-500)', // Warnings, attention needed
  WARNING_DARK_ORANGE: 'var(--nw-color-warning-700)', // Transfer required, urgent items (darker variant)
  INFO_PURPLE: 'var(--nw-color-info-500)' // Special metrics, current year data
} as const

// Type for color values to ensure type safety
export type ExpenseColor = (typeof EXPENSE_COLORS)[keyof typeof EXPENSE_COLORS]

/**
 * Helper function to get icon color based on context
 */
export const getExpenseIconColor = {
  totalSpend: () => EXPENSE_COLORS.PRIMARY_BLUE,
  pendingRequests: () => EXPENSE_COLORS.PRIMARY_BLUE,
  averageSpend: () => EXPENSE_COLORS.PRIMARY_BLUE,
  actualVsPlanned: (isOverBudget: boolean) => (isOverBudget ? EXPENSE_COLORS.ERROR_RED : EXPENSE_COLORS.SUCCESS_GREEN),
  monthlyComparison: (isIncrease: boolean) => (isIncrease ? EXPENSE_COLORS.ERROR_RED : EXPENSE_COLORS.SUCCESS_GREEN),
  transferRequired: () => EXPENSE_COLORS.WARNING_DARK_ORANGE,
  currentYear: () => EXPENSE_COLORS.INFO_PURPLE,
  monthlyTrends: () => EXPENSE_COLORS.PRIMARY_BLUE,
  warning: () => EXPENSE_COLORS.WARNING_ORANGE
} as const
