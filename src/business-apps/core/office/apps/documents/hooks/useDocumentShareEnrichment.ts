import { useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_ID, GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import { getWorkEmailFromCommunication } from '@/common/data/employee/useEmployeeSearch'

export interface DocumentSharedUser {
  id: string
  userId: string
  userName: string
  userEmail: string
  userAvatar?: string
  permission: 'view' | 'edit' | 'comment' | 'admin'
  sharedAt: string
  sharedBy: string
}

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:')) return pictureThumbnail
  if (pictureThumbnail.startsWith('http://') || pictureThumbnail.startsWith('https://')) return pictureThumbnail
  return `data:image/png;base64,${pictureThumbnail}`
}

export function useDocumentShareEnrichment(options: {
  accessToken: string
  sharedUsers: DocumentSharedUser[]
  getSharedUsers: (documentId: string) => Promise<DocumentSharedUser[]>
}) {
  const { accessToken, sharedUsers, getSharedUsers } = options
  const graphqlClient = useGraphQLClient(accessToken || '')
  const knownUsersRef = useRef<Map<string, { displayName: string; avatar?: string; email?: string }>>(new Map())

  const resolveShareUser = useCallback(
    async (
      share: DocumentSharedUser,
      extraKnownUsers?: Map<string, { displayName: string; avatar?: string; email?: string }>
    ): Promise<DocumentSharedUser> => {
      if (graphqlClient) {
        for (const queryBuilder of [GET_EMPLOYEE_LIGHT_BY_USER_ID, GET_EMPLOYEE_LIGHT_BY_ID]) {
          try {
            const result = await graphqlClient.request<{
              Employee: Array<{
                displayName?: string
                firstName?: string
                lastName?: string
                pictureThumbnail?: string
                communication?: Array<{ value?: string; channelRef?: string }>
              }>
            }>(queryBuilder(share.userId))
            const employee = result.Employee?.[0]
            if (!employee) {
              continue
            }

            const displayName =
              employee.displayName || [employee.firstName, employee.lastName].filter(Boolean).join(' ')
            const email = getWorkEmailFromCommunication(employee.communication) || ''
            const avatar = toAvatarDataUrl(employee.pictureThumbnail)
            const resolvedUser = {
              displayName: displayName || email || '',
              avatar,
              email
            }

            knownUsersRef.current.set(share.userId, resolvedUser)

            return {
              ...share,
              userName: resolvedUser.displayName,
              userEmail: resolvedUser.email || share.userEmail,
              userAvatar: resolvedUser.avatar || share.userAvatar
            }
          } catch {
            // Try the next lookup strategy.
          }
        }
      }

      const knownUser = extraKnownUsers?.get(share.userId) || knownUsersRef.current.get(share.userId)
      if (knownUser) {
        return {
          ...share,
          userName: knownUser.displayName,
          userEmail: knownUser.email || share.userEmail,
          userAvatar: knownUser.avatar || share.userAvatar
        }
      }

      return {
        ...share,
        userName: share.userName || share.userEmail || ''
      }
    },
    [graphqlClient]
  )

  const enrichSharedUsers = useCallback(
    async (
      shares: DocumentSharedUser[],
      extraKnownUsers?: Map<string, { displayName: string; avatar?: string; email?: string }>
    ) => {
      if (shares.length === 0) {
        return shares
      }

      return Promise.all(shares.map(share => resolveShareUser(share, extraKnownUsers)))
    },
    [resolveShareUser]
  )

  const buildKnownUsersMap = useCallback(
    (extraDetails?: Array<{ userId: string; displayName: string; avatar?: string; email?: string }>) => {
      const nextKnownUsers = new Map(knownUsersRef.current)

      sharedUsers.forEach(user => {
        if (user.userName) {
          nextKnownUsers.set(user.userId, {
            displayName: user.userName,
            avatar: user.userAvatar,
            email: user.userEmail
          })
        }
      })

      extraDetails?.forEach(user => nextKnownUsers.set(user.userId, user))
      return nextKnownUsers
    },
    [sharedUsers]
  )

  const fetchAndEnrichShares = useCallback(
    async (
      documentId: string,
      extraDetails?: Array<{ userId: string; displayName: string; avatar?: string; email?: string }>
    ) => {
      const shares = await getSharedUsers(documentId)
      return enrichSharedUsers(shares, buildKnownUsersMap(extraDetails))
    },
    [buildKnownUsersMap, enrichSharedUsers, getSharedUsers]
  )

  return {
    fetchAndEnrichShares
  }
}
