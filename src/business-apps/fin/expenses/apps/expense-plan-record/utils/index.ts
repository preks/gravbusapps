// PillType is used for status display configuration
import { PillType } from '@/components/pill/Pill'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Enum representing the technical statuses for expenses
 */
export enum ExpenseStatus {
  PREPARED = 'PREPARED',
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  RETURNED = 'RETURNED',
  REJECTED = 'REJECTED',
  VERIFIED = 'VERIFIED',
  BOOKED = 'BOOKED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
  DISCARDED = 'DISCARDED',
  TRANSFERRED = 'TRANSFERRED'
}

/**
 * Type for status display configuration
 */
export interface StatusDisplayConfig {
  label: string
  type: PillType
}

/**
 * Maps technical expense item statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpenseItemStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        type: 'draft'
      }
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
        type: 'waiting'
      }
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        type: 'waiting'
      }
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit'),
        type: 'waiting'
      }
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
        type: 'completed'
      }
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required'),
        type: 'task'
      }
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        type: 'completed'
      }
    default:
      return {
        label: status,
        type: 'error'
      }
  }
}

/**
 * Maps technical expense plan statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpensePlanStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        type: 'draft'
      }
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
        type: 'waiting'
      }
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        type: 'waiting'
      }
    case ExpenseStatus.APPROVED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved', 'Approved'),
        type: 'completed'
      }
    case ExpenseStatus.RETURNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required'),
        type: 'task'
      }
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        type: 'completed'
      }
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected'),
        type: 'error'
      }
    default:
      return {
        label: status,
        type: 'draft'
      }
  }
}

/**
 * Maps technical expense request statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpenseRequestStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        type: 'draft'
      }
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        type: 'waiting'
      }
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit'),
        type: 'waiting'
      }
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
        type: 'completed'
      }
    case ExpenseStatus.RETURNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required'),
        type: 'task'
      }
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        type: 'completed'
      }
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected'),
        type: 'error'
      }
    default:
      return {
        label: status,
        type: 'draft'
      }
  }
}

/**
 * Maps technical advance payment statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getAdvancePaymentStatusDisplay = (status: string): StatusDisplayConfig => {
  // Advance payments use the same status display configuration as expense requests
  return getExpenseRequestStatusDisplay(status)
}
