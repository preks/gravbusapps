/**
 * useSpreadsheetViewerCollaboration
 *
 * Handles collaboration participant enrichment with avatars and current user info.
 * This hook enriches raw participants from useCollaboration with avatar URLs.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useCollaboration } from '../../shared/hooks/useCollaboration'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { DocumentParticipant, CollaborationOperation } from '../../shared/services/CollaborationClient'

export interface UseSpreadsheetViewerCollaborationProps {
  appId: string
  accessToken: string
  onOperationReceived: (operation: CollaborationOperation) => void
  onError?: (error: Error) => void
}

export interface SpreadsheetViewerCollaborationState {
  // Enriched participants
  headerParticipants: DocumentParticipant[]
  cursorParticipants: DocumentParticipant[]

  // Current user info
  currentUserName: string
  currentUserAvatar: string | undefined
  currentUserIdRef: React.MutableRefObject<string | undefined>

  // Collaboration state
  isCollaborationConnected: boolean
  emitOperation: (operation: Omit<CollaborationOperation, 'userId' | 'timestamp'>) => void
  emitCursor: (position: { line?: number; column?: number; offset?: number; path?: string[] }) => void
}

export function useSpreadsheetViewerCollaboration({
  appId,
  accessToken,
  onOperationReceived,
  onError
}: UseSpreadsheetViewerCollaborationProps): SpreadsheetViewerCollaborationState {
  // Current user info
  const currentUserIdRef = useRef<string | undefined>(undefined)
  const [currentUserName, setCurrentUserName] = useState<string>('User')
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(undefined)

  // Error callback
  const onErrorCallback = useCallback(
    (error: Error) => {
      console.error('[SpreadsheetViewerCollaboration] Collaboration error:', error)
      onError?.(error)
    },
    [onError]
  )

  // Base collaboration hook
  const {
    participants: rawParticipants,
    isConnected: isCollaborationConnected,
    emitOperation,
    emitCursor
  } = useCollaboration({
    entityType: 'spreadsheet',
    entityId: appId,
    enabled: true,
    accessToken,
    onOperationReceived,
    onError: onErrorCallback
  })

  // GraphQL client for avatar fetching
  const authToken = accessToken || localStorage.getItem('business-app-ide-access-token') || ''
  const graphqlClient = useGraphQLClient(authToken)

  // Enriched participants for header presence
  const [headerParticipants, setHeaderParticipants] = useState<DocumentParticipant[]>([])

  // Enriched participants for cell cursor indicators
  const [cursorParticipants, setCursorParticipants] = useState<DocumentParticipant[]>([])

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUserInfo = async () => {
      try {
        const token = localStorage.getItem('business-app-ide-access-token')
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          currentUserIdRef.current = payload.sub || payload.userId
          setCurrentUserName(payload.name || payload.preferred_username || 'User')

          // Fetch avatar
          if (authToken && payload.sub) {
            const query = `
              query GetCurrentUserAvatar($userId: String!) {
                Employee(where: { userId: { _eq: $userId } }) {
                  pictureThumbnail
                }
              }
            `
            const result = await graphqlClient.request<{ Employee: Array<{ pictureThumbnail: string | null }> }>(
              query,
              { userId: payload.sub }
            )

            if (result.Employee?.[0]?.pictureThumbnail) {
              const thumbnail = result.Employee[0].pictureThumbnail
              const url = thumbnail.startsWith('data:') ? thumbnail : `data:image/png;base64,${thumbnail}`
              setCurrentUserAvatar(url)
            }
          }
        }
      } catch (error) {
        console.error('[SpreadsheetViewerCollaboration] Failed to fetch current user info:', error)
      }
    }

    fetchCurrentUserInfo()
  }, [authToken, graphqlClient])

  // Fetch avatars for header presence
  useEffect(() => {
    async function fetchAvatars() {
      if (!rawParticipants.length || !authToken) {
        setHeaderParticipants(rawParticipants)
        return
      }

      const userIds = [...new Set(rawParticipants.map(p => p.userId).filter(Boolean))]
      if (userIds.length === 0) {
        setHeaderParticipants(rawParticipants)
        return
      }

      try {
        const query = `
          query GetEmployeeAvatars($userIds: [String!]!) {
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
        setHeaderParticipants(enrichedParticipants)
      } catch (error) {
        console.error('[SpreadsheetViewerCollaboration] Failed to fetch participant avatars:', error)
        setHeaderParticipants(rawParticipants)
      }
    }

    fetchAvatars()
  }, [rawParticipants, authToken, graphqlClient])

  // Fetch avatars for cell cursor indicators (more robust resolution)
  useEffect(() => {
    async function fetchCursorAvatars() {
      if (!rawParticipants.length || !authToken) {
        setCursorParticipants(rawParticipants)
        return
      }

      const ids = [...new Set(rawParticipants.map(p => p.userId).filter(Boolean))]
      if (ids.length === 0) {
        setCursorParticipants(rawParticipants)
        return
      }

      try {
        // Query by Employee.userId (string)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

        const byUserIdQuery = `
          query GetEmployeeAvatarsByUserId($userIds: [String!]!) {
            Employee(where: { userId: { _in: $userIds } }) {
              id
              userId
              pictureThumbnail
            }
          }
        `
        const byUserIdResult = await graphqlClient.request<{
          Employee: Array<{ id: string; userId: string; pictureThumbnail: string | null }>
        }>(byUserIdQuery, { userIds: ids })

        const avatarMap = new Map<string, string>()
        byUserIdResult?.Employee?.forEach(emp => {
          if (!emp.pictureThumbnail) return
          const avatarUrl = emp.pictureThumbnail.startsWith('data:')
            ? emp.pictureThumbnail
            : `data:image/png;base64,${emp.pictureThumbnail}`
          avatarMap.set(emp.userId, avatarUrl)
          avatarMap.set(emp.id, avatarUrl)
        })

        // Also query by Employee.id for UUID ids
        const uuidIdsMissing = ids.filter(id => uuidRegex.test(id) && !avatarMap.has(id))
        if (uuidIdsMissing.length > 0) {
          const byEmployeeIdQuery = `
            query GetEmployeeAvatarsByEmployeeId($employeeIds: [uuid!]!) {
              Employee(where: { id: { _in: $employeeIds } }) {
                id
                userId
                pictureThumbnail
              }
            }
          `
          const byEmployeeIdResult = await graphqlClient.request<{
            Employee: Array<{ id: string; userId: string; pictureThumbnail: string | null }>
          }>(byEmployeeIdQuery, { employeeIds: uuidIdsMissing })

          byEmployeeIdResult?.Employee?.forEach(emp => {
            if (!emp.pictureThumbnail) return
            const avatarUrl = emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
            avatarMap.set(emp.id, avatarUrl)
            avatarMap.set(emp.userId, avatarUrl)
          })
        }

        const enriched = rawParticipants.map(p => ({
          ...p,
          avatarUrl: avatarMap.get(p.userId) || undefined
        }))
        setCursorParticipants(enriched)
      } catch (error) {
        console.error('[SpreadsheetViewerCollaboration] Failed to fetch cursor participant avatars:', error)
        setCursorParticipants(rawParticipants)
      }
    }

    fetchCursorAvatars()
  }, [rawParticipants, authToken, graphqlClient])

  return {
    headerParticipants,
    cursorParticipants,
    currentUserName,
    currentUserAvatar,
    currentUserIdRef,
    isCollaborationConnected,
    emitOperation,
    emitCursor
  }
}
