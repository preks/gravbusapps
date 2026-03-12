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
import { fromPersistedChatMessages } from '../utils/chatMessageConversion'
import { isValidOrchestratorViewState, resetOrchestratorState } from '../utils/orchestratorSessionUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { env } from '@/common/env/EnvUtils'
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
    resolveDraftCheckpointByMessage,
    createDraftCheckpoint
  } = orchestratorClient

  const [previewRefreshToken, setPreviewRefreshToken] = useState(0)
  const [isRestoringMessageId, setIsRestoringMessageId] = useState<string | null>(null)
  const lastChatStateRef = useRef<string | null>(null)
  const isRestoringSessionRef = useRef(false)
  const chatSaveTimeoutRef = useRef<number | null>(null)
  const lastUiCheckpointKeyRef = useRef<string | null>(null)
  const initialRestoreKeyRef = useRef<string | null>(null)
  const pendingAnalyzeAssistantRef = useRef<string | null>(null)

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
    onBack,
    onAnalyzeAssistantResponse: content => {
      pendingAnalyzeAssistantRef.current = content
    }
  })

  const { completedPhases } = useOrchestratorEffects({
    state,
    handlers,
    buildProgress,
    initialPrompt,
    isAnalyzeStreaming: orchestratorClient.isAnalyzeStreaming
  } as Parameters<typeof useOrchestratorEffects>[0])

  const handleRefineSend = useCallback(
    async (
      feedback: string,
      onPartial?: (partial: AssistantStreamPartial) => void,
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
    ) => {
      const plan = currentPlan
      if (!plan?.jobId) {
        throw new Error('No active plan available for refinement')
      }
      const stream = await orchestratorClient.refinePlanStream(plan.jobId, { feedback, conversationHistory })
      const assistantMessage = await parseRefineAssistantFromStream(stream, onPartial)
      await refreshPlan(plan.jobId)
      return { assistantMessage }
    },
    [currentPlan, orchestratorClient.refinePlanStream, refreshPlan]
  )

  const handleFixSend = useCallback(
    async (
      prompt: string,
      onPartial?: (partial: AssistantStreamPartial) => void,
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
    ) => {
      const sessionId = lastSessionId
      const repoId = lastRepoId
      if (!sessionId || !repoId) {
        throw new Error('No session available for AI fix')
      }
      const stream = await orchestratorClient.client.streamTurnRaw({
        intent: 'auto',
        scope: 'orchestrator_full',
        prompt,
        jobId: currentPlan?.jobId,
        sessionId,
        repoId,
        conversationHistory,
        createdBy: userInfo
      })
      const { assistantMessage, hasMutation, hasPlanUpdate, planJobId } = await parseFixAssistantFromStream(stream, onPartial)
      if (hasMutation) {
        setPreviewRefreshToken(prev => prev + 1)
      }
      if (hasPlanUpdate) {
        const targetJobId = planJobId || currentPlan?.jobId
        if (targetJobId) {
          const refreshedPlan = await refreshPlan(targetJobId)
          if (!refreshedPlan) {
            return { assistantMessage }
          }
          const nextViewState =
            refreshedPlan.status === 'completed' && refreshedPlan.currentPhase !== 'awaiting_change_decision'
              ? 'complete'
              : 'review'
          state.setViewState(nextViewState)
        }
      }
      return { assistantMessage }
    },
    [currentPlan?.jobId, lastSessionId, lastRepoId, orchestratorClient.client, refreshPlan, state, userInfo]
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
      try {
        await handlers.handleAnalyze(prompt)
        const assistantResponse = pendingAnalyzeAssistantRef.current?.trim()
        if (assistantResponse) {
          chat.addAssistantMessage(assistantResponse)
        }
      } finally {
        pendingAnalyzeAssistantRef.current = null
      }
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

  const resolveSessionTargetPath = useCallback(async (): Promise<string | null> => {
    if (!lastSessionId) return null
    try {
      const sessionResponse = await builderClient.getSession(lastSessionId)
      return sessionResponse?.session?.targetPath ?? null
    } catch {
      return null
    }
  }, [builderClient, lastSessionId])

  const reloadChatHistory = useCallback(async () => {
    if (!lastSessionId || !lastRepoId) return
    const history = await builderClient.loadChatHistory(lastRepoId, lastSessionId)
    chat.replaceMessages(fromPersistedChatMessages(history))
  }, [builderClient, chat, lastRepoId, lastSessionId])

  const deriveViewStateFromPlan = useCallback((planLike: typeof currentPlan): 'review' | 'complete' => {
    if (!planLike) return 'review'
    if (planLike.currentPhase === 'awaiting_change_decision') return 'review'
    const isComplete = planLike.status === 'completed' && planLike.currentPhase !== 'awaiting_change_decision'
    return isComplete ? 'complete' : 'review'
  }, [])

  const normalizeCheckpointViewState = useCallback(
    (checkpoint: { snapshot?: Record<string, unknown> } | null, restoredPlan: typeof currentPlan): 'review' | 'complete' | 'error' => {
      const derivedFromPlan = deriveViewStateFromPlan(restoredPlan)
      const rawViewState = checkpoint?.snapshot?.viewState
      if (!isValidOrchestratorViewState(rawViewState)) {
        return derivedFromPlan
      }

      // Plan state is authoritative for review/complete after refresh/restore.
      // Keep explicit error checkpoints only when the plan is not already complete.
      if (rawViewState === 'error' && derivedFromPlan !== 'complete') {
        return 'error'
      }
      return derivedFromPlan
    },
    [deriveViewStateFromPlan]
  )

  const resolveDraftCheckpointForMessage = useCallback(
    async (messageId: string) => {
      if (!messageId || !lastSessionId) return null
      return resolveDraftCheckpointByMessage({
        sessionId: lastSessionId,
        chatCheckpointMessageId: messageId,
        jobId: currentPlan?.jobId ?? undefined
      })
    },
    [currentPlan?.jobId, lastSessionId, resolveDraftCheckpointByMessage]
  )

  const applyPlanSnapshotRestoreForMessage = useCallback(
    async (messageId: string) => {
      const checkpoint = await resolveDraftCheckpointForMessage(messageId)
      if (!checkpoint || !lastSessionId) {
        return { checkpoint: null, restoredPlan: null as typeof currentPlan }
      }

      const restoreResult = await restoreDraftCheckpoint(checkpoint.checkpointId, lastSessionId, true)
      const restoredCheckpoint = restoreResult?.checkpoint ?? checkpoint
      const restoredJobId =
        typeof restoredCheckpoint?.jobId === 'string'
          ? restoredCheckpoint.jobId
          : (typeof checkpoint.jobId === 'string' ? checkpoint.jobId : null)
      const restoredPlan = restoredJobId ? await refreshPlan(restoredJobId) : null

      if (restoredCheckpoint?.sessionId || restoredCheckpoint?.repoId) {
        setSessionFromBuild(
          typeof restoredCheckpoint?.sessionId === 'string' ? restoredCheckpoint.sessionId : undefined,
          typeof restoredCheckpoint?.repoId === 'string' ? restoredCheckpoint.repoId : undefined
        )
      }

      return {
        checkpoint: restoredCheckpoint as { snapshot?: Record<string, unknown>; jobId?: string } | null,
        restoredPlan
      }
    },
    [lastSessionId, refreshPlan, resolveDraftCheckpointForMessage, restoreDraftCheckpoint, setSessionFromBuild]
  )

  const handleRestoreAssistantMessage = useCallback(
    async (message: { id: string }) => {
      if (!lastSessionId || !lastRepoId || !message?.id) return
      setIsRestoringMessageId(message.id)
      try {
        const targetPath = await resolveSessionTargetPath()
        if (targetPath) {
          await builderClient.restoreToMessage({
            repoId: lastRepoId,
            sessionId: lastSessionId,
            targetPath,
            messageId: message.id,
            restoreChat: true
          })
          setPreviewRefreshToken(prev => prev + 1)
        } else {
          await builderClient.trimChatHistory(lastRepoId, lastSessionId, message.id)
        }

        const { checkpoint, restoredPlan } = await applyPlanSnapshotRestoreForMessage(message.id)
        await reloadChatHistory()

        const latestPlan =
          restoredPlan ??
          (typeof checkpoint?.jobId === 'string'
            ? await refreshPlan(checkpoint.jobId)
            : (currentPlan?.jobId ? await refreshPlan(currentPlan.jobId) : currentPlan))
        const nextViewState = normalizeCheckpointViewState(checkpoint, latestPlan)
        state.setViewState(nextViewState)
        state.setChatActive(true)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Restore failed'
        chat.addSystemMessage(`Restore failed: ${errorMessage}`)
      } finally {
        setIsRestoringMessageId(null)
      }
    },
    [
      builderClient,
      chat,
      applyPlanSnapshotRestoreForMessage,
      currentPlan?.jobId,
      lastRepoId,
      lastSessionId,
      normalizeCheckpointViewState,
      refreshPlan,
      reloadChatHistory,
      resolveSessionTargetPath,
      state
    ]
  )

  const handleEditMessage = useCallback(
    async (message: { id: string }, nextContent: string) => {
      const trimmed = nextContent.trim()
      if (!lastSessionId || !lastRepoId || !message?.id || !trimmed) return

      const historySnapshot = chat.messages
      const targetIndex = historySnapshot.findIndex(item => item.id === message.id)
      if (targetIndex < 0) return
      const previousAssistant = [...historySnapshot.slice(0, targetIndex)].reverse().find(item => item.role === 'assistant')

      setIsRestoringMessageId(message.id)
      try {
        let restoredCheckpoint: { snapshot?: Record<string, unknown>; jobId?: string } | null = null
        let restoredPlan: typeof currentPlan = null
        const targetPath = await resolveSessionTargetPath()
        if (targetPath) {
          if (previousAssistant?.id) {
            await builderClient.restoreToMessage({
              repoId: lastRepoId,
              sessionId: lastSessionId,
              targetPath,
              messageId: previousAssistant.id,
              restoreChat: true
            })
          } else {
            await builderClient.restoreToInitial({
              repoId: lastRepoId,
              sessionId: lastSessionId,
              targetPath,
              restoreChat: true
            })
          }
          setPreviewRefreshToken(prev => prev + 1)
        } else if (previousAssistant?.id) {
          await builderClient.trimChatHistory(lastRepoId, lastSessionId, previousAssistant.id)
        } else {
          await builderClient.clearChatHistory(lastRepoId, lastSessionId)
        }

        if (previousAssistant?.id) {
          const planRestore = await applyPlanSnapshotRestoreForMessage(previousAssistant.id)
          restoredCheckpoint = planRestore.checkpoint as { snapshot?: Record<string, unknown>; jobId?: string } | null
          restoredPlan = planRestore.restoredPlan
        }

        await reloadChatHistory()

        if (!previousAssistant?.id) {
          state.setViewState('analyzing')
          state.setChatActive(true)
          state.setUserPrompt(trimmed)
          chat.addUserMessage(trimmed, 'prompt', { createdBy: userInfo?.id })
          try {
            await handlers.handleAnalyze(trimmed)
            const assistantResponse = pendingAnalyzeAssistantRef.current?.trim()
            if (assistantResponse) {
              chat.addAssistantMessage(assistantResponse)
            }
          } finally {
            pendingAnalyzeAssistantRef.current = null
          }
          return
        }

        const latestPlan =
          restoredPlan ??
          (typeof restoredCheckpoint?.jobId === 'string'
            ? await refreshPlan(restoredCheckpoint.jobId)
            : (currentPlan?.jobId ? await refreshPlan(currentPlan.jobId) : currentPlan))
        const nextViewState = normalizeCheckpointViewState(restoredCheckpoint, latestPlan)
        state.setViewState(nextViewState)
        state.setChatActive(true)
        chat.editAndResendMessage(message.id, trimmed, userInfo?.id, nextViewState)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Edit failed'
        chat.addSystemMessage(`Edit failed: ${errorMessage}`)
      } finally {
        setIsRestoringMessageId(null)
      }
    },
    [
      builderClient,
      chat,
      applyPlanSnapshotRestoreForMessage,
      currentPlan?.jobId,
      handlers,
      lastRepoId,
      lastSessionId,
      normalizeCheckpointViewState,
      refreshPlan,
      reloadChatHistory,
      resolveSessionTargetPath,
      state,
      userInfo?.id
    ]
  )

  const handlePublishWithChat = useCallback(async () => {
    const result = await orchestratorClient.publishApp()
    if (result.success) {
      const toPlatformPublishUrl = (resourceUrl: string): string | null => {
        const raw = resourceUrl.trim()
        if (!raw) return null
        if (/^https?:\/\//i.test(raw)) return raw

        const baseUrl = (env('NEXT_PUBLIC_BASE_URL') || globalThis.window?.location?.origin || '').replace(/\/+$/, '')
        if (!baseUrl) return null

        const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`
        const platformPath = normalizedPath.startsWith('/platform/')
          ? normalizedPath
          : normalizedPath.startsWith('/apps/')
            ? `/platform/generated${normalizedPath}`
            : `/platform/generated/apps/${normalizedPath.replace(/^\/+/, '')}`
        return `${baseUrl}${platformPath}`
      }

      const lines = [result.message || 'Publish completed successfully.']
      const publishUrl = result.resourceUrl ? toPlatformPublishUrl(result.resourceUrl) : null
      if (publishUrl) {
        lines.push(`Open app: ${publishUrl}`)
      } else if (result.resourceUrl) {
        // Best effort fallback for malformed resource URLs.
        lines.push(`Open app: ${buildPlatformUrl(result.resourceUrl)}`)
      } else if (result.azureUrl) {
        // Only fall back to CDN when platform URL is unavailable.
        lines.push(`Open app (CDN fallback): ${result.azureUrl}`)
      }
      chat.addAssistantMessage(lines.join('\n'))
      return
    }

    chat.addSystemMessage(`Publish failed: ${result.message || 'Unknown publish error'}`)
  }, [chat, orchestratorClient])

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
            onEditMessage={handleEditMessage}
            onRestoreMessage={handleRestoreAssistantMessage}
            isRestoringMessageId={isRestoringMessageId}
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
            onPublish={handlePublishWithChat}
          />
        }
      />
    </div>
  )
}

export default OrchestratorViewConversational
