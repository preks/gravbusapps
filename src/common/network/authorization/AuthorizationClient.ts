import { RestClient } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'

// Define the permission check request structure based on OpenAPI
export interface CheckPermissionsRequestDTO {
  domain: string
  resource: string
  resourceId: string
  permissions: string[]
}

// Define the permission check response structure based on OpenAPI
export interface CheckPermissionsResponseDTO {
  domain: string
  resource: string
  resourceId: string
  userId: string
  permissions: Record<string, boolean>
}

// Define the scope permission response structure
export interface ScopePermission {
  id: string
  code: string
  name: string
  description: string | null
  name_i18n: Record<string, string>
  description_i18n: Record<string, string>
  resourceUrlId: string
  roles: Array<{ name: string }>
  createdAt: string
  updatedAt: string
}

/**
 * Client for interacting with the Authorization API
 */
export class AuthorizationClient extends RestClient {
  private static instance: AuthorizationClient

  private constructor() {
    // Using the base URL from environment variables
    // Strip '/api/v1' from the permissions API URL to get the base URL
    const permissionsApiUrl = `${env('NEXT_PUBLIC_BASE_URL')}/authorization/api/v1` || ''
    const baseUrl = permissionsApiUrl.replace(/\/api\/v1$/, '')
    super(baseUrl)
  }

  /**
   * Get singleton instance of the AuthorizationClient
   */
  public static getInstance(): AuthorizationClient {
    if (!AuthorizationClient.instance) {
      AuthorizationClient.instance = new AuthorizationClient()
    }
    return AuthorizationClient.instance
  }

  /**
   * Set authorization token for requests
   */
  public setAccessToken(token: string): void {
    this.headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`
    }
  }

  /**
   * Check a single permission
   */
  public async checkPermission(
    domain: string,
    resource: string,
    resourceId: string,
    permission: string
  ): Promise<boolean> {
    const response = await this.post<CheckPermissionsResponseDTO>('/api/v1/permissions/check', {
      domain,
      resource,
      resourceId,
      permissions: [permission]
    })

    return response.permissions[permission] || false
  }

  /**
   * Check multiple permissions in bulk
   */
  public async bulkCheckPermissions(requests: CheckPermissionsRequestDTO[]): Promise<CheckPermissionsResponseDTO[]> {
    return this.post<CheckPermissionsResponseDTO[]>('/api/v1/permissions/bulk-check', requests)
  }

  /**
   * Get scopes/permissions for a resource URL
   * @param resourceUrl - The resource URL path (e.g., '/platform/employee-record')
   * @returns Array of scope permissions
   */
  public async getScopePermissions(resourceUrl: string): Promise<ScopePermission[]> {
    const rootBaseUrl = env('NEXT_PUBLIC_BASE_URL') || ''
    const url = new URL(`${rootBaseUrl}/navigation/api/v1/scopes/permissions`)
    url.searchParams.append('url', resourceUrl)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      mode: 'cors'
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      const responseClone = response.clone()
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        try {
          const errorText = await responseClone.text()
          errorMessage = errorText || response.statusText || errorMessage
        } catch {
          errorMessage = response.statusText || errorMessage
        }
      }
      throw new Error(`REST request failed: ${response.status} - ${errorMessage}`)
    }

    return await response.json()
  }

  /**
   * Get current user's roles from the access token
   * The token is a JWT that may contain role information
   */
  private getUserRolesFromToken(): string[] {
    try {
      const token = this.headers['Authorization']?.replace('Bearer ', '') || ''
      if (!token) return []

      const parts = token.split('.')
      if (parts.length !== 3) return []

      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))

      const roles: string[] = []
      if (payload.realm_access?.roles) {
        roles.push(...payload.realm_access.roles)
      }
      if (payload.resource_access) {
        Object.values(payload.resource_access).forEach((resource: any) => {
          if (resource.roles) {
            roles.push(...resource.roles)
          }
        })
      }
      if (payload.roles) {
        roles.push(...payload.roles)
      }
      if (payload.role) {
        roles.push(payload.role)
      }

      return roles
    } catch {
      return []
    }
  }

  /**
   * Check if a specific scope code exists for a resource URL AND if the current user has access to it
   * The API returns all scopes for a resource URL, so we must check if the current user's roles
   * match the roles required by the scope.
   * @param resourceUrl - The resource URL path (e.g., '/platform/employee-record')
   * @param scopeCode - The scope code to check (e.g., 'employee-record-notes')
   * @returns True if the scope exists AND the user has one of the required roles
   */
  public async hasScopePermission(resourceUrl: string, scopeCode: string): Promise<boolean> {
    try {
      const scopes = await this.getScopePermissions(resourceUrl)
      const scope = scopes.find(s => s.code === scopeCode)

      if (!scope) {
        return false
      }

      const userRoles = this.getUserRolesFromToken()
      const requiredRoleNames = scope.roles.map(r => r.name)
      return requiredRoleNames.some(roleName => userRoles.includes(roleName))
    } catch (error) {
      console.error('Error checking scope permission:', error)
      return false
    }
  }
}

export const authorizationClient = AuthorizationClient.getInstance()

export default AuthorizationClient
