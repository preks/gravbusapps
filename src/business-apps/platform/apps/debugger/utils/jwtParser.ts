/**
 * ⚠️ SECURITY WARNING ⚠️
 *
 * These JWT parsing utilities do NOT verify token signatures.
 * They are ONLY for debugging/display purposes in the Platform Debugger app.
 *
 * The access token provided to the debugger has already been verified
 * by the platform's authentication system (Keycloak/OIDC) before reaching
 * this application. This parser is used solely to display token contents
 * for inspection and debugging.
 *
 * ⚠️ NEVER use these functions for:
 * - Authorization decisions
 * - Access control
 * - Trusting user identity or roles
 * - Any security-critical operations
 *
 * ✅ Safe to use for:
 * - Displaying token payload in debugger UI
 * - Inspecting token contents for debugging
 * - Showing user roles for informational purposes
 */

/**
 * Parse JWT token and extract payload (without signature verification)
 * @warning This function does NOT verify the token signature. Use only for debugging/display.
 */
export function parseJWT(token: string): any | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) {
      return null
    }

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        })
        .join('')
    )

    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to parse JWT:', error)
    return null
  }
}

/**
 * Extract user roles/groups from JWT token (without signature verification)
 * @warning This function does NOT verify the token signature. Use only for debugging/display.
 */
export function getUserRoles(token: string): string[] {
  const jwt = parseJWT(token)
  if (jwt && jwt.groups) {
    return jwt.groups
  }
  if (jwt && jwt.roles) {
    return jwt.roles
  }
  if (jwt && jwt.realm_access?.roles) {
    return jwt.realm_access.roles
  }
  return []
}

/**
 * Check if user has a specific role (without signature verification)
 * @warning This function does NOT verify the token signature. Use only for debugging/display.
 * @deprecated This function should not be used for authorization decisions.
 */
export function userHasRole(token: string, role: string): boolean {
  const roles = getUserRoles(token)
  return roles.includes(role)
}
