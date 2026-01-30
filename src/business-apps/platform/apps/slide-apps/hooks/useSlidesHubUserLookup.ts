import { useCallback, useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import { SlidesApiService } from '../services/SlidesApiService'
import type { SlideSummary } from '../types'

type OwnerInfo = { name: string; avatar?: string }
type OwnerInfoMap = Map<string, OwnerInfo>

export interface SharedUserInfo {
  userId: string
  userName: string
  userAvatar?: string
  permission?: string
  odataId?: string
}

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

function fallbackUserName(userId: string): string {
  return `User ${userId.slice(0, 8)}...`
}

async function buildSharedUsersForSlide(params: {
  slideId: string
  fetchUserInfoByUserId: (userId: string) => Promise<SharedUserInfo | null>
}): Promise<{ slideId: string; sharedUsers: SharedUserInfo[] }> {
  try {
    const shares = await SlidesApiService.getSharedUsers(params.slideId)
    if (shares.length === 0) {
      return { slideId: params.slideId, sharedUsers: [] }
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

    return { slideId: params.slideId, sharedUsers }
  } catch {
    return { slideId: params.slideId, sharedUsers: [] }
  }
}

export function useSlidesHubUserLookup(params: {
  accessToken: string
  slides: SlideSummary[]
  currentUserId: string
}): {
  ownerInfoMap: OwnerInfoMap
  sharedUsersMap: Record<string, SharedUserInfo[]>
  refreshSharedUsersForSlide: (slideId: string) => Promise<void>
} {
  const graphqlClient = useGraphQLClient(params.accessToken)

  const [ownerInfoMap, setOwnerInfoMap] = useState<OwnerInfoMap>(new Map())
  const [sharedUsersMap, setSharedUsersMap] = useState<Record<string, SharedUserInfo[]>>({})

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

  const refreshSharedUsersForSlide = useCallback(
    async (slideId: string) => {
      const { sharedUsers } = await buildSharedUsersForSlide({ slideId, fetchUserInfoByUserId })
      setSharedUsersMap(prev => ({ ...prev, [slideId]: sharedUsers }))
    },
    [fetchUserInfoByUserId]
  )

  useEffect(() => {
    if (!graphqlClient) return

    const loadOwnerInfo = async () => {
      for (const slide of params.slides) {
        const ownerId = slide.createdBy
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
  }, [params.slides, graphqlClient, ownerInfoMap])

  useEffect(() => {
    if (!graphqlClient) return
    if (params.slides.length === 0) return

    const loadSharedUsersData = async () => {
      // Determine ownership same way as SlidesAppsHub
      const ownedSlides = params.slides.filter(slide => {
        const isOwner = slide.isOwner || slide.permission === 'owner' || slide.createdBy === params.currentUserId
        return isOwner && !loadedSharesRef.current.has(slide.id)
      })
      if (ownedSlides.length === 0) return

      ownedSlides.forEach(slide => loadedSharesRef.current.add(slide.id))
      const results = await Promise.all(
        ownedSlides.map(slide => buildSharedUsersForSlide({ slideId: slide.id, fetchUserInfoByUserId }))
      )

      const newMap: Record<string, SharedUserInfo[]> = {}
      for (const r of results) {
        newMap[r.slideId] = r.sharedUsers
      }

      setSharedUsersMap(prev => ({ ...prev, ...newMap }))
    }

    loadSharedUsersData()
  }, [params.slides, params.currentUserId, graphqlClient, fetchUserInfoByUserId])

  return { ownerInfoMap, sharedUsersMap, refreshSharedUsersForSlide }
}
