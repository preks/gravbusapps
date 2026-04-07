import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ChatMessage, DeepAgentSession, SessionConfig, WorkspaceDocument } from '../types/enterpriseAgent'
import type { ActivityEvent, AgentStreamEvent } from '../types/enterpriseAgent'
import type { ArtifactFile, FabricSessionSummary, FabricTaskNode } from '../types/fabric'
import { useAgentSession } from '../hooks/useAgentSession'
import { useAgentSessions } from '../hooks/useAgentSessions'
import { useFabricArtifacts } from '../hooks/useFabricArtifacts'
import { useFabricProgress } from '../hooks/useFabricProgress'
import { useSessionUrlState } from '../hooks/useSessionUrlState'
import { deriveActivityFromEvents } from '../utils/messageUtils'

// ─── Context shape ─────────────────────────────────────────────────────────────

interface FabricContextValue {
  // Auth
  accessToken: string

  // Session list
  sessions: FabricSessionSummary[]

  // Active session
  activeSessionId: string | null
  session: DeepAgentSession | null

  // Conversation
  messages: ChatMessage[]
  events: AgentStreamEvent[]
  isStreaming: boolean
  isConnected: boolean
  isWaitingForInput: boolean

  // Activity panel
  activityEvents: ActivityEvent[]

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
  startSession: (task: string, config?: SessionConfig, activeExternalConnectionIds?: string[]) => Promise<string>
  selectSession: (id: string | null) => void
  newSession: () => void
  deleteSession: (id: string) => void
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

export const FabricProvider: React.FC<FabricProviderProps> = ({ children, accessToken }) => {
  const { urlSessionId, updateUrl } = useSessionUrlState()
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Sync activeSessionId with URL on mount
  useEffect(() => {
    if (urlSessionId && urlSessionId !== activeSessionId) {
      setActiveSessionId(urlSessionId)
    }
  }, [urlSessionId])

  // Update URL when activeSessionId changes
  useEffect(() => {
    updateUrl(activeSessionId)
  }, [activeSessionId, updateUrl])

  // Session list management
  const { sessions, addSession, updateSession, removeSession } = useAgentSessions(accessToken)

  // Active session — streaming, messages, events
  const {
    session,
    messages,
    events,
    isConnected,
    isStreaming,
    isWaitingForInput,
    startSession: _startSession,
    reply: _reply
  } = useAgentSession(activeSessionId, accessToken)

  // Keep session list in sync with live session state
  useEffect(() => {
    if (session) updateSession(session)
  }, [session, updateSession])

  // Task progress derived from session.todos + SSE events
  const { taskNodes, completedCount, totalCount, progressPercent } = useFabricProgress(session, events)

  // Artifacts
  const { artifacts, workspaceDocs, activeArtifactId, activeArtifact, setActiveArtifactId, refreshArtifacts } =
    useFabricArtifacts(activeSessionId, events, accessToken)

  // Activity events for the chronological feed
  const activityEvents = useMemo(() => deriveActivityFromEvents(events), [events])

  // ── Actions ──────────────────────────────────────────────────────────────────

  const startSession = useCallback(
    async (task: string, config?: SessionConfig, activeExternalConnectionIds?: string[]) => {
      const sessionId = await _startSession(task, config, activeExternalConnectionIds)
      setActiveSessionId(sessionId)
      addSession({
        session_id: sessionId,
        input: task,
        status: 'running',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        config
      })
      return sessionId
    },
    [_startSession, addSession]
  )

  const selectSession = useCallback((id: string | null) => {
    setActiveSessionId(id)
  }, [])

  const newSession = useCallback(() => {
    setActiveSessionId(null)
  }, [])

  const deleteSession = useCallback(
    (id: string) => {
      removeSession(id)
      if (activeSessionId === id) setActiveSessionId(null)
    },
    [activeSessionId, removeSession]
  )

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
      sessions: sessions as FabricSessionSummary[],
      activeSessionId,
      session,
      messages,
      events,
      isStreaming,
      isConnected,
      isWaitingForInput,
      activityEvents,
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
      reply,
      stopSession,
      setActiveArtifactId,
      refreshArtifacts
    }),
    [
      accessToken,
      sessions,
      activeSessionId,
      session,
      messages,
      events,
      isStreaming,
      isConnected,
      isWaitingForInput,
      activityEvents,
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
