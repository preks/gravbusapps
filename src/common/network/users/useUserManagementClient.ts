import { useEffect } from 'react'
import { userManagementClient } from './UserManagementClient'

/**
 * React hook for accessing User Management API client
 * Automatically sets and updates the access token for authentication
 *
 * @param accessToken - The access token to use for authentication
 * @returns UserManagementClient instance
 *
 * @example
 * ```typescript
 * const userClient = useUserManagementClient(accessToken)
 *
 * // Search users
 * const users = await userClient.searchUsers('john', 20, 0)
 *
 * // Get specific user
 * const user = await userClient.getUserById('user-id-123')
 * ```
 */
export const useUserManagementClient = (accessToken: string) => {
  // Set access token on the singleton client when it changes
  useEffect(() => {
    if (accessToken) {
      userManagementClient.setAccessToken(accessToken)
    }
  }, [accessToken])

  // Listen for token refresh events
  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      globalThis.addEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      return () => {
        globalThis.removeEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      }

      function listener() {
        userManagementClient.setAccessToken(accessToken)
      }
    },
    [accessToken]
  )

  return userManagementClient
}
