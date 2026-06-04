import { useEffect, useMemo, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_ID, GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import { getWorkEmailFromCommunication } from '@/common/data/employee/useEmployeeSearch'
import type { SharedEntityUser } from '../types'

export interface ShareUserDisplayInfo {
  name: string
  avatarUrl?: string
}

function getCurrentUserFallback(
  userId: string,
  currentUserId: string,
  currentUserName?: string,
  currentUserAvatar?: string
): { displayName?: string; avatarUrl?: string } {
  if (userId !== currentUserId) {
    return {}
  }

  return {
    displayName: currentUserName,
    avatarUrl: currentUserAvatar
  }
}

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:')) return pictureThumbnail
  if (pictureThumbnail.startsWith('http://') || pictureThumbnail.startsWith('https://')) return pictureThumbnail
  return `data:image/png;base64,${pictureThumbnail}`
}

export function useShareUsersEnrichment(options: {
  accessToken: string
  open: boolean
  currentUserId: string
  currentUserName?: string
  currentUserAvatar?: string
  sharedUsers: SharedEntityUser[]
}): { owner: ShareUserDisplayInfo; sharedUsers: SharedEntityUser[] } {
  const { accessToken, open, currentUserId, currentUserName, currentUserAvatar, sharedUsers } = options
  const graphqlClient = useGraphQLClient(accessToken || '')
  const cacheRef = useRef<Map<string, { displayName: string; avatarUrl?: string; email?: string }>>(new Map())
  const inFlightRef = useRef<Set<string>>(new Set())

  const [owner, setOwner] = useState<ShareUserDisplayInfo>({
    name: currentUserName || 'You',
    avatarUrl: currentUserAvatar
  })
  const [enrichedSharedUsers, setEnrichedSharedUsers] = useState<SharedEntityUser[]>([])

  const allUserIds = useMemo(() => {
    const ids = new Set<string>()
    if (currentUserId) ids.add(currentUserId)
    for (const user of sharedUsers || []) {
      if (user?.userId) ids.add(user.userId)
    }
    return [...ids]
  }, [currentUserId, sharedUsers])

  useEffect(() => {
    if (!open) {
      setEnrichedSharedUsers([])
      setOwner({ name: currentUserName || 'You', avatarUrl: currentUserAvatar })
      return
    }

    setEnrichedSharedUsers(
      (sharedUsers || []).map(user => {
        const cached = cacheRef.current.get(user.userId)
        const currentUserFallback = getCurrentUserFallback(
          user.userId,
          currentUserId,
          currentUserName,
          currentUserAvatar
        )
        return {
          ...user,
          userName: cached?.displayName || currentUserFallback.displayName || user.userName || user.userEmail || '',
          userEmail: cached?.email || user.userEmail,
          userAvatar: cached?.avatarUrl || currentUserFallback.avatarUrl || user.userAvatar
        }
      })
    )

    const cachedOwner = cacheRef.current.get(currentUserId)
    setOwner({
      name: cachedOwner?.displayName || currentUserName || 'You',
      avatarUrl: cachedOwner?.avatarUrl || currentUserAvatar
    })
  }, [currentUserAvatar, currentUserId, currentUserName, open, sharedUsers])

  useEffect(() => {
    if (!open || !graphqlClient || allUserIds.length === 0) {
      return
    }

    let cancelled = false

    const loadUser = async (userId: string) => {
      if (cacheRef.current.has(userId) || inFlightRef.current.has(userId)) {
        return
      }

      inFlightRef.current.add(userId)

      try {
        let employee:
          | {
              displayName?: string
              firstName?: string
              lastName?: string
              pictureThumbnail?: string
              communication?: Array<{ value?: string; channelRef?: string }>
            }
          | undefined

        for (const queryBuilder of [GET_EMPLOYEE_LIGHT_BY_USER_ID, GET_EMPLOYEE_LIGHT_BY_ID]) {
          const result = await graphqlClient.request<{
            Employee: Array<{
              displayName?: string
              firstName?: string
              lastName?: string
              pictureThumbnail?: string
              communication?: Array<{ value?: string; channelRef?: string }>
            }>
          }>(queryBuilder(userId))

          employee = result.Employee?.[0]
          if (employee) break
        }

        if (!employee) return

        const displayName = employee.displayName || [employee.firstName, employee.lastName].filter(Boolean).join(' ')
        const email = getWorkEmailFromCommunication(employee.communication) || undefined
        cacheRef.current.set(userId, {
          displayName: displayName || email || '',
          avatarUrl: toAvatarDataUrl(employee.pictureThumbnail),
          email
        })

        if (cancelled) return

        if (userId === currentUserId) {
          const cached = cacheRef.current.get(userId)
          setOwner({
            name: cached?.displayName || currentUserName || 'You',
            avatarUrl: cached?.avatarUrl || currentUserAvatar
          })
        }

        setEnrichedSharedUsers(prev =>
          prev.map(user =>
            user.userId === userId
              ? (() => {
                  const currentUserFallback = getCurrentUserFallback(
                    userId,
                    currentUserId,
                    currentUserName,
                    currentUserAvatar
                  )

                  return {
                    ...user,
                    userName:
                      cacheRef.current.get(userId)?.displayName ||
                      currentUserFallback.displayName ||
                      user.userName ||
                      user.userEmail ||
                      '',
                    userEmail: cacheRef.current.get(userId)?.email || user.userEmail,
                    userAvatar:
                      cacheRef.current.get(userId)?.avatarUrl || currentUserFallback.avatarUrl || user.userAvatar
                  }
                })()
              : user
          )
        )
      } catch {
        // Fall back to existing share data when lookups fail.
      } finally {
        inFlightRef.current.delete(userId)
      }
    }

    void Promise.all(allUserIds.map(loadUser))

    return () => {
      cancelled = true
    }
  }, [allUserIds, currentUserAvatar, currentUserId, currentUserName, graphqlClient, open])

  return {
    owner,
    sharedUsers: enrichedSharedUsers
  }
}
