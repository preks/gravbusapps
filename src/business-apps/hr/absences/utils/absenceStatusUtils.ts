import type { BadgeProps } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Absence status utilities following the same pattern as expenses
 * Maps absence statuses to appropriate Badge variants with translations
 */

/**
 * Configuration for absence status display
 */
export interface AbsenceStatusConfig {
  label: string
  variant: BadgeProps['variant']
  color: string
  type: string
  status: string // Original status value (e.g., "PLANNED", "PENDING")
}

/**
 * Maps absence statuses to appropriate Badge display configuration
 * Based on the exact status mapping provided with correct labels and colors
 * @param status - The absence status
 * @returns Object with user-friendly label, Badge variant, color, and type
 */
export function getAbsenceStatusConfig(status?: string): AbsenceStatusConfig {
  if (!status) {
    return {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.unknown_type', 'Unknown'),
      variant: 'outline',
      color: 'var(--nw-muted-foreground)',
      type: 'unknown',
      status: 'UNKNOWN'
    }
  }

  switch (status.toUpperCase()) {
    case 'PLANNED':
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        variant: 'secondary', // Gray - indicates draft/planned state
        color: 'var(--nw-muted-foreground)',
        type: 'draft',
        status: 'PLANNED'
      }

    case 'PENDING':
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        variant: 'secondary', // Gray - indicates pending approval
        color: 'var(--nw-muted-foreground)',
        type: 'pending',
        status: 'PENDING'
      }

    case 'APPROVED':
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved', 'Approved'),
        variant: 'success', // Green - indicates approved
        color: 'var(--nw-success)',
        type: 'approved',
        status: 'APPROVED'
      }

    case 'REJECTED':
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected'),
        variant: 'destructive', // Red - indicates rejected
        color: 'var(--nw-destructive)',
        type: 'rejected',
        status: 'REJECTED'
      }

    case 'CANCELLED':
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.cancelled', 'Cancelled'),
        variant: 'secondary', // Gray - indicates cancelled
        color: 'var(--nw-muted-foreground)',
        type: 'cancelled',
        status: 'CANCELLED'
      }

    default:
      return {
        label: status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown',
        variant: 'secondary',
        color: 'var(--nw-muted-foreground)',
        type: 'unknown',
        status: status ? status.toUpperCase() : 'UNKNOWN'
      }
  }
}

/**
 * Get only the translated label for absence status
 * @param status - The absence status
 * @returns Translated status label
 */
export function getAbsenceStatusLabel(status?: string): string {
  return getAbsenceStatusConfig(status).label
}

/**
 * Get only the Badge variant for absence status
 * @param status - The absence status
 * @returns Badge variant
 */
export function getAbsenceStatusBadgeVariant(status?: string): BadgeProps['variant'] {
  return getAbsenceStatusConfig(status).variant
}

/**
 * Get the Tailwind background class for a Badge variant (matches Badge component styling)
 * Uses secondary colors with /80 opacity to exactly match Badge component background colors
 * The Badge component internally maps variants like "success" to "bg-success-secondary/80"
 * @param variant - The Badge variant
 * @returns Tailwind background class name
 */
export function getBadgeVariantBackgroundClass(variant: BadgeProps['variant']): string {
  if (!variant) return 'gba:bg-muted'

  // For semantic variants, use the secondary color with /80 opacity (matches Badge component background exactly)
  // Badge component uses: bg-{variant}-secondary/80 for these variants
  if (variant === 'success') return 'gba:bg-success-secondary/80'
  if (variant === 'warning') return 'gba:bg-warning-secondary/80'
  if (variant === 'destructive') return 'gba:bg-destructive-secondary/80'
  if (variant === 'info') return 'gba:bg-info-secondary/80'
  if (variant === 'offline') return 'gba:bg-offline-secondary/80'
  if (variant === 'secondary') return 'gba:bg-secondary'

  // For other variants, use muted
  return 'gba:bg-muted'
}

/**
 * Get the Tailwind background class directly from absence status (convenience function)
 * Combines getAbsenceStatusBadgeVariant and getBadgeVariantBackgroundClass
 * @param status - The absence status
 * @returns Tailwind background class name that matches Badge component styling
 */
export function getAbsenceStatusBackgroundClass(status?: string): string {
  const variant = getAbsenceStatusBadgeVariant(status)
  return getBadgeVariantBackgroundClass(variant)
}

/**
 * Get only the color for absence status
 * @param status - The absence status
 * @returns Color hex code
 */
export function getAbsenceStatusColor(status?: string): string {
  return getAbsenceStatusConfig(status).color
}

/**
 * Get only the type for absence status (for CSS classes, etc.)
 * @param status - The absence status
 * @returns Status type string
 */
export function getAbsenceStatusType(status?: string): string {
  return getAbsenceStatusConfig(status).type
}

/**
 * Legacy function for backward compatibility
 * @param status - The absence status
 * @returns Badge variant that matches the original color meaning
 */
export function getAbsenceStatusDisplay(status?: string): AbsenceStatusConfig {
  return getAbsenceStatusConfig(status)
}

/**
 * Get all available absence statuses with their configurations
 * @returns Array of all status configurations with original status values
 */
export function getAllAbsenceStatusConfigs(): AbsenceStatusConfig[] {
  const statuses = ['PLANNED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']
  return statuses.map(status => getAbsenceStatusConfig(status))
}

/**
 * Check if a status is considered "active" (not draft or cancelled)
 * @param status - The absence status
 * @returns True if status is active
 */
export function isActiveAbsenceStatus(status?: string): boolean {
  if (!status) return false
  const upperStatus = status.toUpperCase()
  return upperStatus === 'PENDING' || upperStatus === 'APPROVED' || upperStatus === 'REJECTED'
}

/**
 * Check if a status is considered "approved"
 * @param status - The absence status
 * @returns True if status is approved
 */
export function isApprovedAbsenceStatus(status?: string): boolean {
  return status?.toUpperCase() === 'APPROVED'
}

/**
 * Check if a status is considered "pending"
 * @param status - The absence status
 * @returns True if status is pending
 */
export function isPendingAbsenceStatus(status?: string): boolean {
  return status?.toUpperCase() === 'PENDING'
}

/**
 * Check if a status is considered "rejected"
 * @param status - The absence status
 * @returns True if status is rejected
 */
export function isRejectedAbsenceStatus(status?: string): boolean {
  return status?.toUpperCase() === 'REJECTED'
}
