import { useState, useEffect, useCallback, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import {
  CollaborationClient,
  createCollaborationClient,
  DocumentParticipant,
  DocumentOperation
} from '../services/CollaborationClient'

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

type CursorEventData = { userId: string; position: DocumentParticipant['cursor'] }
type SelectionEventData = { userId: string; selection: DocumentParticipant['selection'] }

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
  return prev.map(p => (p.userId === data.userId ? { ...p, cursor: data.position, lastActiveAt: new Date() } : p))
}

function updateParticipantSelection(prev: DocumentParticipant[], data: SelectionEventData): DocumentParticipant[] {
  return prev.map(p => (p.userId === data.userId ? { ...p, selection: data.selection, lastActiveAt: new Date() } : p))
}

export interface UseCollaborationOptions {
  entityType: 'document' | 'spreadsheet' | 'note' | 'slide'
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
      connectionTimeout: 20000
    })

    clientRef.current = client

    // Connect
    const socketInstance = client.connect(token)
    setSocket(socketInstance)

    const joinRoomIfNeeded = () => {
      if (hasJoinedRef.current) return
      client.joinDocument(entityType, entityId, (rawParticipants: SocketParticipant[]) => {
        setParticipants(rawParticipants.map(mapSocketParticipantToParticipant))
      })
      hasJoinedRef.current = true
    }

    const handleConnect = () => {
      console.log('[useCollaboration] Connected to collaboration server')
      setIsConnected(true)
      joinRoomIfNeeded()
    }

    const handleDisconnect = () => {
      console.log('[useCollaboration] Disconnected from collaboration server')
      setIsConnected(false)
      hasJoinedRef.current = false
      setSocket(null)
    }

    // Setup event listeners
    client.getSocket()?.on('connect', handleConnect)
    client.getSocket()?.on('disconnect', handleDisconnect)

    // Handle user joined
    const handleUserJoined = (data: ParticipantEventData) => {
      console.log('[useCollaboration] User joined:', data)
      setParticipants(prev => addParticipantIfMissing(prev, data))
    }
    client.onUserJoined(handleUserJoined)

    // Handle user left
    const handleUserLeft = (data: { userId: string }) => {
      console.log('[useCollaboration] User left:', data)
      setParticipants(prev => removeParticipant(prev, data.userId))
    }
    client.onUserLeft(handleUserLeft)

    // Handle operation applied
    const handleOperationApplied = (data: Parameters<NonNullable<typeof onOperationReceived>>[0]) => {
      console.log('[useCollaboration] Operation applied:', data)
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

      clientRef.current.sendDocumentOperation(entityType, entityId, operation)
    },
    [entityType, entityId]
  )

  // Emit cursor position
  const emitCursor = useCallback(
    (position: { line?: number; column?: number; offset?: number; path?: string[] }) => {
      if (!clientRef.current?.isConnected()) return

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
