import { useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

interface UserGroup {
  id: string
  name: string
  // keep it flexible in case the API returns more
  [key: string]: unknown
}

type GroupsResponse =
  | UserGroup[]
  | {
      data?: UserGroup[]
      [key: string]: unknown
    }

/**
 * User Management client focused on user groups retrieval.
 * Uses NEXT_PUBLIC_USER_MANAGEMENT_API as base URL.
 */
export const useUserGroups = (accessToken: string) => {
  const baseURL = env('NEXT_PUBLIC_USER_MANAGEMENT_API') || ''
  const restClient = useRestClient(baseURL)

  /**
   * Fetch groups for a given user id.
   * Returns array of group names (strings).
   */
  const getUserGroups = useCallback(
    async (userId: string, limit: number = 50, offset: number = 0): Promise<string[]> => {
      if (!userId) return []

      try {
        const response = await restClient.get<GroupsResponse>(`/users/${userId}/groups`, {
          params: { limit, offset },
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        const groups: UserGroup[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []

        return groups.map(g => g?.name).filter(Boolean) as string[]
      } catch (error) {
        console.error('Error fetching user groups:', error)
        return []
      }
    },
    [restClient, accessToken]
  )

  return {
    getUserGroups
  }
}
