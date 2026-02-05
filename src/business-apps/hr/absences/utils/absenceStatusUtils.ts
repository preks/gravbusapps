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
 * Status configuration map - defines all status properties in one place
 */
const STATUS_CONFIG_MAP: Record<
  string,
  { i18nKey: string; defaultLabel: string; variant: BadgeProps['variant']; color: string; type: string }
> = {
  PLANNED: {
    i18nKey: 'lowcoder:expense_statuses.draft',
    defaultLabel: 'Draft',
    variant: 'secondary',
    color: 'var(--nw-muted-foreground)',
    type: 'draft'
  },
  PENDING: {
    i18nKey: 'lowcoder:expense_statuses.in_approval',
    defaultLabel: 'In Approval',
    variant: 'secondary',
    color: 'var(--nw-muted-foreground)',
    type: 'pending'
  },
  APPROVED: {
    i18nKey: 'lowcoder:expense_statuses.approved',
    defaultLabel: 'Approved',
    variant: 'success',
    color: 'var(--nw-success)',
    type: 'approved'
  },
  REJECTED: {
    i18nKey: 'lowcoder:expense_statuses.rejected',
    defaultLabel: 'Rejected',
    variant: 'destructive',
    color: 'var(--nw-destructive)',
    type: 'rejected'
  },
  CANCELLED: {
    i18nKey: 'lowcoder:absence_calendar.cancelled',
    defaultLabel: 'Cancelled',
    variant: 'secondary',
    color: 'var(--nw-muted-foreground)',
    type: 'cancelled'
  }
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

  const upperStatus = status.toUpperCase()
  const config = STATUS_CONFIG_MAP[upperStatus]

  if (config) {
    return {
      label: getTranslationFromI18nKeyAndLabel(config.i18nKey, config.defaultLabel),
      variant: config.variant,
      color: config.color,
      type: config.type,
      status: upperStatus
    }
  }

  // Default case for unknown statuses
  return {
    label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
    variant: 'secondary',
    color: 'var(--nw-muted-foreground)',
    type: 'unknown',
    status: upperStatus
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
 * Badge variant to background class mapping
 * Uses secondary colors with /80 opacity to match Badge component styling
 */
const BADGE_VARIANT_BG_MAP: Record<string, string> = {
  success: 'gba:bg-success-secondary/80',
  warning: 'gba:bg-warning-secondary/80',
  destructive: 'gba:bg-destructive-secondary/80',
  info: 'gba:bg-info-secondary/80',
  offline: 'gba:bg-offline-secondary/80',
  secondary: 'gba:bg-secondary'
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
  return BADGE_VARIANT_BG_MAP[variant] || 'gba:bg-muted'
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
