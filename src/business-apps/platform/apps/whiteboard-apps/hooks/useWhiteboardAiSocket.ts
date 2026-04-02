import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { getDocumentServiceApiUrl } from '../../shared/utils/documentServiceUrl'

export interface WhiteboardAiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{ name: string; arguments: string }>
  timestamp: number
}

interface UseWhiteboardAiSocketOptions {
  whiteboardId: string
  accessToken: string
  enabled?: boolean
}

const ACTION_VERBS = /^(draw|create|add|make|build|design|generate|sketch|paint|render|show|put|place|insert)\s+/i
const FILLER = /^(a|an|the|me|some|my)\s+/i

function deriveTitle(message: string): string {
  let title = message.trim()
  title = title.replace(ACTION_VERBS, '')
  title = title.replace(FILLER, '')
  const firstSentence = title.split(/[.!?\n]/)[0].trim()
  const capped = firstSentence.length > 40 ? firstSentence.slice(0, 40).replace(/\s\S*$/, '…') : firstSentence
  return capped.charAt(0).toUpperCase() + capped.slice(1)
}

function getSocketConfig() {
  const apiUrl = getDocumentServiceApiUrl()
  const serviceUrl = apiUrl.replace(/\/api\/v1\/?$/, '')
  const urlObj = new URL(serviceUrl)
  const servicePath = urlObj.pathname
  const namespaceUrl = `${urlObj.origin}/whiteboard-ai`
  const isLocal = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(urlObj.hostname)
  const socketPath = isLocal ? '/socket.io' : `${servicePath}/socket.io`
  return { namespaceUrl, socketPath }
}

export function useWhiteboardAiSocket({ whiteboardId, accessToken, enabled = true }: UseWhiteboardAiSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [messages, setMessages] = useState<WhiteboardAiMessage[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const streamingContentRef = useRef('')
  const pendingToolCallsRef = useRef<Array<{ name: string; arguments: string }>>([])
  const onToolCallRef = useRef<((toolCall: { name: string; arguments: string }) => void) | null>(null)
  const msgIdCounter = useRef(0)

  useEffect(() => {
    if (!enabled || !accessToken || !whiteboardId) return

    const { namespaceUrl, socketPath } = getSocketConfig()
    const socket = io(namespaceUrl, {
      path: socketPath,
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[WhiteboardAI] Connected to', namespaceUrl)
      setIsConnected(true)
      socket.emit('join', { whiteboardId }, (ack: unknown) => {
        console.log('[WhiteboardAI] Join ack:', ack)
      })
    })

    socket.on('connect_error', (err: Error) => {
      console.error('[WhiteboardAI] Connection error:', err.message)
    })

    socket.on('disconnect', (reason: string) => {
      console.log('[WhiteboardAI] Disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('token', (data: { token: string }) => {
      streamingContentRef.current += data.token
      setStreamingContent(streamingContentRef.current)
    })

    socket.on('status', (data: { status: string }) => {
      setStatus(data.status)
    })

    socket.on('tool-call', (data: { name: string; arguments: string }) => {
      console.log('[WhiteboardAI] Tool call received:', data.name)
      pendingToolCallsRef.current.push(data)
      onToolCallRef.current?.(data)
    })

    socket.on('session-title', (data: { title: string }) => {
      if (data.title) setSessionTitle(data.title)
    })

    socket.on(
      'complete',
      (data: {
        assistantText: string
        toolCalls: Array<{ name: string; arguments: string }>
        sessionTitle?: string
      }) => {
        if (data.sessionTitle) setSessionTitle(data.sessionTitle)
        const assistantMessage: WhiteboardAiMessage = {
          id: `msg-${++msgIdCounter.current}`,
          role: 'assistant',
          content: data.assistantText || streamingContentRef.current,
          toolCalls:
            data.toolCalls.length > 0
              ? data.toolCalls
              : pendingToolCallsRef.current.length > 0
                ? pendingToolCallsRef.current
                : undefined,
          timestamp: Date.now()
        }

        setMessages(prev => [...prev, assistantMessage])
        setIsStreaming(false)
        setStreamingContent('')
        setStatus(null)
        streamingContentRef.current = ''
        pendingToolCallsRef.current = []
      }
    )

    socket.on('error', (data: { message: string }) => {
      console.error('[WhiteboardAI] Socket error:', data.message)
      const errorMessage: WhiteboardAiMessage = {
        id: `msg-${++msgIdCounter.current}`,
        role: 'assistant',
        content: `Sorry, something went wrong: ${data.message}. Please try again.`,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsStreaming(false)
      setStreamingContent('')
      setStatus(null)
      streamingContentRef.current = ''
      pendingToolCallsRef.current = []
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [whiteboardId, accessToken, enabled])

  const sendMessage = useCallback(
    (message: string, sceneContext?: string) => {
      if (!socketRef.current || !whiteboardId) return

      setSessionTitle(prev => prev ?? deriveTitle(message))

      const userMessage: WhiteboardAiMessage = {
        id: `msg-${++msgIdCounter.current}`,
        role: 'user',
        content: message,
        timestamp: Date.now()
      }

      setMessages(prev => [...prev, userMessage])
      setIsStreaming(true)
      setStreamingContent('')
      streamingContentRef.current = ''
      pendingToolCallsRef.current = []

      socketRef.current.emit('message', {
        whiteboardId,
        message,
        sceneContext
      })
    },
    [whiteboardId]
  )

  const clearHistory = useCallback(() => {
    if (!socketRef.current || !whiteboardId) return
    socketRef.current.emit('clear-history', { whiteboardId })
    setMessages([])
    setSessionTitle(null)
  }, [whiteboardId])

  const setOnToolCall = useCallback((handler: (toolCall: { name: string; arguments: string }) => void) => {
    onToolCallRef.current = handler
  }, [])

  return {
    isConnected,
    isStreaming,
    messages,
    streamingContent,
    status,
    sessionTitle,
    sendMessage,
    clearHistory,
    setOnToolCall
  }
}
