/**
 * OrchestratorViewConversational - Main orchestrator with agent chat + canvas layout.
 *
 * - idle: Full-screen prompt input (IdleCanvas)
 * - All other states: CreateLayout with chat side panel + canvas
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useOrchestratorClient } from '../hooks/useOrchestratorClient'
import { useBuildProgress } from '../hooks/useBuildProgress'
import { useOrchestratorState } from '../hooks/useOrchestratorState'
import { useOrchestratorHandlers } from '../hooks/useOrchestratorHandlers'
import { useOrchestratorEffects } from '../hooks/useOrchestratorEffects'
import { useCreateChat } from '../hooks/useCreateChat'
import { useOrchestratorRestore } from '../hooks/useOrchestratorRestore'
import { useOrchestratorConversationalEffects } from '../hooks/useOrchestratorConversationalEffects'
import {
  parseFixAssistantFromStream,
  parseRefineAssistantFromStream,
  type AssistantStreamPartial
} from '../utils/orchestratorStreamParsers'
import { resetOrchestratorState } from '../utils/orchestratorSessionUtils'
import { IdleCanvas } from '../components/layouts'
import { CreateLayout } from '../components/layouts/CreateLayout'
import { CreateAgentChat } from '../components/chat/CreateAgentChat'
import { CreateSessionSidebar } from '../components/chat/CreateSessionSidebar'
import { OrchestratorCanvasContent } from './OrchestratorCanvasContent'
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { useListPlans } from '../hooks/useListPlans'
import { useOrchestratorSidebar } from '../hooks/useOrchestratorSidebar'
import { SessionSwitchOverlay } from '../components/widgets/SessionSwitchOverlay'

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

  const [previewRefreshToken, setPreviewRefreshToken] = useState(0)
  const lastChatStateRef = useRef<string | null>(null)
  const isRestoringSessionRef = useRef(false)
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
    userInfo,
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
    [currentPlan, orchestratorClient.refinePlanStream, refreshPlan]
  )

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
    [builderClient, lastSessionId, lastRepoId]
  )

  const chat = useCreateChat({
    viewState: state.viewState,
    onRefine: handlers.handleRefine,
    onRefineSend: handleRefineSend as Parameters<typeof useCreateChat>[0]['onRefineSend'],
    onStartBuild: handlers.handleStartBuild,
    onFixSend: handleFixSend as Parameters<typeof useCreateChat>[0]['onFixSend'],
    userInfo
  })

  const { applyRestoredPlan } = useOrchestratorRestore({
    listDraftCheckpoints,
    restoreDraftCheckpoint,
    builderClient,
    chat,
    state,
    setSessionFromBuild,
    lastChatStateRef
  })

  const { builtBy, builtByLoading, isRestoringSession, setIsRestoringSession, setRestoreComplete } =
    useOrchestratorConversationalEffects({
      state,
      chat,
      currentPlan,
      lastSessionId,
      lastRepoId,
      builderClient,
      createDraftCheckpoint,
      isRestoringSessionRef,
      lastChatStateRef,
      lastUiCheckpointKeyRef,
      chatSaveTimeoutRef
    })

  const { sidebarOpen, plans, plansLoading, refetchPlans, handleOpenHistory, handleSelectSession, handleCloseSidebar } =
    useOrchestratorSidebar({
      accessToken,
      state,
      refreshPlan,
      applyRestoredPlan,
      chat,
      isRestoringSessionRef,
      setIsRestoringSession,
      setRestoreComplete
    })

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
        if (!plan) {
          isRestoringSessionRef.current = false
          setIsRestoringSession(false)
          return
        }
        await applyRestoredPlan(plan)
        setRestoreComplete(true)
      } catch {
        isRestoringSessionRef.current = false
        setIsRestoringSession(false)
      }
    })()
  }, [initialJobId, accessToken, refreshPlan, applyRestoredPlan, setIsRestoringSession, setRestoreComplete])

  const handleIdleSubmit = useCallback(
    async (prompt: string) => {
      state.setChatActive(true)
      chat.addUserMessage(prompt, 'prompt', { createdBy: userInfo?.id })
      chat.addAssistantMessage('Analyzing your request and planning the solution...', 'system')
      await handlers.handleAnalyze(prompt)
    },
    [handlers, state, chat, userInfo?.id]
  )

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

  const { data: recentPlans } = useListPlans({
    accessToken,
    params: { limit: 8, offset: 0, sort: '-createdAt' },
    enabled: !!accessToken
  })

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

  return (
    <div className="gba:h-full gba:w-full gba:overflow-hidden gba:bg-background gba:relative" data-testid={testId}>
      {isRestoringSession && <SessionSwitchOverlay />}

      <CreateLayout
        sidebarOpen={sidebarOpen}
        sidebar={
          <CreateSessionSidebar
            plans={plans}
            currentPlanId={currentPlan?.jobId}
            loading={plansLoading}
            onSelectSession={handleSelectSession}
            onClose={handleCloseSidebar}
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
            builtBy={builtBy}
            builtByLoading={builtByLoading}
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
            builtBy={builtBy}
            builtByLoading={builtByLoading}
            previewRefreshToken={previewRefreshToken}
            isRestoringSession={isRestoringSession}
          />
        }
      />
    </div>
  )
}

export default OrchestratorViewConversational
