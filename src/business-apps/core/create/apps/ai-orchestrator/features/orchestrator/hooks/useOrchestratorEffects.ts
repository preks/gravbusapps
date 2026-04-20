import { useEffect, useMemo } from 'react'
import type { OrchestratorState } from './useOrchestratorState'
import type { UseBuildProgressResult } from './useBuildProgress'
import type { BuildPhase } from '../types'

export interface OrchestratorEffectsDeps {
  state: OrchestratorState
  handlers: {
    handleAnalyze: (prompt: string) => Promise<void>
  }
  buildProgress: UseBuildProgressResult
  initialPrompt?: string
  isAnalyzeStreaming?: boolean
}

export const useOrchestratorEffects = ({
  state,
  handlers,
  buildProgress,
  initialPrompt,
  isAnalyzeStreaming = false
}: OrchestratorEffectsDeps) => {
  // Helper to update thinking steps
  const updateThinkingSteps = (prev: any[]) => {
    const nextPending = prev.findIndex(s => s.status === 'pending')
    if (nextPending === -1) return prev
    const updated = [...prev]
    const currentActive = prev.findIndex(s => s.status === 'active')
    if (currentActive !== -1) {
      updated[currentActive] = {
        ...updated[currentActive],
        status: 'complete'
      }
    }
    updated[nextPending] = { ...updated[nextPending], status: 'active' }
    return updated
  }

  // Helper to update analysis progress
  const updateAnalysisProgress = (prev: number) => {
    if (prev >= 90) return prev
    return Math.min(prev + 10, 90)
  }

  // Initialize thinking steps when analysis starts
  useEffect(() => {
    if (state.viewState === 'analyzing') {
      state.setThinkingSteps([
        { id: '1', title: 'Understanding intent', detail: 'Analyzing your request...', status: 'active' },
        { id: '2', title: 'Identifying components', detail: 'Planning architecture...', status: 'pending' },
        { id: '3', title: 'Checking dependencies', detail: 'Analyzing requirements...', status: 'pending' },
        { id: '4', title: 'Generating plan', detail: 'Creating build strategy...', status: 'pending' }
      ])
      state.setAnalysisProgress(25)

      if (isAnalyzeStreaming) {
        return
      }

      const progressInterval = setInterval(() => {
        state.setAnalysisProgress(updateAnalysisProgress)
        state.setThinkingSteps(updateThinkingSteps)
      }, 1500)

      return () => clearInterval(progressInterval)
    }
  }, [state.viewState, state.setThinkingSteps, state.setAnalysisProgress, isAnalyzeStreaming])

  // Handle initial prompt on mount
  useEffect(() => {
    if (initialPrompt && !state.hasTriggeredInitialAnalysis.current) {
      state.hasTriggeredInitialAnalysis.current = true
      handlers.handleAnalyze(initialPrompt)
    }
  }, [initialPrompt, handlers.handleAnalyze, state.hasTriggeredInitialAnalysis])

  // Completed phases for timeline (memoized)
  const completedPhases = useMemo((): BuildPhase[] => {
    const phases: BuildPhase[] = []
    if (
      buildProgress.currentPhase === 'building' ||
      buildProgress.currentPhase === 'wiring' ||
      buildProgress.currentPhase === 'complete'
    ) {
      phases.push('discovery')
    }
    if (buildProgress.currentPhase === 'wiring' || buildProgress.currentPhase === 'complete') {
      phases.push('building')
    }
    if (buildProgress.currentPhase === 'complete') {
      phases.push('wiring')
    }
    return phases
  }, [buildProgress.currentPhase])

  return { completedPhases }
}
