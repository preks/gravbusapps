/**
 * useVersionUserDisplays
 *
 * Fetches display names and avatars for version createdBy user IDs from the Employee GraphQL API.
 * Used by PagedDocumentEditor to show names and avatars in Version History.
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { Version } from '@/business-apps/platform/apps/shared/types/versioning'

export interface VersionUserDisplay {
  displayName: string
  avatarUrl?: string
}

const EMPTY_USER_IDS: readonly string[] = Object.freeze([])
const EMPTY_USER_DISPLAY_MAP: Record<string, VersionUserDisplay> = Object.freeze({}) as Record<
  string,
  VersionUserDisplay
>

export function useVersionUserDisplays(
  versions: Version[],
  accessToken: string,
  additionalUserIds: readonly string[] = EMPTY_USER_IDS
): Record<string, VersionUserDisplay> {
  const [userDisplayMap, setUserDisplayMap] = useState<Record<string, VersionUserDisplay>>(EMPTY_USER_DISPLAY_MAP)
  const graphqlClient = useGraphQLClient(accessToken)

  // Stable signature for userIds — joining sorted ids gives a primitive that React.useMemo can
  // shallow-compare. Without this, the default `additionalUserIds = []` literal is a new array
  // every render which forces useMemo to recompute (new array ref) which forces the effect to
  // re-fire which calls setUserDisplayMap({}) with a fresh object — an infinite render loop in
  // any consumer (e.g. SpreadsheetAppViewer) when versions is empty/unchanged.
  const userIdsKey = useMemo(() => {
    const ids = Array.from(
      new Set([...versions.map(v => v.createdBy), ...additionalUserIds].filter(Boolean) as string[])
    ).sort()
    return ids.join('\u0001')
  }, [additionalUserIds, versions])

  const userIdsRef = useRef<string[]>([])
  const userIds = useMemo(() => {
    const next = userIdsKey ? userIdsKey.split('\u0001') : []
    if (userIdsRef.current.length === next.length && userIdsRef.current.every((id, idx) => id === next[idx])) {
      return userIdsRef.current
    }
    userIdsRef.current = next
    return next
  }, [userIdsKey])

  useEffect(() => {
    if (!userIds.length || !accessToken) {
      setUserDisplayMap(prev => (Object.keys(prev).length === 0 ? prev : EMPTY_USER_DISPLAY_MAP))
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
