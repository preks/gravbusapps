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
 * Check if a benefit is active
 */
export const isBenefitActive = (status: BenefitStatus | string): boolean => {
  return status === BenefitStatus.ACTIVE
}

/**
 * Check if a payslip should be displayed
 * (exclude cancelled)
 */
export const isPayslipValid = (status: PayslipStatus | string): boolean => {
  return status !== PayslipStatus.CANCELLED && status !== PayslipStatus.UNKNOWN
}
