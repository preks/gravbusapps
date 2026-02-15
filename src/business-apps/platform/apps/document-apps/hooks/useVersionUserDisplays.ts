/**
 * useVersionUserDisplays
 *
 * Fetches display names and avatars for version createdBy user IDs from the Employee GraphQL API.
 * Used by PagedDocumentEditor to show names and avatars in Version History.
 */

import { useState, useEffect, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { Version } from '../../shared/types/versioning'

export interface VersionUserDisplay {
  displayName: string
  avatarUrl?: string
}

export function useVersionUserDisplays(versions: Version[], accessToken: string): Record<string, VersionUserDisplay> {
  const [userDisplayMap, setUserDisplayMap] = useState<Record<string, VersionUserDisplay>>({})
  const graphqlClient = useGraphQLClient(accessToken)

  const userIds = useMemo(() => Array.from(new Set(versions.map(v => v.createdBy).filter(Boolean))), [versions])

  useEffect(() => {
    if (!userIds.length || !accessToken) {
      setUserDisplayMap({})
      return
    }

    const fetchUserDisplays = async () => {
      try {
        const query = `
          query GetEmployeeVersionDisplays($userIds: [String!]) {
            Employee(where: {userId: {_in: $userIds}}) {
              userId
              firstName
              lastName
              pictureThumbnail
            }
          }
        `
        const result = await graphqlClient.request<{
          Employee: Array<{
            userId: string
            firstName: string | null
            lastName: string | null
            pictureThumbnail: string | null
          }>
        }>(query, { userIds })

        const map: Record<string, VersionUserDisplay> = {}
        result?.Employee?.forEach(emp => {
          const displayName = [emp.firstName, emp.lastName].filter(Boolean).join(' ').trim() || emp.userId
          let avatarUrl: string | undefined
          if (emp.pictureThumbnail && emp.pictureThumbnail.length > 0) {
            avatarUrl = emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
          }
          map[emp.userId] = { displayName, avatarUrl }
        })
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
