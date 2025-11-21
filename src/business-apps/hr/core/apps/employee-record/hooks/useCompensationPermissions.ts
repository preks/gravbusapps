import { useMemo } from 'react'
import usePermissionCheck, { ResourcePermissionMap } from '@/common/hooks/usePermissionCheck'

/**
 * Hook for checking compensation-related permissions
 * @param employeeId - ID of the employee whose compensation is being viewed
 * @param accessToken - Access token for authorization
 * @returns Object containing:
 *   - loading: boolean indicating if permissions are being fetched
 *   - error: any error that occurred during permission check
 *   - hasPermissionToAdjustSalary: boolean | undefined - undefined during loading, boolean after
 *   - hasPermissionToGrantBonus: boolean | undefined - undefined during loading, boolean after
 */
export const useCompensationPermissions = (employeeId: string, accessToken: string) => {
  // Define permission mappings for compensation actions
  const compensationPermissionMap: Record<string, ResourcePermissionMap> = useMemo(
    () => ({
      adjustSalary: {
        domain: 'employee',
        resource: 'employee_working_condition',
        permission: 'write'
      },
      grantBonus: {
        domain: 'employee',
        resource: 'employee_bonus',
        permission: 'write'
      }
    }),
    []
  )

  // Check permissions using the standard hook
  const { loading, error, isResourceAccessible } = usePermissionCheck(
    employeeId,
    compensationPermissionMap,
    accessToken
  )

  const hasPermissionToAdjustSalary = loading ? undefined : isResourceAccessible('adjustSalary')
  const hasPermissionToGrantBonus = loading ? undefined : isResourceAccessible('grantBonus')

  return {
    loading,
    error,
    hasPermissionToAdjustSalary,
    hasPermissionToGrantBonus
  }
}

export default useCompensationPermissions
