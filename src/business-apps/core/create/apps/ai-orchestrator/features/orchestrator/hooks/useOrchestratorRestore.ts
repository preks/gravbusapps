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
  const { listDraftCheckpoints, builderClient, chat, state, setSessionFromBuild, lastChatStateRef } = options

  const deriveViewStateFromPlan = useCallback((plan: BuildPlan): OrchestratorViewState => {
    if (plan.currentPhase === 'awaiting_change_decision') {
      return 'review'
    }
    return plan.status === 'completed' ? 'complete' : 'review'
  }, [])

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
        // Never restore here: refresh/session selection should hydrate current persisted state,
        // not mutate backend state by replaying a historical checkpoint.
        const checkpointViewState = latestCheckpoint.snapshot?.viewState
        if (!isValidOrchestratorViewState(checkpointViewState)) {
          return fallback
        }

        // Plan state is authoritative for actionable review/complete modes.
        // Keep explicit error checkpoint only when plan is not already complete.
        if (checkpointViewState === 'error' && fallback !== 'complete') {
          return 'error'
        }
        return fallback
      } catch {
        return fallback
      }
    },
    [listDraftCheckpoints]
  )

  const applyRestoredPlan = useCallback(
    async (plan: BuildPlan) => {
      const alreadyBuilt =
        deriveViewStateFromPlan(plan) === 'complete'

      // Get session directly from plan (no need to extract from components)
      const sessionContext = plan.sessionId && plan.repoId ? { sessionId: plan.sessionId, repoId: plan.repoId } : null

      const baseViewState: OrchestratorViewState = alreadyBuilt ? 'complete' : deriveViewStateFromPlan(plan)
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
    [chat, state, builderClient, setSessionFromBuild, resolveViewStateFromCheckpoint, lastChatStateRef, deriveViewStateFromPlan]
  )

  return { applyRestoredPlan }
}
