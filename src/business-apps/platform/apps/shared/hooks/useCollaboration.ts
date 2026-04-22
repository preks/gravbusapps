import { useState, useEffect, useCallback, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import {
  CollaborationClient,
  createCollaborationClient,
  createSpreadsheetCollaborationClient,
  DocumentParticipant,
  DocumentOperation
} from '../services/CollaborationClient'
import { getSpreadsheetServiceApiUrl } from '../utils/spreadsheetServiceUrl'
import { useSyncClientAccessToken } from '@/common/network/useSyncClientAccessToken'

const isCollabDebug = (): boolean => {
  try {
    if (
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    )
      return true
    if (typeof localStorage !== 'undefined' && localStorage.getItem('nw-collab-debug') === 'true') return true
  } catch {
    /* SSR guard */
  }
  return false
}

type SocketParticipant = {
  odId?: string
  userId?: string
  id?: string
  userName?: string
  userColor?: string
  socketId?: string
  avatarUrl?: string
  avatar?: string
  cursor?: unknown
  selection?: unknown
  lastActiveAt?: string | number | Date
}

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
  socketId?: string
  position: DocumentParticipant['cursor']
}
type SelectionEventData = {
  userId: string
  userName?: string
  userColor?: string
  socketId?: string
  selection: DocumentParticipant['selection'] | null
}

function mapSocketParticipantToParticipant(p: SocketParticipant): DocumentParticipant {
  const socketId = (p.socketId || p.id || '') as string
  return {
    userId: (p.odId || p.userId || p.id || '') as string,
    userName: p.userName || '',
    userColor: p.userColor || '',
    socketId,
    avatarUrl: p.avatarUrl || p.avatar,
    cursor: p.cursor as DocumentParticipant['cursor'],
    selection: p.selection as DocumentParticipant['selection'],
    lastActiveAt: p.lastActiveAt ? new Date(p.lastActiveAt) : new Date()
  }
}

function participantIdentity(data: Pick<DocumentParticipant, 'userId' | 'socketId'>): string {
  return data.socketId || data.userId
}

function addParticipantIfMissing(prev: DocumentParticipant[], data: ParticipantEventData): DocumentParticipant[] {
  const identity = participantIdentity({ userId: data.userId, socketId: data.socketId || '' })
  if (prev.some(p => participantIdentity(p) === identity)) return prev
  return [
    ...prev,
    {
      userId: data.userId,
      userName: data.userName,
      userColor: data.userColor,
      socketId: data.socketId || '',
      avatarUrl: data.avatarUrl || data.avatar,
      lastActiveAt: new Date()
    }
  ]
}

function removeParticipant(
  prev: DocumentParticipant[],
  data: Pick<ParticipantEventData, 'userId' | 'socketId'>
): DocumentParticipant[] {
  if (data.socketId) {
    const identity = participantIdentity({ userId: data.userId, socketId: data.socketId })
    return prev.filter(p => participantIdentity(p) !== identity)
  }
  return prev.filter(p => p.userId !== data.userId)
}

function updateParticipantCursor(prev: DocumentParticipant[], data: CursorEventData): DocumentParticipant[] {
  const identity = participantIdentity({ userId: data.userId, socketId: data.socketId || '' })
  let found = false
  const next = prev.map(p => {
    if (participantIdentity(p) !== identity) return p
    found = true
    return { ...p, cursor: data.position, lastActiveAt: new Date() }
  })
  if (found) return next
  return [
    ...next,
    {
      userId: data.userId,
      userName: data.userName || 'User',
      userColor: data.userColor || '#4ECDC4',
      socketId: data.socketId || '',
      cursor: data.position,
      lastActiveAt: new Date()
    }
  ]
}

function updateParticipantSelection(prev: DocumentParticipant[], data: SelectionEventData): DocumentParticipant[] {
  const identity = participantIdentity({ userId: data.userId, socketId: data.socketId || '' })
  const selection = data.selection ?? undefined
  let found = false
  const next = prev.map(p => {
    if (participantIdentity(p) !== identity) return p
    found = true
    return { ...p, selection, lastActiveAt: new Date() }
  })
  if (found) return next
  return [
    ...next,
    {
      userId: data.userId,
      userName: data.userName || 'User',
      userColor: data.userColor || '#4ECDC4',
      socketId: data.socketId || '',
      selection,
      lastActiveAt: new Date()
    }
  ]
}

export interface UseCollaborationOptions {
  entityType: 'document' | 'spreadsheet' | 'note' | 'slide' | 'whiteboard' | 'presentation'
  entityId: string
  enabled?: boolean
  accessToken?: string
  onOperationReceived?: (operation: {
    userId: string
    userName: string
    operation: DocumentOperation
    version?: number
    timestamp: number
  }) => void
  onOperationAckFailure?: (operation: DocumentOperation) => void
  onError?: (error: Error) => void
}

export type CollaborationHealth = 'connected' | 'reconnecting' | 'failed'

export type DocumentOperationAckResult = { success: boolean; version?: number; error?: string }

export interface UseCollaborationReturn {
  participants: DocumentParticipant[]
  isConnected: boolean
  hasJoined: boolean
  collaborationHealth: CollaborationHealth
  socket: Socket | null
  emitOperation: (operation: DocumentOperation) => void
  emitDocumentOperationAsync: (operation: DocumentOperation) => Promise<DocumentOperationAckResult>
  emitCursor: (position: { line?: number; column?: number; offset?: number; path?: string[] }) => void
  emitSelection: (
    selection: {
      start: { line?: number; column?: number; offset?: number }
      end: { line?: number; column?: number; offset?: number }
    } | null
  ) => void
  emitTypingStart: () => void
  emitTypingStop: () => void
  reconnect: () => void
}

/**
 * React hook for real-time collaboration
 *
 * Manages WebSocket connection, presence tracking, and operation synchronization
 * for documents, spreadsheets, and notes.
 *
 * @example
 * ```tsx
 * const { participants, isConnected, emitOperation } = useCollaboration({
 *   entityType: 'spreadsheet',
 *   entityId: 'app-123',
 *   enabled: true,
 *   onOperationReceived: (op) => {
 *     // Apply remote operation to local state
 *     applyOperation(op.operation)
 *   }
 * })
 * ```
 */
export function useCollaboration(options: UseCollaborationOptions): UseCollaborationReturn {
  const {
    entityType,
    entityId,
    enabled = true,
    accessToken,
    onOperationReceived,
    onOperationAckFailure,
    onError
  } = options

  const [participants, setParticipants] = useState<DocumentParticipant[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [collaborationHealth, setCollaborationHealth] = useState<CollaborationHealth>('reconnecting')
  const [socket, setSocket] = useState<Socket | null>(null)

  const clientRef = useRef<CollaborationClient | null>(null)
  const hasJoinedRef = useRef(false)
  const isJoiningRef = useRef(false)
  const joinAckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingOperationsRef = useRef<DocumentOperation[]>([])
  const pendingCursorRef = useRef<{ line?: number; column?: number; offset?: number; path?: string[] } | null>(null)
  const lastSentCursorRef = useRef<{ line?: number; column?: number; offset?: number; path?: string[] } | null>(null)
  const cursorReplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onOperationReceivedRef = useRef(onOperationReceived)
  const onErrorRef = useRef(onError)
  onOperationReceivedRef.current = onOperationReceived
  onErrorRef.current = onError
  const accessTokenSyncClientRef = useRef<{ setAccessToken: (token: string) => void }>({
    setAccessToken: token => {
      clientRef.current?.setAccessToken(token)
    }
  })

  useSyncClientAccessToken(accessTokenSyncClientRef.current, enabled ? accessToken : undefined)

  // Match documents websocket auth semantics: realtime auth must come from the injected token.

  // Initialize client and connect
  useEffect(() => {
    if (!enabled || !entityId) return

    pendingCursorRef.current = null
    lastSentCursorRef.current = null
    if (cursorReplayTimeoutRef.current) {
      clearTimeout(cursorReplayTimeoutRef.current)
      cursorReplayTimeoutRef.current = null
    }

    const token = accessToken
    if (!token) {
      console.error('[useCollaboration] No auth token available')
      onErrorRef.current?.(new Error('No authentication token available'))
      return
    }

    // Create client
    const createClient = entityType === 'spreadsheet' ? createSpreadsheetCollaborationClient : createCollaborationClient
    const client = createClient({
      reconnectionAttempts: 10,
      connectionTimeout: 20000,
      serviceApiUrl: entityType === 'spreadsheet' ? getSpreadsheetServiceApiUrl() : undefined,
      onReconnectFailed: () => setCollaborationHealth('failed')
    })

    clientRef.current = client

    // Connect
    const socketInstance = client.connect(token)
    setSocket(socketInstance)

    const clearJoinAckTimeout = () => {
      if (joinAckTimeoutRef.current) {
        clearTimeout(joinAckTimeoutRef.current)
        joinAckTimeoutRef.current = null
      }
    }

    const joinRoomIfNeeded = () => {
      if (hasJoinedRef.current || isJoiningRef.current) return
      if (!client.getSocket()?.connected) return
      isJoiningRef.current = true
      clearJoinAckTimeout()
      joinAckTimeoutRef.current = setTimeout(() => {
        isJoiningRef.current = false
      }, 6000)
      client.joinDocument(entityType, entityId, (rawParticipants: SocketParticipant[]) => {
        setParticipants(rawParticipants.map(mapSocketParticipantToParticipant))
        hasJoinedRef.current = true
        isJoiningRef.current = false
        setHasJoined(true)
        clearJoinAckTimeout()
      })
    }

    const handleConnect = () => {
      if (isCollabDebug()) console.log('[useCollaboration] Connected to collaboration server')
      setIsConnected(true)
      setCollaborationHealth('connected')
      setSocket(client.getSocket())
      joinRoomIfNeeded()
    }

    const handleDisconnect = () => {
      if (isCollabDebug()) console.log('[useCollaboration] Disconnected from collaboration server')
      setIsConnected(false)
      setParticipants([])
      setHasJoined(false)
      setCollaborationHealth('reconnecting')
      hasJoinedRef.current = false
      isJoiningRef.current = false
      clearJoinAckTimeout()
      pendingCursorRef.current = null
      lastSentCursorRef.current = null
      if (cursorReplayTimeoutRef.current) {
        clearTimeout(cursorReplayTimeoutRef.current)
        cursorReplayTimeoutRef.current = null
      }
      setSocket(null)
    }

    // Handle user joined
    const handleUserJoined = (data: ParticipantEventData) => {
      if (isCollabDebug()) console.log('[useCollaboration] User joined:', data)
      setParticipants(prev => addParticipantIfMissing(prev, data))
      if (
        entityType === 'spreadsheet' &&
        hasJoinedRef.current &&
        client.getSocket()?.connected &&
        data.socketId !== client.getSocket()?.id
      ) {
        if (cursorReplayTimeoutRef.current) {
          clearTimeout(cursorReplayTimeoutRef.current)
        }
        cursorReplayTimeoutRef.current = setTimeout(() => {
          cursorReplayTimeoutRef.current = null
          const latestCursor = pendingCursorRef.current ?? lastSentCursorRef.current
          if (!latestCursor || !hasJoinedRef.current || !client.getSocket()?.connected) return
          client.sendCursorMove(entityType, entityId, latestCursor)
        }, 1200)
      }
    }
    client.onUserJoined(handleUserJoined)

    // Handle user left
    const handleUserLeft = (data: { userId: string; socketId?: string }) => {
      if (isCollabDebug()) console.log('[useCollaboration] User left:', data)
      setParticipants(prev => removeParticipant(prev, data))
    }
    client.onUserLeft(handleUserLeft)

    const handleParticipantsUpdated = (data: {
      entityType: 'document' | 'spreadsheet' | 'note'
      entityId: string
      participants: SocketParticipant[]
    }) => {
      if (data.entityType !== entityType || data.entityId !== entityId) return
      setParticipants(data.participants.map(mapSocketParticipantToParticipant))
    }
    client.onParticipantsUpdated(handleParticipantsUpdated)

    // Handle operation applied (read handler from ref so callback identity does not recreate the socket)
    const handleOperationApplied = (data: Parameters<NonNullable<typeof onOperationReceived>>[0]) => {
      if (isCollabDebug()) {
        console.log('[useCollaboration] operation_applied (received)', {
          opType: data.operation?.type,
          version: data.version,
          fromUserId: data.userId
        })
      }
      onOperationReceivedRef.current?.(data)
    }
    client.onOperationApplied(handleOperationApplied)

    // Handle cursor updates
    const handleCursorUpdate = (data: CursorEventData) => {
      setParticipants(prev => updateParticipantCursor(prev, data))
    }
    client.onCursorUpdate(handleCursorUpdate)

    // Handle selection updates
    const handleSelectionUpdate = (data: SelectionEventData) => {
      setParticipants(prev => updateParticipantSelection(prev, data))
    }
    client.onSelectionUpdate(handleSelectionUpdate)

    // Setup socket lifecycle listeners after collaboration listeners are ready.
    client.getSocket()?.on('connect', handleConnect)
    client.getSocket()?.on('disconnect', handleDisconnect)
    if (client.getSocket()?.connected) {
      handleConnect()
    }

    // Cleanup
    return () => {
      clearJoinAckTimeout()
      isJoiningRef.current = false
      pendingCursorRef.current = null
      lastSentCursorRef.current = null
      if (cursorReplayTimeoutRef.current) {
        clearTimeout(cursorReplayTimeoutRef.current)
        cursorReplayTimeoutRef.current = null
      }
      if (hasJoinedRef.current) {
        client.leaveDocument(entityType, entityId)
        hasJoinedRef.current = false
      }
      setHasJoined(false)
      client.disconnect()
      clientRef.current = null
      setSocket(null)
    }
  }, [accessToken, enabled, entityType, entityId])

  // Emit operation — pass-through to the socket. Queuing is handled by entity-specific
  // managers (e.g. SpreadsheetCollaborationManager) for types that need it.
  const emitOperation = useCallback(
    (operation: DocumentOperation) => {
      if (!clientRef.current?.isConnected()) {
        console.warn('[useCollaboration] Dropped operation (not connected):', operation.type)
        return
      }
      if (!hasJoinedRef.current && !isJoiningRef.current) {
        isJoiningRef.current = true
        if (joinAckTimeoutRef.current) clearTimeout(joinAckTimeoutRef.current)
        joinAckTimeoutRef.current = setTimeout(() => {
          isJoiningRef.current = false
        }, 6000)
        clientRef.current.joinDocument(entityType, entityId, () => {
          hasJoinedRef.current = true
          isJoiningRef.current = false
          if (joinAckTimeoutRef.current) {
            clearTimeout(joinAckTimeoutRef.current)
            joinAckTimeoutRef.current = null
          }
          if (entityType === 'spreadsheet' && clientRef.current?.isConnected()) {
            const pendingOps = pendingOperationsRef.current
            pendingOperationsRef.current = []
            pendingOps.forEach(op => {
              clientRef.current?.sendDocumentOperation(entityType, entityId, op)
            })
            const pendingCursor = pendingCursorRef.current
            if (pendingCursor) {
              pendingCursorRef.current = null
              lastSentCursorRef.current = pendingCursor
              clientRef.current.sendCursorMove(entityType, entityId, pendingCursor)
            }
          }
        })
      } else if (!hasJoinedRef.current && entityType === 'spreadsheet') {
        pendingOperationsRef.current.push(operation)
        if (pendingOperationsRef.current.length > 100) {
          pendingOperationsRef.current = pendingOperationsRef.current.slice(-100)
        }
        return
      }
      clientRef.current.sendDocumentOperation(entityType, entityId, operation, onOperationAckFailure)
    },
    [entityType, entityId, onOperationAckFailure]
  )

  const emitDocumentOperationAsync = useCallback(
    async (operation: DocumentOperation): Promise<DocumentOperationAckResult> => {
      const client = clientRef.current
      if (!client?.isConnected()) {
        return { success: false, error: 'not_connected' }
      }

      if (!hasJoinedRef.current) {
        if (!isJoiningRef.current) {
          isJoiningRef.current = true
          if (joinAckTimeoutRef.current) clearTimeout(joinAckTimeoutRef.current)
          joinAckTimeoutRef.current = setTimeout(() => {
            isJoiningRef.current = false
          }, 6000)
          client.joinDocument(entityType, entityId, (rawParticipants: SocketParticipant[]) => {
            setParticipants(rawParticipants.map(mapSocketParticipantToParticipant))
            hasJoinedRef.current = true
            isJoiningRef.current = false
            setHasJoined(true)
            if (joinAckTimeoutRef.current) {
              clearTimeout(joinAckTimeoutRef.current)
              joinAckTimeoutRef.current = null
            }
          })
        }
        const deadline = Date.now() + 8000
        while (Date.now() < deadline) {
          if (hasJoinedRef.current) break
          await new Promise<void>(resolve => {
            setTimeout(resolve, 40)
          })
        }
        if (!hasJoinedRef.current) {
          return { success: false, error: 'not_joined' }
        }
      }

      return client.sendDocumentOperationAsync(entityType, entityId, operation)
    },
    [entityId, entityType, setParticipants]
  )

  // Emit cursor position — pass-through to the socket
  const emitCursor = useCallback(
    (position: { line?: number; column?: number; offset?: number; path?: string[] }) => {
      if (entityType === 'spreadsheet') {
        pendingCursorRef.current = position
      }
      if (!clientRef.current?.isConnected() || !hasJoinedRef.current) return
      clientRef.current.sendCursorMove(entityType, entityId, position)
    },
    [entityType, entityId]
  )

  // Emit selection
  const emitSelection = useCallback(
    (
      selection: {
        start: { line?: number; column?: number; offset?: number }
        end: { line?: number; column?: number; offset?: number }
      } | null
    ) => {
      if (!clientRef.current?.isConnected()) return

      clientRef.current.sendSelectionChange(entityType, entityId, selection)
    },
    [entityType, entityId]
  )

  // Emit typing start
  const emitTypingStart = useCallback(() => {
    if (!clientRef.current?.isConnected()) return

    clientRef.current.sendTypingStart(entityType, entityId)
  }, [entityType, entityId])

  // Emit typing stop
  const emitTypingStop = useCallback(() => {
    if (!clientRef.current?.isConnected()) return

    clientRef.current.sendTypingStop(entityType, entityId)
  }, [entityType, entityId])

  // Force reconnect
  const reconnect = useCallback(() => {
    clientRef.current?.forceReconnect()
  }, [])

  return {
    participants,
    isConnected,
    hasJoined,
    collaborationHealth,
    socket,
    emitOperation,
    emitDocumentOperationAsync,
    emitCursor,
    emitSelection,
    emitTypingStart,
    emitTypingStop,
    reconnect
  }
}

export default useCollaboration
