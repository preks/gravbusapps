// Feature key constants for the flow hub
export const FLOW_FEATURE_KEYS = {
  personalFlows: 'personalFlows',
  teamFlows: 'teamFlows',
  adminFlows: 'adminFlows'
}

/**
 * LOCAL flow permissions (no remote checks)
 * - Removes any remote permission checks for Flow Hub
 * - Defaults to personal flows only; team/admin disabled
 */
export const useFlowPermissions = (employeeId: string, accessToken: string) => {
  // Local default: personal flows enabled; team/admin disabled
  const accessibleFeatures = new Set<string>([FLOW_FEATURE_KEYS.personalFlows])

  const permissions: Record<string, { tabKey: string; hasAccess: boolean; sections?: Record<string, boolean> }> = {
    [FLOW_FEATURE_KEYS.personalFlows]: { tabKey: FLOW_FEATURE_KEYS.personalFlows, hasAccess: true, sections: {} },
    [FLOW_FEATURE_KEYS.teamFlows]: { tabKey: FLOW_FEATURE_KEYS.teamFlows, hasAccess: false, sections: {} },
    [FLOW_FEATURE_KEYS.adminFlows]: { tabKey: FLOW_FEATURE_KEYS.adminFlows, hasAccess: false, sections: {} }
  }

  return {
    loading: false,
    error: null,
    permissions,

    // Feature visibility checks
    isFeatureVisible: (featureKey: string) => accessibleFeatures.has(featureKey),

    // Individual feature access helpers
    canViewPersonalFlows: () => true,
    canViewTeamFlows: () => false,
    canManageWorkflows: () => false,
    canAdministerFlows: () => false,
    canCreateTemplates: () => false,
    canManageUsers: () => false,

    // UI determination helpers
    hasManagerPermissions: () => false,
    hasAdminPermissions: () => false,

    // Debug helpers
    getAllPermissions: () => permissions,
    getAccessibleFeatures: () => Array.from(accessibleFeatures)
  }
}

export default useFlowPermissions
