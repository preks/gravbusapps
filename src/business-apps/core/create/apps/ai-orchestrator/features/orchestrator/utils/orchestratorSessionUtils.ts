/**
 * Session and plan helpers for the orchestrator conversational view.
 */

import type React from 'react'
import type { OrchestratorState } from '../hooks/useOrchestratorState'
import type { BuildPlan, OrchestratorViewState } from '../types'

export function normalizePromptText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function extractSessionContextFromPlan(plan: BuildPlan): { sessionId: string; repoId: string } | null {
  const componentWithSession = plan.components.find(
    component =>
      typeof component.metadata?.sessionId === 'string' &&
      component.metadata.sessionId.length > 0 &&
      typeof component.metadata?.repoId === 'string' &&
      component.metadata.repoId.length > 0
  )

  if (componentWithSession) {
    return {
      sessionId: componentWithSession.metadata?.sessionId as string,
      repoId: componentWithSession.metadata?.repoId as string
    }
  }

  if (
    typeof plan.sessionId === 'string' &&
    plan.sessionId.length > 0 &&
    typeof plan.repoId === 'string' &&
    plan.repoId.length > 0
  ) {
    return {
      sessionId: plan.sessionId,
      repoId: plan.repoId
    }
  }

  return null
}

export function isValidOrchestratorViewState(value: unknown): value is OrchestratorViewState {
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

export interface ResetOrchestratorStateOptions {
  chatSaveTimeoutRef: React.MutableRefObject<number | null>
  chat: { resetMessages: () => void }
  buildProgress: { resetProgress: () => void }
  orchestratorClient: { clearPlan: () => void }
  state: OrchestratorState
  lastChatStateRef: React.MutableRefObject<string | null>
  lastUiCheckpointKeyRef: React.MutableRefObject<string | null>
}

export function resetOrchestratorState(options: ResetOrchestratorStateOptions): void {
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
