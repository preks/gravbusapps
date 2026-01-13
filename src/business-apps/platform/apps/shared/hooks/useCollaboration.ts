import { useState, useEffect, useCallback, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import {
  CollaborationClient,
  createCollaborationClient,
  DocumentParticipant,
  DocumentOperation
} from '../services/CollaborationClient'

export interface UseCollaborationOptions {
  entityType: 'document' | 'spreadsheet' | 'note'
  entityId: string
  enabled?: boolean
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
  const { entityType, entityId, enabled = true, onOperationReceived, onError } = options

  const [participants, setParticipants] = useState<DocumentParticipant[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)

  const clientRef = useRef<CollaborationClient | null>(null)
  const hasJoinedRef = useRef(false)

  // Get auth token
  const getAuthToken = useCallback((): string | null => {
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
  }, [])

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

    // Setup event listeners
    client.getSocket()?.on('connect', () => {
      console.log('[useCollaboration] Connected to collaboration server')
      setIsConnected(true)

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCollaboration.ts:connect',message:'Socket connected, about to join',data:{entityType,entityId,hasJoined:hasJoinedRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCollaboration.ts:connect:meta',message:'Socket connected meta',data:{entityType,entityId,hasJoined:hasJoinedRef.current,socketId:client.getSocket()?.id,transport:client.getSocket()?.io?.engine?.transport?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'R1'})}).catch(()=>{});
      // #endregion

      // Join document room
      if (!hasJoinedRef.current) {
        client.joinDocument(entityType, entityId, (participants) => {
          // Set initial participants from join callback
          console.log('[useCollaboration] Setting initial participants from join callback:', participants)
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCollaboration.ts:join_callback',message:'Processing initial participants',data:{participantsCount:participants.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          setParticipants(
            participants.map((p: any) => ({
              userId: p.odId || p.userId || p.id,
              userName: p.userName,
              userColor: p.userColor,
              socketId: p.socketId,
              cursor: p.cursor,
              selection: p.selection,
              lastActiveAt: new Date(p.lastActiveAt)
            }))
          )
        })
        hasJoinedRef.current = true
      }
    })

    client.getSocket()?.on('disconnect', reason => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCollaboration.ts:disconnect',message:'Socket disconnected',data:{entityType,entityId,reason,socketId:client.getSocket()?.id,hasJoinedBeforeReset:hasJoinedRef.current},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'R2'})}).catch(()=>{});
      // #endregion
      console.log('[useCollaboration] Disconnected from collaboration server')
      setIsConnected(false)
      hasJoinedRef.current = false
      setSocket(null)
    })

    // Handle user joined
    client.onUserJoined(data => {
      console.log('[useCollaboration] User joined:', data)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCollaboration.ts:onUserJoined',message:'Received user_joined event',data:{userId:data.userId,userName:data.userName},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      setParticipants(prev => {
        // Check if user already exists
        if (prev.some(p => p.userId === data.userId)) {
          return prev
        }
        return [
          ...prev,
          {
            userId: data.userId,
            userName: data.userName,
            userColor: data.userColor,
            socketId: data.socketId,
            lastActiveAt: new Date()
          }
        ]
      })
    })

    // Handle user left
    client.onUserLeft(data => {
      console.log('[useCollaboration] User left:', data)
      setParticipants(prev => prev.filter(p => p.userId !== data.userId))
    })

    // Handle operation applied
    client.onOperationApplied(data => {
      console.log('[useCollaboration] Operation applied:', data)
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCollaboration.ts:onOperationApplied',message:'Received operation_applied event',data:{operationType:data.operation.type,userId:data.userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      onOperationReceived?.(data)
    })

    // Handle cursor updates
    client.onCursorUpdate(data => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCollaboration.ts:onCursorUpdate',message:'Received cursor_update event',data:{userId:data.userId,position:data.position},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      setParticipants(prev => {
        const updated = prev.map(p => (p.userId === data.userId ? { ...p, cursor: data.position, lastActiveAt: new Date() } : p))
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useCollaboration.ts:onCursorUpdate:updated',message:'Updated participants with cursor',data:{userId:data.userId,participantsCount:updated.length,foundUser:updated.some(p=>p.userId===data.userId)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        return updated
      })
    })

    // Handle selection updates
    client.onSelectionUpdate(data => {
      setParticipants(prev =>
        prev.map(p => (p.userId === data.userId ? { ...p, selection: data.selection, lastActiveAt: new Date() } : p))
      )
    })

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
