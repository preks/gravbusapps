import { useCallback, useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEES_LIGHT_BY_USER_IDS,
  GET_EMPLOYEE_LIGHT_BY_USER_ID
} from '@/common/data/employee/queries/employeeQueries'
import { DocumentApiService } from '../services/DocumentApiService'
import type { DocumentSummary } from '../types'
import type { SharedUserInfo } from '../components/DocumentPreviewCard'

type OwnerInfo = { name: string; avatar?: string }
type OwnerInfoMap = Map<string, OwnerInfo>

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

interface EmployeeRow {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
  userId: string
  pictureThumbnail?: string
}

/**
 * Batched user-info lookup for the document hub.
 *
 * After the server page is received, collects all unique ownerIds +
 * sharedPreviewUserIds and resolves them in ONE GraphQL request.
 * Per-document /sharing/document/:id calls are no longer made on boot —
 * the server already returns sharedCount + sharedPreviewUserIds.
 * Full sharing data is only fetched on-demand via refreshSharedUsersForDocument.
 */
export function useDocumentAppsHubUserLookup(params: {
  accessToken: string
  documents: DocumentSummary[]
  loadSharedUsers?: boolean
}): {
  ownerInfoMap: OwnerInfoMap
  sharedUsersMap: Record<string, SharedUserInfo[]>
  refreshSharedUsersForDocument: (documentId: string) => Promise<void>
} {
  const graphqlClient = useGraphQLClient(params.accessToken)

  const [ownerInfoMap, setOwnerInfoMap] = useState<OwnerInfoMap>(new Map())
  const [sharedUsersMap, setSharedUsersMap] = useState<Record<string, SharedUserInfo[]>>({})

  useEffect(() => {
    DocumentApiService.setAccessToken(params.accessToken || null)
  }, [params.accessToken])

  const userInfoCacheRef = useRef<Map<string, EmployeeRow | null>>(new Map())
  const graphqlClientRef = useRef(graphqlClient)
  graphqlClientRef.current = graphqlClient
  const batchInFlightRef = useRef<string | null>(null)

  // One batched GraphQL call for ALL user IDs on the visible page
  useEffect(() => {
    const client = graphqlClientRef.current
    if (!client || params.documents.length === 0) return

    const allUserIds = new Set<string>()
    for (const doc of params.documents) {
      if (doc.createdBy) allUserIds.add(doc.createdBy)
      if (doc.sharedPreviewUserIds) {
        for (const uid of doc.sharedPreviewUserIds) allUserIds.add(uid)
      }
    }

    // Filter out already-cached IDs
    const toFetch = [...allUserIds].filter(id => !userInfoCacheRef.current.has(id))

    // Stable key to avoid re-fetching the same batch
    const batchKey = [...allUserIds].sort().join(',')
    if (batchKey === batchInFlightRef.current && toFetch.length === 0) {
      // Same batch, all cached — just rebuild maps from cache
      rebuildMaps(params.documents)
      return
    }
    batchInFlightRef.current = batchKey

    if (toFetch.length === 0) {
      rebuildMaps(params.documents)
      return
    }

    const fetchBatch = async () => {
      try {
        const query = GET_EMPLOYEES_LIGHT_BY_USER_IDS(toFetch)
        const result = await client.request<{ Employee: EmployeeRow[] }>(query)
        const employees = result.Employee ?? []

        const byUserId = new Map<string, EmployeeRow>()
        for (const emp of employees) byUserId.set(emp.userId, emp)

        for (const uid of toFetch) {
          userInfoCacheRef.current.set(uid, byUserId.get(uid) ?? null)
        }
      } catch {
        for (const uid of toFetch) userInfoCacheRef.current.set(uid, null)
      }

      rebuildMaps(params.documents)
    }

    fetchBatch()
  }, [params.documents]) // fetchBatch is stable via ref-based pattern above

  function rebuildMaps(docs: DocumentSummary[]) {
    const nextOwners: Map<string, OwnerInfo> = new Map()
    const nextShared: Record<string, SharedUserInfo[]> = {}

    for (const doc of docs) {
      // Owner info
      if (doc.createdBy) {
        const emp = userInfoCacheRef.current.get(doc.createdBy)
        nextOwners.set(doc.createdBy, {
          name:
            emp?.displayName ||
            `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() ||
            `User ${doc.createdBy.slice(0, 8)}`,
          avatar: toAvatarDataUrl(emp?.pictureThumbnail)
        })
      }

      // Share preview users (from server-provided sharedPreviewUserIds)
      if (doc.sharedPreviewUserIds && doc.sharedPreviewUserIds.length > 0) {
        nextShared[doc.id] = doc.sharedPreviewUserIds.map(uid => {
          const emp = userInfoCacheRef.current.get(uid)
          return {
            userId: uid,
            userName:
              emp?.displayName ||
              `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() ||
              `User ${uid.slice(0, 8)}...`
          } as SharedUserInfo
        })
      }
    }

    setOwnerInfoMap(nextOwners)
    setSharedUsersMap(nextShared)
  }

  // On-demand refresh for ManageSharesDialog — fetches full sharing data for one document
  const refreshSharedUsersForDocument = useCallback(async (documentId: string) => {
    const client = graphqlClientRef.current
    try {
      const shares = await DocumentApiService.getSharedUsers(documentId)
      if (shares.length === 0) {
        setSharedUsersMap(prev => ({ ...prev, [documentId]: [] }))
        return
      }

      const sharedUsers: SharedUserInfo[] = []
      for (const share of shares) {
        let emp = userInfoCacheRef.current.get(share.userId)
        if (emp === undefined) {
          // Not in cache — single lookup
          try {
            if (client) {
              const q = GET_EMPLOYEE_LIGHT_BY_USER_ID(share.userId)
              const res = await client.request<{ Employee: EmployeeRow[] }>(q)
              emp = res.Employee?.[0] ?? null
              userInfoCacheRef.current.set(share.userId, emp)
            }
          } catch {
            emp = null
            userInfoCacheRef.current.set(share.userId, null)
          }
        }
        sharedUsers.push({
          userId: share.userId,
          userName: emp?.displayName || `User ${share.userId.slice(0, 8)}...`,
          userAvatar: toAvatarDataUrl(emp?.pictureThumbnail),
          permission: share.permission
        } as SharedUserInfo)
      }

      setSharedUsersMap(prev => ({ ...prev, [documentId]: sharedUsers }))
    } catch {
      setSharedUsersMap(prev => ({ ...prev, [documentId]: [] }))
    }
  }, [])

  return { ownerInfoMap, sharedUsersMap, refreshSharedUsersForDocument }
}
