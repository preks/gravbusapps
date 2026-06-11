export const DISCARD_EXPENSE_ENTITY_REASON = 'Discarded by user'

export const DISCARDABLE_EXPENSE_ENTITY_STATUSES = new Set(['CREATED', 'REJECTED'])

export const DISCARD_EXPENSE_REQUEST_ENDPOINT = '/employee-expense/discardExpenseRequest'

export const DISCARD_EXPENSE_PLAN_ENDPOINT = '/employee-expense/discardExpensePlan'

export function isDiscardableExpenseEntityStatus(status?: string | null): boolean {
  if (!status) {
    return false
  }
  return DISCARDABLE_EXPENSE_ENTITY_STATUSES.has(status)
}
