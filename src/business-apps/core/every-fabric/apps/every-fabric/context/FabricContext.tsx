import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  ActivityEvent,
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

export const FabricProvider: React.FC<FabricProviderProps> = ({ children, accessToken, userInfo }) => {
  const { urlSessionId, updateUrl } = useSessionUrlState()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [bootstrapSession, setBootstrapSession] = useState<DeepAgentSession | null>(null)

  // Sync activeSessionId with URL on mount
  useEffect(() => {
    if (urlSessionId && urlSessionId !== activeSessionId) {
      setActiveSessionId(urlSessionId)
    }
  }, [urlSessionId])

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

  useEffect(() => {
    if (session?.session_id && bootstrapSession?.session_id === session.session_id) {
      setBootstrapSession(null)
    }
  }, [session?.session_id, bootstrapSession?.session_id])

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
      setBootstrapSession(startResponse.session)
      setActiveSessionId(sessionId)
      addSession({
        session_id: sessionId,
        input: task,
        status: startResponse.session.status,
        created_at: startResponse.session.created_at,
        updated_at: startResponse.session.updated_at,
        config: startResponse.session.config ?? config
      })
      return sessionId
    },
    [_startSession, addSession]
  )

  const selectSession = useCallback((id: string | null) => {
    setBootstrapSession(null)
    setActiveSessionId(id)
  }, [])

  const newSession = useCallback(() => {
    setBootstrapSession(null)
    setActiveSessionId(null)
  }, [])

  const deleteSession = useCallback(
    (id: string) => {
      removeSession(id)
      if (activeSessionId === id) {
        setBootstrapSession(null)
        setActiveSessionId(null)
      }
    },
    [activeSessionId, removeSession]
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
    setActiveSessionId(null)
  }, [activeSessionId, removeSession])

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
