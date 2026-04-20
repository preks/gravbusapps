import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type {
  NexusSession,
  NexusMessage,
  NexusArtifact,
  NexusHistoryAck,
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

const createInitialArtifactContent = (type: NexusArtifact['type'], title: string) => {
  if (type === 'document') {
    return { markdown: '', title }
  }

  if (type === 'analysis') {
    return { summary: '', kpis: [], charts: [], tables: [], insights: [], sections: [] }
  }

  return { title, slides: [] }
}

const mapArtifactsById = (artifacts: NexusArtifact[]) =>
  artifacts.reduce<Record<string, NexusArtifact>>((acc, artifact) => {
    acc[artifact.id] = artifact
    return acc
  }, {})

const getStreamingStatusForArtifactType = (type: NexusArtifact['type']) => {
  switch (type) {
    case 'document':
      return 'Generating document...'
    case 'analysis':
      return 'Generating analysis...'
    default:
      return 'Preparing response...'
  }
}

const getStreamingStatusForArtifact = (artifact: NexusArtifact) => getStreamingStatusForArtifactType(artifact.type)

const mergeCompletedMessages = (messages: NexusMessage[], completeEvent: NexusCompleteEvent, tempId?: string) => {
  const idsToReplace = new Set(
    [tempId, completeEvent.userMessage.id, completeEvent.assistantMessage.id].filter(Boolean)
  )
  const nextMessages = messages.filter(message => !idsToReplace.has(message.id))

  return [...nextMessages, completeEvent.userMessage, completeEvent.assistantMessage]
}

const hasPendingAssistantResponse = (history: NexusMessage[]) => {
  const latestMessage = history[history.length - 1]

  return latestMessage?.role === 'user'
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
  const [artifactsById, setArtifactsById] = useState<Record<string, NexusArtifact>>({})
  const [artifactStreaming, setArtifactStreaming] = useState(false)
  const [artifactStreamContent, setArtifactStreamContent] = useState('')

  // Thinking status (e.g. "Searching the web...", "Generating document...")
  const [thinkingStatus, setThinkingStatus] = useState<string | null>(null)
  const [thinkingSources, setThinkingSources] = useState<Array<{ title: string; url: string }>>([])

  // Persisted web sources per assistant message (survives streaming → complete transition)
  const [messageWebSources, setMessageWebSources] = useState<Record<string, Array<{ title: string; url: string }>>>({})

  const streamingContentRef = useRef('')
  const artifactStreamRef = useRef('')
  const activeArtifactRef = useRef<NexusArtifact | null>(null)
  const activeArtifactIdRef = useRef<string | null>(null)
  const artifactsByIdRef = useRef<Record<string, NexusArtifact>>({})
  const pendingArtifactIdRef = useRef<string | null>(null)
  const pendingUserMessageRef = useRef<{
    tempId: string
    sessionId: string
    content: string
  } | null>(null)

  useEffect(() => {
    activeArtifactRef.current = activeArtifact
    activeArtifactIdRef.current = activeArtifact?.id ?? null
  }, [activeArtifact])

  useEffect(() => {
    artifactsByIdRef.current = artifactsById
  }, [artifactsById])

  const resetStreamingState = useCallback(() => {
    setIsStreaming(false)
    streamingContentRef.current = ''
    setStreamingContent('')
    setThinkingStatus(null)
    setThinkingSources([])
    setError(null)
    setArtifactStreaming(false)
    artifactStreamRef.current = ''
    setArtifactStreamContent('')
    pendingArtifactIdRef.current = null
    pendingUserMessageRef.current = null
  }, [])

  const resetSessionState = useCallback(() => {
    resetStreamingState()
    activeArtifactRef.current = null
    activeArtifactIdRef.current = null
    artifactsByIdRef.current = {}
    setMessages([])
    setMessageWebSources({})
    setArtifactsById({})
    setActiveArtifact(null)
  }, [resetStreamingState])

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
      setIsStreaming(true)
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

      pendingArtifactIdRef.current = data.id

      const existingArtifact =
        (activeArtifactIdRef.current === data.id ? activeArtifactRef.current : null) ||
        artifactsByIdRef.current[data.id]

      if (existingArtifact) {
        const updatedArtifact = {
          ...existingArtifact,
          type: data.type,
          title: data.title,
          status: 'generating' as const,
          updatedAt: new Date().toISOString()
        }

        artifactsByIdRef.current = { ...artifactsByIdRef.current, [data.id]: updatedArtifact }
        activeArtifactRef.current = updatedArtifact
        activeArtifactIdRef.current = updatedArtifact.id
        setArtifactsById(prev => ({ ...prev, [data.id]: updatedArtifact }))
        setActiveArtifact(updatedArtifact)
        return
      }

      const nextArtifact: NexusArtifact = {
        id: data.id,
        sessionId: '',
        type: data.type,
        title: data.title,
        status: 'generating' as const,
        content: createInitialArtifactContent(data.type, data.title),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      artifactsByIdRef.current = { ...artifactsByIdRef.current, [data.id]: nextArtifact }
      setArtifactsById(prev => ({ ...prev, [data.id]: nextArtifact }))

      // Keep the current artifact visible until the new one has actual content.
      if (!activeArtifactRef.current) {
        activeArtifactRef.current = nextArtifact
        activeArtifactIdRef.current = nextArtifact.id
        setActiveArtifact(nextArtifact)
      }
    })

    newSocket.on('artifact-chunk', (data: ArtifactChunkEvent) => {
      if (data.chunkType === 'analysis-partial') {
        const isTrackedArtifact =
          pendingArtifactIdRef.current === data.artifactId ||
          activeArtifactIdRef.current === data.artifactId ||
          Boolean(artifactsByIdRef.current[data.artifactId])

        if (!isTrackedArtifact) {
          return
        }

        // Progressive analysis update: merge parsed fields into existing content
        try {
          const partial = JSON.parse(data.chunk)
          const baseArtifact =
            (activeArtifactIdRef.current === data.artifactId ? activeArtifactRef.current : null) ||
            artifactsByIdRef.current[data.artifactId]

          if (!baseArtifact) {
            return
          }

          const prevContent = (baseArtifact.content || {}) as unknown as Record<string, unknown>
          const updatedArtifact: NexusArtifact = {
            ...baseArtifact,
            title: partial.title || baseArtifact.title,
            status: 'generating',
            updatedAt: new Date().toISOString(),
            content: {
              summary: partial.summary || prevContent.summary || '',
              kpis: partial.kpis?.length ? partial.kpis : (prevContent.kpis as unknown[]) || [],
              charts: partial.charts?.length ? partial.charts : (prevContent.charts as unknown[]) || [],
              tables: partial.tables?.length ? partial.tables : (prevContent.tables as unknown[]) || [],
              insights: partial.insights?.length ? partial.insights : (prevContent.insights as unknown[]) || [],
              sections: partial.sections?.length ? partial.sections : (prevContent.sections as unknown[]) || []
            }
          }

          artifactsByIdRef.current = { ...artifactsByIdRef.current, [data.artifactId]: updatedArtifact }
          setArtifactsById(prev => ({ ...prev, [data.artifactId]: updatedArtifact }))

          if (
            pendingArtifactIdRef.current === data.artifactId ||
            activeArtifactIdRef.current === data.artifactId ||
            !activeArtifactRef.current
          ) {
            activeArtifactRef.current = updatedArtifact
            activeArtifactIdRef.current = updatedArtifact.id
            setActiveArtifact(updatedArtifact)
          }
        } catch {
          // Partial JSON not parseable yet — skip this chunk
        }
      } else {
        const isTrackedArtifact =
          pendingArtifactIdRef.current === data.artifactId ||
          activeArtifactIdRef.current === data.artifactId ||
          Boolean(artifactsByIdRef.current[data.artifactId])

        if (!isTrackedArtifact) {
          return
        }

        if (pendingArtifactIdRef.current === data.artifactId && activeArtifactIdRef.current !== data.artifactId) {
          const pendingArtifact = artifactsByIdRef.current[data.artifactId]
          if (pendingArtifact) {
            activeArtifactRef.current = pendingArtifact
            activeArtifactIdRef.current = pendingArtifact.id
            setActiveArtifact(pendingArtifact)
          }
        }

        artifactStreamRef.current += data.chunk
        setArtifactStreamContent(artifactStreamRef.current)
      }
    })

    newSocket.on('artifact-complete', (data: ArtifactCompleteEvent) => {
      if (pendingArtifactIdRef.current === data.artifactId) {
        pendingArtifactIdRef.current = null
      }
      setArtifactStreaming(false)
      artifactsByIdRef.current = { ...artifactsByIdRef.current, [data.artifact.id]: data.artifact }
      activeArtifactRef.current = data.artifact
      activeArtifactIdRef.current = data.artifact.id
      setActiveArtifact(data.artifact)
      setArtifactsById(prev => ({ ...prev, [data.artifact.id]: data.artifact }))
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

      setMessages(prev => mergeCompletedMessages(prev, data, tempId))

      const artifact = data.artifact
      if (artifact) {
        if (pendingArtifactIdRef.current === artifact.id) {
          pendingArtifactIdRef.current = null
        }
        artifactsByIdRef.current = { ...artifactsByIdRef.current, [artifact.id]: artifact }
        activeArtifactRef.current = artifact
        activeArtifactIdRef.current = artifact.id
        setActiveArtifact(artifact)
        setArtifactsById(prev => ({ ...prev, [artifact.id]: artifact }))
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
      resetStreamingState()
      setError(message)
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
      resetSessionState()
      socket.emit('create-session', opts || {})
    },
    [resetSessionState, socket]
  )

  const joinSession = useCallback(
    async (sessionId: string) => {
      if (!socket) return
      resetSessionState()

      const result: any = await socket.emitWithAck('join', { sessionId })
      if (!result?.success) return

      // Update current session with full data (including contextConfig)
      if (result.session) {
        setCurrentSession(result.session)
      }

      const historyResult = (await socket.emitWithAck('get-history', { sessionId })) as NexusHistoryAck
      if (historyResult?.success) {
        const history: NexusMessage[] = historyResult.history || []
        setMessages(history)
        const activeRun = historyResult.activeRun
        const pendingAssistantResponse = hasPendingAssistantResponse(history)
        // Set latest artifact if any
        const artifacts: NexusArtifact[] = historyResult.artifacts || []
        setArtifactsById(mapArtifactsById(artifacts))
        const activeRunArtifact = activeRun?.artifactId
          ? artifacts.find(artifact => artifact.id === activeRun.artifactId)
          : null
        if (artifacts.length > 0) {
          const artifactToDisplay = activeRunArtifact || artifacts[0]
          activeArtifactRef.current = artifactToDisplay
          activeArtifactIdRef.current = artifactToDisplay.id
          setActiveArtifact(artifactToDisplay)

          if (!activeRun && artifactToDisplay.status === 'generating') {
            pendingArtifactIdRef.current = artifactToDisplay.id
            setIsStreaming(true)
            setThinkingStatus(getStreamingStatusForArtifact(artifactToDisplay))
            setArtifactStreaming(true)
            streamingContentRef.current = ''
            setStreamingContent('')
          }
        }

        if (activeRun) {
          const activeRunStatus =
            activeRun.status ||
            (activeRunArtifact
              ? getStreamingStatusForArtifact(activeRunArtifact)
              : activeRun.artifactType
                ? getStreamingStatusForArtifactType(activeRun.artifactType)
                : pendingAssistantResponse
                  ? 'Preparing response...'
                  : null)

          setIsStreaming(true)
          setThinkingStatus(activeRunStatus)
          if (activeRun.artifactId) {
            pendingArtifactIdRef.current = activeRun.artifactId
            setArtifactStreaming(true)
          }
          streamingContentRef.current = ''
          setStreamingContent('')
        } else if (pendingAssistantResponse && !pendingArtifactIdRef.current) {
          setIsStreaming(true)
          setThinkingStatus('Preparing response...')
          streamingContentRef.current = ''
          setStreamingContent('')
        }
      }
    },
    [resetSessionState, socket]
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
    artifactsById,
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
