import { useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import type { User } from '../types'

interface UserManagementUser {
  id: string
  preferredUsername?: string
  email: string
  givenName?: string
  familyName?: string
  active?: boolean
  createdTimestamp?: number
}

interface UserManagementResponse {
  data: UserManagementUser[]
  paging?: {
    totalRecords: number
    page: number
    pageSize: number
  }
}

export const useUserManagementClient = (accessToken: string) => {
  const baseURL = env('NEXT_PUBLIC_USER_MANAGEMENT_API') || ''
  const restClient = useRestClient(baseURL)

  const transformUserData = useCallback(
    (userData: UserManagementUser): User => ({
      id: userData.id,
      keycloakId: userData.id,
      username: userData.preferredUsername || userData.email,
      email: userData.email,
      firstName: userData.givenName,
      lastName: userData.familyName,
      avatarUrl: undefined,
      isActive: userData.active ?? false,
      createdAt: userData.createdTimestamp ? new Date(userData.createdTimestamp) : new Date(),
      updatedAt: new Date()
    }),
    []
  )

  const searchUsers = useCallback(
    async (query?: string, limit: number = 20, offset: number = 0): Promise<User[]> => {
      try {
        const params: Record<string, any> = {
          limit,
          offset
        }

        if (query?.trim()) {
          params.searchParam = query.trim()
        }

        const response = await restClient.get<UserManagementResponse>('/users', {
          params,
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        // Transform user management response to Chat User interface
        const users = response.data || []
        return users.map(transformUserData).filter(user => user?.isActive)
      } catch (error) {
        console.error('Error fetching users from user management service:', error)
        throw error
      }
    },
    [restClient, accessToken, transformUserData]
  )

  const getUsersByIds = useCallback(
    async (userIds: string[]): Promise<Map<string, User>> => {
      const userMap = new Map<string, User>()

      if (!userIds || userIds.length === 0) {
        return userMap
      }

      try {
        // Fetch users in parallel (user management API should support fetching by ID)
        const userPromises = userIds.map(async userId => {
          try {
            const response = await restClient.get<UserManagementUser>(`/users/${userId}`, {
              headers: {
                Authorization: `Bearer ${accessToken}`
              }
            })
            return response
          } catch (error) {
            console.warn(`Failed to fetch user ${userId}:`, error)
            return null
          }
        })

        const users = await Promise.all(userPromises)

        users.forEach(userData => {
          if (userData) {
            const user = transformUserData(userData)
            if (user?.isActive) {
              userMap.set(user.id, user)
            }
          }
        })

        return userMap
      } catch (error) {
        console.error('Error fetching users by IDs:', error)
        return userMap
      }
    },
    [restClient, accessToken, transformUserData]
  )

  return {
    searchUsers,
    getUsersByIds
  }
}
