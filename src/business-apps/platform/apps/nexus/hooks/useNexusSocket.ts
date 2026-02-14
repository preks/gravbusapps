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

  // Thinking status (e.g. "Searching the web...", "Generating document...")
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null)
  const [thinkingSources, setThinkingSources] = useState<Array<{ title: string; url: string }>>([])

  // Persisted web sources per assistant message (survives streaming → complete transition)
  const [messageWebSources, setMessageWebSources] = useState<Record<string, Array<{ title: string; url: string }>>>({})

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
      // Don't clear thinking status here — deep research sends an initial
      // token and then continues sending status updates for minutes.
      // Status is cleared by the 'complete' event or overwritten by 'status' events.
    })

    newSocket.on('status', ({ status }: { status: string }) => {
      setThinkingStatus(status)
    })

    newSocket.on('web-sources', ({ sources }: { sources: Array<{ title: string; url: string }> }) => {
      // Accumulate sources progressively — each event may carry one or more new sources.
      // Deduplicate by URL so repeated emissions don't create duplicates.
      setThinkingSources(prev => {
        const existingUrls = new Set(prev.map(s => s.url))
        const newSources = sources.filter(s => !existingUrls.has(s.url))
        return newSources.length > 0 ? [...prev, ...newSources] : prev
      })
    })

    newSocket.on('artifact-start', (data: ArtifactStartEvent) => {
      setArtifactStreaming(true)
      artifactStreamRef.current = ''
      setArtifactStreamContent('')
      // Don't clear thinking status — deep research sends artifact-start early
      // and then continues researching for minutes with status updates.

      setActiveArtifact(prev => {
        // If we already have an artifact (refinement case), keep its content visible
        // and just update the id/status so the user doesn't lose what they're looking at
        if (prev && prev.status === 'complete') {
          return {
            ...prev,
            id: data.id,
            status: 'generating' as const
          }
        }

        // New artifact — start with empty content
        const initialContent =
          data.type === 'document'
            ? { markdown: '', title: data.title }
            : data.type === 'analysis'
              ? { summary: '', kpis: [], charts: [], tables: [], insights: [], sections: [] }
              : { title: data.title, slides: [] }

        return {
          id: data.id,
          sessionId: '',
          type: data.type,
          title: data.title,
          status: 'generating' as const,
          content: initialContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    })

    newSocket.on('artifact-chunk', (data: ArtifactChunkEvent) => {
      if (data.chunkType === 'analysis-partial') {
        // Progressive analysis update: merge parsed fields into existing content
        try {
          const partial = JSON.parse(data.chunk)
          setActiveArtifact(prev => {
            if (!prev) return prev
            const prevContent = (prev.content || {}) as Record<string, unknown>
            return {
              ...prev,
              title: partial.title || prev.title,
              content: {
                summary: partial.summary || prevContent.summary || '',
                kpis: partial.kpis?.length ? partial.kpis : (prevContent.kpis as unknown[]) || [],
                charts: partial.charts?.length ? partial.charts : (prevContent.charts as unknown[]) || [],
                tables: partial.tables?.length ? partial.tables : (prevContent.tables as unknown[]) || [],
                insights: partial.insights?.length ? partial.insights : (prevContent.insights as unknown[]) || [],
                sections: partial.sections?.length ? partial.sections : (prevContent.sections as unknown[]) || []
              }
            }
          })
        } catch {
          // Partial JSON not parseable yet — skip this chunk
        }
      } else {
        artifactStreamRef.current += data.chunk
        setArtifactStreamContent(artifactStreamRef.current)
      }
    })

    newSocket.on('artifact-complete', (data: ArtifactCompleteEvent) => {
      setArtifactStreaming(false)
      setActiveArtifact(data.artifact)
    })

    newSocket.on('complete', (data: NexusCompleteEvent) => {
      setIsStreaming(false)
      setThinkingStatus(null)
      // Persist web sources for this assistant message before clearing
      setThinkingSources(prev => {
        if (prev.length > 0) {
          setMessageWebSources(map => ({ ...map, [data.assistantMessage.id]: prev }))
        }
        return []
      })
      streamingContentRef.current = ''
      setStreamingContent('')

      // Capture tempId before setMessages — the ref may be null by the time
      // React processes the state update callback (batched rendering).
      const tempId = pendingUserMessageRef.current?.tempId
      pendingUserMessageRef.current = null

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempId)
        return [...filtered, data.userMessage, data.assistantMessage]
      })

      if (data.artifact) {
        setActiveArtifact(data.artifact)
      }
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
      setThinkingStatus(null)
      setThinkingSources([])
    })

    setSocket(newSocket)
    return () => {
      newSocket.disconnect()
    }
  }, [userId, accessToken])

  // ── Actions ─────────────────────────────────────────────────

  const createSession = useCallback(
    (opts?: { scope?: 'all' | 'space' | 'none'; spaceId?: string; title?: string; llmProvider?: string }) => {
      if (!socket) return
      setMessages([])
      setMessageWebSources({})
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
      setMessageWebSources({})
      setActiveArtifact(null)
      setArtifactStreamContent('')

      const result: any = await socket.emitWithAck('join', { sessionId })
      if (!result?.success) return

      // Update current session with full data (including contextConfig)
      if (result.session) {
        setCurrentSession(result.session)
      }

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

  const toggleWebSearch = useCallback(
    (enabled: boolean) => {
      if (!socket || !currentSession) return
      socket.emit('toggle-web-search', {
        sessionId: currentSession.id,
        enabled
      })
    },
    [socket, currentSession]
  )

  const toggleDeepResearch = useCallback(
    (enabled: boolean) => {
      if (!socket || !currentSession) return
      socket.emit('toggle-deep-research', {
        sessionId: currentSession.id,
        enabled
      })
    },
    [socket, currentSession]
  )

  const sendMessage = useCallback(
    (
      message: string,
      opts?: {
        scope?: 'all' | 'space' | 'none'
        spaceId?: string
        llmProvider?: string
        dataAccessEnabled?: boolean
        webSearchEnabled?: boolean
        deepResearchEnabled?: boolean
      }
    ) => {
      if (!socket || !currentSession) return

      setIsStreaming(true)
      streamingContentRef.current = ''
      setStreamingContent('')
      setThinkingStatus(null)
      setThinkingSources([])
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
    thinkingStatus,
    thinkingSources,
    messageWebSources,
    error,
    activeArtifact,
    artifactStreaming,
    artifactStreamContent,
    lastSessionTitleUpdate,
    createSession,
    joinSession,
    sendMessage,
    toggleDataAccess,
    toggleWebSearch,
    toggleDeepResearch,
    setCurrentSession,
    setActiveArtifact
  }
}
