import { useCallback, useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import { DocumentApiService } from '../services/DocumentApiService'
import type { DocumentSummary } from '../types'
import type { SharedUserInfo } from '../components/DocumentPreviewCard'

type OwnerInfo = { name: string; avatar?: string }
type OwnerInfoMap = Map<string, OwnerInfo>

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

function fallbackUserName(userId: string): string {
  return `User ${userId.slice(0, 8)}...`
}

async function buildSharedUsersForDocument(params: {
  documentId: string
  fetchUserInfoByUserId: (userId: string) => Promise<SharedUserInfo | null>
}): Promise<{ docId: string; sharedUsers: SharedUserInfo[] }> {
  try {
    const shares = await DocumentApiService.getSharedUsers(params.documentId)
    if (shares.length === 0) {
      return { docId: params.documentId, sharedUsers: [] }
    }

    const sharedUsers: SharedUserInfo[] = []
    for (const share of shares) {
      const userInfo = await params.fetchUserInfoByUserId(share.userId)
      if (userInfo) {
        sharedUsers.push({ ...userInfo, permission: share.permission } as SharedUserInfo)
      } else {
        sharedUsers.push({
          userId: share.userId,
          userName: fallbackUserName(share.userId),
          permission: share.permission
        } as SharedUserInfo)
      }
    }

    return { docId: params.documentId, sharedUsers }
  } catch {
    return { docId: params.documentId, sharedUsers: [] }
  }
}

export function useDocumentAppsHubUserLookup(params: { accessToken: string; documents: DocumentSummary[] }): {
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

  const loadedSharesRef = useRef<Set<string>>(new Set())
  const loadingOwnerInfoRef = useRef<Set<string>>(new Set())

  const fetchUserInfoByUserId = useCallback(
    async (userId: string): Promise<SharedUserInfo | null> => {
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
          userId: emp.userId,
          userName: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
          userAvatar: toAvatarDataUrl(emp.pictureThumbnail)
        }
      } catch {
        return null
      }
    },
    [graphqlClient]
  )

  const refreshSharedUsersForDocument = useCallback(
    async (documentId: string) => {
      const { sharedUsers } = await buildSharedUsersForDocument({ documentId, fetchUserInfoByUserId })
      setSharedUsersMap(prev => ({ ...prev, [documentId]: sharedUsers }))
    },
    [fetchUserInfoByUserId]
  )

  useEffect(() => {
    if (!graphqlClient) return

    const loadOwnerInfo = async () => {
      for (const doc of params.documents) {
        const ownerId = doc.createdBy
        if (!ownerId) continue
        if (ownerInfoMap.has(ownerId)) continue
        if (loadingOwnerInfoRef.current.has(ownerId)) continue

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
              avatar: toAvatarDataUrl(emp?.pictureThumbnail)
            })
          )
        } catch {
          setOwnerInfoMap(prev => new Map(prev).set(ownerId, { name: `User ${ownerId.slice(0, 8)}` }))
        } finally {
          loadingOwnerInfoRef.current.delete(ownerId)
        }
      }
    }

    loadOwnerInfo()
  }, [params.documents, graphqlClient, ownerInfoMap])

  useEffect(() => {
    if (!graphqlClient) return
    if (params.documents.length === 0) return

    const loadSharedUsersData = async () => {
      const ownedDocs = params.documents.filter(doc => doc.isOwner && !loadedSharesRef.current.has(doc.id))
      if (ownedDocs.length === 0) return

      ownedDocs.forEach(doc => loadedSharesRef.current.add(doc.id))

      const BATCH_SIZE = 5
      const allResults: { docId: string; sharedUsers: SharedUserInfo[] }[] = []
      for (let i = 0; i < ownedDocs.length; i += BATCH_SIZE) {
        const batch = ownedDocs.slice(i, i + BATCH_SIZE)
        const batchResults = await Promise.all(
          batch.map(doc => buildSharedUsersForDocument({ documentId: doc.id, fetchUserInfoByUserId }))
        )
        allResults.push(...batchResults)
      }

      const newMap: Record<string, SharedUserInfo[]> = {}
      for (const r of allResults) {
        newMap[r.docId] = r.sharedUsers
      }

      setSharedUsersMap(prev => ({ ...prev, ...newMap }))
    }

    loadSharedUsersData()
  }, [params.documents, graphqlClient, fetchUserInfoByUserId])

  return { ownerInfoMap, sharedUsersMap, refreshSharedUsersForDocument }
}
