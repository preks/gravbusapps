/**
 * Hook for managing orchestrator view state
 * Centralizes state management for the orchestrator view
 */

import { useState, useCallback, useRef } from 'react'
import type { OrchestratorViewState } from '../types'

export interface UseOrchestratorStateOptions {
  initialPrompt?: string
}

export interface UseOrchestratorStateResult {
  // State
  viewState: OrchestratorViewState
  prompt: string
  buildStartTime: number
  buildDuration: number

  // Actions
  setViewState: (state: OrchestratorViewState) => void
  setPrompt: (prompt: string) => void
  startBuildTimer: () => void
  stopBuildTimer: () => void
  resetState: () => void
  hasTriggeredInitialAnalysis: React.MutableRefObject<boolean>
}

/**
 * Manages the core orchestrator view state
 */
export function useOrchestratorState({ initialPrompt = '' }: UseOrchestratorStateOptions): UseOrchestratorStateResult {
  const [viewState, setViewState] = useState<OrchestratorViewState>(initialPrompt ? 'analyzing' : 'idle')
  const [prompt, setPrompt] = useState(initialPrompt)
  const [buildStartTime, setBuildStartTime] = useState<number>(0)
  const [buildDuration, setBuildDuration] = useState<number>(0)

  const hasTriggeredInitialAnalysis = useRef(false)

  const startBuildTimer = useCallback(() => {
    setBuildStartTime(Date.now())
  }, [])

  const stopBuildTimer = useCallback(() => {
    if (buildStartTime) {
      setBuildDuration(Date.now() - buildStartTime)
    }
  }, [buildStartTime])

  const resetState = useCallback(() => {
    setViewState('idle')
    setPrompt('')
    setBuildDuration(0)
    setBuildStartTime(0)
    hasTriggeredInitialAnalysis.current = false
  }, [])

  return {
    viewState,
    prompt,
    buildStartTime,
    buildDuration,
    setViewState,
    setPrompt,
    startBuildTimer,
    stopBuildTimer,
    resetState,
    hasTriggeredInitialAnalysis
  }
}
