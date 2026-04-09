// Spreadsheet-specific collaboration hook wrapping SpreadsheetCollaborationManager.
// Creates/manages a SpreadsheetCollaborationManager instance and handles avatar enrichment.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Socket } from 'socket.io-client'
import { useCollaboration } from '@/business-apps/platform/apps/shared/hooks/useCollaboration'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type {
  DocumentParticipant,
  DocumentOperation
} from '@/business-apps/platform/apps/shared/services/CollaborationClient'
import {
  SpreadsheetCollaborationManager,
  type CollaborationCallbacks,
  type CollaborationOperation
} from '../services/SpreadsheetCollaborationManager'

function sameBaseParticipant(a: DocumentParticipant, b: DocumentParticipant): boolean {
  return (
    a.userId === b.userId && (a.userName || '') === (b.userName || '') && (a.avatarUrl || '') === (b.avatarUrl || '')
  )
}

function sameCursorPath(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

function areParticipantsEquivalent(a: DocumentParticipant[], b: DocumentParticipant[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!sameBaseParticipant(a[i], b[i])) return false
  }
  return true
}

function areCursorParticipantsEquivalent(a: DocumentParticipant[], b: DocumentParticipant[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (!sameBaseParticipant(a[i], b[i])) return false
    if (!sameCursorPath(a[i].cursor?.path, b[i].cursor?.path)) return false
  }
  return true
}

function safeParseJwtPayload(
  token: string
): { sub?: string; userId?: string; name?: string; preferred_username?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[1]) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    const payload = JSON.parse(json)
    return typeof payload === 'object' && payload !== null ? payload : null
  } catch {
    return null
  }
}

export interface UseSpreadsheetCollaborationProps {
  appId: string
  accessToken: string
  callbacks: CollaborationCallbacks
  onError?: (error: Error) => void
}

export interface SpreadsheetCollaborationState {
  headerParticipants: DocumentParticipant[]
  cursorParticipants: DocumentParticipant[]
  currentUserName: string
  currentUserAvatar: string | undefined
  currentUserIdRef: React.MutableRefObject<string | undefined>
  isCollaborationConnected: boolean
  socket: Socket | null
  manager: SpreadsheetCollaborationManager
  emitOperation: (operation: Omit<DocumentOperation, 'userId' | 'timestamp'>) => void
  emitCursor: (position: { line?: number; column?: number; offset?: number; path?: string[] }) => void
}

export function useSpreadsheetCollaboration({
  appId,
  accessToken,
  callbacks,
  onError
}: UseSpreadsheetCollaborationProps): SpreadsheetCollaborationState {
  const currentUserIdRef = useRef<string | undefined>(undefined)
  const [currentUserName, setCurrentUserName] = useState<string>('User')
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(undefined)

  // Stable ref for callbacks — prevents re-creating the manager on every render
  const callbacksRef = useRef(callbacks)
  useEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // Create manager once, update callbacks via ref
  const manager = useMemo(() => new SpreadsheetCollaborationManager(callbacksRef.current), [])
  useEffect(() => {
    manager.updateCallbacks(callbacksRef.current)
  })

  const onOperationReceivedStable = useCallback(
    (op: CollaborationOperation) => {
      manager.handleOperation(op as CollaborationOperation)
    },
    [manager]
  )

  const onErrorStable = useCallback((error: Error) => {
    console.error('[SpreadsheetCollaboration] Collaboration error:', error)
    onErrorRef.current?.(error)
  }, [])

  const {
    participants: rawParticipants,
    isConnected: isCollaborationConnected,
    socket,
    emitOperation: baseEmitOperation,
    emitCursor: baseEmitCursor
  } = useCollaboration({
    entityType: 'spreadsheet',
    entityId: appId,
    enabled: true,
    accessToken,
    onOperationReceived: onOperationReceivedStable,
    onError: onErrorStable
  })

  // Wire emit functions into the manager
  useEffect(() => {
    manager.setEmitFunctions(baseEmitOperation, baseEmitCursor as (pos: { path?: string[] }) => void)
  }, [manager, baseEmitOperation, baseEmitCursor])

  useEffect(() => {
    manager.setConnectionState(isCollaborationConnected, isCollaborationConnected)
  }, [manager, isCollaborationConnected])

  // Expose the manager's emitOperation (which queues if not connected)
  const emitOperation = useCallback(
    (operation: Omit<DocumentOperation, 'userId' | 'timestamp'>) => {
      manager.emitOperation(operation as DocumentOperation)
    },
    [manager]
  )

  const emitCursor = useCallback(
    (position: { line?: number; column?: number; offset?: number; path?: string[] }) => {
      if (position.path) {
        manager.emitCursor(position.path)
      }
    },
    [manager]
  )

  // Avatar enrichment — single query for both header and cursor participants
  const authToken = accessToken || localStorage.getItem('business-app-ide-access-token') || ''
  const graphqlClient = useGraphQLClient(authToken)

  const [headerParticipants, setHeaderParticipants] = useState<DocumentParticipant[]>([])
  const [cursorParticipants, setCursorParticipants] = useState<DocumentParticipant[]>([])

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUserInfo = async () => {
      try {
        const token = localStorage.getItem('business-app-ide-access-token') || accessToken
        if (!token) return
        const payload = safeParseJwtPayload(token)
        if (!payload) return
        currentUserIdRef.current = payload.sub || payload.userId
        setCurrentUserName(payload.name || payload.preferred_username || 'User')

        if (authToken && payload.sub) {
          const query = `
            query GetCurrentUserAvatar($userId: String!) {
              Employee(where: { userId: { _eq: $userId } }) {
                pictureThumbnail
              }
            }
          `
          const result = await graphqlClient.request<{ Employee: Array<{ pictureThumbnail: string | null }> }>(query, {
            userId: payload.sub
          })
          if (result.Employee?.[0]?.pictureThumbnail) {
            const thumbnail = result.Employee[0].pictureThumbnail
            const url = thumbnail.startsWith('data:') ? thumbnail : `data:image/png;base64,${thumbnail}`
            setCurrentUserAvatar(url)
          }
        }
      } catch (error) {
        console.error('[SpreadsheetCollaboration] Failed to fetch current user info:', error)
      }
    }
    fetchCurrentUserInfo()
  }, [accessToken, authToken, graphqlClient])

  // Single avatar fetch for all participants (deduplicated)
  useEffect(() => {
    async function fetchAvatars() {
      if (!rawParticipants.length || !authToken) {
        setHeaderParticipants(prev => (areParticipantsEquivalent(prev, rawParticipants) ? prev : rawParticipants))
        setCursorParticipants(prev => (areCursorParticipantsEquivalent(prev, rawParticipants) ? prev : rawParticipants))
        return
      }

      const userIds = [...new Set(rawParticipants.map(p => p.userId).filter(Boolean))]
      if (userIds.length === 0) {
        setHeaderParticipants(prev => (areParticipantsEquivalent(prev, rawParticipants) ? prev : rawParticipants))
        setCursorParticipants(prev => (areCursorParticipantsEquivalent(prev, rawParticipants) ? prev : rawParticipants))
        return
      }

      try {
        const query = `
          query GetEmployeeAvatars($userIds: [String!]!) {
            Employee(where: {userId: {_in: $userIds}}) {
              id
              userId
              pictureThumbnail
            }
          }
        `
        const result = await graphqlClient.request<{
          Employee: Array<{ id: string; userId: string; pictureThumbnail: string | null }>
        }>(query, { userIds })

        const avatarMap = new Map<string, string>()
        result?.Employee?.forEach(emp => {
          if (!emp.pictureThumbnail) return
          const avatarUrl = emp.pictureThumbnail.startsWith('data:')
            ? emp.pictureThumbnail
            : `data:image/png;base64,${emp.pictureThumbnail}`
          avatarMap.set(emp.userId, avatarUrl)
          avatarMap.set(emp.id, avatarUrl)
        })

        const enriched = rawParticipants.map(p => ({
          ...p,
          avatarUrl: avatarMap.get(p.userId) || undefined
        }))
        setHeaderParticipants(prev => (areParticipantsEquivalent(prev, enriched) ? prev : enriched))
        setCursorParticipants(prev => (areCursorParticipantsEquivalent(prev, enriched) ? prev : enriched))
      } catch (error) {
        console.error('[SpreadsheetCollaboration] Failed to fetch participant avatars:', error)
        setHeaderParticipants(prev => (areParticipantsEquivalent(prev, rawParticipants) ? prev : rawParticipants))
        setCursorParticipants(prev => (areCursorParticipantsEquivalent(prev, rawParticipants) ? prev : rawParticipants))
      }
    }

    fetchAvatars()
  }, [rawParticipants, authToken, graphqlClient])

  return {
    headerParticipants,
    cursorParticipants,
    currentUserName,
    currentUserAvatar,
    currentUserIdRef,
    isCollaborationConnected,
    socket,
    manager,
    emitOperation,
    emitCursor
  }
}
