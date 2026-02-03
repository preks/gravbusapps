/**
 * useSpaceUserLookup Hook
 *
 * Resolves user info (name, avatar) for space owners and members
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'

export interface UserInfo {
  userId: string
  name: string
  avatar?: string
}

type UserInfoMap = Map<string, UserInfo>

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

export interface UseSpaceUserLookupParams {
  accessToken: string
  userIds: string[]
}

export interface UseSpaceUserLookupResult {
  userInfoMap: UserInfoMap
  getUserInfo: (userId: string) => UserInfo | undefined
  isLoading: boolean
}

export function useSpaceUserLookup(params: UseSpaceUserLookupParams): UseSpaceUserLookupResult {
  const { accessToken, userIds } = params
  const graphqlClient = useGraphQLClient(accessToken)

  const [userInfoMap, setUserInfoMap] = useState<UserInfoMap>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const loadingRef = useRef<Set<string>>(new Set())

  const fetchUserInfo = useCallback(
    async (userId: string): Promise<UserInfo | null> => {
      if (!graphqlClient || !userId) return null

      try {
        const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(userId)
        const result = await graphqlClient.request<{
          Employee: Array<{
            id: string
            displayName: string
            firstName?: string
            lastName?: string
            userId: string
            pictureThumbnail?: string
          }>
        }>(query)

        const emp = result.Employee?.[0]
        if (!emp) return null

        return {
          userId: emp.userId || userId,
          name: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
          avatar: toAvatarDataUrl(emp.pictureThumbnail)
        }
      } catch (err) {
        console.error('[useSpaceUserLookup] Error fetching user:', userId, err)
        return null
      }
    },
    [graphqlClient]
  )

  useEffect(() => {
    if (!graphqlClient || userIds.length === 0) return

    const loadUsers = async () => {
      const newUserIds = userIds.filter(id => id && !userInfoMap.has(id) && !loadingRef.current.has(id))

      if (newUserIds.length === 0) return

      setIsLoading(true)
      newUserIds.forEach(id => loadingRef.current.add(id))

      try {
        const results = await Promise.all(newUserIds.map(fetchUserInfo))

        setUserInfoMap(prev => {
          const newMap = new Map(prev)
          results.forEach((info, index) => {
            const userId = newUserIds[index]
            if (info) {
              newMap.set(userId, info)
            } else {
              // Fallback for users not found
              newMap.set(userId, {
                userId,
                name: `User ${userId.slice(0, 8)}...`
              })
            }
          })
          return newMap
        })
      } finally {
        newUserIds.forEach(id => loadingRef.current.delete(id))
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [userIds, graphqlClient, fetchUserInfo, userInfoMap])

  const getUserInfo = useCallback(
    (userId: string): UserInfo | undefined => {
      return userInfoMap.get(userId)
    },
    [userInfoMap]
  )

  return {
    userInfoMap,
    getUserInfo,
    isLoading
  }
}
