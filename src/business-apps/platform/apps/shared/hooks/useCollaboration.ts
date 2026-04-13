import { useState, useEffect, useCallback, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import {
  CollaborationClient,
  createCollaborationClient,
  DocumentParticipant,
  DocumentOperation
} from '../services/CollaborationClient'

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
  position: DocumentParticipant['cursor']
}
type SelectionEventData = {
  userId: string
  userName?: string
  userColor?: string
  selection: DocumentParticipant['selection']
}

function mapSocketParticipantToParticipant(p: SocketParticipant): DocumentParticipant {
  return {
    userId: (p.odId || p.userId || p.id || '') as string,
    userName: p.userName || '',
    userColor: p.userColor || '',
    socketId: p.socketId,
    avatarUrl: p.avatarUrl || p.avatar,
    cursor: p.cursor as DocumentParticipant['cursor'],
    selection: p.selection as DocumentParticipant['selection'],
    lastActiveAt: p.lastActiveAt ? new Date(p.lastActiveAt) : new Date()
  }
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
  return prev.filter(p => p.userId !== userId)
}

function updateParticipantCursor(prev: DocumentParticipant[], data: CursorEventData): DocumentParticipant[] {
  let found = false
  const next = prev.map(p => {
    if (p.userId !== data.userId) return p
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
      socketId: '',
      cursor: data.position,
      lastActiveAt: new Date()
    }
  ]
}

function updateParticipantSelection(prev: DocumentParticipant[], data: SelectionEventData): DocumentParticipant[] {
  let found = false
  const next = prev.map(p => {
    if (p.userId !== data.userId) return p
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
      socketId: '',
      selection: data.selection,
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

export interface UseCollaborationReturn {
  participants: DocumentParticipant[]
  isConnected: boolean
  hasJoined: boolean
  collaborationHealth: CollaborationHealth
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
      joinRoomIfNeeded()
    }

    const handleDisconnect = () => {
      if (isCollabDebug()) console.log('[useCollaboration] Disconnected from collaboration server')
      setIsConnected(false)
      setHasJoined(false)
      setCollaborationHealth('reconnecting')
      hasJoinedRef.current = false
      isJoiningRef.current = false
      clearJoinAckTimeout()
      setSocket(null)
    }

    // Setup event listeners
    client.getSocket()?.on('connect', handleConnect)
    client.getSocket()?.on('disconnect', handleDisconnect)
    // Avoid missing a fast initial connect before listeners are attached.
    if (client.getSocket()?.connected) {
      handleConnect()
    }

    // Handle user joined
    const handleUserJoined = (data: ParticipantEventData) => {
      if (isCollabDebug()) console.log('[useCollaboration] User joined:', data)
      setParticipants(prev => addParticipantIfMissing(prev, data))
    }
    client.onUserJoined(handleUserJoined)

    // Handle user left
    const handleUserLeft = (data: { userId: string }) => {
      if (isCollabDebug()) console.log('[useCollaboration] User left:', data)
      setParticipants(prev => removeParticipant(prev, data.userId))
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

    // Cleanup
    return () => {
      clearJoinAckTimeout()
      isJoiningRef.current = false
      if (hasJoinedRef.current) {
        client.leaveDocument(entityType, entityId)
        hasJoinedRef.current = false
      }
      setHasJoined(false)
      client.disconnect()
      clientRef.current = null
      setSocket(null)
    }
  }, [enabled, entityType, entityId, getAuthToken, onOperationReceived, onError])

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
        })
        return
      } else if (!hasJoinedRef.current) {
        return
      }
      clientRef.current.sendDocumentOperation(entityType, entityId, operation, onOperationAckFailure)
    },
    [entityType, entityId, onOperationAckFailure]
  )

  // Emit cursor position — pass-through to the socket
  const emitCursor = useCallback(
    (position: { line?: number; column?: number; offset?: number; path?: string[] }) => {
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
    emitCursor,
    emitSelection,
    emitTypingStart,
    emitTypingStop,
    reconnect
  }
}

export default useCollaboration
