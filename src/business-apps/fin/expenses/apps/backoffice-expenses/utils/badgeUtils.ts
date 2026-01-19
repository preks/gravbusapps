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

/**
 * Maps expense request statuses to appropriate Badge display configuration
 * Based on the exact status mapping provided with correct labels and colors
 * @param status - The expense request status
 * @returns Object with user-friendly label and Badge variant
 */
export function getExpenseRequestStatusConfig(status?: string): ExpenseStatusConfig {
  if (!status) {
    return { label: 'Unknown', variant: 'outline' }
  }

  switch (status.toUpperCase()) {
    case 'PREPARED':
      return {
        label: 'Prepared',
        variant: 'secondary' // rgba(55, 99, 153, 0.55) - Blue-gray
      }

    case 'CREATED':
      return {
        label: 'Draft',
        variant: 'secondary' // rgba(55, 99, 153, 0.55) - Blue-gray
      }

    case 'ASSIGNED':
      return {
        label: 'Assigned',
        variant: 'info' // rgba(0, 148, 209, 0.55) - Blue
      }

    case 'PENDING':
      return {
        label: 'In Approval',
        variant: 'info' // rgba(0, 148, 209, 0.55) - Blue
      }

    case 'APPROVED':
      return {
        label: 'Verification Required',
        variant: 'warning' // rgba(255, 158, 2, 0.55) - Orange
      }

    case 'VERIFIED':
      return {
        label: 'Booking Required',
        variant: 'warning' // rgba(255, 158, 2, 0.55) - Orange
      }

    case 'BOOKED':
      return {
        label: 'Transfer Required',
        variant: 'warning' // rgba(255, 158, 2, 0.55) - Orange
      }

    case 'TRANSFERRED':
      return {
        label: 'Payment Required',
        variant: 'warning' // rgba(255, 158, 2, 0.55) - Orange
      }

    case 'PAID':
      return {
        label: 'Paid',
        variant: 'success' // rgba(13, 188, 123, 0.55) - Green
      }

    case 'REJECTED':
      return {
        label: 'Revision Required',
        variant: 'info' // rgba(0, 148, 209, 1) - Blue (full opacity)
      }

    case 'CLOSED':
      return {
        label: 'Closed',
        variant: 'success' // rgba(13, 188, 123, 0.55) - Green
      }

    case 'DISCARDED':
      return {
        label: 'Discarded',
        variant: 'secondary' // rgba(55, 99, 153, 0.55) - Blue-gray
      }

    default:
      return {
        label: status,
        variant: 'secondary' // Default to secondary variant
      }
  }
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
  if (!status) {
    return { label: 'Unknown', variant: 'outline' }
  }

  switch (status.toUpperCase()) {
    case 'PREPARED':
      return {
        label: 'Prepared',
        variant: 'secondary' // rgba(55, 99, 153, 0.55) - Blue-gray
      }

    case 'CREATED':
      return {
        label: 'Draft',
        variant: 'secondary' // rgba(55, 99, 153, 0.55) - Blue-gray
      }

    case 'ASSIGNED':
      return {
        label: 'Assigned',
        variant: 'info' // rgba(0, 148, 209, 0.55) - Blue
      }

    case 'PENDING':
      return {
        label: 'In Approval',
        variant: 'info' // rgba(0, 148, 209, 0.55) - Blue
      }

    case 'APPROVED':
      return {
        label: 'Verification Required',
        variant: 'warning' // rgba(255, 158, 2, 0.55) - Orange
      }

    case 'VERIFIED':
      return {
        label: 'Booking Required',
        variant: 'warning' // rgba(255, 158, 2, 0.55) - Orange
      }

    case 'BOOKED':
      return {
        label: 'Transfer Required',
        variant: 'warning' // rgba(255, 158, 2, 0.55) - Orange
      }

    case 'TRANSFERRED':
      return {
        label: 'Payment Required',
        variant: 'warning' // rgba(255, 158, 2, 0.55) - Orange
      }

    case 'PAID':
      return {
        label: 'Paid',
        variant: 'success' // rgba(13, 188, 123, 0.55) - Green
      }

    case 'REJECTED':
      return {
        label: 'Revision Required',
        variant: 'info' // rgba(0, 148, 209, 1) - Blue (full opacity)
      }

    case 'CLOSED':
      return {
        label: 'Closed',
        variant: 'success' // rgba(13, 188, 123, 0.55) - Green
      }

    case 'DISCARDED':
      return {
        label: 'Discarded',
        variant: 'secondary' // rgba(55, 99, 153, 0.55) - Blue-gray
      }

    default:
      return {
        label: status,
        variant: 'secondary' // Default to secondary variant
      }
  }
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
