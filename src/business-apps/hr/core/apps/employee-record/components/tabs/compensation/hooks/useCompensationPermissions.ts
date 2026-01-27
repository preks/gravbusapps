import { useMemo } from 'react'

export interface CompensationPermissions {
  /** Whether the compensation tab should be visible */
  canViewCompensationTab: boolean
  /** Whether user can manage compensation (adjust salary, grant bonus) */
  canManageCompensation: boolean
}

interface UseCompensationPermissionsParams {
  isSelfView: boolean
  isManager: boolean
  hasEmployeeGrowthPermission: boolean
  hasEmployeeRecordAllHrBackoffice: boolean
}

/**
 * Centralized hook for compensation permission logic
 *
 * Permission Rules:
 * - Tab Visibility: Self-view users + authorized managers/HR admins ONLY
 * - Action Permissions: Authorized managers/HR admins ONLY (excludes self-view)
 *
 * SECURITY NOTE:
 * - employee-record-all-employees permission is NOT used here
 * - That permission grants access to basic employee profiles, NOT sensitive compensation data
 * - Only managers with employee-growth OR HR with employee-record-all-hr-backoffice can access
 */
export const useCompensationPermissions = ({
  isSelfView,
  isManager,
  hasEmployeeGrowthPermission,
  hasEmployeeRecordAllHrBackoffice
}: UseCompensationPermissionsParams): CompensationPermissions => {
  return useMemo(() => {
    // Base permission: Manager with employee-growth OR HR admin
    const hasManagerEmployeeGrowthPermission = isManager && hasEmployeeGrowthPermission
    const hasBasePermission = hasManagerEmployeeGrowthPermission || hasEmployeeRecordAllHrBackoffice

    return {
      // Tab visibility: Self-view + managers with employee-growth + HR admins ONLY
      canViewCompensationTab: isSelfView || hasBasePermission,

      // Action permissions: Only authorized users (excludes self-view)
      canManageCompensation: !isSelfView && hasBasePermission
    }
  }, [isSelfView, isManager, hasEmployeeGrowthPermission, hasEmployeeRecordAllHrBackoffice])
}
