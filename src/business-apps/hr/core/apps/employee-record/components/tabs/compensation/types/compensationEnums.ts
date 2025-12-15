/**
 * Compensation-related enums matching database schema
 * These enums must match the values defined in the database
 */

/**
 * Compensation Status Enum
 * Used for EmployeeBonus and EmployeeBenefit status field
 */
export enum CompensationStatus {
  UNKNOWN = 'UNKNOWN_COMPENSATION',
  PENDING = 'PENDING_COMPENSATION',
  APPROVED = 'APPROVED_COMPENSATION',
  CANCELLED = 'CANCELLED_COMPENSATION'
}

/**
 * Benefit Status Enum
 * Used for EmployeeBenefit benefit_status field
 */
export enum BenefitStatus {
  UNKNOWN = 'UNKNOWN_BENEFIT',
  ACTIVE = 'ACTIVE_BENEFIT',
  INACTIVE = 'INACTIVE_BENEFIT'
}

/**
 * Payslip Status Enum
 * Used for EmployeePayslip status field
 */
export enum PayslipStatus {
  UNKNOWN = 'UNKNOWN_PAYSLIP',
  GENERATED = 'GENERATED_PAYSLIP',
  PAID = 'PAID_PAYSLIP',
  CANCELLED = 'CANCELLED_PAYSLIP'
}

/**
 * Helper functions for status display
 */

/**
 * Get human-readable label for CompensationStatus
 * Uses translation system from useTranslation hook
 * @param status - The compensation status enum value
 * @param t - Translation function from useTranslation hook (required)
 */
export const getCompensationStatusLabel = (
  status: CompensationStatus | string,
  t: (key: string, params?: any) => string
): string => {
  switch (status) {
    case CompensationStatus.PENDING:
      return t('status-pending')
    case CompensationStatus.APPROVED:
      return t('status-approved')
    case CompensationStatus.CANCELLED:
      return t('status-cancelled')
    case CompensationStatus.UNKNOWN:
    default:
      return t('status-unknown')
  }
}

/**
 * Get human-readable label for BenefitStatus
 */
export const getBenefitStatusLabel = (status: BenefitStatus | string): string => {
  switch (status) {
    case BenefitStatus.ACTIVE:
      return 'Active'
    case BenefitStatus.INACTIVE:
      return 'Inactive'
    case BenefitStatus.UNKNOWN:
    default:
      return 'Unknown'
  }
}

/**
 * Get human-readable label for PayslipStatus
 * Uses translation system from useTranslation hook
 * @param status - The payslip status enum value
 * @param t - Translation function from useTranslation hook (required)
 */
export const getPayslipStatusLabel = (
  status: PayslipStatus | string,
  t: (key: string, params?: any) => string
): string => {
  switch (status) {
    case PayslipStatus.GENERATED:
      return t('status-generated')
    case PayslipStatus.PAID:
      return t('status-paid')
    case PayslipStatus.CANCELLED:
      return t('status-cancelled')
    case PayslipStatus.UNKNOWN:
    default:
      return t('status-unknown')
  }
}

/**
 * Get color/variant for CompensationStatus badge
 */
export const getCompensationStatusVariant = (
  status: CompensationStatus | string
): 'warning' | 'success' | 'destructive' | 'default' => {
  switch (status) {
    case CompensationStatus.PENDING:
      return 'warning'
    case CompensationStatus.APPROVED:
      return 'success'
    case CompensationStatus.CANCELLED:
      return 'destructive'
    case CompensationStatus.UNKNOWN:
    default:
      return 'default'
  }
}

/**
 * Get color/variant for BenefitStatus badge
 */
export const getBenefitStatusVariant = (status: BenefitStatus | string): 'success' | 'destructive' | 'default' => {
  switch (status) {
    case BenefitStatus.ACTIVE:
      return 'success'
    case BenefitStatus.INACTIVE:
      return 'destructive'
    case BenefitStatus.UNKNOWN:
    default:
      return 'default'
  }
}

/**
 * Get color/variant for PayslipStatus badge
 */
export const getPayslipStatusVariant = (
  status: PayslipStatus | string
): 'warning' | 'success' | 'destructive' | 'default' => {
  switch (status) {
    case PayslipStatus.GENERATED:
      return 'warning'
    case PayslipStatus.PAID:
      return 'success'
    case PayslipStatus.CANCELLED:
      return 'destructive'
    case PayslipStatus.UNKNOWN:
    default:
      return 'default'
  }
}

/**
 * Check if a compensation status should be included in totals
 * (exclude cancelled and unknown)
 */
export const isCompensationStatusActive = (status: CompensationStatus | string): boolean => {
  return status === CompensationStatus.PENDING || status === CompensationStatus.APPROVED
}

/**
 * Parse and validate a date string
 * @param value - Date string to parse
 * @returns Valid Date object or null if invalid/missing
 */
const parseDate = (value?: string | null): Date | null => {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Check if a benefit is active based on date range and status
 *
 * Strategy: Prioritize dates as the source of truth for temporal validity.
 *
 * A benefit is considered active if:
 * 1. EITHER: Has valid dates that indicate it's currently active (within startDate and endDate range)
 * 2. OR: Has ACTIVE_BENEFIT status (when no valid dates are provided)
 *
 * This approach protects against premature backend status changes where
 * benefitStatus is set to INACTIVE_BENEFIT before the endDate is actually reached,
 * while still respecting status when dates aren't specified or are invalid.
 *
 * @param benefit - The employee benefit object with status and date fields
 * @returns true if the benefit is currently active, false otherwise
 */
export const isBenefitActive = (benefit: {
  benefitStatus: BenefitStatus | string
  startDate?: string | null
  endDate?: string | null
}): boolean => {
  const now = new Date()

  // Parse and validate dates
  const start = parseDate(benefit.startDate)
  const end = parseDate(benefit.endDate)
  const hasValidStartDate = start !== null
  const hasValidEndDate = end !== null

  // Scenario 1: Valid dates are provided - dates are authoritative
  if (hasValidStartDate || hasValidEndDate) {
    // Check if benefit has started (if valid startDate is provided)
    if (hasValidStartDate && now < start!) {
      return false // Not started yet
    }

    // Check if benefit has ended (if valid endDate is provided)
    if (hasValidEndDate) {
      // Set end date to end of day for comparison
      const endOfDay = new Date(end!)
      endOfDay.setHours(23, 59, 59, 999)
      if (now > endOfDay) {
        return false // Already ended
      }
    }

    // Valid dates indicate benefit is currently active (within valid range)
    // Override any premature INACTIVE_BENEFIT status from backend
    return true
  }

  // Scenario 2: No valid dates provided - rely on status field
  return benefit.benefitStatus === BenefitStatus.ACTIVE
}

/**
 * Check if a benefit is scheduled for deactivation
 * (has an endDate in the future while having ACTIVE_BENEFIT status)
 *
 * Note: This function only checks the benefitStatus field and endDate,
 * without full date validation. For accurate active status, use isBenefitActive() instead.
 *
 * @param benefit - The employee benefit object with status and endDate
 * @returns true if benefit has ACTIVE_BENEFIT status and a future end date, false otherwise
 * @deprecated Consider using inline checks: `benefit.isActive && Boolean(benefit.endDate)`
 *             when benefit.isActive is already validated via isBenefitActive()
 */
export const isBenefitScheduledForDeactivation = (benefit: {
  benefitStatus: BenefitStatus | string
  endDate?: string | null
}): boolean => {
  // Must have ACTIVE_BENEFIT status
  if (benefit.benefitStatus !== BenefitStatus.ACTIVE) {
    return false
  }

  if (!benefit.endDate) {
    return false
  }

  const now = new Date()
  const end = new Date(benefit.endDate)

  return end > now
}

/**
 * Check if a payslip should be displayed
 * (exclude cancelled)
 */
export const isPayslipValid = (status: PayslipStatus | string): boolean => {
  return status !== PayslipStatus.CANCELLED && status !== PayslipStatus.UNKNOWN
}
