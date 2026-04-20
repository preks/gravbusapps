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
import {
  canShowExistingBuild,
  createFallbackCompletedSnapshot,
  extractSessionContextFromPlan,
  isValidOrchestratorViewState,
  resetOrchestratorState
} from '../utils/orchestratorSessionUtils'
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
import { ImportFolderNewAppDialog } from '@/common/components/ai-builder/import-new-app/ImportFolderNewAppDialog'
import type { BuildPlan } from '../types/build'
import type { OrchestratorFixComposerScope } from '../types/chat'

export interface OrchestratorViewConversationalProps {
  accessToken: string
  userInfo?: any
  initialPrompt?: string
  initialJobId?: string
  initialSessionId?: string
  onBack?: () => void
  onComplete?: (success: boolean) => void
  'data-testid'?: string
}

export const OrchestratorViewConversational: React.FC<OrchestratorViewConversationalProps> = ({
  accessToken,
  userInfo,
  initialPrompt = '',
  initialJobId,
  initialSessionId,
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
    setCurrentPlanSnapshot,
    setSessionFromBuild,
    refreshPlan,
    listDraftCheckpoints,
    restoreDraftCheckpoint,
    resolveDraftCheckpointByMessage,
    createDraftCheckpoint
  } = orchestratorClient

  const [previewRefreshToken, setPreviewRefreshToken] = useState(0)
  const [isRestoringMessageId, setIsRestoringMessageId] = useState<string | null>(null)
  const [isSavingVersion, setIsSavingVersion] = useState(false)
  const [isImportingFolder, setIsImportingFolder] = useState(false)
  const [importNewAppDialogOpen, setImportNewAppDialogOpen] = useState(false)
  const [lastCompletedPlanSnapshot, setLastCompletedPlanSnapshot] = useState<BuildPlan | null>(null)
  const [reviewCanvasMode, setReviewCanvasMode] = useState<'plan' | 'currentBuild'>('plan')
  const [fixComposerScope, setFixComposerScope] = useState<OrchestratorFixComposerScope>('screen')
  const [pendingImportFiles, setPendingImportFiles] = useState<File[] | null>(null)
  const [importTargetPath, setImportTargetPath] = useState('')
  const [importResourceUrl, setImportResourceUrl] = useState('')
  const [importDialogError, setImportDialogError] = useState<string | null>(null)
  const lastChatStateRef = useRef<string | null>(null)
  const isRestoringSessionRef = useRef(false)
  const chatSaveTimeoutRef = useRef<number | null>(null)
  const lastUiCheckpointKeyRef = useRef<string | null>(null)
  const initialRestoreKeyRef = useRef<string | null>(null)
  const pendingAnalyzeAssistantRef = useRef<string | null>(null)
  const snapshotLookupKeyRef = useRef<string | null>(null)

  const clearCompletedPlanSnapshot = useCallback(() => {
    setLastCompletedPlanSnapshot(null)
    setReviewCanvasMode('plan')
  }, [])

  const rememberCompletedPlanSnapshot = useCallback((plan: BuildPlan | null) => {
    if (!canShowExistingBuild(plan)) return false
    setLastCompletedPlanSnapshot(plan)
    return true
  }, [])

  const showExistingBuild = useCallback(() => {
    setReviewCanvasMode('currentBuild')
  }, [])

  const showReviewPlan = useCallback(() => {
    setReviewCanvasMode('plan')
  }, [])

  const { data: recentPlans } = useListPlans({
    accessToken,
    params: { limit: 8, offset: 0, sort: '-createdAt' },
    enabled: !!accessToken
  })

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
        refreshPlan(event.jobId)
          .then(plan => {
            if (rememberCompletedPlanSnapshot(plan)) {
              setReviewCanvasMode('plan')
            }
          })
          .catch(() => {})
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
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
      options?: { changeScope: OrchestratorFixComposerScope }
    ) => {
      const sessionId = lastSessionId
      const repoId = lastRepoId
      if (!sessionId || !repoId) {
        throw new Error('No session available for AI fix')
      }
      const changeScope = options?.changeScope ?? 'screen'

      const stream =
        changeScope === 'screen'
          ? await orchestratorClient.client.streamTurnRaw({
              intent: 'ui_mutate',
              scope: 'ui_only',
              prompt,
              sessionId,
              repoId,
              conversationHistory,
              createdBy: userInfo
            })
          : await (async () => {
              if (!currentPlan?.jobId) {
                throw new Error(
                  'No active plan for this session. Use Screen & layout for visual changes, or reopen a session that has a plan.'
                )
              }
              return orchestratorClient.client.streamTurnRaw({
                intent: 'plan_refine',
                scope: 'orchestrator_full',
                prompt,
                jobId: currentPlan.jobId,
                sessionId,
                repoId,
                conversationHistory,
                createdBy: userInfo
              })
            })()
      const { assistantMessage, hasMutation, hasPlanUpdate, planJobId } = await parseFixAssistantFromStream(
        stream,
        onPartial
      )
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
          if (rememberCompletedPlanSnapshot(refreshedPlan)) {
            setReviewCanvasMode('plan')
          }
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
    fixComposerChangeScope: fixComposerScope,
    userInfo
  })

  const { applyRestoredPlan } = useOrchestratorRestore({
    listDraftCheckpoints,
    builderClient,
    chat,
    state,
    setSessionFromBuild,
    lastChatStateRef,
    onCompletedPlanRestored: plan => {
      if (rememberCompletedPlanSnapshot(plan)) {
        setReviewCanvasMode('plan')
      }
    }
  })

  const { builtBy, builtByLoading, isRestoringSession, setIsRestoringSession, setRestoreComplete } =
    useOrchestratorConversationalEffects({
      state,
      chat,
      currentPlan,
      buildSummaryMessage: buildProgress.buildSummaryMessage,
      initialJobId,
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

  const findMatchingCompletedSnapshotPlan = useCallback(
    (sessionContext: { sessionId: string; repoId: string }, activeJobId?: string | null) => {
      const candidatePlans = [...plans, ...recentPlans, ...(currentPlan ? [currentPlan] : [])]
      const seenJobIds = new Set<string>()

      for (const plan of candidatePlans) {
        if (!plan?.jobId || seenJobIds.has(plan.jobId)) continue
        seenJobIds.add(plan.jobId)

        const planSessionContext = extractSessionContextFromPlan(plan)
        if (!planSessionContext) continue
        if (
          planSessionContext.sessionId !== sessionContext.sessionId ||
          planSessionContext.repoId !== sessionContext.repoId
        ) {
          continue
        }
        if (activeJobId && plan.jobId === activeJobId && !canShowExistingBuild(plan)) {
          continue
        }
        if (canShowExistingBuild(plan)) {
          return plan
        }
      }

      return null
    },
    [currentPlan, plans, recentPlans]
  )

  const resolveHistoricalCompletedSnapshot = useCallback(
    async (plan: BuildPlan) => {
      const sessionContext = extractSessionContextFromPlan(plan)
      if (!sessionContext) return null

      const checkpoints = await listDraftCheckpoints({
        jobId: plan.jobId,
        sessionId: sessionContext.sessionId,
        limit: 20
      }).catch(() => [])

      const hasCompletedCheckpoint = checkpoints.some(checkpoint => checkpoint.snapshot?.viewState === 'complete')
      if (!hasCompletedCheckpoint) return null

      return createFallbackCompletedSnapshot(plan)
    },
    [listDraftCheckpoints]
  )

  const resolveSessionBackedCompletedSnapshot = useCallback(
    async (plan: BuildPlan) => {
      const sessionContext = extractSessionContextFromPlan(plan)
      if (!sessionContext) return null

      const sessionResponse = await builderClient.getSession(sessionContext.sessionId).catch(() => null)
      const session = sessionResponse?.session
      if (!session || (!session.targetPath && !session.resourceUrl)) {
        return null
      }

      const fallbackPlan = createFallbackCompletedSnapshot(plan)
      if (!fallbackPlan) return null

      return {
        ...fallbackPlan,
        components: fallbackPlan.components.map(component => {
          if (component.type !== 'screen') {
            return component
          }

          return {
            ...component,
            resourceUrl: component.resourceUrl ?? session.resourceUrl ?? undefined,
            metadata: {
              ...component.metadata,
              resourceUrl: component.metadata?.resourceUrl ?? session.resourceUrl ?? undefined
            }
          }
        })
      }
    },
    [builderClient]
  )

  useEffect(() => {
    if (state.viewState === 'review' && currentPlan?.currentPhase === 'awaiting_change_decision') {
      setReviewCanvasMode('plan')
    }
  }, [currentPlan, state.viewState])

  useEffect(() => {
    if (state.viewState !== 'review' || lastCompletedPlanSnapshot) {
      snapshotLookupKeyRef.current = null
      return
    }

    const sessionContext =
      (currentPlan && extractSessionContextFromPlan(currentPlan)) ??
      (lastSessionId && lastRepoId ? { sessionId: lastSessionId, repoId: lastRepoId } : null)
    if (!sessionContext) return

    const lookupKey = `${sessionContext.sessionId}:${sessionContext.repoId}:${currentPlan?.jobId ?? ''}`
    if (snapshotLookupKeyRef.current === lookupKey) return

    const candidatePlan = findMatchingCompletedSnapshotPlan(sessionContext, currentPlan?.jobId)
    snapshotLookupKeyRef.current = lookupKey
    void (async () => {
      try {
        const hydratedCandidatePlan = candidatePlan ? await refreshPlan(candidatePlan.jobId) : null
        const fallbackPlan =
          hydratedCandidatePlan ??
          candidatePlan ??
          (currentPlan ? await resolveHistoricalCompletedSnapshot(currentPlan) : null) ??
          (currentPlan ? await resolveSessionBackedCompletedSnapshot(currentPlan) : null)

        if (!rememberCompletedPlanSnapshot(fallbackPlan)) {
          snapshotLookupKeyRef.current = null
        }
      } catch {
        snapshotLookupKeyRef.current = null
      }
    })()
  }, [
    currentPlan,
    findMatchingCompletedSnapshotPlan,
    lastCompletedPlanSnapshot,
    lastRepoId,
    lastSessionId,
    refreshPlan,
    resolveHistoricalCompletedSnapshot,
    resolveSessionBackedCompletedSnapshot,
    rememberCompletedPlanSnapshot,
    state.viewState
  ])

  useEffect(() => {
    if (!lastCompletedPlanSnapshot) return

    const snapshotContext = extractSessionContextFromPlan(lastCompletedPlanSnapshot)
    const currentPlanContext = currentPlan ? extractSessionContextFromPlan(currentPlan) : null
    const activeContext =
      currentPlanContext ?? (lastSessionId && lastRepoId ? { sessionId: lastSessionId, repoId: lastRepoId } : null)

    if (
      !snapshotContext ||
      snapshotContext.sessionId !== activeContext?.sessionId ||
      snapshotContext.repoId !== activeContext?.repoId
    ) {
      clearCompletedPlanSnapshot()
    }
  }, [clearCompletedPlanSnapshot, currentPlan, lastCompletedPlanSnapshot, lastRepoId, lastSessionId])

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
      clearCompletedPlanSnapshot()
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
    [clearCompletedPlanSnapshot, handlers, state, chat, userInfo?.id]
  )

  const handleNewSession = useCallback(() => {
    clearCompletedPlanSnapshot()
    resetOrchestratorState({
      chatSaveTimeoutRef,
      chat,
      buildProgress,
      orchestratorClient,
      state,
      lastChatStateRef,
      lastUiCheckpointKeyRef
    })
  }, [chat, buildProgress, clearCompletedPlanSnapshot, orchestratorClient, state])

  const buildDefaultResourceUrl = useCallback((targetPath: string): string => {
    const normalized = targetPath.replace(/^\/+|\/+$/g, '')
    const slug = normalized.split('/').filter(Boolean).pop() || normalized
    return `/platform/generated/${slug}`
  }, [])

  const formatAppNameFromTargetPath = useCallback((targetPath: string): string => {
    const slug = targetPath.split('/').filter(Boolean).pop() || targetPath
    const cleaned = slug.replace(/[^a-zA-Z0-9-_ ]/g, '')
    return (
      cleaned
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Imported App'
    )
  }, [])

  const buildImportedSessionPlan = useCallback(
    (input: {
      sessionId: string
      repoId: string
      targetPath: string
      resourceUrl?: string | null
      createdAt?: string | null
    }): BuildPlan => {
      const appName = formatAppNameFromTargetPath(input.targetPath)
      const effectiveResourceUrl = input.resourceUrl || buildDefaultResourceUrl(input.targetPath)
      return {
        jobId: '',
        originalPrompt: `Imported app from ${input.targetPath}`,
        sessionId: input.sessionId,
        repoId: input.repoId,
        analysis: {
          summary: `Imported existing app at ${input.targetPath}`,
          intent: 'Imported app session',
          complexity: 'moderate',
          requiresDataModel: false,
          requiresFunctions: false,
          requiresAgents: false,
          requiresFlows: false,
          requiresScreens: true,
          notes: ['Session imported from local folder; no plan generated automatically.']
        },
        userSummary: {
          title: appName,
          whatYouGet: ['Existing app code imported into a new isolated session'],
          whatYouCanDo: ['Preview current UI', 'Import updates', 'Continue iterative AI fixes'],
          businessValue: 'Start from a real baseline app without forcing an initial planning cycle.',
          estimatedTime: 'Ready now'
        },
        components: [
          {
            id: `imported-screen-${input.sessionId}`,
            type: 'screen',
            name: appName.replace(/\s+/g, ''),
            description: `Imported screen for ${appName}`,
            status: 'completed',
            dependencies: [],
            screenSpec: {
              screenType: 'dashboard',
              name: appName.replace(/\s+/g, ''),
              title: appName,
              description: `Imported from ${input.targetPath}`
            },
            resourceUrl: effectiveResourceUrl,
            metadata: {
              sessionId: input.sessionId,
              repoId: input.repoId,
              resourceUrl: effectiveResourceUrl
            }
          }
        ],
        estimatedDurationSeconds: 0,
        createdAt: input.createdAt || new Date().toISOString(),
        status: 'completed',
        currentPhase: 'complete',
        appMetadata: {
          name: appName,
          icon: 'LayoutDashboard',
          description: `Imported app from ${input.targetPath}`,
          longDescription: 'Imported existing app session. Plan generation is optional and user-initiated.',
          category: 'Imported App',
          tags: ['imported'],
          version: '1.0.0'
        }
      }
    },
    [buildDefaultResourceUrl, formatAppNameFromTargetPath]
  )

  const openImportedSession = useCallback(
    async (input: {
      sessionId: string
      repoId: string
      targetPath: string
      resourceUrl?: string | null
      createdAt?: string | null
      announce?: boolean
    }) => {
      const importedPlan = buildImportedSessionPlan(input)
      setCurrentPlanSnapshot(importedPlan)
      setSessionFromBuild(input.sessionId, input.repoId)
      rememberCompletedPlanSnapshot(importedPlan)
      setReviewCanvasMode('plan')
      state.setViewState('complete')
      state.setChatActive(true)
      state.setUserPrompt('')

      const persistedHistory = await builderClient.loadChatHistory(input.repoId, input.sessionId).catch(() => null)
      if (Array.isArray(persistedHistory) && persistedHistory.length > 0) {
        chat.replaceMessages(fromPersistedChatMessages(persistedHistory))
      } else {
        chat.resetMessages()
      }

      if (input.announce !== false) {
        chat.addSystemMessage(
          `Imported app ready. Viewing current state from ${input.targetPath}. No plan was generated automatically.`
        )
      }
      setPreviewRefreshToken(prev => prev + 1)
    },
    [
      buildImportedSessionPlan,
      builderClient,
      chat,
      rememberCompletedPlanSnapshot,
      setCurrentPlanSnapshot,
      setSessionFromBuild,
      state
    ]
  )

  useEffect(() => {
    if (initialJobId || !initialSessionId || !accessToken) return
    const restoreKey = `session:${initialSessionId}:${accessToken}`
    if (initialRestoreKeyRef.current === restoreKey) return
    initialRestoreKeyRef.current = restoreKey

    isRestoringSessionRef.current = true
    setIsRestoringSession(true)
    ;(async () => {
      try {
        const sessionResponse = await builderClient.getSession(initialSessionId)
        const session = sessionResponse?.session
        if (!session?.repoId || !session.targetPath) {
          throw new Error('Session context is incomplete for imported app preview.')
        }
        await openImportedSession({
          sessionId: session.sessionId,
          repoId: session.repoId,
          targetPath: session.targetPath,
          resourceUrl: session.resourceUrl,
          createdAt: session.createdAt,
          announce: false
        })
        setRestoreComplete(true)
      } catch {
        isRestoringSessionRef.current = false
        setIsRestoringSession(false)
      }
    })()
  }, [
    accessToken,
    builderClient,
    initialJobId,
    initialSessionId,
    openImportedSession,
    setIsRestoringSession,
    setRestoreComplete
  ])

  const resolveSessionDetails = useCallback(async (): Promise<{
    targetPath: string | null
    resourceUrl: string | null
  }> => {
    if (!lastSessionId) {
      return { targetPath: null, resourceUrl: null }
    }
    try {
      const sessionResponse = await builderClient.getSession(lastSessionId)
      return {
        targetPath: sessionResponse?.session?.targetPath ?? null,
        resourceUrl: sessionResponse?.session?.resourceUrl ?? null
      }
    } catch {
      return { targetPath: null, resourceUrl: null }
    }
  }, [builderClient, lastSessionId])

  const resolveSessionTargetPath = useCallback(async (): Promise<string | null> => {
    const details = await resolveSessionDetails()
    return details.targetPath
  }, [resolveSessionDetails])

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
    (
      checkpoint: { snapshot?: Record<string, unknown> } | null,
      restoredPlan: typeof currentPlan
    ): 'review' | 'complete' | 'error' => {
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
      const restoredCheckpointJobId = typeof restoredCheckpoint?.jobId === 'string' ? restoredCheckpoint.jobId : null
      const checkpointJobId = typeof checkpoint.jobId === 'string' ? checkpoint.jobId : null
      const restoredJobId = restoredCheckpointJobId ?? checkpointJobId
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

        let latestPlan = restoredPlan
        if (!latestPlan && typeof checkpoint?.jobId === 'string') {
          latestPlan = await refreshPlan(checkpoint.jobId)
        }
        if (!latestPlan && currentPlan?.jobId) {
          latestPlan = await refreshPlan(currentPlan.jobId)
        }
        if (!latestPlan) {
          latestPlan = currentPlan
        }
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
      const previousAssistant = historySnapshot
        .slice(0, targetIndex)
        .reverse()
        .find(item => item.role === 'assistant')

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

        let latestPlan = restoredPlan
        if (!latestPlan && typeof restoredCheckpoint?.jobId === 'string') {
          latestPlan = await refreshPlan(restoredCheckpoint.jobId)
        }
        if (!latestPlan && currentPlan?.jobId) {
          latestPlan = await refreshPlan(currentPlan.jobId)
        }
        if (!latestPlan) {
          latestPlan = currentPlan
        }
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

  const captureVersionForCurrentSession = useCallback(
    async (options?: { silent?: boolean; versionNote?: string }) => {
      const sessionId = lastSessionId
      const repoId = lastRepoId ?? currentPlan?.repoId ?? null
      if (!sessionId || !repoId) {
        throw new Error('No active app session available to version.')
      }

      const details = await resolveSessionDetails()
      if (!details.targetPath) {
        throw new Error('Target path is not available for this session.')
      }

      const resourceUrl = details.resourceUrl || buildDefaultResourceUrl(details.targetPath)

      const version = await builderClient.captureSessionVersion({
        repoId,
        sessionId,
        targetPath: details.targetPath,
        resourceUrl,
        versionNote: options?.versionNote ?? 'Manual version save'
      })

      if (!options?.silent) {
        chat.addSystemMessage(`Version saved: v${version.versionMajor}.${version.versionMinor}`)
      }

      return {
        version,
        sessionId,
        targetPath: details.targetPath
      }
    },
    [
      buildDefaultResourceUrl,
      builderClient,
      chat,
      currentPlan?.repoId,
      lastRepoId,
      lastSessionId,
      resolveSessionDetails
    ]
  )

  const handleSaveVersion = useCallback(async () => {
    setIsSavingVersion(true)
    try {
      await captureVersionForCurrentSession()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save version.'
      chat.addSystemMessage(message)
    } finally {
      setIsSavingVersion(false)
    }
  }, [captureVersionForCurrentSession, chat])

  const handleDownloadPackage = useCallback(async () => {
    const sessionId = lastSessionId
    const repoId = lastRepoId ?? currentPlan?.repoId ?? null
    if (!sessionId || !repoId) {
      chat.addSystemMessage('No active app session available for package download.')
      return
    }

    const { targetPath } = await resolveSessionDetails()
    if (!targetPath) {
      chat.addSystemMessage('Target path is not available for this session.')
      return
    }

    try {
      const { version: latest } = await captureVersionForCurrentSession({
        silent: true,
        versionNote: 'Download package capture'
      })
      const blob = await builderClient.downloadVersionPackage(latest.id)
      const safeTargetPath = targetPath.replace(/[\\/]/g, '-').replace(/[^a-zA-Z0-9._-]/g, '_')
      const filename = `ai-builder-${safeTargetPath}-v${latest.versionMajor}.${latest.versionMinor}.zip`
      const blobUrl = URL.createObjectURL(blob)
      try {
        const link = Object.assign(document.createElement('a'), {
          href: blobUrl,
          download: filename
        })
        link.click()
      } finally {
        URL.revokeObjectURL(blobUrl)
      }

      chat.addSystemMessage(`Downloaded app package: ${filename}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download app package.'
      chat.addSystemMessage(message)
    }
  }, [
    builderClient,
    captureVersionForCurrentSession,
    chat,
    currentPlan?.repoId,
    lastRepoId,
    lastSessionId,
    resolveSessionDetails
  ])

  const toSessionUser = useCallback(() => {
    return {
      id: String(userInfo?.id ?? 'unknown-user'),
      employeeId: String(userInfo?.employeeId ?? ''),
      firstName: String(userInfo?.firstName ?? userInfo?.givenName ?? ''),
      lastName: String(userInfo?.lastName ?? userInfo?.familyName ?? ''),
      displayName: String(userInfo?.displayName ?? userInfo?.name ?? 'Unknown User'),
      email: typeof userInfo?.email === 'string' ? userInfo.email : undefined,
      pictureThumbnail:
        typeof userInfo?.pictureThumbnail === 'string'
          ? userInfo.pictureThumbnail
          : typeof userInfo?.picture === 'string'
            ? userInfo.picture
            : undefined,
      consentToStorePii: Boolean(userInfo?.consentToStorePii)
    }
  }, [userInfo])

  const resolveRepoIdForImport = useCallback(async (): Promise<string | null> => {
    let repoId =
      lastRepoId ??
      currentPlan?.repoId ??
      recentPlans?.find(plan => typeof plan.repoId === 'string' && plan.repoId.trim().length > 0)?.repoId ??
      null
    if (!repoId) {
      const appConfig = await builderClient.fetchAppConfig().catch(() => null)
      repoId = appConfig?.repositoryId || null
    }
    return repoId
  }, [builderClient, currentPlan?.repoId, lastRepoId, recentPlans])

  const resetImportNewAppDialog = useCallback(() => {
    setImportNewAppDialogOpen(false)
    setPendingImportFiles(null)
    setImportDialogError(null)
    setImportTargetPath('')
    setImportResourceUrl('')
  }, [])

  const syncUrlToImportedSession = useCallback((sessionId: string) => {
    const params = new URLSearchParams(globalThis.location.search)
    params.set('sessionId', sessionId)
    params.delete('jobId')
    const nextUrl = params.toString()
      ? `${globalThis.location.pathname}?${params.toString()}`
      : globalThis.location.pathname
    globalThis.history.replaceState({}, '', nextUrl)
  }, [])

  const handleImportFolderFromScreenBuilder = useCallback(
    async (files: File[], mode: 'update' | 'new') => {
      if (!Array.isArray(files) || files.length === 0) return

      if (mode === 'new') {
        const firstPath = files[0].webkitRelativePath || files[0].name || 'imported-app'
        const defaultTargetPath = firstPath.split('/').filter(Boolean)[0]?.trim().replace(/\s+/g, '-') || 'imported-app'
        setPendingImportFiles(files)
        setImportTargetPath(defaultTargetPath)
        setImportResourceUrl(buildDefaultResourceUrl(defaultTargetPath))
        setImportDialogError(null)
        setImportNewAppDialogOpen(true)
        return
      }

      setIsImportingFolder(true)
      try {
        const repoId = await resolveRepoIdForImport()
        if (!repoId) {
          throw new Error('No repository is available for folder import.')
        }
        if (!lastSessionId) {
          throw new Error('No active session is available to update.')
        }

        const details = await resolveSessionDetails()
        if (!details.targetPath) {
          throw new Error('Target path is missing for the active session.')
        }

        const resourceUrl = details.resourceUrl || buildDefaultResourceUrl(details.targetPath)

        await builderClient.importFolderSnapshot({
          files,
          sessionId: lastSessionId,
          repoId,
          targetPath: details.targetPath,
          resourceUrl,
          applyToCache: true,
          versionNote: 'Imported folder snapshot (screen builder update)',
          createdBy: toSessionUser(),
          importMode: 'update'
        })

        if (currentPlan?.jobId) {
          await refreshPlan(currentPlan.jobId)
        }
        setPreviewRefreshToken(prev => prev + 1)
        chat.addSystemMessage('Folder imported successfully. Existing app session was updated.')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to import folder.'
        chat.addSystemMessage(message)
      } finally {
        setIsImportingFolder(false)
      }
    },
    [
      buildDefaultResourceUrl,
      builderClient,
      chat,
      currentPlan?.jobId,
      lastSessionId,
      refreshPlan,
      resolveRepoIdForImport,
      resolveSessionDetails,
      toSessionUser
    ]
  )

  const handleConfirmImportFolderAsNewApp = useCallback(async () => {
    if (!pendingImportFiles || pendingImportFiles.length === 0) return
    const normalizedTargetPath = importTargetPath.trim().replace(/^\/+|\/+$/g, '')
    if (!normalizedTargetPath) {
      setImportDialogError('Target path is required.')
      return
    }

    const repoId = await resolveRepoIdForImport()
    if (!repoId) {
      setImportDialogError('No repository is available for folder import.')
      return
    }

    const rawResourceUrl = importResourceUrl.trim()
    const resourceUrl = rawResourceUrl
      ? rawResourceUrl.startsWith('/')
        ? rawResourceUrl
        : `/${rawResourceUrl}`
      : buildDefaultResourceUrl(normalizedTargetPath)

    setIsImportingFolder(true)
    setImportDialogError(null)
    try {
      const createdBy = toSessionUser()
      const newSession = await builderClient.saveSession({
        repoId,
        targetPath: normalizedTargetPath,
        resourceUrl,
        fileCount: 0,
        description: `Imported from local folder (${normalizedTargetPath})`,
        createdBy
      })

      await builderClient.importFolderSnapshot({
        files: pendingImportFiles,
        sessionId: newSession.sessionId,
        repoId,
        targetPath: normalizedTargetPath,
        resourceUrl,
        applyToCache: true,
        versionNote: 'Imported folder snapshot (screen builder new app)',
        createdBy,
        importMode: 'new'
      })
      syncUrlToImportedSession(newSession.sessionId)
      await openImportedSession({
        sessionId: newSession.sessionId,
        repoId,
        targetPath: normalizedTargetPath,
        resourceUrl,
        createdAt: new Date().toISOString(),
        announce: true
      })
      resetImportNewAppDialog()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import folder.'
      setImportDialogError(message)
      chat.addSystemMessage(message)
    } finally {
      setIsImportingFolder(false)
    }
  }, [
    pendingImportFiles,
    importTargetPath,
    resolveRepoIdForImport,
    importResourceUrl,
    buildDefaultResourceUrl,
    toSessionUser,
    builderClient,
    openImportedSession,
    resetImportNewAppDialog,
    syncUrlToImportedSession,
    chat
  ])

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
        let platformPath = normalizedPath
        if (!normalizedPath.startsWith('/platform/')) {
          if (normalizedPath.startsWith('/apps/')) {
            platformPath = `/platform/generated${normalizedPath}`
          } else {
            platformPath = `/platform/generated/apps/${normalizedPath.replace(/^\/+/, '')}`
          }
        }
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

  const importNewAppDialog = (
    <ImportFolderNewAppDialog
      open={importNewAppDialogOpen}
      onOpenChange={open => {
        if (!open && !isImportingFolder) {
          resetImportNewAppDialog()
          return
        }
        setImportNewAppDialogOpen(open)
      }}
      title="Import Folder as New App"
      description="Create a new AI Builder app from a local folder and open it in complete preview mode."
      targetPath={importTargetPath}
      onTargetPathChange={setImportTargetPath}
      resourceUrl={importResourceUrl}
      onResourceUrlChange={setImportResourceUrl}
      confirmLabel="Create"
      isSubmitting={isImportingFolder}
      errorMessage={importDialogError}
      onConfirm={handleConfirmImportFolderAsNewApp}
    />
  )

  if (!state.chatActive && state.viewState === 'idle' && !sidebarOpen) {
    return (
      <>
        <div
          className="gba:flex gba:h-full gba:min-h-0 gba:w-full gba:flex-col gba:overflow-hidden gba:bg-background gba:rounded-t-none"
          data-testid={testId}
        >
          <IdleCanvas
            onSubmit={handleIdleSubmit}
            isLoading={orchestratorClient.isAnalyzing}
            onOpenHistory={handleOpenHistory}
            recentPlans={recentPlans}
            onSelectSession={handleSelectSession}
            onImportFolderAsNewApp={files => handleImportFolderFromScreenBuilder(files, 'new')}
            isImportingFolderAsNewApp={isImportingFolder}
          />
        </div>
        {importNewAppDialog}
      </>
    )
  }

  return (
    <>
      <div
        className="gba:relative gba:flex gba:h-full gba:min-h-0 gba:w-full gba:flex-col gba:overflow-hidden gba:bg-background"
        data-testid={testId}
      >
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
              showComposerChangeScope={state.viewState === 'complete'}
              composerChangeScope={fixComposerScope}
              onComposerChangeScope={setFixComposerScope}
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
              onSaveVersion={handleSaveVersion}
              isSavingVersion={isSavingVersion}
              onDownloadPackage={handleDownloadPackage}
              onImportFolder={handleImportFolderFromScreenBuilder}
              isImportingFolder={isImportingFolder}
              reviewCanvasMode={reviewCanvasMode}
              completedBuildSnapshot={lastCompletedPlanSnapshot}
              canShowExistingBuild={canShowExistingBuild(lastCompletedPlanSnapshot)}
              onShowExistingBuild={showExistingBuild}
              onShowReviewPlan={showReviewPlan}
            />
          }
        />
      </div>
      {importNewAppDialog}
    </>
  )
}

export default OrchestratorViewConversational
