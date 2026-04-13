/**
 * Read Keycloak-style roles from an access token payload (no signature verification).
 * Used only for UI gating; authorization is enforced by services.
 */
export function getKeycloakRolesFromAccessToken(accessToken: string | undefined | null): string[] {
  if (!accessToken || typeof accessToken !== 'string') return []
  const token = accessToken.trim()
  if (!token) return []

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return []

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    ) as Record<string, unknown>

    const roles: string[] = []
    const realmAccess = payload.realm_access as { roles?: string[] } | undefined
    if (realmAccess?.roles?.length) {
      roles.push(...realmAccess.roles)
    }
    const resourceAccess = payload.resource_access as Record<string, { roles?: string[] }> | undefined
    if (resourceAccess && typeof resourceAccess === 'object') {
      for (const resource of Object.values(resourceAccess)) {
        if (resource?.roles?.length) {
          roles.push(...resource.roles)
        }
      }
    }
    if (Array.isArray(payload.roles)) {
      roles.push(...(payload.roles as string[]))
    }
    if (typeof payload.role === 'string' && payload.role) {
      roles.push(payload.role)
    }
    return roles
  } catch {
    return []
  }
}

export function tokenHasRole(accessToken: string | undefined | null, role: string): boolean {
  return getKeycloakRolesFromAccessToken(accessToken).includes(role)
}
