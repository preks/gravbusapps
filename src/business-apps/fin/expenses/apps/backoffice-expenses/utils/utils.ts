/**
 * Utility functions for Expense Management Overview
 *
 * @version 1.0
 * @date 2025-06-05
 */

export type TranslateFn = (key: string, vars?: Record<string, unknown>) => string

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
  badgeVariant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info' | 'offline'
}

/**
 * Maps technical expense request statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @param t - Translation function
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpenseRequestStatusDisplay = (status: string, t: TranslateFn): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: t('status-draft'),
        badgeVariant: 'offline'
      }

    case ExpenseStatus.PREPARED:
      return {
        label: t('status-prepared'),
        badgeVariant: 'offline'
      }

    case ExpenseStatus.ASSIGNED:
      return {
        label: t('status-assigned'),
        badgeVariant: 'info'
      }

    case ExpenseStatus.PENDING:
      return {
        label: t('status-in-approval'),
        badgeVariant: 'info'
      }

    case ExpenseStatus.APPROVED:
      return {
        label: t('status-verification-required'),
        badgeVariant: 'warning'
      }

    case ExpenseStatus.BOOKED:
      return {
        label: t('status-transfer-required'),
        badgeVariant: 'warning'
      }

    case ExpenseStatus.VERIFIED:
      return {
        label: t('status-booking-required'),
        badgeVariant: 'warning'
      }

    case ExpenseStatus.CLOSED:
      return {
        label: t('status-closed'),
        badgeVariant: 'success'
      }

    case ExpenseStatus.PAID:
      return {
        label: t('status-paid'),
        badgeVariant: 'success'
      }
    case ExpenseStatus.REJECTED:
      return {
        label: t('status-revision-required'),
        badgeVariant: 'warning'
      }

    case ExpenseStatus.DISCARDED:
      return {
        label: t('status-discarded'),
        badgeVariant: 'offline'
      }

    case ExpenseStatus.TRANSFERRED:
      return {
        label: t('status-transferred'),
        badgeVariant: 'success'
      }

    default:
      return {
        label: t('status-draft'),
        badgeVariant: 'offline'
      }
  }
}

/**
 * Maps technical advance payment statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @param t - Translation function
 * @returns StatusDisplayConfig with label and styling information
 */
export const getAdvancePaymentStatusDisplay = (status: string, t: TranslateFn): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.PENDING:
      return {
        label: t('status-in-approval'),
        badgeVariant: 'info'
      }
    case ExpenseStatus.APPROVED:
      return {
        label: t('status-approved'),
        badgeVariant: 'success'
      }
    case ExpenseStatus.BOOKED:
      return {
        label: t('status-transfer-required'),
        badgeVariant: 'warning'
      }
    case ExpenseStatus.PREPARED:
      return {
        label: t('status-prepared'),
        badgeVariant: 'offline'
      }
    case ExpenseStatus.REJECTED:
      return {
        label: t('status-revision-required'),
        badgeVariant: 'warning'
      }
    case ExpenseStatus.RETURNED:
      return {
        label: t('status-returned'),
        badgeVariant: 'warning'
      }
    case ExpenseStatus.TRANSFERRED:
      return {
        label: t('status-payment-required'),
        badgeVariant: 'warning'
      }
    case ExpenseStatus.VERIFIED:
      return {
        label: t('status-booking-required'),
        badgeVariant: 'warning'
      }
    case ExpenseStatus.PAID:
      return {
        label: t('status-paid'),
        badgeVariant: 'success'
      }
    default:
      return {
        label: t('status-draft'),
        badgeVariant: 'offline'
      }
  }
}

/**
 * Backoffice report hook expects plan/request/advance status mappers.
 * For plan reports we keep the same label mapping as request statuses.
 */
export const getExpensePlanStatusDisplay = (status: string, t: TranslateFn): StatusDisplayConfig => {
  return getExpenseRequestStatusDisplay(status, t)
}
