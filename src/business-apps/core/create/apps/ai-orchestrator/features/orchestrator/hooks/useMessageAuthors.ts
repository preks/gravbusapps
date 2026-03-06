/**
 * useMessageAuthors - Resolves userIds to display name + avatar + initials for chat message authors.
 * Used so multiple collaborators see who wrote each user message.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'

export interface MessageAuthorDisplay {
  name: string
  avatar?: string
  initials: string
}

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

function toInitials(firstName?: string, lastName?: string, displayName?: string): string {
  if (firstName && lastName) {
    return [firstName[0], lastName[0]].filter(Boolean).join('').toUpperCase()
  }
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) {
      const first = parts[0]?.[0]
      const last = parts[parts.length - 1]?.[0]
      return first && last ? (first + last).toUpperCase() : '?'
    }
    return displayName.slice(0, 2).toUpperCase()
  }
  return '?'
}

export interface UseMessageAuthorsParams {
  accessToken: string
  userIds: string[]
}

export interface UseMessageAuthorsResult {
  authorMap: Record<string, MessageAuthorDisplay>
  getAuthor: (userId: string) => MessageAuthorDisplay | undefined
  isLoading: boolean
}

const UNKNOWN_AUTHOR: MessageAuthorDisplay = { name: 'Unknown', initials: '?' }

async function loadUsersIntoMap(
  newUserIds: string[],
  fetchAuthor: (userId: string) => Promise<MessageAuthorDisplay | null>,
  setAuthorMap: Dispatch<SetStateAction<Record<string, MessageAuthorDisplay>>>
): Promise<void> {
  const results = await Promise.all(newUserIds.map(fetchAuthor))
  setAuthorMap(prev => {
    const next = { ...prev }
    results.forEach((info, index) => {
      const userId = newUserIds[index]
      next[userId] = info ?? UNKNOWN_AUTHOR
    })
    return next
  })
}

export function useMessageAuthors(params: UseMessageAuthorsParams): UseMessageAuthorsResult {
  const { accessToken, userIds } = params
  const graphqlClient = useGraphQLClient(accessToken)

  const [authorMap, setAuthorMap] = useState<Record<string, MessageAuthorDisplay>>({})
  const [isLoading, setIsLoading] = useState(false)
  const loadingRef = useRef<Set<string>>(new Set())

  const fetchAuthor = useCallback(
    async (userId: string): Promise<MessageAuthorDisplay | null> => {
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

        const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
        const initials = toInitials(emp.firstName, emp.lastName, emp.displayName)
        const avatar = toAvatarDataUrl(emp.pictureThumbnail)

        return { name, avatar, initials }
      } catch (err) {
        console.error('[useMessageAuthors] Error fetching user:', userId, err)
        return null
      }
    },
    [graphqlClient]
  )

  useEffect(() => {
    if (!graphqlClient || userIds.length === 0) return

    const deduped = [...new Set(userIds.filter(Boolean))]
    const newUserIds = deduped.filter(id => !authorMap[id] && !loadingRef.current.has(id))

    if (newUserIds.length === 0) return

    setIsLoading(true)
    newUserIds.forEach(id => loadingRef.current.add(id))

    loadUsersIntoMap(newUserIds, fetchAuthor, setAuthorMap).finally(() => {
      newUserIds.forEach(id => loadingRef.current.delete(id))
      setIsLoading(false)
    })
  }, [userIds.join(','), graphqlClient, fetchAuthor, authorMap])

  const getAuthor = useCallback(
    (userId: string): MessageAuthorDisplay | undefined => {
      return authorMap[userId] ?? undefined
    },
    [authorMap]
  )

  return {
    authorMap,
    getAuthor,
    isLoading
  }
}
