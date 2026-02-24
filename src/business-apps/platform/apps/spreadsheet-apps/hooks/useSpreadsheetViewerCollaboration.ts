/**
 * useSpreadsheetViewerCollaboration
 *
 * Handles collaboration participant enrichment with avatars and current user info.
 * This hook enriches raw participants from useCollaboration with avatar URLs.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useCollaboration } from '../../shared/hooks/useCollaboration'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { DocumentParticipant, CollaborationOperation } from '../../shared/services/CollaborationClient'

const COLLABORATION_COLOR_PALETTE = [
  '#2563eb',
  '#7c3aed',
  '#0f766e',
  '#c2410c',
  '#be185d',
  '#0369a1',
  '#4d7c0f',
  '#4338ca'
]

function getDeterministicCollaboratorColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return COLLABORATION_COLOR_PALETTE[hash % COLLABORATION_COLOR_PALETTE.length]
}

function normalizeParticipantColor(participant: DocumentParticipant): string {
  // Always use the curated spreadsheet palette to keep circles + cursor visually consistent.
  return getDeterministicCollaboratorColor(participant.userId || participant.userName || 'user')
}

function normalizeParticipants(participants: DocumentParticipant[]): DocumentParticipant[] {
  return participants.map(participant => ({
    ...participant,
    userColor: normalizeParticipantColor(participant)
  }))
}

function areParticipantsEquivalent(a: DocumentParticipant[], b: DocumentParticipant[], includeCursor = false): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    const pa = a[i]
    const pb = b[i]
    if (pa.userId !== pb.userId) return false
    if ((pa.userName || '') !== (pb.userName || '')) return false
    if ((pa.avatarUrl || '') !== (pb.avatarUrl || '')) return false
    if ((pa.userColor || '') !== (pb.userColor || '')) return false
    if (includeCursor) {
      const paPath = Array.isArray(pa.cursor?.path) ? pa.cursor?.path.join('|') : ''
      const pbPath = Array.isArray(pb.cursor?.path) ? pb.cursor?.path.join('|') : ''
      if (paPath !== pbPath) return false
    }
  }
  return true
}

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

  // IMPORTANT: `useCollaboration` reconnects when callback identities change.
  // Keep callbacks stable via refs to prevent infinite connect/disconnect loops.
  const onOperationReceivedRef = useRef(onOperationReceived)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onOperationReceivedRef.current = onOperationReceived
  }, [onOperationReceived])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const onOperationReceivedStable = useCallback((op: CollaborationOperation) => {
    onOperationReceivedRef.current(op)
  }, [])

  const onErrorCallback = useCallback((error: Error) => {
    console.error('[SpreadsheetViewerCollaboration] Collaboration error:', error)
    onErrorRef.current?.(error)
  }, [])

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
    onOperationReceived: onOperationReceivedStable,
    onError: onErrorCallback
  })

  // Debug: log collaboration state changes
  useEffect(() => {
    console.log('[SpreadsheetViewerCollaboration] State:', {
      appId,
      isCollaborationConnected,
      participantsCount: rawParticipants.length
    })
  }, [appId, isCollaborationConnected, rawParticipants.length])

  // GraphQL client for avatar fetching
  const graphqlClient = useGraphQLClient(accessToken)
  const normalizedParticipants = useMemo(() => normalizeParticipants(rawParticipants), [rawParticipants])

  // Enriched participants for header presence
  const [headerParticipants, setHeaderParticipants] = useState<DocumentParticipant[]>([])

  // Enriched participants for cell cursor indicators
  const [cursorParticipants, setCursorParticipants] = useState<DocumentParticipant[]>([])
  const cursorAvatarFetchIdsRef = useRef<string>('')

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUserInfo = async () => {
      try {
        if (accessToken) {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          currentUserIdRef.current = payload.sub || payload.userId
          setCurrentUserName(payload.name || payload.preferred_username || 'User')

          // Fetch avatar
          if (payload.sub) {
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
  }, [accessToken, graphqlClient])

  // Fetch avatars for header presence
  useEffect(() => {
    async function fetchAvatars() {
      if (!normalizedParticipants.length || !accessToken) {
        setHeaderParticipants(prev =>
          areParticipantsEquivalent(prev, normalizedParticipants) ? prev : normalizedParticipants
        )
        return
      }

      const userIds = [...new Set(normalizedParticipants.map(p => p.userId).filter(Boolean))]
      if (userIds.length === 0) {
        setHeaderParticipants(prev =>
          areParticipantsEquivalent(prev, normalizedParticipants) ? prev : normalizedParticipants
        )
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

        const enrichedParticipants = normalizedParticipants.map(p => ({
          ...p,
          avatarUrl: avatarMap.get(p.userId) || undefined
        }))
        setHeaderParticipants(prev =>
          areParticipantsEquivalent(prev, enrichedParticipants) ? prev : enrichedParticipants
        )
      } catch (error) {
        console.error('[SpreadsheetViewerCollaboration] Failed to fetch participant avatars:', error)
        setHeaderParticipants(prev =>
          areParticipantsEquivalent(prev, normalizedParticipants) ? prev : normalizedParticipants
        )
      }
    }

    fetchAvatars()
  }, [normalizedParticipants, accessToken, graphqlClient])

  // Fetch avatars for cell cursor indicators (more robust resolution)
  useEffect(() => {
    async function fetchCursorAvatars() {
      if (!normalizedParticipants.length) {
        setCursorParticipants(prev =>
          areParticipantsEquivalent(prev, normalizedParticipants, true) ? prev : normalizedParticipants
        )
        cursorAvatarFetchIdsRef.current = ''
        return
      }

      // Update cursor state immediately from socket payload to keep remote cursor movement smooth.
      setCursorParticipants(prev => {
        const previousAvatars = new Map(prev.map(p => [p.userId, p.avatarUrl]))
        const merged = normalizedParticipants.map(p => ({
          ...p,
          avatarUrl: p.avatarUrl || previousAvatars.get(p.userId)
        }))
        return areParticipantsEquivalent(prev, merged, true) ? prev : merged
      })

      if (!accessToken) {
        return
      }

      const ids = [...new Set(normalizedParticipants.map(p => p.userId).filter(Boolean))]
      if (ids.length === 0) {
        setCursorParticipants(prev =>
          areParticipantsEquivalent(prev, normalizedParticipants, true) ? prev : normalizedParticipants
        )
        cursorAvatarFetchIdsRef.current = ''
        return
      }

      const idsKey = ids.slice().sort().join('|')
      if (cursorAvatarFetchIdsRef.current === idsKey) {
        return
      }
      cursorAvatarFetchIdsRef.current = idsKey

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

        const enriched = normalizedParticipants.map(p => ({
          ...p,
          avatarUrl: avatarMap.get(p.userId) || undefined
        }))
        setCursorParticipants(prev => (areParticipantsEquivalent(prev, enriched, true) ? prev : enriched))
      } catch (error) {
        console.error('[SpreadsheetViewerCollaboration] Failed to fetch cursor participant avatars:', error)
        setCursorParticipants(prev =>
          areParticipantsEquivalent(prev, normalizedParticipants, true) ? prev : normalizedParticipants
        )
      }
    }

    fetchCursorAvatars()
  }, [normalizedParticipants, accessToken, graphqlClient])

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
