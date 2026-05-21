import { userManagementClient } from './UserManagementClient'
import { useSyncClientAccessToken } from '../useSyncClientAccessToken'

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
  useSyncClientAccessToken(userManagementClient, accessToken)

  return userManagementClient
}
