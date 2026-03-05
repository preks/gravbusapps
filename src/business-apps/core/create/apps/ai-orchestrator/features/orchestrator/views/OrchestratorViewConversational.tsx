/**
 * OrchestratorViewConversational - Main orchestrator with agent chat + canvas layout.
 *
 * - idle: Full-screen prompt input (IdleCanvas)
 * - All other states: CreateLayout with chat side panel + canvas
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useOrchestratorClient } from '../hooks/useOrchestratorClient'
import type { OrchestratorState } from '../hooks/useOrchestratorState'
import { useBuildProgress } from '../hooks/useBuildProgress'
import { useOrchestratorState } from '../hooks/useOrchestratorState'
import { useOrchestratorHandlers } from '../hooks/useOrchestratorHandlers'
import { useOrchestratorEffects } from '../hooks/useOrchestratorEffects'
import { useCreateChat } from '../hooks/useCreateChat'
import type { BuildPlan, OrchestratorViewState } from '../types'
import type { CreateChatMessage } from '../types/chat'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import type { ChatMessage as BuilderChatMessage } from '@/common/network/ai/builder/BuilderClient'
import {
  parseFixAssistantFromStream,
  parseRefineAssistantFromStream,
  type AssistantStreamPartial
} from '../utils/orchestratorStreamParsers'
import { IdleCanvas } from '../components/layouts'
import { CreateLayout } from '../components/layouts/CreateLayout'
import { CreateAgentChat } from '../components/chat/CreateAgentChat'
import { CreateSessionSidebar } from '../components/chat/CreateSessionSidebar'
import { OrchestratorCanvasContent } from './OrchestratorCanvasContent.tsx'
import { useListPlans } from '../hooks/useListPlans'
import { useCachedPlans } from '../hooks/useCachedPlans'
import { ScreenBuildingLoader } from '../components/widgets/ScreenBuildingLoader'

const ORCHESTRATOR_SYSTEM_AUTHOR = 'orchestrator-system'

function extractSessionContextFromPlan(plan: BuildPlan): { sessionId: string; repoId: string } | null {
  const componentWithSession = plan.components.find(
    component =>
      typeof component.metadata?.sessionId === 'string' &&
      component.metadata.sessionId.length > 0 &&
      typeof component.metadata?.repoId === 'string' &&
      component.metadata.repoId.length > 0
  )

  if (!componentWithSession) return null
  return {
    sessionId: componentWithSession.metadata?.sessionId as string,
    repoId: componentWithSession.metadata?.repoId as string
  }
}

function toPersistedChatMessages(messages: CreateChatMessage[]): BuilderChatMessage[] {
  return messages.map(message => {
    const m = message as CreateChatMessage & Partial<BuilderChatMessage>
    return {
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
      toolCalls: m.toolCalls,
      thinkingLog: m.thinkingLog,
      thinkingCollapsed: m.thinkingCollapsed,
      blocks: m.blocks,
      createdBy: message.role === 'system' ? ORCHESTRATOR_SYSTEM_AUTHOR : m.createdBy,
      editHistory: m.editHistory,
      messageId: message.id,
      createdAt: message.createdAt,
      serverCreatedAt: m.serverCreatedAt
    }
  })
}

function deriveRoleFromMessage(message: BuilderChatMessage): CreateChatMessage['role'] {
  if (message.role === 'user') return 'user'
  const isSystem = message.role === 'assistant' && message.createdBy === ORCHESTRATOR_SYSTEM_AUTHOR
  return isSystem ? 'system' : 'assistant'
}

function deriveMessageType(role: CreateChatMessage['role']): CreateChatMessage['messageType'] {
  if (role === 'user') return 'prompt'
  if (role === 'system') return 'system'
  return 'general'
}

function fromPersistedChatMessages(messages: BuilderChatMessage[]): CreateChatMessage[] {
  return messages.map(message => {
    const role = deriveRoleFromMessage(message)
    return {
      id: message.messageId || crypto.randomUUID(),
      role,
      content: message.content || '',
      createdAt: message.serverCreatedAt || message.createdAt || new Date().toISOString(),
      messageType: deriveMessageType(role),
      toolCalls: message.toolCalls,
      thinkingLog: message.thinkingLog,
      thinkingCollapsed: message.thinkingCollapsed,
      blocks: message.blocks,
      createdBy: message.createdBy,
      editHistory: message.editHistory,
      serverCreatedAt: message.serverCreatedAt
    }
  })
}

interface ResetOrchestratorStateOptions {
  chatSaveTimeoutRef: React.MutableRefObject<number | null>
  chat: { resetMessages: () => void }
  buildProgress: { resetProgress: () => void }
  orchestratorClient: { clearPlan: () => void }
  state: OrchestratorState
  lastChatStateRef: React.MutableRefObject<string | null>
  lastUiCheckpointKeyRef: React.MutableRefObject<string | null>
}

function resetOrchestratorState(options: ResetOrchestratorStateOptions): void {
  if (options.chatSaveTimeoutRef.current !== null) {
    globalThis.window.clearTimeout(options.chatSaveTimeoutRef.current)
    options.chatSaveTimeoutRef.current = null
  }
  options.chat.resetMessages()
  options.buildProgress.resetProgress()
  options.orchestratorClient.clearPlan()
  options.state.setViewState('idle')
  options.state.setChatActive(false)
  options.state.setUserPrompt('')
  options.state.setBuildLogs([])
  options.state.setThinkingSteps([])
  options.state.setBuildDuration(0)
  options.state.setCapturedBuildError(null)
  options.state.loggedPhasesRef.current.clear()
  options.state.lastCompletedCountRef.current = 0
  options.state.hasTriggeredInitialAnalysis.current = false
  options.lastChatStateRef.current = null
  options.lastUiCheckpointKeyRef.current = null
}

function isValidOrchestratorViewState(value: unknown): value is OrchestratorViewState {
  return (
    value === 'idle' ||
    value === 'analyzing' ||
    value === 'review' ||
    value === 'discovering' ||
    value === 'building' ||
    value === 'wiring' ||
    value === 'complete' ||
    value === 'error'
  )
}

export interface OrchestratorViewConversationalProps {
  accessToken: string
  userInfo?: any
  initialPrompt?: string
  initialJobId?: string
  onBack?: () => void
  onComplete?: (success: boolean) => void
  'data-testid'?: string
}

export const OrchestratorViewConversational: React.FC<OrchestratorViewConversationalProps> = ({
  accessToken,
  userInfo,
  initialPrompt = '',
  initialJobId,
  onBack,
  onComplete,
  'data-testid': testId = 'orchestrator-conversational'
}) => {
  const state = useOrchestratorState({ initialPrompt })
  const orchestratorClient = useOrchestratorClient({ accessToken })
  const builderClient = useBuilderClient(accessToken)
  const {
    currentPlan,
    lastSessionId,
    lastRepoId,
    setSessionFromBuild,
    refreshPlan,
    listDraftCheckpoints,
    restoreDraftCheckpoint,
    createDraftCheckpoint
  } = orchestratorClient

  // Preview refresh token — bumped when AI fix modifies screen code
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0)

  // Track which state transitions we already posted chat messages for
  const lastChatStateRef = useRef<string | null>(null)

  // Prevents the viewState effect from adding messages mid-restore (race condition guard)
  const isRestoringSessionRef = useRef(false)

  // Track session restoration loading state for UI feedback
  const [isRestoringSession, setIsRestoringSession] = useState(false)
  const chatSaveTimeoutRef = useRef<number | null>(null)
  const lastUiCheckpointKeyRef = useRef<string | null>(null)
  const initialRestoreKeyRef = useRef<string | null>(null)

  const buildProgress = useBuildProgress({
    client: orchestratorClient.client,
    plan: currentPlan,
    onComplete: success => {
      state.setViewState(success ? 'complete' : 'error')
      if (state.buildStartTime) {
        state.setBuildDuration(Date.now() - state.buildStartTime)
      }
      onComplete?.(success)
    },
    onError: (error: string) => {
      console.error('Build error:', error)
      state.setCapturedBuildError(error)
      state.setViewState('error')
      if (state.buildStartTime) {
        state.setBuildDuration(Date.now() - state.buildStartTime)
      }
    },
    onBuildComplete: event => {
      const meta = event.metadata as { sessionId?: string; repoId?: string } | undefined
      setSessionFromBuild(meta?.sessionId, meta?.repoId)
      if (event.jobId) {
        refreshPlan(event.jobId).catch(() => {})
      }
    },
    onComponentUpdate: orchestratorClient.updateComponentProperties
  })

  const handlers = useOrchestratorHandlers({
    state,
    orchestratorClient,
    buildProgress,
    onComplete,
    onBack
  })

  const { completedPhases } = useOrchestratorEffects({
    state,
    handlers,
    buildProgress,
    initialPrompt,
    isAnalyzeStreaming: orchestratorClient.isAnalyzeStreaming
  } as Parameters<typeof useOrchestratorEffects>[0])

  const handleRefineSend = useCallback(
    async (feedback: string, onPartial?: (partial: AssistantStreamPartial) => void) => {
      const plan = currentPlan
      if (!plan?.jobId) {
        throw new Error('No active plan available for refinement')
      }

      const stream = await orchestratorClient.refinePlanStream(plan.jobId, { feedback })
      const assistantMessage = await parseRefineAssistantFromStream(stream, onPartial)
      await refreshPlan(plan.jobId)
      return { assistantMessage }
    },
    [currentPlan, orchestratorClient.refinePlanStream, parseRefineAssistantFromStream, refreshPlan]
  )

  // --- Fix send handler (routes to AI builder for screen fixes) ---
  const handleFixSend = useCallback(
    async (prompt: string, onPartial?: (partial: AssistantStreamPartial) => void) => {
      const sessionId = lastSessionId
      const repoId = lastRepoId
      if (!sessionId || !repoId) {
        throw new Error('No session available for AI fix')
      }

      const stream = await builderClient.queryCode(repoId, prompt, [], true, true, sessionId, 'claude')
      const { assistantMessage, hasMutation } = await parseFixAssistantFromStream(stream, onPartial)

      if (hasMutation) {
        setPreviewRefreshToken(prev => prev + 1)
      }

      return { assistantMessage }
    },
    [builderClient, lastSessionId, lastRepoId, parseFixAssistantFromStream]
  )

  // --- Chat integration ---
  const chat = useCreateChat({
    viewState: state.viewState,
    onRefine: handlers.handleRefine,
    onRefineSend: handleRefineSend as Parameters<typeof useCreateChat>[0]['onRefineSend'],
    onStartBuild: handlers.handleStartBuild,
    onFixSend: handleFixSend as Parameters<typeof useCreateChat>[0]['onFixSend']
  })

  // --- Shared session restore logic (used on mount and when selecting from history) ---
  const resolveViewStateFromCheckpoint = useCallback(
    async (
      sessionContext: { sessionId: string; repoId: string },
      plan: NonNullable<Awaited<ReturnType<typeof refreshPlan>>>,
      fallback: OrchestratorViewState
    ): Promise<OrchestratorViewState> => {
      try {
        const checkpoints = await listDraftCheckpoints({
          jobId: plan.jobId,
          sessionId: sessionContext.sessionId,
          limit: 1
        })
        const latestCheckpoint = checkpoints[0]
        if (!latestCheckpoint) return fallback
        const restored = await restoreDraftCheckpoint(latestCheckpoint.checkpointId, sessionContext.sessionId)
        const checkpointViewState = restored.checkpoint?.snapshot?.viewState
        return isValidOrchestratorViewState(checkpointViewState) ? checkpointViewState : fallback
      } catch {
        return fallback
      }
    },
    [listDraftCheckpoints, restoreDraftCheckpoint]
  )

  const applyRestoredPlan = useCallback(
    async (plan: NonNullable<Awaited<ReturnType<typeof refreshPlan>>>) => {
      const alreadyBuilt =
        plan.status === 'completed' || plan.components.some(c => c.status === 'completed' || c.status === 'reused')
      const sessionContext = extractSessionContextFromPlan(plan)
      if (sessionContext) {
        setSessionFromBuild(sessionContext.sessionId, sessionContext.repoId)
      }

      const baseViewState: OrchestratorViewState = alreadyBuilt ? 'complete' : 'review'
      const resolvedViewState = sessionContext
        ? await resolveViewStateFromCheckpoint(sessionContext, plan, baseViewState)
        : baseViewState

      let loadedHistory = false
      if (sessionContext) {
        try {
          const history = await builderClient.loadChatHistory(sessionContext.repoId, sessionContext.sessionId)
          if (history.length > 0) {
            chat.replaceMessages(fromPersistedChatMessages(history))
            loadedHistory = true
          }
        } catch {
          // Chat hydration is best-effort.
        }
      }

      if (!loadedHistory && plan.originalPrompt) {
        chat.addUserMessage(plan.originalPrompt, 'prompt')
      }

      lastChatStateRef.current = loadedHistory ? `${resolvedViewState}:${plan.jobId}` : null
      state.setChatActive(true)
      state.setViewState(resolvedViewState)
    },
    [chat, state, builderClient, setSessionFromBuild, resolveViewStateFromCheckpoint]
  )

  // Keep ?jobId= in sync with the active plan so page refresh restores the session
  useEffect(() => {
    const jobId = currentPlan?.jobId ?? null
    const urlParams = new URLSearchParams(globalThis.location.search)
    if (jobId) {
      urlParams.set('jobId', jobId)
    } else {
      urlParams.delete('jobId')
    }
    const newUrl = urlParams.toString()
      ? `${globalThis.location.pathname}?${urlParams.toString()}`
      : globalThis.location.pathname
    globalThis.history.replaceState({}, '', newUrl)
  }, [currentPlan?.jobId])

  useEffect(() => {
    if (!initialJobId || !accessToken) return
    const restoreKey = `${initialJobId}:${accessToken}`
    if (initialRestoreKeyRef.current === restoreKey) return
    initialRestoreKeyRef.current = restoreKey

    isRestoringSessionRef.current = true
    setIsRestoringSession(true)
    ;(async () => {
      try {
        const plan = await refreshPlan(initialJobId)
        if (!plan) return
        await applyRestoredPlan(plan)
      } catch {
        // Ignore restore errors and keep idle state fallback.
      } finally {
        isRestoringSessionRef.current = false
        setIsRestoringSession(false)
      }
    })()
  }, [initialJobId, accessToken, refreshPlan, applyRestoredPlan])

  const handleIdleSubmit = useCallback(
    async (prompt: string) => {
      state.setChatActive(true)
      chat.addUserMessage(prompt, 'prompt')
      chat.addAssistantMessage('Analyzing your request and planning the solution...', 'system')
      await handlers.handleAnalyze(prompt)
    },
    [handlers, state, chat]
  )

  // Post contextual chat messages on state transitions (deduplicated via ref)
  const viewState = state.viewState
  const planJobId = currentPlan?.jobId
  const planTitle = currentPlan?.userSummary?.title

  useEffect(() => {
    if (isRestoringSessionRef.current) return
    const stateKey = `${viewState}:${planJobId ?? ''}`
    if (stateKey === lastChatStateRef.current) return
    lastChatStateRef.current = stateKey

    if (viewState === 'review' && planTitle) {
      chat.addAssistantMessage(
        `Your build plan is ready: **${planTitle}**. ` +
          'Review it on the canvas, then tell me to refine it or say "build" to start.'
      )
    } else if (viewState === 'building') {
      chat.addSystemMessage('Build started. Watch the progress on the canvas.')
    } else if (viewState === 'complete') {
      chat.addAssistantMessage(
        'Build complete! The screen preview is on the canvas. ' + 'You can ask me to make changes or fixes from here.'
      )
    }
  }, [viewState, planJobId, planTitle, chat])

  // Persist chat history for the active draft session so refresh restores the full timeline.
  useEffect(() => {
    const sessionId = lastSessionId
    const repoId = lastRepoId
    if (!sessionId || !repoId) return
    if (isRestoringSessionRef.current) return
    if (chat.messages.length === 0) return

    if (chatSaveTimeoutRef.current !== null) {
      globalThis.window.clearTimeout(chatSaveTimeoutRef.current)
    }

    chatSaveTimeoutRef.current = globalThis.window.setTimeout(() => {
      const persisted = toPersistedChatMessages(chat.messages)
      void builderClient.saveChatHistory(repoId, sessionId, persisted)
    }, 700)

    return () => {
      if (chatSaveTimeoutRef.current !== null) {
        globalThis.window.clearTimeout(chatSaveTimeoutRef.current)
        chatSaveTimeoutRef.current = null
      }
    }
  }, [chat.messages, lastSessionId, lastRepoId, builderClient])

  // Create lightweight UI checkpoints on major state transitions with chat pointer metadata.
  useEffect(() => {
    const jobId = currentPlan?.jobId
    const sessionId = lastSessionId
    if (!jobId || !sessionId) return
    if (isRestoringSessionRef.current) return
    if (!(viewState === 'review' || viewState === 'building' || viewState === 'complete' || viewState === 'error')) {
      return
    }

    const phaseKey = `${jobId}:${sessionId}:${viewState}`
    if (phaseKey === lastUiCheckpointKeyRef.current) return
    lastUiCheckpointKeyRef.current = phaseKey

    const latestMessage = chat.messages[chat.messages.length - 1]
    void createDraftCheckpoint({
      jobId,
      sessionId,
      repoId: lastRepoId ?? undefined,
      name: `ui_${viewState}`,
      chatCheckpointMessageId: latestMessage?.id,
      snapshot: {
        viewState,
        messageCount: chat.messages.length,
        latestMessageRole: latestMessage?.role
      }
    })
  }, [viewState, chat.messages, createDraftCheckpoint, currentPlan?.jobId, lastSessionId, lastRepoId])

  const handleNewSession = useCallback(() => {
    resetOrchestratorState({
      chatSaveTimeoutRef,
      chat,
      buildProgress,
      orchestratorClient,
      state,
      lastChatStateRef,
      lastUiCheckpointKeyRef
    })
  }, [chat, buildProgress, orchestratorClient, state])

  // --- Recent plans for idle screen ---
  const { data: recentPlans } = useListPlans({
    accessToken,
    params: { limit: 8, offset: 0, sort: '-createdAt' },
    enabled: !!accessToken
  })

  // --- Session history sidebar ---
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    data: plans,
    loading: plansLoading,
    refetch: refetchPlans
  } = useCachedPlans({
    accessToken,
    enabled: sidebarOpen
  })

  const handleOpenHistory = useCallback(() => {
    if (!state.chatActive) {
      state.setChatActive(true)
    }
    setSidebarOpen(true)
    refetchPlans()
  }, [refetchPlans, state])

  const handleSelectSession = useCallback(
    async (jobId: string) => {
      setSidebarOpen(false)
      isRestoringSessionRef.current = true
      setIsRestoringSession(true)
      chat.resetMessages()

      try {
        const plan = await refreshPlan(jobId)
        if (!plan) {
          return
        }
        await applyRestoredPlan(plan)
      } finally {
        isRestoringSessionRef.current = false
        setIsRestoringSession(false)
      }
    },
    [chat, orchestratorClient, applyRestoredPlan]
  )

  // --- Idle: full-screen (square top so banner has no top border radius) ---
  if (!state.chatActive && state.viewState === 'idle' && !sidebarOpen) {
    return (
      <div
        className="gba:h-full gba:w-full gba:overflow-hidden gba:bg-background gba:rounded-t-none"
        data-testid={testId}
      >
        <IdleCanvas
          onSubmit={handleIdleSubmit}
          isLoading={orchestratorClient.isAnalyzing}
          onOpenHistory={handleOpenHistory}
          recentPlans={recentPlans}
          onSelectSession={handleSelectSession}
        />
      </div>
    )
  }

  // --- Chat + Canvas layout ---
  return (
    <div className="gba:h-full gba:w-full gba:overflow-hidden gba:bg-background gba:relative" data-testid={testId}>
      {/* Session restoration loading overlay */}
      {isRestoringSession && (
        <div className="gba:absolute gba:inset-0 gba:bg-background/98 gba:backdrop-blur-md gba:z-100 gba:flex gba:items-center gba:justify-center">
          <ScreenBuildingLoader />
        </div>
      )}

      <CreateLayout
        sidebarOpen={sidebarOpen}
        sidebar={
          <CreateSessionSidebar
            plans={plans}
            currentPlanId={currentPlan?.jobId}
            loading={plansLoading}
            onSelectSession={handleSelectSession}
            onClose={() => {
              setSidebarOpen(false)
              if (chat.messages.length === 0) {
                state.setChatActive(false)
              }
            }}
            accessToken={accessToken}
            onRefresh={refetchPlans}
          />
        }
        chatPanel={
          <CreateAgentChat
            messages={chat.messages}
            isProcessing={
              chat.isProcessing ||
              orchestratorClient.isAnalyzing ||
              orchestratorClient.isRefining ||
              buildProgress.isBuilding
            }
            onSend={chat.handleSend}
            onNewSession={handleNewSession}
            onOpenHistory={handleOpenHistory}
            userInfo={userInfo}
            accessToken={accessToken}
          />
        }
        canvasPanel={
          <OrchestratorCanvasContent
            state={state}
            orchestratorClient={orchestratorClient}
            buildProgress={buildProgress}
            handlers={handlers}
            completedPhases={completedPhases}
            accessToken={accessToken}
            userInfo={userInfo}
            previewRefreshToken={previewRefreshToken}
            isRestoringSession={isRestoringSession}
          />
        }
      />
    </div>
  )
}

export default OrchestratorViewConversational
