import type { BadgeProps } from '@newwork/nw-design-system'

/**
 * Badge utilities for expense status following the same pattern as leads
 * Maps expense statuses to appropriate Badge variants that preserve the original color meanings
 */

/**
 * Configuration for expense request status display
 */
export interface ExpenseStatusConfig {
  label: string
  variant: BadgeProps['variant']
}

const STATUS_CONFIG_BY_CODE: Record<string, ExpenseStatusConfig> = {
  PREPARED: { label: 'Prepared', variant: 'secondary' },
  CREATED: { label: 'Draft', variant: 'secondary' },
  ASSIGNED: { label: 'Assigned', variant: 'info' },
  PENDING: { label: 'In Approval', variant: 'info' },
  APPROVED: { label: 'Verification Required', variant: 'warning' },
  VERIFIED: { label: 'Booking Required', variant: 'warning' },
  BOOKED: { label: 'Transfer Required', variant: 'warning' },
  TRANSFERRED: { label: 'Payment Required', variant: 'warning' },
  PAID: { label: 'Paid', variant: 'success' },
  REJECTED: { label: 'Revision Required', variant: 'info' },
  CLOSED: { label: 'Closed', variant: 'success' },
  DISCARDED: { label: 'Discarded', variant: 'secondary' }
}

const getExpenseStatusConfig = (status?: string): ExpenseStatusConfig => {
  if (!status) {
    return { label: 'Unknown', variant: 'outline' }
  }

  const mappedConfig = STATUS_CONFIG_BY_CODE[status.toUpperCase()]
  if (mappedConfig) {
    return mappedConfig
  }

  return { label: status, variant: 'secondary' }
}

/**
 * Maps expense request statuses to appropriate Badge display configuration
 * Based on the exact status mapping provided with correct labels and colors
 * @param status - The expense request status
 * @returns Object with user-friendly label and Badge variant
 */
export function getExpenseRequestStatusConfig(status?: string): ExpenseStatusConfig {
  return getExpenseStatusConfig(status)
}

/**
 * Legacy function for backward compatibility
 * @param status - The expense request status
 * @returns Badge variant that matches the original Pill color meaning
 */
export function getExpenseRequestStatusBadgeVariant(status?: string): BadgeProps['variant'] {
  return getExpenseRequestStatusConfig(status).variant
}

/**
 * Configuration for advance payment status display
 */
export interface AdvancePaymentStatusConfig {
  label: string
  variant: BadgeProps['variant']
}

/**
 * Maps advance payment statuses to appropriate Badge display configuration
 * Based on the exact status mapping provided with correct labels and colors
 * @param status - The advance payment status
 * @returns Object with user-friendly label and Badge variant
 */
export function getAdvancePaymentStatusConfig(status?: string): AdvancePaymentStatusConfig {
  return getExpenseStatusConfig(status)
}

/**
 * Legacy function for backward compatibility
 * @param status - The advance payment status
 * @returns Badge variant that matches the original Pill color meaning
 */
export function getAdvancePaymentStatusBadgeVariant(status?: string): BadgeProps['variant'] {
  return getAdvancePaymentStatusConfig(status).variant
}

/**
 * Legacy mapping for backward compatibility with existing Pill types
 * Maps Pill types to Badge variants
 */
export function getPillTypeBadgeVariant(pillType?: string): BadgeProps['variant'] {
  if (!pillType) {
    return 'outline'
  }

  switch (pillType) {
    case 'completed':
      return 'success' // Green (#0DBC7B)
    case 'task':
      return 'warning' // Orange (#FF9E02)
    case 'error':
      return 'destructive' // Red (#DE1D49)
    case 'waiting':
      return 'info' // Blue (#0094D1)
    case 'draft':
    default:
      return 'secondary' // Gray (#797d82)
  }
}
