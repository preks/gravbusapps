import { isDiscardableExpenseEntityStatus } from '../discard/discardConstants'
import { isExpenseRecordOwnedByCurrentUser } from './expenseRequestActionEligibility'

export const EDITABLE_EXPENSE_PLAN_STATUSES = new Set(['CREATED', 'REJECTED'])

export function isEditableExpensePlanStatus(status?: string | null): boolean {
  if (!status) {
    return false
  }
  return EDITABLE_EXPENSE_PLAN_STATUSES.has(status)
}

export function canShowExpensePlanOwnerActions(
  status: string | undefined | null,
  recordOwnerEmployeeId: string | undefined | null,
  currentEmployeeId: string | undefined | null
): boolean {
  if (!isExpenseRecordOwnedByCurrentUser(recordOwnerEmployeeId, currentEmployeeId)) {
    return false
  }
  return isEditableExpensePlanStatus(status) || isDiscardableExpenseEntityStatus(status)
}
