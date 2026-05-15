import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  ActivityEvent,
  AgentChunkEvent,
  AgentStreamEvent,
  ChatMessage,
  DeepAgentSession,
  MessageAttachmentRef,
  PendingComposerAttachment,
  ReasoningEffort,
  SessionAttachment,
  SessionConfig,
  WorkspaceDocument
} from '../types/enterpriseAgent'
import { useSessionAttachments } from '../hooks/useSessionAttachments'
import type { ArtifactFile, FabricSessionSummary, FabricTaskNode } from '../types/fabric'
import { useAgentSession, type ActiveSkillInfo } from '../hooks/useAgentSession'
import { useAgentSessions } from '../hooks/useAgentSessions'
import { useArtifactPreview, type ArtifactPreview } from '../hooks/useArtifactPreview'
import { useFabricArtifacts } from '../hooks/useFabricArtifacts'
import { useFabricDecisions, type DecisionItem } from '../hooks/useFabricDecisions'
import { useFabricPlan } from '../hooks/useFabricPlan'
import { useFabricSkills, type ActiveFabricSkill } from '../hooks/useFabricSkills'
import { useEnterpriseAgentClient } from '../hooks/useEnterpriseAgentClient'
import { useModelOptions } from '../hooks/useModelOptions'
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

  // Decisions panel (discrete agent branch points)
  decisions: DecisionItem[]

  // Active enterprise skill (initial skill auto-detected by the agent at session start)
  activeSkill: ActiveSkillInfo | null

  // Skills loaded by the agent during this session (via `skill_load` tool + `skill_loaded` events).
  // `fabricActiveSkill` is the most recently loaded one; `loadedSkills` is the full set.
  fabricActiveSkill: ActiveFabricSkill | null
  loadedSkills: ActiveFabricSkill[]
  /** Lookup used by the Activity panel to attach a skill badge to `skill_load` rows. */
  skillIdByStepId: Map<string, string>

  // Active connectors for the session (persisted from session start)
  sessionConnectorIds: string[]

  // Plan panel (right rail) — todo list only
  taskNodes: FabricTaskNode[]
  hasPlan: boolean
  completedCount: number
  totalCount: number
  progressPercent: number
  /** First in-progress (or next pending) todo text; used as a status fallback. */
  currentTodoText: string | null

  // Artifacts
  artifacts: ArtifactFile[]
  workspaceDocs: WorkspaceDocument[]
  activeArtifactId: string | null
  activeArtifact: ArtifactFile | null

  // Live artifact previews (real-time from SSE during generation)
  artifactPreviews: ArtifactPreview[]
  latestPreview: ArtifactPreview | null
  hasActivePreview: boolean

  // Model selector
  modelOptions: import('../types/enterpriseAgent').ModelOption[]
  defaultModelId: string
  defaultReasoningEffort: import('../types/enterpriseAgent').ReasoningEffort
  selectedModelId: string
  selectedReasoningEffort: import('../types/enterpriseAgent').ReasoningEffort
  isLoadingModels: boolean
  setModelSelection: (modelId: string, effort: import('../types/enterpriseAgent').ReasoningEffort) => void

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

  // Session attachments (RAG over composer uploads). Staged files survive the
  // landing -> workspace transition because the hook lives in the provider.
  sessionAttachments: SessionAttachment[]
  pendingSessionAttachments: PendingComposerAttachment[]
  uploadSessionAttachment: (file: File) => Promise<SessionAttachment | null>
  removeSessionAttachment: (id: string) => Promise<void>
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

/**
 * Take the current attachment set from FabricContext (server-confirmed +
 * still-pending) and project it down to the minimal MessageAttachmentRef
 * shape we attach to the optimistic `user_input` ChatMessage. We include
 * pending ones too — the chip already exists in the composer, so dropping
 * it off the user's bubble would feel jumpy. Newly-staged-during-send is
 * not a real concern because this is called synchronously before the
 * server round-trip.
 */
function snapshotAttachmentsForMessage(
  attachments: SessionAttachment[],
  pending: PendingComposerAttachment[]
): MessageAttachmentRef[] {
  const refs: MessageAttachmentRef[] = []

  for (const a of attachments) {
    refs.push({
      id: a.id,
      name: a.name,
      mime_type: a.mime_type,
      size: a.size,
      indexing_status: a.indexing_status,
      preview_url: a.preview_url
    })
  }
  for (const p of pending) {
    if (p.attachment) {
      refs.push({
        id: p.attachment.id,
        name: p.attachment.name,
        mime_type: p.attachment.mime_type,
        size: p.attachment.size,
        indexing_status: p.attachment.indexing_status,
        preview_url: p.preview_url ?? p.attachment.preview_url
      })
      continue
    }
    refs.push({
      id: p.client_id,
      name: p.name,
      mime_type: p.mime_type,
      size: p.size,
      indexing_status: p.state === 'failed' ? 'failed' : 'pending',
      preview_url: p.preview_url
    })
  }
  const seen = new Set<string>()
  const dedupedRefs = refs.filter(ref => {
    if (seen.has(ref.id)) return false
    seen.add(ref.id)
    return true
  })
  return dedupedRefs
}

type PreviewAttachmentRef = Pick<MessageAttachmentRef, 'id' | 'name' | 'mime_type' | 'size' | 'preview_url'>

function attachmentSignature(att: Pick<MessageAttachmentRef, 'name' | 'mime_type' | 'size'>): string {
  return `${att.name}\u0000${att.size}\u0000${att.mime_type}`
}

function buildPreviewLookup(refs: PreviewAttachmentRef[]) {
  const byId = new Map<string, string>()
  const bySignature = new Map<string, string>()
  const duplicateSignatures = new Set<string>()

  for (const ref of refs) {
    if (!ref.preview_url) continue
    byId.set(ref.id, ref.preview_url)

    const signature = attachmentSignature(ref)
    if (bySignature.has(signature)) {
      duplicateSignatures.add(signature)
      bySignature.delete(signature)
      continue
    }
    if (!duplicateSignatures.has(signature)) {
      bySignature.set(signature, ref.preview_url)
    }
  }

  return { byId, bySignature }
}

function resolvePreviewUrl(
  att: Pick<MessageAttachmentRef, 'id' | 'name' | 'mime_type' | 'size'>,
  lookup: ReturnType<typeof buildPreviewLookup>
): string | undefined {
  return lookup.byId.get(att.id) ?? lookup.bySignature.get(attachmentSignature(att))
}

function mergePreviewUrlsIntoAttachments(
  serverAttachments: Array<SessionAttachment | MessageAttachmentRef> | undefined,
  bootstrapAttachments: Array<SessionAttachment | MessageAttachmentRef> | undefined
): Array<SessionAttachment | MessageAttachmentRef> | undefined {
  if (!serverAttachments || serverAttachments.length === 0) return bootstrapAttachments

  const refsWithPreview = (bootstrapAttachments ?? []).filter(
    (att): att is PreviewAttachmentRef => !!(att as { preview_url?: string }).preview_url
  )
  if (refsWithPreview.length === 0) return serverAttachments

  const lookup = buildPreviewLookup(refsWithPreview)
  return serverAttachments.map(att => {
    if ((att as { preview_url?: string }).preview_url) return att
    const previewUrl = resolvePreviewUrl(att, lookup)
    return previewUrl ? { ...att, preview_url: previewUrl } : att
  })
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
  const [sessionConnectorIds, setSessionConnectorIds] = useState<string[]>([])

  // Model selection state — loaded once per app session from the backend catalog.
  const {
    models: modelOptions,
    defaultModelId,
    defaultReasoningEffort,
    isLoading: isLoadingModels
  } = useModelOptions(accessToken)

  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [selectedReasoningEffort, setSelectedReasoningEffort] = useState<ReasoningEffort>('none')

  // Once defaults are loaded, hydrate from defaults (only runs once).
  const defaultsHydratedRef = useRef(false)
  useEffect(() => {
    if (!isLoadingModels && modelOptions.length > 0 && !defaultsHydratedRef.current) {
      defaultsHydratedRef.current = true
      if (!selectedModelId) {
        setSelectedModelId(defaultModelId)
        setSelectedReasoningEffort(defaultReasoningEffort)
      }
    }
  }, [isLoadingModels, modelOptions, defaultModelId, defaultReasoningEffort, selectedModelId])

  const enterpriseClient = useEnterpriseAgentClient(accessToken)

  const setModelSelection = useCallback(
    (modelId: string, effort: ReasoningEffort) => {
      setSelectedModelId(modelId)
      setSelectedReasoningEffort(effort)
      // If there is an active session, persist the new selection immediately so
      // the backend uses the updated model on the next turn.
      if (activeSessionId) {
        enterpriseClient.updateSessionConfig(activeSessionId, modelId, effort).catch((err: unknown) => {
          console.warn('[FabricContext] Failed to persist session model config:', err)
        })
      }
    },
    [activeSessionId, enterpriseClient]
  )

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
    activateSession: _activateSession,
    reply: _reply,
    retrySessionLoad: _retrySessionLoad
  } = useAgentSession(activeSessionId, accessToken, bootstrapSession)

  // Keep session list in sync with live session state
  useEffect(() => {
    if (session) updateSession(session)
  }, [session, updateSession])

  // Sync session connector IDs from loaded session (for page refreshes / session switching)
  useEffect(() => {
    if (session?.active_external_connection_ids) {
      setSessionConnectorIds(session.active_external_connection_ids)
    }
  }, [session?.active_external_connection_ids])

  // Plan panel — todo list derived from session.todos + SSE todo tools
  const { taskNodes, hasPlan, completedCount, totalCount, progressPercent, currentTodoText } = useFabricPlan(
    session,
    events
  )

  // Artifacts - pass session for workspace_documents from REST (for completed sessions)
  const { artifacts, workspaceDocs, activeArtifactId, activeArtifact, setActiveArtifactId, refreshArtifacts } =
    useFabricArtifacts(activeSessionId, events, accessToken, session)

  // Activity events for the chronological feed (tools + delegations)
  const activityEvents = useMemo(() => deriveActivityFromEvents(events), [events])

  // Decisions panel — discrete agent branch points (skill, reflection, HITL, …)
  const decisions = useFabricDecisions(events)

  // Skills — parsed from `skill_load` tool calls and `skill_loaded` events.
  const { activeSkill: fabricActiveSkill, loadedSkills, skillIdByStepId } = useFabricSkills(events)

  // Merge SSE events with session trace for completed sessions (trace has preview events too)
  const previewSourceEvents = useMemo((): AgentStreamEvent[] => {
    if (events.length > 0) return events
    return (session?.trace ?? []) as AgentStreamEvent[]
  }, [events, session?.trace])

  // Live artifact previews from SSE or session trace events
  const { previews: artifactPreviews, latestPreview, hasActivePreview } = useArtifactPreview(previewSourceEvents)

  // Session attachments (RAG over composer uploads). Lives at the provider
  // level so files staged on the landing screen survive the transition into
  // the workspace and get auto-flushed once a session id exists.
  const {
    attachments: sessionAttachments,
    pendingAttachments: pendingSessionAttachments,
    upload: uploadSessionAttachment,
    remove: removeSessionAttachment,
    flushPendingToSession
  } = useSessionAttachments(activeSessionId, accessToken)

  // ── Actions ──────────────────────────────────────────────────────────────────

  const startSession = useCallback(
    async (
      task: string,
      config?: SessionConfig,
      activeExternalConnectionIds?: string[],
      activeEnterpriseSkillId?: string,
      fallbackSkillId?: string
    ) => {
      // Snapshot the attachments that were on the composer at the moment
      // the user pressed Send, before kicking off the network request — so
      // the chip on the first turn's user bubble can't accidentally drop
      // mid-flight if the user keeps staging files. We forward them onto
      // the bootstrap session so `sessionToMessages` picks them up for
      // the synthesised initial `user_input` row before the trace catches
      // up. (See C4 in the doc-ux plan: not yet persisted to the trace,
      // so refresh = chip gone — accepted limitation.)
      // CRITICAL: Include BOTH server-confirmed AND pending (staged) attachments
      const attachmentSnapshot = snapshotAttachmentsForMessage(sessionAttachments, pendingSessionAttachments)

      // If user attached files, prepend their names to the task so the agent
      // is immediately aware of what documents are available.
      let taskWithAttachments = task
      if (attachmentSnapshot.length > 0) {
        const fileList = attachmentSnapshot.map(a => a.name).join(', ')
        taskWithAttachments = `[Attached document${attachmentSnapshot.length > 1 ? 's' : ''}: ${fileList}]\n\n${task}`
      }

      const createResponse = await _startSession(
        taskWithAttachments, // Use modified task with file names
        config,
        activeExternalConnectionIds,
        activeEnterpriseSkillId,
        fallbackSkillId
      )
      const sessionId = createResponse.session_id
      const bootstrapBase =
        createResponse.session ??
        createFallbackBootstrapSession(sessionId, task, config, createResponse.status ?? 'pending')
      const bootstrap: DeepAgentSession = {
        ...bootstrapBase,
        session_attachments:
          bootstrapBase.session_attachments && bootstrapBase.session_attachments.length > 0
            ? bootstrapBase.session_attachments
            : attachmentSnapshot // Use snapshot which includes pending files
      }
      setBootstrapSession(bootstrap)
      writeBootstrapSessionToHistoryState(bootstrap)
      pendingInternalSessionIdRef.current = sessionId === urlSessionId ? undefined : sessionId
      setActiveSessionId(sessionId)
      // Track active connectors for this session
      setSessionConnectorIds(activeExternalConnectionIds ?? [])
      addSession({
        session_id: sessionId,
        input: task,
        status: bootstrap.status,
        created_at: bootstrap.created_at,
        updated_at: bootstrap.updated_at,
        config: bootstrap.config ?? config
      })

      await flushPendingToSession(sessionId)
      const activatedResponse = await _activateSession(sessionId)
      if (activatedResponse.session) {
        const activatedSession: DeepAgentSession = {
          ...activatedResponse.session,
          // Preserve the client-only image blob previews across the pending
          // client-id -> persisted attachment-id handoff. We match by exact id
          // first, then by unique name/size/mime only; no fuzzy matching.
          session_attachments: mergePreviewUrlsIntoAttachments(
            activatedResponse.session.session_attachments,
            bootstrap.session_attachments
          )
        }
        setBootstrapSession(activatedSession)
        writeBootstrapSessionToHistoryState(activatedSession)
      }
      return sessionId
    },
    [
      _startSession,
      _activateSession,
      addSession,
      sessionAttachments,
      pendingSessionAttachments,
      flushPendingToSession,
      urlSessionId,
      activeSessionId
    ]
  )

  const selectSession = useCallback(
    (id: string | null) => {
      setBootstrapSession(null)
      writeBootstrapSessionToHistoryState(null)
      pendingInternalSessionIdRef.current = id === urlSessionId ? undefined : id
      setActiveSessionId(id)
      // Clear connector tracking when switching sessions (we don't know the old session's connectors)
      setSessionConnectorIds([])
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
      const attachmentSnapshot = snapshotAttachmentsForMessage(sessionAttachments, pendingSessionAttachments)
      await _reply(message, structuredInput, attachmentSnapshot)
    },
    [_reply, sessionAttachments, pendingSessionAttachments]
  )

  // Build a deterministic lookup of client-only image blob URLs from both
  // confirmed and still-pending attachments. Pending refs are important for the
  // first landing turn, where the message bubble can render before upload has
  // completed and ids have transitioned to server UUIDs.
  const attachmentPreviewLookup = useMemo(() => {
    const refs: PreviewAttachmentRef[] = []
    for (const att of sessionAttachments) {
      if (att.preview_url) refs.push(att)
    }
    for (const pending of pendingSessionAttachments) {
      const previewUrl = pending.preview_url ?? pending.attachment?.preview_url
      if (!previewUrl) continue
      if (pending.attachment) {
        refs.push({ ...pending.attachment, preview_url: previewUrl })
      }
      refs.push({
        id: pending.client_id,
        name: pending.name,
        mime_type: pending.mime_type,
        size: pending.size,
        preview_url: previewUrl
      })
    }
    return buildPreviewLookup(refs)
  }, [sessionAttachments, pendingSessionAttachments])

  // Re-hydrate preview_url on every ChatMessage whose attachment refs are
  // missing it. This covers:
  //   • First message: the activated session replaces the bootstrap and the
  //     server-returned session_attachments have no blob URLs.
  //   • Follow-up messages: the trace's attachment_refs never carry blob URLs.
  //   • Any fetchSession() refresh that overwrites the in-memory preview_url.
  // Runs in O(messages × attachments) but both counts are tiny; useMemo keeps
  // it from re-running unless messages or the attachment preview lookup changes.
  const enrichedMessages = useMemo(() => {
    if (attachmentPreviewLookup.byId.size === 0 && attachmentPreviewLookup.bySignature.size === 0) return messages
    return messages.map(msg => {
      if (!msg.attachments?.length) return msg
      let changed = false
      const enrichedAtts = msg.attachments.map(att => {
        if (att.preview_url) return att
        const url = resolvePreviewUrl(att, attachmentPreviewLookup)
        if (!url) return att
        changed = true
        return { ...att, preview_url: url }
      })
      return changed ? { ...msg, attachments: enrichedAtts } : msg
    })
  }, [messages, attachmentPreviewLookup])

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
      messages: enrichedMessages,
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
      decisions,
      activeSkill,
      fabricActiveSkill,
      loadedSkills,
      skillIdByStepId,
      sessionConnectorIds,
      taskNodes,
      hasPlan,
      completedCount,
      totalCount,
      progressPercent,
      currentTodoText,
      artifacts,
      workspaceDocs,
      activeArtifactId,
      activeArtifact,
      artifactPreviews,
      latestPreview,
      hasActivePreview,
      modelOptions,
      defaultModelId,
      defaultReasoningEffort,
      selectedModelId: selectedModelId || defaultModelId,
      selectedReasoningEffort,
      isLoadingModels,
      setModelSelection,
      startSession,
      selectSession,
      newSession,
      deleteSession,
      retrySessionLoad,
      reply,
      stopSession,
      setActiveArtifactId,
      refreshArtifacts,
      sessionAttachments,
      pendingSessionAttachments,
      uploadSessionAttachment,
      removeSessionAttachment
    }),
    [
      accessToken,
      userInfo,
      sessions,
      activeSessionId,
      session,
      enrichedMessages,
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
      decisions,
      activeSkill,
      fabricActiveSkill,
      loadedSkills,
      skillIdByStepId,
      sessionConnectorIds,
      taskNodes,
      hasPlan,
      completedCount,
      totalCount,
      progressPercent,
      currentTodoText,
      artifacts,
      workspaceDocs,
      activeArtifactId,
      activeArtifact,
      artifactPreviews,
      latestPreview,
      hasActivePreview,
      startSession,
      selectSession,
      newSession,
      deleteSession,
      retrySessionLoad,
      reply,
      stopSession,
      setActiveArtifactId,
      refreshArtifacts,
      sessionAttachments,
      pendingSessionAttachments,
      uploadSessionAttachment,
      removeSessionAttachment,
      modelOptions,
      defaultModelId,
      defaultReasoningEffort,
      selectedModelId,
      selectedReasoningEffort,
      isLoadingModels,
      setModelSelection
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
