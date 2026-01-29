import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { ChatSession, ChatMessage, CreateSessionDto } from '../types/chat.types'

// IMPORTANT:
// - Published screens run in the platform host where `process` is not available.
// - Use Vite env vars (import.meta.env.*) to avoid `ReferenceError: process is not defined`.
// - For WebSocket connections, we need the base URL without /api/v1 suffix
const getDocumentServiceBaseUrl = (): string => {
  // Try VITE_DOCUMENT_SERVICE_URL first (for local dev with custom URL)
  const viteUrl = import.meta.env.VITE_DOCUMENT_SERVICE_URL as string | undefined
  if (viteUrl) {
    return viteUrl.replace(/\/api\/v1\/?$/, '')
  }

  // Fall back to NEXT_PUBLIC_DOCUMENT_SERVICE_URL (standard pattern)
  const nextPublicUrl = import.meta.env.NEXT_PUBLIC_DOCUMENT_SERVICE_URL as string | undefined
  if (nextPublicUrl) {
    return nextPublicUrl.replace(/\/api\/v1\/?$/, '')
  }

  // Default to localhost for local development
  return 'http://localhost:3002'
}

const DOCUMENT_SERVICE_URL = getDocumentServiceBaseUrl()

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

  const streamingContentRef = useRef('')

  // Initialize WebSocket connection
  useEffect(() => {
    if (!userId || !accessToken) return

    const newSocket = io(`${DOCUMENT_SERVICE_URL}/document-chat`, {
      query: { userId },
      auth: { token: accessToken },
      transports: ['websocket']
    })

    newSocket.on('connect', () => {
      console.log('Connected to document chat')
      setIsConnected(true)
      setError(null)
    })

    newSocket.on('connect_error', (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to connect to chat service'
      console.error('Document chat connect error:', message)
      setIsConnected(false)
      setError(message)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from document chat')
      setIsConnected(false)
    })

    newSocket.on('token', (data: { token: string }) => {
      streamingContentRef.current += data.token
      setStreamingContent(streamingContentRef.current)
    })

    newSocket.on('complete', (data: { userMessage: ChatMessage; assistantMessage: ChatMessage }) => {
      setMessages(prev => [...prev, data.userMessage, data.assistantMessage])
      setIsStreaming(false)
      setStreamingContent('')
      streamingContentRef.current = ''
    })

    newSocket.on('error', (data: { message: string }) => {
      console.error('Chat error:', data.message)
      setError(data.message)
      setIsStreaming(false)
      setStreamingContent('')
      streamingContentRef.current = ''
    })

    setSocket(newSocket)

    return () => {
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
      return new Promise<void>((resolve, reject) => {
        socket.emit('join', { sessionId }, (response: { success: boolean; error?: string }) => {
          if (response.success) {
            // Fetch session and history via REST API
            fetchSessionHistory(sessionId)
            resolve()
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
    async (sessionId: string) => {
      try {
        const response = await fetch(`${DOCUMENT_SERVICE_URL}/api/v1/chat/sessions/${sessionId}/history`, {
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
        const sessionResponse = await fetch(`${DOCUMENT_SERVICE_URL}/api/v1/chat/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        })

        if (sessionResponse.ok) {
          const session: ChatSession = await sessionResponse.json()
          setCurrentSession(session)
        }
      } catch (error) {
        console.error('Failed to fetch history:', error)
        setError('Failed to load conversation history')
      }
    },
    [accessToken]
  )

  // Send message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!socket || !currentSession) {
        throw new Error('No active session')
      }

      setIsStreaming(true)
      setStreamingContent('')
      streamingContentRef.current = ''
      setError(null)

      // Add user message to UI immediately
      const tempUserMessage: ChatMessage = {
        id: 'temp-' + Date.now(),
        sessionId: currentSession.id,
        role: 'user',
        content: message,
        sources: [],
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, tempUserMessage])

      socket.emit('message', {
        sessionId: currentSession.id,
        message,
        userId
      })
    },
    [socket, currentSession, userId]
  )

  // Get user sessions via REST API
  const getUserSessions = useCallback(async (): Promise<ChatSession[]> => {
    try {
      const response = await fetch(`${DOCUMENT_SERVICE_URL}/api/v1/chat/sessions`, {
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
      try {
        const response = await fetch(`${DOCUMENT_SERVICE_URL}/api/v1/chat/sessions/${sessionId}`, {
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
    deleteSession
  }
}
