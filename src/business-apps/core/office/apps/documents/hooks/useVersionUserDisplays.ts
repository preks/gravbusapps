/**
 * useVersionUserDisplays
 *
 * Fetches display names and avatars for version createdBy user IDs from the Employee GraphQL API.
 * Used by PagedDocumentEditor to show names and avatars in Version History.
 */

import { useState, useEffect, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { Version } from '@/business-apps/platform/apps/shared/types/versioning'

export interface VersionUserDisplay {
  displayName: string
  avatarUrl?: string
}

export function useVersionUserDisplays(
  versions: Version[],
  accessToken: string,
  additionalUserIds: string[] = []
): Record<string, VersionUserDisplay> {
  const [userDisplayMap, setUserDisplayMap] = useState<Record<string, VersionUserDisplay>>({})
  const graphqlClient = useGraphQLClient(accessToken)

  const userIds = useMemo(
    () => Array.from(new Set([...versions.map(v => v.createdBy), ...additionalUserIds].filter(Boolean))),
    [additionalUserIds, versions]
  )

  useEffect(() => {
    if (!userIds.length || !accessToken) {
      setUserDisplayMap({})
      return
    }

    const fetchUserDisplays = async () => {
      try {
        const byUserIdQuery = `
          query GetEmployeeVersionDisplays($userIds: [String!]) {
            Employee(where: {userId: {_in: $userIds}}) {
              id
              userId
              firstName
              lastName
              pictureThumbnail
            }
          }
        `

        const byUserIdResult = await graphqlClient.request<{
          Employee: Array<{
            id: string
            userId: string
            firstName: string | null
            lastName: string | null
            pictureThumbnail: string | null
          }>
        }>(byUserIdQuery, { userIds })

        const map: Record<string, VersionUserDisplay> = {}
        byUserIdResult?.Employee?.forEach(emp => {
          const displayName = [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || emp.userId || emp.id
          let avatarUrl: string | undefined
          if (emp.pictureThumbnail && emp.pictureThumbnail.length > 0) {
            avatarUrl = emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
          }
          map[emp.userId] = { displayName, avatarUrl }
          map[emp.id] = { displayName, avatarUrl }
        })

        // Some version authors are stored as Employee.id UUIDs, not userId.
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const uuidIdsMissing = userIds.filter(id => uuidRegex.test(id) && !map[id])
        if (uuidIdsMissing.length > 0) {
          const byEmployeeIdQuery = `
            query GetEmployeeVersionDisplaysById($employeeIds: [uuid!]!) {
              Employee(where: { id: { _in: $employeeIds } }) {
                id
                userId
                firstName
                lastName
                pictureThumbnail
              }
            }
          `
          const byEmployeeIdResult = await graphqlClient.request<{
            Employee: Array<{
              id: string
              userId: string
              firstName: string | null
              lastName: string | null
              pictureThumbnail: string | null
            }>
          }>(byEmployeeIdQuery, { employeeIds: uuidIdsMissing })

          byEmployeeIdResult?.Employee?.forEach(emp => {
            const displayName = [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || emp.userId || emp.id
            let avatarUrl: string | undefined
            if (emp.pictureThumbnail && emp.pictureThumbnail.length > 0) {
              avatarUrl = emp.pictureThumbnail.startsWith('data:')
                ? emp.pictureThumbnail
                : `data:image/png;base64,${emp.pictureThumbnail}`
            }
            map[emp.id] = { displayName, avatarUrl }
            map[emp.userId] = { displayName, avatarUrl }
          })
        }

        setUserDisplayMap(map)
      } catch (error) {
        console.error('[useVersionUserDisplays] Failed to fetch user displays:', error)
        setUserDisplayMap({})
      }
    }

    fetchUserDisplays()
  }, [userIds, accessToken, graphqlClient])

  return userDisplayMap
}
