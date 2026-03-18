// React import removed - not used in this file
import { PillType } from '@/components/pill/Pill'
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
  formatNumberFunction
} from '@/common/utils/windowUtils'

/**
 * Enum representing the technical statuses for expenses
 */
export enum ExpenseStatus {
  PREPARED = 'PREPARED',
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
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
  color?: string // Optional color for custom styling (token-based)
  badgeVariant?: StatusBadgeVariant // Optional design-system Badge variant for unified rendering
}

/**
 * Centralized mapping from status to Badge variant
 */
const STATUS_COLORS: Record<string, StatusBadgeVariant> = {
  // Muted/Offline (Gray)
  DRAFT: 'offline',
  CREATED: 'offline',
  PREPARED: 'offline',
  CANCELLED: 'offline',
  DISCARDED: 'offline',

  // Info (Blue)
  IN_TRANSIT: 'info',
  ASSIGNED: 'info',
  IN_REVISION: 'info',
  PENDING: 'info',
  VERIFIED: 'info',
  BOOKED: 'info',
  TRANSFERRED: 'info',

  // Success (Green)
  CLOSED: 'success',
  PAID: 'success',
  APPROVED: 'success',

  // Warning (Amber)
  ACTION_REQUIRED: 'warning',
  TASK: 'warning',
  REJECTED: 'warning'
}

/**
 * Maps technical expense item statuses to user-friendly display configurations
 * Based on srn_expenseItemList status mapping
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpenseItemStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        type: 'draft',
        badgeVariant: STATUS_COLORS.DRAFT
      }
    case ExpenseStatus.DISCARDED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.discarded', 'Discarded'),
        type: 'draft',
        badgeVariant: STATUS_COLORS.DISCARDED
      }
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.ASSIGNED
      }
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.PENDING
      }
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.IN_TRANSIT
      }
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
        type: 'completed',
        badgeVariant: STATUS_COLORS.PAID
      }
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required'),
        type: 'task',
        badgeVariant: STATUS_COLORS.REJECTED
      }
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        type: 'completed',
        badgeVariant: STATUS_COLORS.CLOSED
      }
    default:
      return {
        label: status.charAt(0) + status.slice(1).toLowerCase(),
        type: 'error',
        badgeVariant: STATUS_COLORS.REJECTED
      }
  }
}

/**
 * Maps expense item statuses to nw-design-system Badge variants
 * Prefer using Badge variants over custom Pill colors for design-token compliance
 */
export type StatusBadgeVariant =
  | 'default'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'outline'
  | 'info'
  | 'offline'

// Removed legacy getExpenseItemStatusBadgeVariant in favor of badgeVariant from getExpenseItemStatusDisplay

/**
 * Maps technical expense plan statuses to user-friendly display configurations
 * Based on srn_expensePlanList status mapping
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpensePlanStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        type: 'draft',
        badgeVariant: STATUS_COLORS.DRAFT
      }
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.ASSIGNED
      }
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.IN_TRANSIT
      }
    case ExpenseStatus.APPROVED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved', 'Approved'),
        type: 'completed',
        badgeVariant: STATUS_COLORS.APPROVED
      }
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required'),
        type: 'task',
        badgeVariant: STATUS_COLORS.TASK
      }
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        type: 'completed',
        badgeVariant: STATUS_COLORS.CLOSED
      }
    case ExpenseStatus.DISCARDED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.discarded', 'Discarded'),
        type: 'draft',
        badgeVariant: STATUS_COLORS.DISCARDED
      }
    default:
      return {
        label: status,
        type: 'draft',
        badgeVariant: STATUS_COLORS.DRAFT
      }
  }
}

/**
 * Maps technical expense request statuses to user-friendly display configurations
 * Based on srn_expenseRequest status mapping
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getExpenseRequestStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        type: 'draft',
        badgeVariant: STATUS_COLORS.DRAFT
      }
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.IN_TRANSIT
      }
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.IN_TRANSIT
      }
    case ExpenseStatus.PREPARED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared'),
        type: 'draft',
        color: STATUS_COLORS.PREPARED
      }
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.ASSIGNED
      }
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
        type: 'completed',
        badgeVariant: STATUS_COLORS.PAID
      }
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required'),
        type: 'task',
        badgeVariant: STATUS_COLORS.TASK
      }
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        type: 'completed',
        badgeVariant: STATUS_COLORS.CLOSED
      }
    case ExpenseStatus.DISCARDED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.discarded', 'Discarded'),
        type: 'draft',
        badgeVariant: STATUS_COLORS.DISCARDED
      }
    default:
      return {
        label: status,
        type: 'draft',
        badgeVariant: STATUS_COLORS.DRAFT
      }
  }
}

/**
 * Maps technical advance payment statuses to user-friendly display configurations
 * Based on srn_myAdvancePayments status mapping
 * @param status - The technical status from the API
 * @returns StatusDisplayConfig with label and styling information
 */
export const getAdvancePaymentStatusDisplay = (status: string): StatusDisplayConfig => {
  switch (status) {
    case ExpenseStatus.CREATED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        type: 'draft',
        badgeVariant: STATUS_COLORS.DRAFT
      }
    case ExpenseStatus.PREPARED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared'),
        type: 'draft',
        badgeVariant: STATUS_COLORS.PREPARED
      }
    case ExpenseStatus.ASSIGNED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.ASSIGNED
      }
    case ExpenseStatus.PENDING:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.IN_TRANSIT
      }
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit'),
        type: 'waiting',
        badgeVariant: STATUS_COLORS.IN_TRANSIT
      }
    case ExpenseStatus.PAID:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
        type: 'completed',
        badgeVariant: STATUS_COLORS.PAID
      }
    case ExpenseStatus.REJECTED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required'),
        type: 'task',
        badgeVariant: STATUS_COLORS.TASK
      }
    case ExpenseStatus.CLOSED:
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
        type: 'completed',
        badgeVariant: STATUS_COLORS.CLOSED
      }
    default:
      return {
        label: status,
        type: 'draft',
        badgeVariant: STATUS_COLORS.DRAFT
      }
  }
}

/**
 * Formats currency display based on active user locale
 * - English (en-US): EUR 1,234
 * - German (de-DE): 1.234 EUR
 * - Romanian (fr-FR): 1 234 EUR
 * @param amount - The amount to format
 * @param currencyCode - The currency code (e.g., 'EUR', 'USD')
 * @returns Formatted currency string based on user locale
 */
export const formatCurrencyDisplay = (
  amount: number | string | null | undefined,
  currencyCode: string | null | undefined
): string => {
  // Handle null/undefined amounts
  if (amount === null || amount === undefined) {
    return `0 ${currencyCode || 'EUR'}`
  }

  // Handle empty string or invalid amounts
  if (amount === '' || isNaN(Number(amount))) {
    return `0 ${currencyCode || 'EUR'}`
  }

  // Handle missing currency code
  if (!currencyCode) {
    if (typeof amount === 'string' && amount.includes(' ')) {
      const parts = amount.split(' ')
      const lastPart = parts[parts.length - 1]
      if (/^[A-Z]{3}$/.test(lastPart)) {
        currencyCode = lastPart
      } else {
        currencyCode = 'EUR'
      }
    } else {
      currencyCode = 'EUR'
    }
  }

  const userLocale = getCurrentActiveUserLocale()

  let formattedAmount: string
  try {
    if (formatNumberFunction) {
      const result = formatNumberFunction(Number(amount))
      if (result) {
        formattedAmount = result
      } else {
        formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount))
      }
    } else {
      formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount))
    }
  } catch {
    formattedAmount = String(amount)
  }

  if (!formattedAmount || formattedAmount === 'undefined' || formattedAmount === 'null') {
    formattedAmount = new Intl.NumberFormat(userLocale).format(Number(amount))
  }

  const language = userLocale.split('-')[0].toLowerCase()

  switch (language) {
    case 'de':
      return `${formattedAmount} ${currencyCode}` // 1.234,56 EUR
    case 'ro':
      return `${formattedAmount} ${currencyCode}` // 1 234,56 EUR
    case 'en':
      return `${currencyCode} ${formattedAmount}` // EUR 1,234.56
    default:
      return `${formattedAmount} ${currencyCode}`
  }
}
