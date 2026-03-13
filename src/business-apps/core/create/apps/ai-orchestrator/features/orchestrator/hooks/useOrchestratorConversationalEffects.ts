/**
 * useOrchestratorConversationalEffects - Side effects for the conversational view:
 * URL sync, chat state messages, chat persistence, builtBy loading, UI checkpoints.
 */

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { OrchestratorState } from './useOrchestratorState'
import type { ChatMessage as BuilderChatMessage } from '@/common/network/ai/builder/BuilderClient'
import type { UseCreateChatResult } from './useCreateChat'
import type { BuildPlan } from '../types'
import { toPersistedChatMessages } from '../utils/chatMessageConversion'

export interface UseOrchestratorConversationalEffectsOptions {
  state: OrchestratorState
  chat: Pick<UseCreateChatResult, 'messages' | 'addAssistantMessage' | 'addSystemMessage'>
  currentPlan: BuildPlan | null
  initialJobId?: string
  lastSessionId: string | null
  lastRepoId: string | null
  builderClient: {
    appendChatMessage: (repoId: string, sessionId: string, message: BuilderChatMessage) => Promise<boolean>
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
    initialJobId,
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
  const [isRestoringSession, setIsRestoringSession] = useState(Boolean(initialJobId))
  const [restoreComplete, setRestoreComplete] = useState(false)
  const persistedMessageSnapshotsRef = useRef<Map<string, string>>(new Map())
  const chatPersistenceInitializedRef = useRef(false)

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
      chat.addSystemMessage(`Plan ready: ${planTitle}`)
    } else if (viewState === 'building') {
      chat.addSystemMessage('Build started. Watch the progress on the canvas.')
    } else if (viewState === 'complete') {
      chat.addSystemMessage(
        planJobId
          ? 'Build complete. You can keep chatting and request further changes.'
          : 'Imported app ready. You can keep chatting and request further changes.'
      )
    }
  }, [viewState, planJobId, planTitle, chat, isRestoringSessionRef, lastChatStateRef])

  // Reset incremental chat persistence when session changes.
  useEffect(() => {
    persistedMessageSnapshotsRef.current = new Map()
    chatPersistenceInitializedRef.current = false
  }, [lastSessionId, lastRepoId])

  // Chat persistence: debounced delta append/update (single-message payloads).
  useEffect(() => {
    const sessionId = lastSessionId
    const repoId = lastRepoId
    if (!sessionId || !repoId) return
    if (isRestoringSessionRef.current) return
    if (chat.messages.length === 0) return

    const persistable = toPersistedChatMessages(chat.messages.filter(message => !message.isStreaming)).filter(
      message => {
        const hasContent = typeof message.content === 'string' && message.content.trim().length > 0
        const hasThinking = typeof message.thinkingLog === 'string' && message.thinkingLog.trim().length > 0
        const hasBlocks =
          Array.isArray(message.blocks) &&
          message.blocks.some(block => typeof block?.content === 'string' && block.content.trim().length > 0)
        const hasToolCalls = Array.isArray(message.toolCalls) && message.toolCalls.length > 0
        return message.role === 'user' ? hasContent : hasContent || hasThinking || hasBlocks || hasToolCalls
      }
    )

    if (persistable.length === 0) return

    if (!chatPersistenceInitializedRef.current) {
      // Do not re-upload restored server history on first hydration.
      const hasServerHistory = persistable.some(message => !!message.serverCreatedAt)
      if (hasServerHistory) {
        const seeded = new Map<string, string>()
        for (const message of persistable) {
          if (!message.messageId) continue
          seeded.set(message.messageId, JSON.stringify(message))
        }
        persistedMessageSnapshotsRef.current = seeded
      }
      chatPersistenceInitializedRef.current = true
      if (hasServerHistory) {
        return
      }
    }

    if (chatSaveTimeoutRef.current !== null) {
      globalThis.window.clearTimeout(chatSaveTimeoutRef.current)
    }

    chatSaveTimeoutRef.current = globalThis.window.setTimeout(() => {
      const currentIds = new Set<string>()
      const queue = persistable.filter(message => {
        if (!message.messageId) return false
        currentIds.add(message.messageId)
        const nextSnapshot = JSON.stringify(message)
        const previousSnapshot = persistedMessageSnapshotsRef.current.get(message.messageId)
        return previousSnapshot !== nextSnapshot
      })

      for (const persistedId of Array.from(persistedMessageSnapshotsRef.current.keys())) {
        if (!currentIds.has(persistedId)) {
          persistedMessageSnapshotsRef.current.delete(persistedId)
        }
      }

      if (queue.length === 0) return

      void (async () => {
        for (const message of queue) {
          if (!message.messageId) continue
          const ok = await builderClient.appendChatMessage(repoId, sessionId, message)
          if (ok) {
            persistedMessageSnapshotsRef.current.set(message.messageId, JSON.stringify(message))
          }
        }
      })()
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

  // UI checkpoints: one server-owned checkpoint per assistant message.
  useEffect(() => {
    const jobId = planJobId
    const sessionId = lastSessionId
    if (!jobId || !sessionId) return
    if (isRestoringSessionRef.current) return
    if (viewState === 'idle') {
      return
    }

    const latestCheckpointMessage = [...chat.messages]
      .reverse()
      .find(message => message.role === 'assistant' && !message.isStreaming)
    if (!latestCheckpointMessage?.id) return

    const messageKey = `${jobId}:${sessionId}:${latestCheckpointMessage.id}`
    if (messageKey === lastUiCheckpointKeyRef.current) return
    lastUiCheckpointKeyRef.current = messageKey

    void createDraftCheckpoint({
      jobId,
      sessionId,
      repoId: lastRepoId ?? undefined,
      name: `ui_${viewState}`,
      chatCheckpointMessageId: latestCheckpointMessage.id,
      snapshot: {
        viewState,
        messageCount: chat.messages.length,
        latestMessageRole: latestCheckpointMessage.role
      }
    })
  }, [
    viewState,
    chat.messages,
    currentPlan,
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
