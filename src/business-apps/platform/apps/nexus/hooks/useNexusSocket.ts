import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type {
  NexusSession,
  NexusMessage,
  NexusArtifact,
  NexusCompleteEvent,
  ArtifactStartEvent,
  ArtifactChunkEvent,
  ArtifactCompleteEvent
} from '../types/nexus.types'

const getNexusSocketConfig = () => {
  const apiUrl = getDocumentServiceApiUrl()
  const serviceUrl = apiUrl.replace(/\/api\/v1\/?$/, '')
  const urlObj = new URL(serviceUrl)
  const servicePath = urlObj.pathname

  const isLocalhost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'
  const namespaceUrl = `${urlObj.origin}/nexus`
  const socketPath = isLocalhost ? '/socket.io' : `${servicePath}/socket.io`

  return { namespaceUrl, socketPath, serviceUrl }
}

interface UseNexusSocketProps {
  userId: string
  accessToken: string
}

export const useNexusSocket = ({ userId, accessToken }: UseNexusSocketProps) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentSession, setCurrentSession] = useState<NexusSession | null>(null)
  const [messages, setMessages] = useState<NexusMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastSessionTitleUpdate, setLastSessionTitleUpdate] = useState<{
    sessionId: string
    title: string
  } | null>(null)

  // Artifact state
  const [activeArtifact, setActiveArtifact] = useState<NexusArtifact | null>(null)
  const [artifactStreaming, setArtifactStreaming] = useState(false)
  const [artifactStreamContent, setArtifactStreamContent] = useState('')

  const streamingContentRef = useRef('')
  const artifactStreamRef = useRef('')
  const pendingUserMessageRef = useRef<{
    tempId: string
    sessionId: string
    content: string
  } | null>(null)

  // ── Connect ─────────────────────────────────────────────────

  useEffect(() => {
    if (!userId || !accessToken) return

    const { namespaceUrl, socketPath, serviceUrl } = getNexusSocketConfig()

    console.log('[Nexus] Connecting...', { serviceUrl, namespaceUrl, socketPath })

    const newSocket = io(namespaceUrl, {
      path: socketPath,
      query: { userId },
      auth: { token: accessToken },
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

    // Engine-level debugging
    try {
      newSocket.io.engine.on('close', (reason: string) => {
        console.log('[Nexus] engine.close:', reason)
      })
      newSocket.io.engine.on('upgradeError', (err: unknown) => {
        console.error('[Nexus] engine.upgradeError:', err)
      })
    } catch {
      // ignore – engine hooks may not be available in some environments
    }

    newSocket.on('connect', () => {
      console.log('[Nexus] Connected', {
        id: newSocket.id,
        transport: newSocket.io.engine.transport?.name
      })
      setIsConnected(true)
      setError(null)
    })

    newSocket.on('connect_error', (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to connect to Nexus service'
      console.error('[Nexus] connect_error:', message, err)
      setIsConnected(false)
    })

    newSocket.on('disconnect', () => setIsConnected(false))

    newSocket.on('reconnect', (attemptNumber: number) => {
      console.log('[Nexus] Reconnected after', attemptNumber, 'attempts')
    })

    newSocket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('[Nexus] Reconnection attempt:', attemptNumber)
    })

    newSocket.on('reconnect_error', (err: Error) => {
      console.error('[Nexus] Reconnection error:', err.message)
    })

    newSocket.on('token', ({ token }: { token: string }) => {
      streamingContentRef.current += token
      setStreamingContent(streamingContentRef.current)
    })

    newSocket.on('artifact-start', (data: ArtifactStartEvent) => {
      setArtifactStreaming(true)
      artifactStreamRef.current = ''
      setArtifactStreamContent('')

      const initialContent =
        data.type === 'document'
          ? { markdown: '', title: data.title }
          : data.type === 'analysis'
            ? { summary: '', kpis: [], charts: [], tables: [], insights: [] }
            : { title: data.title, slides: [] }

      setActiveArtifact({
        id: data.id,
        sessionId: '',
        type: data.type,
        title: data.title,
        status: 'generating',
        content: initialContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    })

    newSocket.on('artifact-chunk', (data: ArtifactChunkEvent) => {
      artifactStreamRef.current += data.chunk
      setArtifactStreamContent(artifactStreamRef.current)
    })

    newSocket.on('artifact-complete', (data: ArtifactCompleteEvent) => {
      setArtifactStreaming(false)
      setActiveArtifact(data.artifact)
    })

    newSocket.on('complete', (data: NexusCompleteEvent) => {
      setIsStreaming(false)
      streamingContentRef.current = ''
      setStreamingContent('')

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== pendingUserMessageRef.current?.tempId)
        return [...filtered, data.userMessage, data.assistantMessage]
      })

      if (data.artifact) {
        setActiveArtifact(data.artifact)
      }

      pendingUserMessageRef.current = null
    })

    newSocket.on('session-created', ({ session }: { session: NexusSession }) => {
      setCurrentSession(session)
    })

    newSocket.on('session-updated', ({ sessionId, title }: { sessionId: string; title: string }) => {
      setCurrentSession(prev => (prev && prev.id === sessionId ? { ...prev, title } : prev))
      setLastSessionTitleUpdate({ sessionId, title })
    })

    newSocket.on('error', ({ message }: { message: string }) => {
      setError(message)
      setIsStreaming(false)
    })

    setSocket(newSocket)
    return () => {
      newSocket.disconnect()
    }
  }, [userId, accessToken])

  // ── Actions ─────────────────────────────────────────────────

  const createSession = useCallback(
    (opts?: { scope?: 'all' | 'space'; spaceId?: string; title?: string; llmProvider?: string }) => {
      if (!socket) return
      setMessages([])
      setActiveArtifact(null)
      setArtifactStreamContent('')
      socket.emit('create-session', opts || {})
    },
    [socket]
  )

  const joinSession = useCallback(
    async (sessionId: string) => {
      if (!socket) return
      setMessages([])
      setActiveArtifact(null)
      setArtifactStreamContent('')

      const result: any = await socket.emitWithAck('join', { sessionId })
      if (!result?.success) return

      const historyResult: any = await socket.emitWithAck('get-history', { sessionId })
      if (historyResult?.success) {
        setMessages(historyResult.history || [])
        // Set latest artifact if any
        const artifacts: NexusArtifact[] = historyResult.artifacts || []
        if (artifacts.length > 0) {
          setActiveArtifact(artifacts[0])
        }
      }
    },
    [socket]
  )

  const toggleDataAccess = useCallback(
    (enabled: boolean) => {
      if (!socket || !currentSession) return
      socket.emit('toggle-data-access', {
        sessionId: currentSession.id,
        enabled
      })
    },
    [socket, currentSession]
  )

  const sendMessage = useCallback(
    (message: string, opts?: { scope?: 'all' | 'space'; spaceId?: string; llmProvider?: string }) => {
      if (!socket || !currentSession) return

      setIsStreaming(true)
      streamingContentRef.current = ''
      setStreamingContent('')
      setError(null)

      // Optimistic user message
      const tempId = `temp-${Date.now()}`
      pendingUserMessageRef.current = {
        tempId,
        sessionId: currentSession.id,
        content: message
      }
      setMessages(prev => [
        ...prev,
        {
          id: tempId,
          sessionId: currentSession.id,
          role: 'user',
          content: message,
          createdAt: new Date().toISOString()
        }
      ])

      socket.emit('message', {
        sessionId: currentSession.id,
        message,
        ...opts
      })
    },
    [socket, currentSession]
  )

  return {
    isConnected,
    currentSession,
    messages,
    isStreaming,
    streamingContent,
    error,
    activeArtifact,
    artifactStreaming,
    artifactStreamContent,
    lastSessionTitleUpdate,
    createSession,
    joinSession,
    sendMessage,
    toggleDataAccess,
    setCurrentSession,
    setActiveArtifact
  }
}
