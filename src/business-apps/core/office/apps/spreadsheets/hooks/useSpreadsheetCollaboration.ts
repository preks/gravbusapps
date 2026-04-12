// Spreadsheet-specific collaboration hook wrapping SpreadsheetCollaborationManager.
// Creates/manages a SpreadsheetCollaborationManager instance and handles avatar enrichment.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Socket } from 'socket.io-client'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { OfficeWebSocketClient } from '@/common/network/office/OfficeWebSocketClient'
import type {
  DocumentParticipant,
  DocumentOperation
} from '@/business-apps/platform/apps/shared/services/CollaborationClient'
import {
  SpreadsheetCollaborationManager,
  type CollaborationCallbacks,
  type CollaborationOperation
} from '../services/SpreadsheetCollaborationManager'

type CollaborationHealth = 'connected' | 'reconnecting' | 'failed'

type ParticipantEventData = {
  userId: string
  userName: string
  userColor: string
  socketId?: string
  avatarUrl?: string
  avatar?: string
}

type CursorEventData = {
  userId: string
  userName?: string
  userColor?: string
  position: DocumentParticipant['cursor']
}

type SelectionEventData = {
  userId: string
  userName?: string
  userColor?: string
  selection: DocumentParticipant['selection']
}

const TOKEN_REFRESH_EVENT = 'com.newwork.token.shouldRefreshAuthorizationHeader'

function safeGetLocalStorageItem(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

type TokenRefreshEventDetail = string | boolean | { accessToken?: string } | undefined

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

function addParticipantIfMissing(prev: DocumentParticipant[], data: ParticipantEventData): DocumentParticipant[] {
  if (prev.some(p => p.userId === data.userId)) return prev

  return [
    ...prev,
    {
      userId: data.userId,
      userName: data.userName,
      userColor: data.userColor,
      socketId: data.socketId,
      avatarUrl: data.avatarUrl || data.avatar,
      lastActiveAt: new Date()
    }
  ]
}

function removeParticipant(prev: DocumentParticipant[], userId: string): DocumentParticipant[] {
  return prev.filter(participant => participant.userId !== userId)
}

function updateParticipantCursor(prev: DocumentParticipant[], data: CursorEventData): DocumentParticipant[] {
  let found = false
  const next = prev.map(participant => {
    if (participant.userId !== data.userId) return participant

    found = true
    return { ...participant, cursor: data.position, lastActiveAt: new Date() }
  })

  if (found) return next

  return [
    ...next,
    {
      userId: data.userId,
      userName: data.userName || 'User',
      userColor: data.userColor || '#4ECDC4',
      socketId: '',
      cursor: data.position,
      lastActiveAt: new Date()
    }
  ]
}

function updateParticipantSelection(prev: DocumentParticipant[], data: SelectionEventData): DocumentParticipant[] {
  let found = false
  const next = prev.map(participant => {
    if (participant.userId !== data.userId) return participant

    found = true
    return { ...participant, selection: data.selection, lastActiveAt: new Date() }
  })

  if (found) return next

  return [
    ...next,
    {
      userId: data.userId,
      userName: data.userName || 'User',
      userColor: data.userColor || '#4ECDC4',
      socketId: '',
      selection: data.selection,
      lastActiveAt: new Date()
    }
  ]
}

function resolveAccessTokenFromRefreshEvent(event: Event, fallbackAccessToken: string): string {
  const eventDetail = 'detail' in event ? ((event as CustomEvent).detail as TokenRefreshEventDetail) : undefined
  if (!eventDetail) {
    return fallbackAccessToken
  }

  if (typeof eventDetail === 'string') {
    return eventDetail.trim() || fallbackAccessToken
  }

  if (typeof eventDetail === 'object' && 'accessToken' in eventDetail) {
    return String(eventDetail.accessToken ?? '').trim() || fallbackAccessToken
  }

  return fallbackAccessToken
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
  isCollaborationJoined: boolean
  collaborationHealth: CollaborationHealth
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

  const onAckFailureStable = useCallback(
    (op: DocumentOperation) => {
      manager.handleAckFailure(op)
    },
    [manager]
  )

  const clientRef = useRef<OfficeWebSocketClient | null>(null)
  const hasJoinedRef = useRef(false)
  const isJoiningRef = useRef(false)
  const joinAckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [rawParticipants, setRawParticipants] = useState<DocumentParticipant[]>([])
  const [isCollaborationConnected, setIsCollaborationConnected] = useState(false)
  const [isCollaborationJoined, setIsCollaborationJoined] = useState(false)
  const [collaborationHealth, setCollaborationHealth] = useState<CollaborationHealth>('reconnecting')
  const [socket, setSocket] = useState<Socket | null>(null)

  const clearJoinAckTimeout = useCallback(() => {
    if (joinAckTimeoutRef.current) {
      clearTimeout(joinAckTimeoutRef.current)
      joinAckTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!accessToken || !appId) {
      setRawParticipants([])
      setIsCollaborationConnected(false)
      setIsCollaborationJoined(false)
      setCollaborationHealth('reconnecting')
      setSocket(null)
      hasJoinedRef.current = false
      isJoiningRef.current = false
      clientRef.current?.disconnect()
      clientRef.current = null
      return
    }

    const client = clientRef.current ?? new OfficeWebSocketClient()
    clientRef.current = client
    client.setAccessToken(accessToken)
    setSocket(client.connect(accessToken))

    const joinRoomIfNeeded = () => {
      if (hasJoinedRef.current || isJoiningRef.current) return
      if (!client.getSocket()?.connected) return

      isJoiningRef.current = true
      clearJoinAckTimeout()
      joinAckTimeoutRef.current = setTimeout(() => {
        isJoiningRef.current = false
      }, 6000)

      client.joinDocument('spreadsheet', appId, participants => {
        const deduped = new Map<string, DocumentParticipant>()
        for (const p of participants as DocumentParticipant[]) {
          deduped.set(p.userId, {
            ...p,
            lastActiveAt: p.lastActiveAt ? new Date(p.lastActiveAt) : new Date()
          })
        }
        setRawParticipants([...deduped.values()])
        hasJoinedRef.current = true
        isJoiningRef.current = false
        setIsCollaborationJoined(true)
        clearJoinAckTimeout()
      })
    }

    const unsubscribeConnect = client.onConnect(() => {
      setIsCollaborationConnected(true)
      setCollaborationHealth('connected')
      setSocket(client.getSocket())
      joinRoomIfNeeded()
    })

    const unsubscribeDisconnect = client.onDisconnect(() => {
      setIsCollaborationConnected(false)
      setIsCollaborationJoined(false)
      setCollaborationHealth('reconnecting')
      setSocket(null)
      setRawParticipants([])
      hasJoinedRef.current = false
      isJoiningRef.current = false
      clearJoinAckTimeout()
    })

    const unsubscribeConnectError = client.onConnectError(error => {
      setCollaborationHealth(client.isHealthy() ? 'reconnecting' : 'failed')
      onErrorStable(error)
    })

    const unsubscribeUserJoined = client.onUserJoined(data => {
      setRawParticipants(prev => addParticipantIfMissing(prev, data))
    })

    const unsubscribeUserLeft = client.onUserLeft(data => {
      setRawParticipants(prev => removeParticipant(prev, data.userId))
    })

    const unsubscribeOperationApplied = client.onOperationApplied(data => {
      onOperationReceivedStable(data as CollaborationOperation)
    })

    const unsubscribeCursorUpdate = client.onCursorUpdate(data => {
      setRawParticipants(prev => updateParticipantCursor(prev, data))
    })

    const unsubscribeSelectionUpdate = client.onSelectionUpdate(data => {
      setRawParticipants(prev => updateParticipantSelection(prev, data))
    })

    if (client.getSocket()?.connected) {
      setIsCollaborationConnected(true)
      setCollaborationHealth('connected')
      setSocket(client.getSocket())
      joinRoomIfNeeded()
    }

    return () => {
      clearJoinAckTimeout()
      unsubscribeSelectionUpdate()
      unsubscribeCursorUpdate()
      unsubscribeOperationApplied()
      unsubscribeUserLeft()
      unsubscribeUserJoined()
      unsubscribeConnectError()
      unsubscribeDisconnect()
      unsubscribeConnect()

      if (hasJoinedRef.current) {
        client.leaveDocument('spreadsheet', appId)
      }
      hasJoinedRef.current = false
      isJoiningRef.current = false
      setIsCollaborationJoined(false)
      setIsCollaborationConnected(false)
      setSocket(null)
      setRawParticipants([])
      client.disconnect()
      clientRef.current = null
    }
  }, [accessToken, appId, clearJoinAckTimeout, onErrorStable, onOperationReceivedStable])

  useEffect(() => {
    if (!accessToken || typeof window === 'undefined') {
      return
    }

    const handleTokenRefresh: EventListener = event => {
      clientRef.current?.setAccessToken(resolveAccessTokenFromRefreshEvent(event, accessToken))
    }

    window.addEventListener(TOKEN_REFRESH_EVENT, handleTokenRefresh)

    return () => {
      window.removeEventListener(TOKEN_REFRESH_EVENT, handleTokenRefresh)
    }
  }, [accessToken])

  const baseEmitOperation = useCallback(
    (operation: DocumentOperation) => {
      clientRef.current?.sendDocumentOperation('spreadsheet', appId, operation, onAckFailureStable)
    },
    [appId, onAckFailureStable]
  )

  const baseEmitCursor = useCallback(
    (position: { path?: string[] }) => {
      clientRef.current?.sendCursorMove('spreadsheet', appId, position)
    },
    [appId]
  )

  const baseEmitDocumentOperationAsync = useCallback(
    (operation: DocumentOperation) => {
      if (!clientRef.current) {
        return Promise.resolve({ success: false, error: 'no_client' } as const)
      }
      return clientRef.current.sendDocumentOperationAsync('spreadsheet', appId, operation)
    },
    [appId]
  )

  // Wire emit functions into the manager
  useEffect(() => {
    manager.setEmitFunctions(baseEmitOperation, baseEmitCursor as (pos: { path?: string[] }) => void)
  }, [manager, baseEmitOperation, baseEmitCursor])

  useEffect(() => {
    manager.setDocumentOperationAsync(op => baseEmitDocumentOperationAsync(op))
    return () => manager.setDocumentOperationAsync(null)
  }, [manager, baseEmitDocumentOperationAsync])

  useEffect(() => {
    manager.setConnectionState(isCollaborationConnected, isCollaborationJoined)
  }, [manager, isCollaborationConnected, isCollaborationJoined])

  useEffect(() => {
    manager.setCurrentUserId(currentUserIdRef.current ?? null)
  }, [manager, currentUserName])

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
  const authToken = accessToken || safeGetLocalStorageItem('business-app-ide-access-token') || ''
  const graphqlClient = useGraphQLClient(authToken)

  const [headerParticipants, setHeaderParticipants] = useState<DocumentParticipant[]>([])
  const [cursorParticipants, setCursorParticipants] = useState<DocumentParticipant[]>([])

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUserInfo = async () => {
      try {
        const token = safeGetLocalStorageItem('business-app-ide-access-token') || accessToken
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
    isCollaborationJoined,
    collaborationHealth,
    socket,
    manager,
    emitOperation,
    emitCursor
  }
}
