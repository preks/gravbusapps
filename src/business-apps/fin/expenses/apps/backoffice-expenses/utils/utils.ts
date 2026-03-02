/**
 * Utility functions for Expense Management Overview
 *
 * @version 1.0
 * @date 2025-06-05
 */

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
  badgeVariant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info' | 'offline'
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
        badgeVariant: 'offline'
      }

    case ExpenseStatus.PREPARED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared'),
        badgeVariant: 'offline'
      }

    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
        badgeVariant: 'info'
      }

    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        badgeVariant: 'info'
      }

    case ExpenseStatus.APPROVED:
      return {
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_statuses.verification_required',
          'Verification Required'
        ),
        badgeVariant: 'warning'
      }

    case ExpenseStatus.VERIFIED:
      return {
        label: 'Transfer Required',
        badgeVariant: 'warning'
      }

    case ExpenseStatus.BOOKED:
      return {
        label: 'Transfer Required',
        badgeVariant: 'warning'
      }

    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        badgeVariant: 'success'
      }

    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
        badgeVariant: 'success'
      }
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected'),
        badgeVariant: 'warning'
      }

    case ExpenseStatus.DISCARDED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.discarded', 'Discarded'),
        badgeVariant: 'offline'
      }

    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.transferred', 'Transferred'),
        badgeVariant: 'success'
      }

    default:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        badgeVariant: 'offline'
      }
  }
}

/**
 * Maps technical advance payment statuses to user-friendly display configurations
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getAdvancePaymentStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        badgeVariant: 'info'
      }
    case ExpenseStatus.APPROVED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved', 'Approved'),
        badgeVariant: 'success'
      }
    case ExpenseStatus.BOOKED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.transfer_required', 'Transfer Required'),
        badgeVariant: 'warning'
      }
    case ExpenseStatus.PREPARED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared'),
        badgeVariant: 'offline'
      }
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected'),
        badgeVariant: 'destructive'
      }
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.payment_required', 'Payment Required'),
        badgeVariant: 'warning'
      }
    case ExpenseStatus.VERIFIED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booking_required', 'Booking Required'),
        badgeVariant: 'warning'
      }
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
        badgeVariant: 'success'
      }
    default:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        badgeVariant: 'offline'
      }
  }
}

/**
 * Backoffice report hook expects plan/request/advance status mappers.
 * For plan reports we keep the same label mapping as request statuses.
 */
export const getExpensePlanStatusDisplay = (status: string): StatusDisplayConfig => {
  return getExpenseRequestStatusDisplay(status)
}

/**
 * Determines the fiscal year date range based on current date
 * Assumes fiscal year is calendar year (Jan 1 - Dec 31)
 *
 * @returns Object with start and end dates of the current fiscal year
 */
export const getCurrentFiscalYearRange = () => {
  const today = new Date()
  const currentYear = today.getFullYear()

  const fiscalYearStart = new Date(`${currentYear}-01-01T00:00:00.000Z`)
  const fiscalYearEnd = new Date(`${currentYear}-12-31T23:59:59.999Z`)

  return {
    start: fiscalYearStart,
    end: fiscalYearEnd,
    startISOString: fiscalYearStart.toISOString(),
    endISOString: fiscalYearEnd.toISOString(),
    year: currentYear
  }
}

/**
 * Formats a date string to YYYY-MM-DD format
 *
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  return dateString.split('T')[0]
}

/**
 * Determines if an expense request is part of the YTD calculation
 *
 * @param expense - Expense data object
 * @returns Boolean indicating if expense is part of YTD
 */
export const isExpenseInYTD = (expense: any) => {
  const fiscalYear = getCurrentFiscalYearRange()
  const expenseDate = new Date(expense.date)

  return (
    expenseDate >= fiscalYear.start &&
    expenseDate <= fiscalYear.end &&
    expense.status.toLowerCase() === 'paid' &&
    expense.currency === 'EUR'
  )
}
