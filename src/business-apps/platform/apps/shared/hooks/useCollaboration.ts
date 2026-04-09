import { useState, useEffect, useCallback, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import {
  CollaborationClient,
  createCollaborationClient,
  DocumentParticipant,
  DocumentOperation
} from '../services/CollaborationClient'
import { getSpreadsheetServiceApiUrl } from '../utils/spreadsheetServiceUrl'

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
  selection: DocumentParticipant['selection']
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
      socketId: data.socketId,
      avatarUrl: data.avatarUrl || data.avatar,
      lastActiveAt: new Date()
    }
  ]
}

function removeParticipant(
  prev: DocumentParticipant[],
  data: Pick<ParticipantEventData, 'userId' | 'socketId'>
): DocumentParticipant[] {
  const identity = participantIdentity({ userId: data.userId, socketId: data.socketId || '' })
  return prev.filter(p => participantIdentity(p) !== identity)
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
  let found = false
  const next = prev.map(p => {
    if (participantIdentity(p) !== identity) return p
    found = true
    return { ...p, selection: data.selection, lastActiveAt: new Date() }
  })
  if (found) return next
  return [
    ...next,
    {
      userId: data.userId,
      userName: data.userName || 'User',
      userColor: data.userColor || '#4ECDC4',
      socketId: data.socketId || '',
      selection: data.selection,
      lastActiveAt: new Date()
    }
  ]
}

export interface UseCollaborationOptions {
  entityType: 'document' | 'spreadsheet' | 'note'
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
  onError?: (error: Error) => void
}

export interface UseCollaborationReturn {
  participants: DocumentParticipant[]
  isConnected: boolean
  socket: Socket | null
  emitOperation: (operation: DocumentOperation) => void
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
  const { entityType, entityId, enabled = true, accessToken, onOperationReceived, onError } = options

  const [participants, setParticipants] = useState<DocumentParticipant[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)

  const clientRef = useRef<CollaborationClient | null>(null)
  const hasJoinedRef = useRef(false)
  const isJoiningRef = useRef(false)
  const joinAckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingOperationsRef = useRef<DocumentOperation[]>([])
  const pendingCursorRef = useRef<{ line?: number; column?: number; offset?: number; path?: string[] } | null>(null)
  const lastSentCursorRef = useRef<{ line?: number; column?: number; offset?: number; path?: string[] } | null>(null)
  const cursorReplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get auth token - prefer passed accessToken, then try localStorage
  const getAuthToken = useCallback((): string | null => {
    // Use passed accessToken first
    if (accessToken) return accessToken

    try {
      // Check IDE token
      const ideToken = localStorage.getItem('business-app-ide-access-token')
      if (ideToken) return ideToken

      // Check keycloak token
      const authData = localStorage.getItem('keycloak-token')
      if (authData) {
        try {
          const parsed = JSON.parse(authData)
          return parsed.token || parsed.access_token || null
        } catch {
          return authData
        }
      }

      // Check session storage
      const sessionToken = sessionStorage.getItem('auth_token')
      if (sessionToken) return sessionToken

      return null
    } catch {
      return null
    }
  }, [accessToken])

  // Initialize client and connect
  useEffect(() => {
    if (!enabled || !entityId) return

    pendingCursorRef.current = null
    lastSentCursorRef.current = null
    if (cursorReplayTimeoutRef.current) {
      clearTimeout(cursorReplayTimeoutRef.current)
      cursorReplayTimeoutRef.current = null
    }

    const token = getAuthToken()
    if (!token) {
      console.error('[useCollaboration] No auth token available')
      onError?.(new Error('No authentication token available'))
      return
    }

    // Create client
    const client = createCollaborationClient({
      reconnectionAttempts: 10,
      connectionTimeout: 20000,
      serviceApiUrl: entityType === 'spreadsheet' ? getSpreadsheetServiceApiUrl() : undefined
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

    const flushPendingSpreadsheetEvents = () => {
      if (entityType !== 'spreadsheet' || !client.getSocket()?.connected || !hasJoinedRef.current) return

      const pendingOps = pendingOperationsRef.current
      if (pendingOps.length > 0) {
        pendingOperationsRef.current = []
        pendingOps.forEach(op => {
          client.sendDocumentOperation(entityType, entityId, op)
        })
      }

      const pendingCursor = pendingCursorRef.current
      if (pendingCursor) {
        pendingCursorRef.current = null
        client.sendCursorMove(entityType, entityId, pendingCursor)
      }
    }

    const joinRoomIfNeeded = () => {
      if (hasJoinedRef.current || isJoiningRef.current) return
      if (!client.getSocket()?.connected) return
      isJoiningRef.current = true
      clearJoinAckTimeout()
      // Avoid getting stuck in "joining" when ack is dropped.
      joinAckTimeoutRef.current = setTimeout(() => {
        isJoiningRef.current = false
      }, 6000)
      client.joinDocument(entityType, entityId, (rawParticipants: SocketParticipant[]) => {
        setParticipants(rawParticipants.map(mapSocketParticipantToParticipant))
        hasJoinedRef.current = true
        isJoiningRef.current = false
        clearJoinAckTimeout()
        flushPendingSpreadsheetEvents()
      })
    }

    const handleConnect = () => {
      console.log('[useCollaboration] Connected to collaboration server')
      setIsConnected(true)
      joinRoomIfNeeded()
    }

    const handleDisconnect = () => {
      console.log('[useCollaboration] Disconnected from collaboration server')
      setIsConnected(false)
      setParticipants([])
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
      console.log('[useCollaboration] User joined:', data)
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
      console.log('[useCollaboration] User left:', data)
      setParticipants(prev => removeParticipant(prev, data))
    }
    client.onUserLeft(handleUserLeft)

    // Handle operation applied
    const handleOperationApplied = (data: Parameters<NonNullable<typeof onOperationReceived>>[0]) => {
      onOperationReceived?.(data)
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
      client.disconnect()
      clientRef.current = null
      setSocket(null)
    }
  }, [enabled, entityType, entityId, getAuthToken, onOperationReceived, onError])

  // Emit operation
  const emitOperation = useCallback(
    (operation: DocumentOperation) => {
      if (!clientRef.current?.isConnected()) {
        console.warn('[useCollaboration] Cannot emit operation: not connected')
        return
      }
      if (!hasJoinedRef.current && !isJoiningRef.current) {
        isJoiningRef.current = true
        if (joinAckTimeoutRef.current) {
          clearTimeout(joinAckTimeoutRef.current)
        }
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

      clientRef.current.sendDocumentOperation(entityType, entityId, operation)
    },
    [entityType, entityId]
  )

  // Emit cursor position
  const emitCursor = useCallback(
    (position: { line?: number; column?: number; offset?: number; path?: string[] }) => {
      if (entityType === 'spreadsheet') {
        pendingCursorRef.current = position
      }
      if (!clientRef.current?.isConnected()) return
      if (!hasJoinedRef.current && !isJoiningRef.current) {
        isJoiningRef.current = true
        if (joinAckTimeoutRef.current) {
          clearTimeout(joinAckTimeoutRef.current)
        }
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
        pendingCursorRef.current = position
        return
      }

      if (entityType === 'spreadsheet') {
        pendingCursorRef.current = null
        lastSentCursorRef.current = position
      }
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
    socket,
    emitOperation,
    emitCursor,
    emitSelection,
    emitTypingStart,
    emitTypingStop,
    reconnect
  }
}

export default useCollaboration
