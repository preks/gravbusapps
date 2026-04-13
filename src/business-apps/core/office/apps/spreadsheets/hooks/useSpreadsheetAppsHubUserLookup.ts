import { useCallback, useEffect, useRef, useState } from 'react'
import type { GraphQLClient } from 'graphql-request'
import type { SpreadsheetAppSummary } from '../types'
import { GET_EMPLOYEES_LIGHT_BY_USER_IDS } from '@/common/data/employee/queries/employeeQueries'

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
  /** Retained for call-site stability; list payloads drive preview data for all sections */
  activeSection: 'home' | 'my-files' | 'shared' | 'favorites' | 'recent' | 'automations' | 'tasks' | 'trash'
}

export interface UseSpreadsheetAppsHubUserLookupReturn {
  ownerInfoMap: Map<string, SpreadsheetOwnerInfo>
  sharedUsersMap: Map<string, SpreadsheetSharedUserInfo[]>
  /** No-op: previews refresh when `apps` updates (e.g. `refreshApps()` after share changes). */
  invalidateSharedUsersForApp: (appId: string) => void
}

function toAvatarUrl(thumbnail?: string | null): string | undefined {
  if (!thumbnail) return undefined
  return thumbnail.startsWith('data:') ? thumbnail : `data:image/png;base64,${thumbnail}`
}

type EmployeeRow = {
  id: string
  displayName: string
  firstName?: string | null
  lastName?: string | null
  userId: string
  pictureThumbnail?: string | null
}

/**
 * Batched owner + share-preview resolution (same approach as document hub).
 * `sharedPreviewUserIds` + `sharedWithCount` come from the list API; no per-app `/sharing/...` on load.
 */
export function useSpreadsheetAppsHubUserLookup(
  params: UseSpreadsheetAppsHubUserLookupParams
): UseSpreadsheetAppsHubUserLookupReturn {
  const { apps, graphqlClient } = params

  const [ownerInfoMap, setOwnerInfoMap] = useState<Map<string, SpreadsheetOwnerInfo>>(new Map())
  const [sharedUsersMap, setSharedUsersMap] = useState<Map<string, SpreadsheetSharedUserInfo[]>>(new Map())

  const userInfoCacheRef = useRef<Map<string, EmployeeRow | null>>(new Map())
  const graphqlClientRef = useRef(graphqlClient)
  graphqlClientRef.current = graphqlClient
  const batchInFlightRef = useRef<string | null>(null)

  const rebuildMaps = useCallback((list: SpreadsheetAppSummary[]) => {
    const nextOwners = new Map<string, SpreadsheetOwnerInfo>()
    const nextShared = new Map<string, SpreadsheetSharedUserInfo[]>()

    for (const app of list) {
      if (app.createdBy) {
        const emp = userInfoCacheRef.current.get(app.createdBy)
        nextOwners.set(app.createdBy, {
          name:
            emp?.displayName ||
            `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() ||
            `User ${app.createdBy.slice(0, 8)}`,
          avatar: toAvatarUrl(emp?.pictureThumbnail)
        })
      }

      const previewIds = app.sharedPreviewUserIds
      if (previewIds && previewIds.length > 0) {
        nextShared.set(
          app.id,
          previewIds.map(uid => {
            const emp = userInfoCacheRef.current.get(uid)
            return {
              userId: uid,
              name:
                emp?.displayName ||
                `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() ||
                `User ${uid.slice(0, 8)}`,
              avatar: toAvatarUrl(emp?.pictureThumbnail),
              permission: 'view' as const
            }
          })
        )
      }
    }

    setOwnerInfoMap(nextOwners)
    setSharedUsersMap(nextShared)
  }, [])

  useEffect(() => {
    const client = graphqlClientRef.current
    if (!client || apps.length === 0) {
      setOwnerInfoMap(new Map())
      setSharedUsersMap(new Map())
      return
    }

    const allUserIds = new Set<string>()
    for (const app of apps) {
      if (app.createdBy) allUserIds.add(app.createdBy)
      if (app.sharedPreviewUserIds) {
        for (const uid of app.sharedPreviewUserIds) {
          allUserIds.add(uid)
        }
      }
    }

    const toFetch = [...allUserIds].filter(id => !userInfoCacheRef.current.has(id))
    const batchKey = [...allUserIds].sort().join(',')
    if (batchKey === batchInFlightRef.current && toFetch.length === 0) {
      rebuildMaps(apps)
      return
    }
    batchInFlightRef.current = batchKey

    if (toFetch.length === 0) {
      rebuildMaps(apps)
      return
    }

    const fetchBatch = async () => {
      try {
        const query = GET_EMPLOYEES_LIGHT_BY_USER_IDS(toFetch)
        const result = await client.request<{ Employee: EmployeeRow[] }>(query)
        const employees = result.Employee ?? []
        const byUserId = new Map<string, EmployeeRow>()
        for (const emp of employees) {
          byUserId.set(emp.userId, emp)
        }
        for (const uid of toFetch) {
          userInfoCacheRef.current.set(uid, byUserId.get(uid) ?? null)
        }
      } catch {
        for (const uid of toFetch) {
          userInfoCacheRef.current.set(uid, null)
        }
      }
      rebuildMaps(apps)
    }

    void fetchBatch()
  }, [apps, rebuildMaps])

  const invalidateSharedUsersForApp = useCallback((appId: string) => {
    void appId
    // Previews reload via `apps` after refreshApps(); avoids duplicating per-app sharing calls here.
  }, [])

  return { ownerInfoMap, sharedUsersMap, invalidateSharedUsersForApp }
}
