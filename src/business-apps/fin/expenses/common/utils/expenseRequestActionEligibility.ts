import { isDiscardableExpenseEntityStatus } from '../discard/discardConstants'

export const EDITABLE_EXPENSE_REQUEST_STATUSES = new Set(['CREATED', 'REJECTED', 'PENDING'])

export function isEditableExpenseRequestStatus(status?: string | null): boolean {
  if (!status) {
    return false
  }
  return EDITABLE_EXPENSE_REQUEST_STATUSES.has(status)
}

export function isExpenseRecordOwnedByCurrentUser(
  recordOwnerEmployeeId: string | undefined | null,
  currentEmployeeId: string | undefined | null
): boolean {
  if (!recordOwnerEmployeeId || !currentEmployeeId) {
    return false
  }
  return recordOwnerEmployeeId === currentEmployeeId
}

export function canShowExpenseRequestOwnerActions(
  status: string | undefined | null,
  recordOwnerEmployeeId: string | undefined | null,
  currentEmployeeId: string | undefined | null
): boolean {
  if (!isExpenseRecordOwnedByCurrentUser(recordOwnerEmployeeId, currentEmployeeId)) {
    return false
  }
  return isEditableExpenseRequestStatus(status) || isDiscardableExpenseEntityStatus(status)
}
