import { useEffect, useRef, useState } from 'react'
import type { GraphQLClient } from 'graphql-request'
import { SpreadsheetApiService } from '../services/SpreadsheetApiService'
import type { SpreadsheetAppSummary } from '../types'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'

export interface SpreadsheetOwnerInfo {
  name: string
  avatar?: string
}

export interface SpreadsheetSharedUserInfo {
  userId: string
  name: string
  avatar?: string
  permission: 'view' | 'edit'
}

export interface UseSpreadsheetAppsHubUserLookupParams {
  apps: SpreadsheetAppSummary[]
  currentUserId: string
  graphqlClient: GraphQLClient
  activeSection: 'home' | 'my-files' | 'shared' | 'favorites' | 'recent' | 'automations' | 'tasks' | 'trash'
}

export interface UseSpreadsheetAppsHubUserLookupReturn {
  ownerInfoMap: Map<string, SpreadsheetOwnerInfo>
  sharedUsersMap: Map<string, SpreadsheetSharedUserInfo[]>
  invalidateSharedUsersForApp: (appId: string) => void
}

function toAvatarUrl(thumbnail?: string | null): string | undefined {
  if (!thumbnail) return undefined
  return thumbnail.startsWith('data:') ? thumbnail : `data:image/png;base64,${thumbnail}`
}

export function useSpreadsheetAppsHubUserLookup(
  params: UseSpreadsheetAppsHubUserLookupParams
): UseSpreadsheetAppsHubUserLookupReturn {
  const { apps, currentUserId, graphqlClient, activeSection } = params

  const [ownerInfoMap, setOwnerInfoMap] = useState<Map<string, SpreadsheetOwnerInfo>>(new Map())
  const [sharedUsersMap, setSharedUsersMap] = useState<Map<string, SpreadsheetSharedUserInfo[]>>(new Map())

  const loadingOwnerInfoRef = useRef<Set<string>>(new Set())
  const loadingSharedUsersRef = useRef<Set<string>>(new Set())

  // Fetch owner info for apps.
  useEffect(() => {
    if (!graphqlClient) return

    const loadOwnerInfo = async () => {
      for (const app of apps) {
        const ownerId = app.createdBy
        if (!ownerId || ownerInfoMap.has(ownerId) || loadingOwnerInfoRef.current.has(ownerId)) continue
        loadingOwnerInfoRef.current.add(ownerId)

        try {
          const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(ownerId)
          const result = await graphqlClient.request<{
            Employee: Array<{ displayName: string; pictureThumbnail?: string }>
          }>(query)
          const emp = result.Employee?.[0]
          setOwnerInfoMap(prev =>
            new Map(prev).set(ownerId, {
              name: emp?.displayName || `User ${ownerId.slice(0, 8)}`,
              avatar: toAvatarUrl(emp?.pictureThumbnail)
            })
          )
        } catch {
          // Ignore errors.
        } finally {
          loadingOwnerInfoRef.current.delete(ownerId)
        }
      }
    }

    loadOwnerInfo().catch(() => {
      // Ignore errors.
    })
  }, [apps, graphqlClient, ownerInfoMap])

  // Fetch shared user info for owned apps (to show avatars in "my-files").
  useEffect(() => {
    if (!graphqlClient || activeSection !== 'my-files') return

    const ownedApps = apps.filter(app => app.isOwner ?? app.createdBy === currentUserId)

    const loadSharedUsersData = async () => {
      for (const app of ownedApps) {
        if (sharedUsersMap.has(app.id) || loadingSharedUsersRef.current.has(app.id)) continue
        loadingSharedUsersRef.current.add(app.id)

        try {
          const shares = await SpreadsheetApiService.getSharedUsers(app.id)
          if (shares.length === 0) {
            setSharedUsersMap(prev => new Map(prev).set(app.id, []))
            continue
          }

          const userInfoPromises = shares.map(async share => {
            try {
              const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(share.userId)
              const result = await graphqlClient.request<{
                Employee: Array<{ displayName: string; pictureThumbnail?: string }>
              }>(query)
              const emp = result.Employee?.[0]
              return {
                userId: share.userId,
                name: emp?.displayName || `User ${share.userId.slice(0, 8)}`,
                avatar: toAvatarUrl(emp?.pictureThumbnail),
                permission: share.permission
              } satisfies SpreadsheetSharedUserInfo
            } catch {
              return {
                userId: share.userId,
                name: `User ${share.userId.slice(0, 8)}`,
                permission: share.permission
              } satisfies SpreadsheetSharedUserInfo
            }
          })

          const sharedUsers = await Promise.all(userInfoPromises)
          setSharedUsersMap(prev => new Map(prev).set(app.id, sharedUsers))
        } catch {
          // Ignore errors.
        } finally {
          loadingSharedUsersRef.current.delete(app.id)
        }
      }
    }

    loadSharedUsersData().catch(() => {
      // Ignore errors.
    })
  }, [activeSection, apps, currentUserId, graphqlClient, sharedUsersMap])

  const invalidateSharedUsersForApp = (appId: string) => {
    setSharedUsersMap(prev => {
      const next = new Map(prev)
      next.delete(appId)
      return next
    })
  }

  return { ownerInfoMap, sharedUsersMap, invalidateSharedUsersForApp }
}
