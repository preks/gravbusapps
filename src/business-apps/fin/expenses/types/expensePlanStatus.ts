/**
 * Enum for expense plan statuses.
 * This ensures consistency and type safety across the application.
 */
export enum ExpensePlanStatus {
  CREATED = 'CREATED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

/**
 * Array of all expense plan statuses.
 * Useful for iterating over all possible statuses.
 */
export const ALL_EXPENSE_PLAN_STATUSES = Object.values(ExpensePlanStatus)
