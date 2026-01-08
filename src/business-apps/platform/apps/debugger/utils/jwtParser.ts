/**
 * Parse JWT token and extract payload
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
 * Extract user roles/groups from JWT token
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
 * Check if user has a specific role
 */
export function userHasRole(token: string, role: string): boolean {
  const roles = getUserRoles(token)
  return roles.includes(role)
}
