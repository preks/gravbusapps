/**
 * useOrchestratorRestore - Encapsulates session restore logic for the conversational view.
 * Used on mount (initialJobId) and when selecting a session from history.
 */

import { useCallback, type MutableRefObject } from 'react'
import type { OrchestratorState } from './useOrchestratorState'
import type { BuildPlan, OrchestratorViewState } from '../types'
import type { ChatMessage as BuilderChatMessage } from '@/common/network/ai/builder/BuilderClient'
import type { CreateChatMessage } from '../types/chat'
import { isValidOrchestratorViewState } from '../utils/orchestratorSessionUtils'
import { fromPersistedChatMessages } from '../utils/chatMessageConversion'

export interface UseOrchestratorRestoreOptions {
  listDraftCheckpoints: (params: {
    jobId?: string
    sessionId?: string
    limit?: number
  }) => Promise<{ checkpointId: string; snapshot?: { viewState?: unknown } }[]>
  restoreDraftCheckpoint: (
    checkpointId: string,
    sessionId?: string
  ) => Promise<{
    checkpoint?: { snapshot?: { viewState?: unknown } }
  }>
  builderClient: {
    loadChatHistory: (repoId: string, sessionId: string) => Promise<BuilderChatMessage[]>
  }
  chat: {
    replaceMessages: (messages: CreateChatMessage[]) => void
    addSystemMessage: (content: string) => string
  }
  state: OrchestratorState
  setSessionFromBuild: (sessionId?: string, repoId?: string) => void
  lastChatStateRef: MutableRefObject<string | null>
}

export function useOrchestratorRestore(options: UseOrchestratorRestoreOptions) {
  const {
    listDraftCheckpoints,
    restoreDraftCheckpoint,
    builderClient,
    chat,
    state,
    setSessionFromBuild,
    lastChatStateRef
  } = options

  const resolveViewStateFromCheckpoint = useCallback(
    async (
      sessionContext: { sessionId: string; repoId: string },
      plan: BuildPlan,
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
    async (plan: BuildPlan) => {
      const alreadyBuilt =
        plan.status === 'completed' || plan.components.some(c => c.status === 'completed' || c.status === 'reused')

      // Get session directly from plan (no need to extract from components)
      const sessionContext = plan.sessionId && plan.repoId ? { sessionId: plan.sessionId, repoId: plan.repoId } : null

      const baseViewState: OrchestratorViewState = alreadyBuilt ? 'complete' : 'review'
      const resolvedViewState = sessionContext
        ? await resolveViewStateFromCheckpoint(sessionContext, plan, baseViewState)
        : baseViewState

      let loadedHistory = false
      if (sessionContext) {
        try {
          const history = await builderClient.loadChatHistory(sessionContext.repoId, sessionContext.sessionId)
          if (history.length > 0) {
            const normalizedHistory = fromPersistedChatMessages(history)
            chat.replaceMessages(normalizedHistory)
            loadedHistory = true
          }
        } catch {
          // Chat hydration is best-effort
        }
      }

      if (sessionContext) {
        setSessionFromBuild(sessionContext.sessionId, sessionContext.repoId)
      } else {
        setSessionFromBuild(undefined, undefined)
      }

      if (!loadedHistory) {
        const fallbackTitle = plan.userSummary?.title || plan.appMetadata?.name || ''
        const fallbackMessage = fallbackTitle
          ? `Chat history is unavailable for "${fallbackTitle}".`
          : 'Chat history is unavailable for this session.'
        chat.addSystemMessage(fallbackMessage)
      }

      lastChatStateRef.current = loadedHistory ? `${resolvedViewState}:${plan.jobId}` : null
      state.setChatActive(true)
      state.setViewState(resolvedViewState)
    },
    [chat, state, builderClient, setSessionFromBuild, resolveViewStateFromCheckpoint, lastChatStateRef]
  )

  return { applyRestoredPlan }
}
