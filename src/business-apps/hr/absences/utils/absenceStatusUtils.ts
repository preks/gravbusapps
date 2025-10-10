import type { BadgeProps } from "@newwork/nw-design-system";
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

/**
 * Absence status utilities following the same pattern as expenses
 * Maps absence statuses to appropriate Badge variants with translations
 */

/**
 * Configuration for absence status display
 */
export interface AbsenceStatusConfig {
  label: string;
  variant: BadgeProps["variant"];
  color: string;
  type: string;
}

/**
 * Maps absence statuses to appropriate Badge display configuration
 * Based on the exact status mapping provided with correct labels and colors
 * @param status - The absence status
 * @returns Object with user-friendly label, Badge variant, color, and type
 */
export function getAbsenceStatusConfig(
  status?: string
): AbsenceStatusConfig {
  if (!status) {
    return { 
      label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.unknown_type', 'Unknown'), 
      variant: "outline",
      color: '#6b7280',
      type: 'unknown'
    };
  }

  switch (status.toUpperCase()) {
    case "PLANNED":
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft'),
        variant: "secondary", // Gray - indicates draft/planned state
        color: '#6b7280',
        type: 'draft'
      };

    case "PENDING":
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval'),
        variant: "warning", // Orange - indicates pending approval
        color: '#f59e0b',
        type: 'pending'
      };

    case "APPROVED":
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved', 'Approved'),
        variant: "success", // Green - indicates approved
        color: '#10b981',
        type: 'approved'
      };

    case "REJECTED":
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected'),
        variant: "destructive", // Red - indicates rejected
        color: '#ef4444',
        type: 'rejected'
      };

    case "CANCELLED":
      return {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_calendar.cancelled', 'Cancelled'),
        variant: "secondary", // Gray - indicates cancelled
        color: '#6b7280',
        type: 'cancelled'
      };

    default:
      return {
        label: status,
        variant: "secondary",
        color: '#6b7280',
        type: 'unknown'
      };
  }
}

/**
 * Get only the translated label for absence status
 * @param status - The absence status
 * @returns Translated status label
 */
export function getAbsenceStatusLabel(status?: string): string {
  return getAbsenceStatusConfig(status).label;
}

/**
 * Get only the Badge variant for absence status
 * @param status - The absence status
 * @returns Badge variant
 */
export function getAbsenceStatusBadgeVariant(status?: string): BadgeProps["variant"] {
  return getAbsenceStatusConfig(status).variant;
}

/**
 * Get only the color for absence status
 * @param status - The absence status
 * @returns Color hex code
 */
export function getAbsenceStatusColor(status?: string): string {
  return getAbsenceStatusConfig(status).color;
}

/**
 * Get only the type for absence status (for CSS classes, etc.)
 * @param status - The absence status
 * @returns Status type string
 */
export function getAbsenceStatusType(status?: string): string {
  return getAbsenceStatusConfig(status).type;
}

/**
 * Legacy function for backward compatibility
 * @param status - The absence status
 * @returns Badge variant that matches the original color meaning
 */
export function getAbsenceStatusDisplay(status?: string): AbsenceStatusConfig {
  return getAbsenceStatusConfig(status);
}

/**
 * Get all available absence statuses with their configurations
 * @returns Array of all status configurations
 */
export function getAllAbsenceStatusConfigs(): AbsenceStatusConfig[] {
  const statuses = ['PLANNED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
  return statuses.map(status => getAbsenceStatusConfig(status));
}

/**
 * Check if a status is considered "active" (not draft or cancelled)
 * @param status - The absence status
 * @returns True if status is active
 */
export function isActiveAbsenceStatus(status?: string): boolean {
  if (!status) return false;
  const upperStatus = status.toUpperCase();
  return upperStatus === 'PENDING' || upperStatus === 'APPROVED' || upperStatus === 'REJECTED';
}

/**
 * Check if a status is considered "approved"
 * @param status - The absence status
 * @returns True if status is approved
 */
export function isApprovedAbsenceStatus(status?: string): boolean {
  return status?.toUpperCase() === 'APPROVED';
}

/**
 * Check if a status is considered "pending"
 * @param status - The absence status
 * @returns True if status is pending
 */
export function isPendingAbsenceStatus(status?: string): boolean {
  return status?.toUpperCase() === 'PENDING';
}

/**
 * Check if a status is considered "rejected"
 * @param status - The absence status
 * @returns True if status is rejected
 */
export function isRejectedAbsenceStatus(status?: string): boolean {
  return status?.toUpperCase() === 'REJECTED';
}
