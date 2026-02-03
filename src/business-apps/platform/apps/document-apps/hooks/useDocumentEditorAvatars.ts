/**
 * useDocumentEditorAvatars
 *
 * Fetches and enriches current user + collaboration participants with avatar URLs
 * from the Employee GraphQL API. Used by PagedDocumentEditor for presence and Yjs awareness.
 */

import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { DocumentParticipant } from '../../shared/services/CollaborationClient'

export interface UseDocumentEditorAvatarsParams {
  accessToken: string
  rawParticipants: DocumentParticipant[]
}

export interface UseDocumentEditorAvatarsResult {
  participants: DocumentParticipant[]
  currentUserId: string | null
  currentUserName: string | null
  currentUserAvatar: string | null
}

export function useDocumentEditorAvatars({
  accessToken,
  rawParticipants
}: UseDocumentEditorAvatarsParams): UseDocumentEditorAvatarsResult {
  const [participants, setParticipants] = useState<DocumentParticipant[]>(rawParticipants)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  // Parse JWT for current user id/name
  useEffect(() => {
    try {
      const token =
        accessToken ||
        (typeof localStorage === 'undefined' ? null : localStorage.getItem('business-app-ide-access-token'))
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setCurrentUserId(payload.sub || payload.userId || null)
        setCurrentUserName(payload.name || payload.preferred_username || payload.username || null)
      }
    } catch {
      // Ignore invalid token
    }
  }, [accessToken])

  // Enrich participants with avatar URLs from Employee table
  useEffect(() => {
    if (!rawParticipants.length || !accessToken) {
      setParticipants(rawParticipants)
      return
    }

    const userIds = rawParticipants.map(p => p.userId).filter(Boolean)
    if (userIds.length === 0) {
      setParticipants(rawParticipants)
      return
    }

    const fetchParticipantAvatars = async () => {
      try {
        const query = `
          query GetEmployeeAvatars($userIds: [String!]) {
            Employee(where: {userId: {_in: $userIds}}) {
              userId
              pictureThumbnail
            }
          }
        `
        const result = await graphqlClient.request<{
          Employee: Array<{ userId: string; pictureThumbnail: string | null }>
        }>(query, { userIds })

        const avatarMap = new Map<string, string>()
        result?.Employee?.forEach(emp => {
          if (emp.pictureThumbnail) {
            const avatarUrl = emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
            avatarMap.set(emp.userId, avatarUrl)
          }
        })

        const enrichedParticipants = rawParticipants.map(p => ({
          ...p,
          avatarUrl: avatarMap.get(p.userId) || undefined
        }))
        setParticipants(enrichedParticipants)
      } catch (error) {
        console.error('[PagedDocumentEditor] Failed to fetch participant avatars:', error)
        setParticipants(rawParticipants)
      }
    }

    fetchParticipantAvatars()
  }, [rawParticipants, accessToken, graphqlClient])

  // Fetch current user avatar from Employee table
  useEffect(() => {
    if (!currentUserId || !accessToken) return

    const fetchAvatar = async () => {
      try {
        const query = `
          query GetEmployeeAvatar($userId: String!) {
            Employee(where: {userId: {_eq: $userId}}, limit: 1) {
              pictureThumbnail
            }
          }
        `
        const result = await graphqlClient.request<{ Employee: Array<{ pictureThumbnail: string | null }> }>(query, {
          userId: currentUserId
        })

        if (result?.Employee?.[0]?.pictureThumbnail) {
          const thumbnail = result.Employee[0].pictureThumbnail
          const avatarUrl = thumbnail.startsWith('data:') ? thumbnail : `data:image/png;base64,${thumbnail}`
          setCurrentUserAvatar(avatarUrl)
        }
      } catch (error) {
        console.error('[PagedDocumentEditor] Failed to fetch user avatar:', error)
      }
    }

    fetchAvatar()
  }, [currentUserId, accessToken, graphqlClient])

  return { participants, currentUserId, currentUserName, currentUserAvatar }
}
