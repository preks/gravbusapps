import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  ActivityEvent,
  AgentChunkEvent,
  AgentStreamEvent,
  ChatMessage,
  DeepAgentSession,
  SessionConfig,
  WorkspaceDocument
} from '../types/enterpriseAgent'
import type { ArtifactFile, FabricSessionSummary, FabricTaskNode } from '../types/fabric'
import { useAgentSession, type ActiveSkillInfo } from '../hooks/useAgentSession'
import { useAgentSessions } from '../hooks/useAgentSessions'
import { useFabricArtifacts } from '../hooks/useFabricArtifacts'
import { useFabricProgress } from '../hooks/useFabricProgress'
import { useSessionUrlState } from '../hooks/useSessionUrlState'
import { deriveActivityFromEvents } from '../utils/messageUtils'

// ─── Context shape ─────────────────────────────────────────────────────────────

interface FabricContextValue {
  // Auth
  accessToken: string
  userInfo: BusinessAppContextProps['userInfo']

  // Session list
  sessions: FabricSessionSummary[]

  // Active session
  activeSessionId: string | null
  session: DeepAgentSession | null

  // Conversation
  messages: ChatMessage[]
  events: AgentStreamEvent[]
  streamingGreeting: string
  streamingContent: string
  streamingThinking: string
  statusHeadline: string | null
  isStreaming: boolean
  isConnected: boolean
  isWaitingForInput: boolean
  sessionLoadError: boolean

  // Activity panel
  activityEvents: ActivityEvent[]

  // Active enterprise skill
  activeSkill: ActiveSkillInfo | null

  // Task progress (right panel)
  taskNodes: FabricTaskNode[]
  completedCount: number
  totalCount: number
  progressPercent: number

  // Artifacts
  artifacts: ArtifactFile[]
  workspaceDocs: WorkspaceDocument[]
  activeArtifactId: string | null
  activeArtifact: ArtifactFile | null

  // Actions
  startSession: (
    task: string,
    config?: SessionConfig,
    activeExternalConnectionIds?: string[],
    activeEnterpriseSkillId?: string,
    fallbackSkillId?: string
  ) => Promise<string>
  selectSession: (id: string | null) => void
  newSession: () => void
  deleteSession: (id: string) => void
  retrySessionLoad: () => Promise<void>
  reply: (message?: string, structuredInput?: Record<string, any>) => Promise<void>
  stopSession: () => Promise<void>
  setActiveArtifactId: (id: string | null) => void
  refreshArtifacts: () => Promise<void>
}

// ─── Context ───────────────────────────────────────────────────────────────────

const FabricContext = createContext<FabricContextValue | null>(null)

// ─── Provider ──────────────────────────────────────────────────────────────────

export interface FabricProviderProps extends BusinessAppContextProps {
  children: React.ReactNode
}

const BOOTSTRAP_SESSION_HISTORY_KEY = 'everyFabricBootstrapSession'

function getCurrentPathSearchHash(): string {
  if (globalThis.location === undefined) return ''
  return `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`
}

function readBootstrapSessionFromHistoryState(expectedSessionId?: string | null): DeepAgentSession | null {
  if (globalThis.history === undefined) return null
  const candidate = globalThis.history.state?.[BOOTSTRAP_SESSION_HISTORY_KEY]
  if (!candidate || typeof candidate !== 'object') return null
  if (expectedSessionId && (candidate as DeepAgentSession).session_id !== expectedSessionId) return null
  return candidate as DeepAgentSession
}

function writeBootstrapSessionToHistoryState(session: DeepAgentSession | null) {
  if (globalThis.history === undefined || globalThis.location === undefined) return
  const currentState = globalThis.history.state
  const nextState = { ...(currentState !== null && currentState !== undefined ? currentState : {}) }
  if (session) {
    nextState[BOOTSTRAP_SESSION_HISTORY_KEY] = session
  } else {
    delete nextState[BOOTSTRAP_SESSION_HISTORY_KEY]
  }
  globalThis.history.replaceState(nextState, '', getCurrentPathSearchHash())
}

function createFallbackBootstrapSession(
  sessionId: string,
  task: string,
  config?: SessionConfig,
  status: DeepAgentSession['status'] = 'running'
): DeepAgentSession {
  const timestamp = new Date().toISOString()
  const initialTrace: AgentChunkEvent[] = [
    {
      type: 'agent_chunk',
      seq: 1,
      event_id: `${sessionId}:bootstrap-user`,
      role: 'human',
      content: task,
      timestamp
    }
  ]

  return {
    session_id: sessionId,
    input: task,
    status,
    config,
    created_at: timestamp,
    updated_at: timestamp,
    trace: initialTrace
  }
}

export const FabricProvider: React.FC<FabricProviderProps> = ({ children, accessToken, userInfo }) => {
  const { urlSessionId, updateUrl } = useSessionUrlState()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(urlSessionId)
  const [bootstrapSession, setBootstrapSession] = useState<DeepAgentSession | null>(() =>
    readBootstrapSessionFromHistoryState(urlSessionId)
  )
  const pendingInternalSessionIdRef = useRef<string | null | undefined>(undefined)

  // Keep activeSessionId aligned with browser history changes.
  useEffect(() => {
    const pendingInternalSessionId = pendingInternalSessionIdRef.current
    if (pendingInternalSessionId === activeSessionId && urlSessionId !== activeSessionId) {
      return
    }
    if (urlSessionId !== activeSessionId) {
      pendingInternalSessionIdRef.current = undefined
      setBootstrapSession(readBootstrapSessionFromHistoryState(urlSessionId))
      setActiveSessionId(urlSessionId)
      return
    }
    if (pendingInternalSessionId === activeSessionId) {
      pendingInternalSessionIdRef.current = undefined
    }
  }, [urlSessionId, activeSessionId])

  // Update URL when activeSessionId changes
  useEffect(() => {
    updateUrl({ sessionId: activeSessionId })
  }, [activeSessionId, updateUrl])

  // Session list management
  const { sessions, addSession, updateSession, removeSession } = useAgentSessions(accessToken)

  // Active session — streaming, messages, events
  const {
    session,
    messages,
    events,
    streamingGreeting,
    streamingContent,
    streamingThinking,
    statusHeadline,
    isConnected,
    isStreaming,
    isWaitingForInput,
    sessionLoadError,
    activeSkill,
    startSession: _startSession,
    reply: _reply,
    retrySessionLoad: _retrySessionLoad
  } = useAgentSession(activeSessionId, accessToken, bootstrapSession)

  // Keep session list in sync with live session state
  useEffect(() => {
    if (session) updateSession(session)
  }, [session, updateSession])

  // Task progress derived from session.todos + SSE events
  const { taskNodes, completedCount, totalCount, progressPercent } = useFabricProgress(session, events)

  // Artifacts - pass session for workspace_documents from REST (for completed sessions)
  const { artifacts, workspaceDocs, activeArtifactId, activeArtifact, setActiveArtifactId, refreshArtifacts } =
    useFabricArtifacts(activeSessionId, events, accessToken, session)

  // Activity events for the chronological feed
  const activityEvents = useMemo(() => deriveActivityFromEvents(events), [events])

  // ── Actions ──────────────────────────────────────────────────────────────────

  const startSession = useCallback(
    async (
      task: string,
      config?: SessionConfig,
      activeExternalConnectionIds?: string[],
      activeEnterpriseSkillId?: string,
      fallbackSkillId?: string
    ) => {
      const startResponse = await _startSession(
        task,
        config,
        activeExternalConnectionIds,
        activeEnterpriseSkillId,
        fallbackSkillId
      )
      const sessionId = startResponse.session_id
      const bootstrap =
        startResponse.session ??
        createFallbackBootstrapSession(sessionId, task, config, startResponse.status ?? 'running')
      setBootstrapSession(bootstrap)
      writeBootstrapSessionToHistoryState(bootstrap)
      pendingInternalSessionIdRef.current = sessionId === urlSessionId ? undefined : sessionId
      setActiveSessionId(sessionId)
      addSession({
        session_id: sessionId,
        input: task,
        status: bootstrap.status,
        created_at: bootstrap.created_at,
        updated_at: bootstrap.updated_at,
        config: bootstrap.config ?? config
      })
      return sessionId
    },
    [_startSession, addSession, urlSessionId]
  )

  const selectSession = useCallback(
    (id: string | null) => {
      setBootstrapSession(null)
      writeBootstrapSessionToHistoryState(null)
      pendingInternalSessionIdRef.current = id === urlSessionId ? undefined : id
      setActiveSessionId(id)
    },
    [urlSessionId]
  )

  const newSession = useCallback(() => {
    setBootstrapSession(null)
    writeBootstrapSessionToHistoryState(null)
    pendingInternalSessionIdRef.current = null === urlSessionId ? undefined : null
    setActiveSessionId(null)
  }, [urlSessionId])

  const deleteSession = useCallback(
    (id: string) => {
      removeSession(id)
      if (activeSessionId === id) {
        setBootstrapSession(null)
        writeBootstrapSessionToHistoryState(null)
        pendingInternalSessionIdRef.current = null === urlSessionId ? undefined : null
        setActiveSessionId(null)
      }
    },
    [activeSessionId, removeSession, urlSessionId]
  )

  const retrySessionLoad = useCallback(async () => {
    await _retrySessionLoad()
  }, [_retrySessionLoad])

  const reply = useCallback(
    async (message?: string, structuredInput?: Record<string, any>) => {
      await _reply(message, structuredInput)
    },
    [_reply]
  )

  const stopSession = useCallback(async () => {
    if (!activeSessionId) return
    await removeSession(activeSessionId)
    pendingInternalSessionIdRef.current = null === urlSessionId ? undefined : null
    writeBootstrapSessionToHistoryState(null)
    setActiveSessionId(null)
  }, [activeSessionId, removeSession, urlSessionId])

  // ── Value ─────────────────────────────────────────────────────────────────────

  const value = useMemo(
    (): FabricContextValue => ({
      accessToken,
      userInfo,
      sessions: sessions as FabricSessionSummary[],
      activeSessionId,
      session,
      messages,
      events,
      streamingGreeting,
      streamingContent,
      streamingThinking,
      statusHeadline,
      isStreaming,
      isConnected,
      isWaitingForInput,
      sessionLoadError,
      activityEvents,
      activeSkill,
      taskNodes,
      completedCount,
      totalCount,
      progressPercent,
      artifacts,
      workspaceDocs,
      activeArtifactId,
      activeArtifact,
      startSession,
      selectSession,
      newSession,
      deleteSession,
      retrySessionLoad,
      reply,
      stopSession,
      setActiveArtifactId,
      refreshArtifacts
    }),
    [
      accessToken,
      userInfo,
      sessions,
      activeSessionId,
      session,
      messages,
      events,
      streamingGreeting,
      streamingContent,
      streamingThinking,
      statusHeadline,
      isStreaming,
      isConnected,
      isWaitingForInput,
      sessionLoadError,
      activityEvents,
      activeSkill,
      taskNodes,
      completedCount,
      totalCount,
      progressPercent,
      artifacts,
      workspaceDocs,
      activeArtifactId,
      activeArtifact,
      startSession,
      selectSession,
      newSession,
      deleteSession,
      retrySessionLoad,
      reply,
      stopSession,
      setActiveArtifactId,
      refreshArtifacts
    ]
  )

  return <FabricContext.Provider value={value}>{children}</FabricContext.Provider>
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useFabric = (): FabricContextValue => {
  const ctx = useContext(FabricContext)
  if (!ctx) {
    throw new Error('useFabric must be used inside <FabricProvider>')
  }
  return ctx
}
