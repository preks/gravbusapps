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
 * - Tab Visibility: Self-view users + authorized managers/HR admins
 * - Action Permissions: Only authorized managers/HR admins (excludes self-view)
 */
export const useCompensationPermissions = ({
  isSelfView,
  isManager,
  hasEmployeeGrowthPermission,
  hasEmployeeRecordAllHrBackoffice
}: UseCompensationPermissionsParams): CompensationPermissions => {
  return useMemo(() => {
    // Base permission: Manager with employee-growth OR HR admin without employee-growth
    const hasManagerEmployeeGrowthPermission = isManager && hasEmployeeGrowthPermission
    const hasHrBackofficeWithoutGrowth = hasEmployeeRecordAllHrBackoffice && !hasEmployeeGrowthPermission
    const hasBasePermission = hasManagerEmployeeGrowthPermission || hasHrBackofficeWithoutGrowth

    return {
      // Tab visibility: Includes self-view + authorized users
      canViewCompensationTab: isSelfView || hasBasePermission,

      // Action permissions: Only authorized users (excludes self-view)
      canManageCompensation: !isSelfView && hasBasePermission
    }
  }, [isSelfView, isManager, hasEmployeeGrowthPermission, hasEmployeeRecordAllHrBackoffice])
}
