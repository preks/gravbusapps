import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { ChatSession, ChatMessage, CreateSessionDto } from '../types/chat.types'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

type ChatSocketConfig = {
  namespaceUrl: string
  socketPath: string
  serviceUrl: string
}

/**
 * IMPORTANT (matches `CollaborationClient` setup):
 * - The Socket.IO **engine** is served under `/document/socket.io` behind the platform proxy.
 * - The Socket.IO **namespace** is served at the platform origin, e.g. `https://.../document-chat`.
 */
const getChatSocketConfig = (): ChatSocketConfig => {
  const apiUrl = getDocumentServiceApiUrl() // e.g. https://.../document/api/v1
  const serviceUrl = apiUrl.replace(/\/api\/v1\/?$/, '') // e.g. https://.../document
  const urlObj = new URL(serviceUrl)
  const servicePath = urlObj.pathname // e.g. /document

  const isLocalhost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'
  const namespaceUrl = `${urlObj.origin}/document-chat`
  const socketPath = isLocalhost ? '/socket.io' : `${servicePath}/socket.io`

  return { namespaceUrl, socketPath, serviceUrl }
}

interface UseDocumentChatProps {
  userId: string
  accessToken: string
}

export const useDocumentChat = ({ userId, accessToken }: UseDocumentChatProps) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastSessionTitleUpdate, setLastSessionTitleUpdate] = useState<{ sessionId: string; title: string } | null>(
    null
  )

  const streamingContentRef = useRef('')
  const streamingRafRef = useRef<number | null>(null)
  const pendingUserMessageRef = useRef<{ tempId: string; sessionId: string; content: string } | null>(null)

  const upsertById = (prev: ChatMessage[], next: ChatMessage): ChatMessage[] => {
    const idx = prev.findIndex(m => m.id === next.id)
    if (idx === -1) return [...prev, next]
    const copy = prev.slice()
    copy[idx] = next
    return copy
  }

  // Initialize WebSocket connection
  useEffect(() => {
    if (!userId || !accessToken) return

    const { namespaceUrl, socketPath, serviceUrl } = getChatSocketConfig()

    // High-signal connection logging (helps debug platform proxy issues)

    console.log('[DocumentChat] Connecting...', {
      serviceUrl,
      namespaceUrl,
      socketPath
    })

    const newSocket = io(namespaceUrl, {
      path: socketPath,
      query: { userId },
      auth: { token: accessToken },
      // Mirror collaboration defaults: allow polling fallback through proxies
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      upgrade: true,
      rememberUpgrade: true,
      forceNew: false
    })

    // Engine-level debugging (similar to `CollaborationClient`)
    try {
      newSocket.io.engine.on('close', (reason: string) => {
        console.log('[DocumentChat] engine.close:', reason)
      })
      newSocket.io.engine.on('upgradeError', (err: unknown) => {
        console.error('[DocumentChat] engine.upgradeError:', err)
      })
    } catch {
      // ignore – engine hooks may not be available in some environments
    }

    newSocket.on('connect', () => {
      console.log('[DocumentChat] ✅ Connected', {
        id: newSocket.id,
        transport: newSocket.io.engine.transport?.name
      })
      setIsConnected(true)
      setError(null)
    })

    newSocket.on('connect_error', (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to connect to chat service'
      console.error('Document chat connect error:', message, err)
      setIsConnected(false)
      setError(message)
    })

    newSocket.on('disconnect', (reason: string) => {
      console.log('[DocumentChat] ❌ Disconnected:', reason)
      setIsConnected(false)
    })

    newSocket.on('reconnect', (attemptNumber: number) => {
      console.log('[DocumentChat] 🔄 Reconnected after', attemptNumber, 'attempts')
    })

    newSocket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('[DocumentChat] 🔄 Reconnection attempt:', attemptNumber)
    })

    newSocket.on('reconnect_error', (err: Error) => {
      console.error('[DocumentChat] ❌ Reconnection error:', err.message)
    })

    newSocket.on('token', (data: { token: string }) => {
      streamingContentRef.current += data.token
      if (typeof window === 'undefined') {
        setStreamingContent(streamingContentRef.current)
        return
      }

      if (streamingRafRef.current !== null) return
      streamingRafRef.current = window.requestAnimationFrame(() => {
        streamingRafRef.current = null
        setStreamingContent(streamingContentRef.current)
      })
    })

    newSocket.on('complete', (data: { userMessage: ChatMessage; assistantMessage: ChatMessage }) => {
      setMessages(prev => {
        const pending = pendingUserMessageRef.current

        // Replace the optimistic temp message (prevents user message from being duplicated)
        if (pending && pending.sessionId === data.userMessage.sessionId) {
          const tempIdx = prev.findIndex(m => m.id === pending.tempId)
          pendingUserMessageRef.current = null

          if (tempIdx !== -1) {
            const next = prev.slice()
            next[tempIdx] = data.userMessage
            return upsertById(next, data.assistantMessage)
          }
        }

        // Fallback: de-duplicate by id if complete is emitted twice
        const nextWithUser = upsertById(prev, data.userMessage)
        return upsertById(nextWithUser, data.assistantMessage)
      })
      setIsStreaming(false)
      setStreamingContent('')
      streamingContentRef.current = ''
      pendingUserMessageRef.current = null
    })

    newSocket.on('session-updated', (data: { sessionId: string; title: string }) => {
      setLastSessionTitleUpdate({ sessionId: data.sessionId, title: data.title })
      setCurrentSession(prev => (prev?.id === data.sessionId ? { ...prev, title: data.title } : prev))
    })

    newSocket.on('error', (data: { message: string }) => {
      console.error('Chat error:', data.message)
      setError(data.message)
      setIsStreaming(false)
      setStreamingContent('')
      streamingContentRef.current = ''
      pendingUserMessageRef.current = null
    })

    setSocket(newSocket)

    return () => {
      if (typeof window !== 'undefined' && streamingRafRef.current !== null) {
        window.cancelAnimationFrame(streamingRafRef.current)
        streamingRafRef.current = null
      }
      newSocket.disconnect()
    }
  }, [userId, accessToken])

  // Create new session
  const createSession = useCallback(
    async (dto: CreateSessionDto = {}) => {
      if (!socket) {
        throw new Error('Socket not connected')
      }

      return new Promise<ChatSession>((resolve, reject) => {
        socket.emit(
          'create-session',
          { userId, ...dto },
          (response: { success: boolean; session?: ChatSession; error?: string }) => {
            if (response.success && response.session) {
              setCurrentSession(response.session)
              setMessages([])
              resolve(response.session)
            } else {
              reject(new Error(response.error || 'Failed to create session'))
            }
          }
        )
      })
    },
    [socket, userId]
  )

  // Join existing session
  const joinSession = useCallback(
    async (sessionId: string) => {
      if (!socket) {
        throw new Error('Socket not connected')
      }

      // Join the session room
      return new Promise<ChatSession | null>((resolve, reject) => {
        socket.emit('join', { sessionId }, (response: { success: boolean; error?: string }) => {
          if (response.success) {
            // Fetch session and history via REST API
            fetchSessionHistory(sessionId).then(result => resolve(result?.session ?? null))
          } else {
            reject(new Error(response.error || 'Failed to join session'))
          }
        })
      })
    },
    [socket]
  )

  // Fetch session history via REST API
  const fetchSessionHistory = useCallback(
    async (
      sessionId: string
    ): Promise<{
      session?: ChatSession
      history: ChatMessage[]
    } | null> => {
      const apiUrl = getDocumentServiceApiUrl()
      try {
        const response = await fetch(`${apiUrl}/chat/sessions/${sessionId}/history`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch history')
        }

        const history: ChatMessage[] = await response.json()
        setMessages(history)

        // Fetch session details
        const sessionResponse = await fetch(`${apiUrl}/chat/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        let session: ChatSession | undefined
        if (sessionResponse.ok) {
          session = await sessionResponse.json()
          setCurrentSession(session)
        }

        return { session, history }
      } catch (error) {
        console.error('Failed to fetch history:', error)
        setError('Failed to load conversation history')
        return null
      }
    },
    [accessToken]
  )

  // Send message
  const sendMessage = useCallback(
    async (message: string, options?: { scope?: 'all' | 'space'; spaceId?: string | null; llmProvider?: string }) => {
      if (!socket || !currentSession) {
        throw new Error('No active session')
      }

      setIsStreaming(true)
      setStreamingContent('')
      streamingContentRef.current = ''
      setError(null)

      // Add user message to UI immediately
      const tempId = 'temp-' + Date.now()
      const tempUserMessage: ChatMessage = {
        id: tempId,
        sessionId: currentSession.id,
        role: 'user',
        content: message,
        sources: [],
        createdAt: new Date().toISOString()
      }
      pendingUserMessageRef.current = { tempId, sessionId: currentSession.id, content: message }
      setMessages(prev => [...prev, tempUserMessage])

      socket.emit('message', {
        sessionId: currentSession.id,
        message,
        userId,
        llmProvider: options?.llmProvider,
        scope: options?.scope,
        spaceId: options?.spaceId || undefined
      })
    },
    [socket, currentSession, userId]
  )

  // Get user sessions via REST API
  const getUserSessions = useCallback(async (): Promise<ChatSession[]> => {
    const apiUrl = getDocumentServiceApiUrl()
    try {
      const response = await fetch(`${apiUrl}/chat/sessions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }

      return response.json()
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      setError('Failed to load chat sessions')
      return []
    }
  }, [accessToken])

  // Delete session
  const deleteSession = useCallback(
    async (sessionId: string) => {
      const apiUrl = getDocumentServiceApiUrl()
      try {
        const response = await fetch(`${apiUrl}/chat/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to delete session')
        }

        if (currentSession?.id === sessionId) {
          setCurrentSession(null)
          setMessages([])
        }
      } catch (error) {
        console.error('Failed to delete session:', error)
        setError('Failed to delete chat session')
      }
    },
    [accessToken, currentSession]
  )

  return {
    isConnected,
    currentSession,
    messages,
    isStreaming,
    streamingContent,
    error,
    createSession,
    joinSession,
    sendMessage,
    getUserSessions,
    deleteSession,
    lastSessionTitleUpdate
  }
}
