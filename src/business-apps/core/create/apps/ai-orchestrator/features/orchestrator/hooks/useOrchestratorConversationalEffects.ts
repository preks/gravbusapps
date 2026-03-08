/**
 * useOrchestratorConversationalEffects - Side effects for the conversational view:
 * URL sync, chat state messages, chat persistence, builtBy loading, UI checkpoints.
 */

import { useEffect, useState, type MutableRefObject } from 'react'
import type { OrchestratorState } from './useOrchestratorState'
import type { ChatMessage as BuilderChatMessage } from '@/common/network/ai/builder/BuilderClient'
import type { UseCreateChatResult } from './useCreateChat'
import { toPersistedChatMessages } from '../utils/chatMessageConversion'

export interface UseOrchestratorConversationalEffectsOptions {
  state: OrchestratorState
  chat: Pick<UseCreateChatResult, 'messages' | 'addAssistantMessage' | 'addSystemMessage'>
  currentPlan: { jobId?: string; userSummary?: { title?: string } } | null
  lastSessionId: string | null
  lastRepoId: string | null
  builderClient: {
    saveChatHistory: (repoId: string, sessionId: string, messages: BuilderChatMessage[]) => Promise<unknown>
    getSession: (sessionId: string) => Promise<{
      success: boolean
      session?: { createdBy?: unknown }
    }>
  }
  createDraftCheckpoint: (request: {
    jobId: string
    sessionId: string
    repoId?: string
    name: string
    chatCheckpointMessageId?: string
    snapshot: Record<string, unknown>
  }) => Promise<unknown>
  isRestoringSessionRef: MutableRefObject<boolean>
  lastChatStateRef: MutableRefObject<string | null>
  lastUiCheckpointKeyRef: MutableRefObject<string | null>
  chatSaveTimeoutRef: MutableRefObject<number | null>
}

export function useOrchestratorConversationalEffects(options: UseOrchestratorConversationalEffectsOptions) {
  const {
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
  } = options

  const [builtBy, setBuiltBy] = useState<unknown>(null)
  const [builtByLoading, setBuiltByLoading] = useState(false)
  const [isRestoringSession, setIsRestoringSession] = useState(false)
  const [restoreComplete, setRestoreComplete] = useState(false)

  const viewState = state.viewState
  const planJobId = currentPlan?.jobId
  const planTitle = currentPlan?.userSummary?.title

  // URL sync: keep ?jobId= in sync with the active plan
  useEffect(() => {
    const jobId = planJobId ?? null
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
  }, [planJobId])

  // Chat state messages on transitions (deduplicated via ref)
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
  }, [viewState, planJobId, planTitle, chat, isRestoringSessionRef, lastChatStateRef])

  // Chat persistence: debounced save
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
  }, [chat.messages, lastSessionId, lastRepoId, builderClient, isRestoringSessionRef, chatSaveTimeoutRef])

  // builtBy loading when sessionId changes
  useEffect(() => {
    const sessionId = lastSessionId
    if (!sessionId) {
      setBuiltBy(null)
      setBuiltByLoading(false)
      return
    }

    setBuiltBy(null)
    setBuiltByLoading(true)

    let cancelled = false
    builderClient
      .getSession(sessionId)
      .then(response => {
        if (!cancelled && response.success && response.session) {
          setBuiltBy(response.session.createdBy)
        } else if (!cancelled) {
          setBuiltBy(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBuiltBy(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBuiltByLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [lastSessionId, builderClient])

  // Hide overlay when restore complete AND builtBy has finished loading
  useEffect(() => {
    if (restoreComplete && !builtByLoading) {
      isRestoringSessionRef.current = false
      setIsRestoringSession(false)
      setRestoreComplete(false)
    }
  }, [restoreComplete, builtByLoading, isRestoringSessionRef])

  // UI checkpoints on major state transitions
  useEffect(() => {
    const jobId = planJobId
    const sessionId = lastSessionId
    if (!jobId || !sessionId) return
    if (isRestoringSessionRef.current) return
    if (!(viewState === 'review' || viewState === 'building' || viewState === 'complete' || viewState === 'error')) {
      return
    }

    const phaseKey = `${jobId}:${sessionId}:${viewState}`
    if (phaseKey === lastUiCheckpointKeyRef.current) return
    lastUiCheckpointKeyRef.current = phaseKey

    const latestMessage = chat.messages[chat.messages.length - 1] as { id?: string; role?: string }
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
  }, [
    viewState,
    chat.messages,
    createDraftCheckpoint,
    planJobId,
    lastSessionId,
    lastRepoId,
    isRestoringSessionRef,
    lastUiCheckpointKeyRef
  ])

  return {
    builtBy,
    builtByLoading,
    isRestoringSession,
    setIsRestoringSession,
    setRestoreComplete
  }
}
