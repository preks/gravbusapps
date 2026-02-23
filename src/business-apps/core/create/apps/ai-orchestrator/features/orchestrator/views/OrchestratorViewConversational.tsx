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
import { useBuilderClient } from '@/common/network/ai/builder/useBuilderClient'
import { IdleCanvas } from '../components/layouts'
import { CreateLayout } from '../components/layouts/CreateLayout'
import { CreateAgentChat } from '../components/chat/CreateAgentChat'
import { CreateSessionSidebar } from '../components/chat/CreateSessionSidebar'
import { OrchestratorCanvasContent } from './OrchestratorCanvasContent.tsx'
import { useListPlans } from '../hooks/useListPlans'

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

  // Preview refresh token — bumped when AI fix modifies screen code
  const [previewRefreshToken, setPreviewRefreshToken] = useState(0)

  // Track which state transitions we already posted chat messages for
  const lastChatStateRef = useRef<string | null>(null)

  useEffect(() => {
    if (!initialJobId || !accessToken) return
    orchestratorClient
      .refreshPlan(initialJobId)
      .then(plan => {
        if (!plan) return
        const alreadyBuilt =
          plan.status === 'completed' || plan.components.some(c => c.status === 'completed' || c.status === 'reused')
        if (alreadyBuilt) {
          const firstWithSession = plan.components.find(c => c.metadata?.sessionId && c.metadata?.repoId)
          orchestratorClient.setSessionFromBuild(
            firstWithSession?.metadata?.sessionId,
            firstWithSession?.metadata?.repoId
          )
        }
        state.setChatActive(true)
        state.setViewState(alreadyBuilt ? 'complete' : 'review')
      })
      .catch(() => {})
  }, [initialJobId, accessToken])

  const buildProgress = useBuildProgress({
    client: orchestratorClient.client,
    plan: orchestratorClient.currentPlan,
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
      orchestratorClient.setSessionFromBuild(meta?.sessionId, meta?.repoId)
      if (event.jobId) {
        orchestratorClient.refreshPlan(event.jobId).catch(() => {})
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
    initialPrompt
  })

  const MUTATION_TOOLS = ['write_file', 'delete_file', 'screen_build', 'run_command']

  const processStreamEvent = (payload: string): boolean => {
    const eventData = JSON.parse(payload) as Record<string, unknown>
    const eventType = typeof eventData.type === 'string' ? eventData.type : ''

    if (eventType === 'tool_call') {
      const toolName = typeof eventData.toolName === 'string' ? eventData.toolName : ''
      if (MUTATION_TOOLS.includes(toolName)) return true
    }
    if (eventType === 'error') {
      const message = typeof eventData.content === 'string' ? eventData.content : 'Fix request failed'
      throw new Error(message)
    }
    return false
  }

  const readStream = async (stream: ReadableStream<Uint8Array>): Promise<boolean> => {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let hasMutation = false

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          if (processStreamEvent(payload)) hasMutation = true
        } catch (error_) {
          if (error_ instanceof Error && error_.message !== 'Fix request failed') continue
          throw error_
        }
      }
    }

    return hasMutation
  }

  // --- Fix send handler (routes to AI builder for screen fixes) ---
  const handleFixSend = useCallback(
    async (prompt: string) => {
      const sessionId = orchestratorClient.lastSessionId
      const repoId = orchestratorClient.lastRepoId
      if (!sessionId || !repoId) {
        throw new Error('No session available for AI fix')
      }

      const stream = await builderClient.queryCode(repoId, prompt, [], true, true, sessionId, 'claude')
      const hasMutation = await readStream(stream)

      if (hasMutation) {
        setPreviewRefreshToken(prev => prev + 1)
      }
    },
    [builderClient, orchestratorClient.lastSessionId, orchestratorClient.lastRepoId]
  )

  // --- Chat integration ---
  const chat = useCreateChat({
    viewState: state.viewState,
    onRefine: handlers.handleRefine,
    onStartBuild: handlers.handleStartBuild,
    onFixSend: handleFixSend
  })

  const handleIdleSubmit = useCallback(
    async (prompt: string) => {
      state.setChatActive(true)
      // Add user's initial prompt to chat history
      chat.addUserMessage(prompt, 'prompt')
      // Add analyzing feedback to chat
      chat.addAssistantMessage('Analyzing your request and planning the solution...', 'system')
      await handlers.handleAnalyze(prompt)
    },
    [handlers, state, chat]
  )

  // Post contextual chat messages on state transitions (deduplicated via ref)
  const viewState = state.viewState
  const planJobId = orchestratorClient.currentPlan?.jobId
  const planTitle = orchestratorClient.currentPlan?.userSummary?.title

  useEffect(() => {
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

  const handleNewSession = useCallback(() => {
    chat.resetMessages()
    handlers.handleReset()
    state.setChatActive(false)
    lastChatStateRef.current = null
  }, [chat, handlers, state])

  // --- Session history sidebar ---
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    data: plans,
    loading: plansLoading,
    refetch: refetchPlans
  } = useListPlans({
    accessToken,
    enabled: sidebarOpen
  })

  const handleOpenHistory = useCallback(() => {
    setSidebarOpen(true)
    refetchPlans()
  }, [refetchPlans])

  const handleSelectSession = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  // --- Idle: full-screen (square top so banner has no top border radius) ---
  if (!state.chatActive && state.viewState === 'idle') {
    return (
      <div
        className="gba:h-full gba:w-full gba:overflow-hidden gba:bg-background gba:rounded-t-none"
        data-testid={testId}
      >
        <IdleCanvas onSubmit={handleIdleSubmit} isLoading={orchestratorClient.isAnalyzing} />
      </div>
    )
  }

  // --- Chat + Canvas layout ---
  return (
    <div className="gba:h-full gba:w-full gba:overflow-hidden gba:bg-background" data-testid={testId}>
      <CreateLayout
        sidebarOpen={sidebarOpen}
        sidebar={
          <CreateSessionSidebar
            plans={plans}
            currentPlanId={orchestratorClient.currentPlan?.jobId}
            loading={plansLoading}
            onSelectSession={handleSelectSession}
            onClose={() => setSidebarOpen(false)}
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
          />
        }
      />
    </div>
  )
}

export default OrchestratorViewConversational
