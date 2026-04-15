/**
 * Statuses exposed in Expense Request filters (personal expenses), aligned with product matrix.
 */
export const EXPENSE_REQUEST_FILTER_STATUSES: readonly string[] = [
  'CREATED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'VERIFIED',
  'BOOKED',
  'PAID',
  'TRANSFERRED'
]

/** Former filter ids — cleared when resetting filters from dashboard cards */
export const LEGACY_EXPENSE_REQUEST_FILTER_IDS: readonly string[] = [
  'PREPARED',
  'ASSIGNED',
  'CLOSED',
  'RETURNED',
  'DISCARDED'
]
