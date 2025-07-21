/**
 * Color constants for backoffice expenses application
 * Following the same pattern as leads components
 */

export const EXPENSE_COLORS = {
  // Primary colors used in statistics and KPI cards
  PRIMARY_BLUE: '#1890ff',      // Main accent color for primary metrics
  SUCCESS_GREEN: '#52c41a',     // Success, positive trends, within budget
  ERROR_RED: '#ff4d4f',         // Errors, negative trends, over budget  
  WARNING_ORANGE: '#faad14',    // Warnings, attention needed
  WARNING_DARK_ORANGE: '#d46b08', // Transfer required, urgent items
  INFO_PURPLE: '#722ed1',       // Special metrics, current year data
} as const;

// Type for color values to ensure type safety
export type ExpenseColor = typeof EXPENSE_COLORS[keyof typeof EXPENSE_COLORS];

/**
 * Helper function to get icon color based on context
 */
export const getExpenseIconColor = {
  totalSpend: () => EXPENSE_COLORS.PRIMARY_BLUE,
  pendingRequests: () => EXPENSE_COLORS.PRIMARY_BLUE,
  averageSpend: () => EXPENSE_COLORS.PRIMARY_BLUE,
  actualVsPlanned: (isOverBudget: boolean) => 
    isOverBudget ? EXPENSE_COLORS.ERROR_RED : EXPENSE_COLORS.SUCCESS_GREEN,
  monthlyComparison: (isIncrease: boolean) => 
    isIncrease ? EXPENSE_COLORS.ERROR_RED : EXPENSE_COLORS.SUCCESS_GREEN,
  transferRequired: () => EXPENSE_COLORS.WARNING_DARK_ORANGE,
  currentYear: () => EXPENSE_COLORS.INFO_PURPLE,
  monthlyTrends: () => EXPENSE_COLORS.PRIMARY_BLUE,
} as const; 