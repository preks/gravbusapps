import usePermissionCheck, { ResourcePermissionMap } from '@/common/hooks/usePermissionCheck'

// Feature key constants for the expenses launcher
export const EXPENSE_FEATURE_KEYS = {
  personalExpenses: 'personalExpenses',
  teamExpenses: 'teamExpenses',
  backofficeExpenses: 'backofficeExpenses'
}

// SpiceDB Schema Constants
export const CORE_DOMAIN = 'core'
export const CORE_RESOURCE = 'resource'

export const SPICEDB_PERMISSIONS = {
  READ: 'read',
  APPROVE: 'approve',
  EXECUTE: 'execute'
} as const

export const EXPENSE_RESOURCE_IDS = {
  PERSONAL_EXPENSES: '/platform/fin/expenses/personal-expenses',
  TEAM_EXPENSES: '/platform/fin/expenses/manager-expenses',
  BACKOFFICE_EXPENSES: '/platform/fin/expenses/backoffice-expenses'
}

// Map expense features to their required permissions using actual SpiceDB schema
const expensePermissionMap: Record<string, ResourcePermissionMap> = {
  [EXPENSE_FEATURE_KEYS.personalExpenses]: {
    domain: CORE_DOMAIN,
    resource: CORE_RESOURCE,
    permission: SPICEDB_PERMISSIONS.EXECUTE,
    resourceId: EXPENSE_RESOURCE_IDS.PERSONAL_EXPENSES
  },
  [EXPENSE_FEATURE_KEYS.teamExpenses]: {
    domain: CORE_DOMAIN,
    resource: CORE_RESOURCE,
    permission: SPICEDB_PERMISSIONS.EXECUTE,
    resourceId: EXPENSE_RESOURCE_IDS.TEAM_EXPENSES
  },
  [EXPENSE_FEATURE_KEYS.backofficeExpenses]: {
    domain: CORE_DOMAIN,
    resource: CORE_RESOURCE,
    permission: SPICEDB_PERMISSIONS.EXECUTE,
    resourceId: EXPENSE_RESOURCE_IDS.BACKOFFICE_EXPENSES
  }
}

/**
 * Hook for checking expense permissions (following HR employee record pattern)
 * @param employeeId - ID of the employee (used as resource ID)
 * @param accessToken - Access token for API calls
 */
export const useExpensePermissions = (employeeId: string, accessToken: string) => {
  const { loading, error, permissions, isResourceAccessible } = usePermissionCheck(
    employeeId,
    expensePermissionMap,
    accessToken
  )

  return {
    loading,
    error,
    permissions,

    // Feature visibility checks (same pattern as HR isTabVisible)
    isFeatureVisible: (featureKey: string) => isResourceAccessible(featureKey as keyof typeof expensePermissionMap),

    // Individual feature access helpers
    canViewPersonalExpenses: () => isResourceAccessible(EXPENSE_FEATURE_KEYS.personalExpenses),
    canViewTeamExpenses: () => isResourceAccessible(EXPENSE_FEATURE_KEYS.teamExpenses),
    canApproveExpenses: () => isResourceAccessible(EXPENSE_FEATURE_KEYS.teamExpenses),
    canViewFinancialReports: () => isResourceAccessible(EXPENSE_FEATURE_KEYS.backofficeExpenses),
    canManageBudgets: () => isResourceAccessible(EXPENSE_FEATURE_KEYS.backofficeExpenses),
    canManageExpensePolicy: () => isResourceAccessible(EXPENSE_FEATURE_KEYS.backofficeExpenses),

    // UI determination helpers (derived from permissions, not preset roles)
    hasManagerPermissions: () => isResourceAccessible(EXPENSE_FEATURE_KEYS.teamExpenses),
    hasFinancePermissions: () => isResourceAccessible(EXPENSE_FEATURE_KEYS.backofficeExpenses),

    // Debug helpers
    getAllPermissions: () => permissions,
    getAccessibleFeatures: () => Object.keys(expensePermissionMap).filter(key => isResourceAccessible(key))
  }
}

export default useExpensePermissions
