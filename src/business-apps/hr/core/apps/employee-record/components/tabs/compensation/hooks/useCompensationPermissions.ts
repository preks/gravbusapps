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
  hasEmployeeRecordAllEmployees: boolean
}

/**
 * Centralized hook for compensation permission logic
 *
 * Permission Rules:
 * - Tab Visibility: Self-view users + authorized managers/HR admins + HR with all-employees permission
 * - Action Permissions: Authorized managers/HR admins + HR with all-employees permission (excludes self-view)
 */
export const useCompensationPermissions = ({
  isSelfView,
  isManager,
  hasEmployeeGrowthPermission,
  hasEmployeeRecordAllHrBackoffice,
  hasEmployeeRecordAllEmployees
}: UseCompensationPermissionsParams): CompensationPermissions => {
  return useMemo(() => {
    // Base permission: Manager with employee-growth OR HR admin
    const hasManagerEmployeeGrowthPermission = isManager && hasEmployeeGrowthPermission
    const hasBasePermission = hasManagerEmployeeGrowthPermission || hasEmployeeRecordAllHrBackoffice

    // Extended permission includes all-employees HR permission
    const hasExtendedPermission = hasBasePermission || hasEmployeeRecordAllEmployees

    return {
      // Tab visibility: Includes self-view + authorized users + HR with all-employees permission
      canViewCompensationTab: isSelfView || hasExtendedPermission,

      // Action permissions: Only authorized users (excludes self-view), includes HR with all-employees
      canManageCompensation: !isSelfView && hasExtendedPermission
    }
  }, [
    isSelfView,
    isManager,
    hasEmployeeGrowthPermission,
    hasEmployeeRecordAllHrBackoffice,
    hasEmployeeRecordAllEmployees
  ])
}
