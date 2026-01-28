import { useEffect, useMemo, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import type { SharedNoteUser } from '../components/ShareNoteDialog'

export interface ShareUserDisplayInfo {
  name: string
  avatarUrl?: string
}

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:')) return pictureThumbnail
  if (pictureThumbnail.startsWith('http://') || pictureThumbnail.startsWith('https://')) return pictureThumbnail
  return `data:image/png;base64,${pictureThumbnail}`
}

function fallbackName(user: { userId: string; userName?: string; userEmail?: string }, fallbackPrefix: string): string {
  return user.userName || user.userEmail || `${fallbackPrefix} ${user.userId.slice(0, 8)}`
}

export function useShareUsersEnrichment(options: {
  accessToken: string
  open: boolean
  currentUserId: string
  currentUserName?: string
  sharedUsers: SharedNoteUser[]
}): { owner: ShareUserDisplayInfo; sharedUsers: SharedNoteUser[] } {
  const { accessToken, open, currentUserId, currentUserName, sharedUsers } = options
  const graphqlClient = useGraphQLClient(accessToken || '')

  const cacheRef = useRef<Map<string, { displayName: string; avatarUrl?: string }>>(new Map())
  const inFlightRef = useRef<Set<string>>(new Set())

  const [owner, setOwner] = useState<ShareUserDisplayInfo>(() => ({
    name: currentUserName || 'You'
  }))
  const [enrichedSharedUsers, setEnrichedSharedUsers] = useState<SharedNoteUser[]>([])

  const allUserIds = useMemo(() => {
    const ids = new Set<string>()
    if (currentUserId) ids.add(currentUserId)
    for (const u of sharedUsers || []) {
      if (u?.userId) ids.add(u.userId)
    }
    return [...ids]
  }, [currentUserId, sharedUsers])

  useEffect(() => {
    if (!open) {
      setEnrichedSharedUsers([])
      setOwner({ name: currentUserName || 'You' })
      return
    }

    // Fast path: render immediately from best-known data (prop + cache)
    const nextShared = (sharedUsers || []).map(u => {
      const cached = cacheRef.current.get(u.userId)
      return {
        ...u,
        userName: u.userName || cached?.displayName || fallbackName(u, 'User'),
        userAvatar: u.userAvatar || cached?.avatarUrl
      }
    })
    setEnrichedSharedUsers(nextShared)

    const cachedOwner = currentUserId ? cacheRef.current.get(currentUserId) : undefined
    setOwner({
      name: currentUserName || cachedOwner?.displayName || 'You',
      avatarUrl: cachedOwner?.avatarUrl
    })

    if (!accessToken || !graphqlClient) return

    let cancelled = false

    const fetchOne = async (userId: string) => {
      if (!userId) return
      if (cacheRef.current.has(userId)) return
      if (inFlightRef.current.has(userId)) return

      inFlightRef.current.add(userId)
      try {
        const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(userId)
        const result = await graphqlClient.request<{
          Employee: Array<{ displayName: string; pictureThumbnail?: string }>
        }>(query)
        const emp = result.Employee?.[0]
        const displayName = emp?.displayName || `User ${userId.slice(0, 8)}`
        const avatarUrl = toAvatarDataUrl(emp?.pictureThumbnail)
        cacheRef.current.set(userId, { displayName, avatarUrl })
      } catch {
        cacheRef.current.set(userId, { displayName: `User ${userId.slice(0, 8)}` })
      } finally {
        inFlightRef.current.delete(userId)
      }
    }

    const run = async () => {
      await Promise.all(allUserIds.map(id => fetchOne(id)))
      if (cancelled) return

      const refreshedShared = (sharedUsers || []).map(u => {
        const cached = cacheRef.current.get(u.userId)
        return {
          ...u,
          userName: u.userName || cached?.displayName || fallbackName(u, 'User'),
          userAvatar: u.userAvatar || cached?.avatarUrl
        }
      })
      setEnrichedSharedUsers(refreshedShared)

      const cached = currentUserId ? cacheRef.current.get(currentUserId) : undefined
      setOwner({
        name: currentUserName || cached?.displayName || 'You',
        avatarUrl: cached?.avatarUrl
      })
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [accessToken, allUserIds, currentUserId, currentUserName, graphqlClient, open, sharedUsers])

  return { owner, sharedUsers: enrichedSharedUsers }
}
