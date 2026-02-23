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
}

export const useOrchestratorEffects = ({ state, handlers, buildProgress, initialPrompt }: OrchestratorEffectsDeps) => {
  // Helper to update thinking steps
  const updateThinkingSteps = (prev: any[]) => {
    const nextPending = prev.findIndex(s => s.status === 'pending')
    if (nextPending === -1) return prev
    const updated = [...prev]
    const currentActive = prev.findIndex(s => s.status === 'active')
    if (currentActive !== -1) {
      updated[currentActive] = {
        ...updated[currentActive],
        status: 'complete',
        duration: Math.floor(Math.random() * 500 + 200)
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

      const progressInterval = setInterval(() => {
        state.setAnalysisProgress(updateAnalysisProgress)
        state.setThinkingSteps(updateThinkingSteps)
      }, 1500)

      return () => clearInterval(progressInterval)
    }
  }, [state.viewState, state.setThinkingSteps, state.setAnalysisProgress])

  // Build log tracking
  useEffect(() => {
    if (!buildProgress.isBuilding && !buildProgress.currentPhase) return

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })

    // Log phase transitions (only once per phase)
    if (buildProgress.currentPhase && !state.loggedPhasesRef.current.has(buildProgress.currentPhase)) {
      state.loggedPhasesRef.current.add(buildProgress.currentPhase)

      if (buildProgress.currentPhase === 'discovery') {
        state.setBuildLogs(prev => [
          ...prev,
          { timestamp, type: 'info', message: 'Starting resource discovery phase...' }
        ])
      } else if (buildProgress.currentPhase === 'building') {
        state.setBuildLogs(prev => [
          ...prev,
          { timestamp, type: 'info', message: 'Starting component building phase...' }
        ])
      } else if (buildProgress.currentPhase === 'wiring') {
        state.setBuildLogs(prev => [
          ...prev,
          { timestamp, type: 'info', message: 'Starting component wiring phase...' }
        ])
      }
    }

    // Log component completions (only when count increases)
    if (buildProgress.completedCount > state.lastCompletedCountRef.current) {
      state.lastCompletedCountRef.current = buildProgress.completedCount
      state.setBuildLogs(prev => [...prev, { timestamp, type: 'success', message: 'Component completed successfully' }])
    }
  }, [
    buildProgress.currentPhase,
    buildProgress.completedCount,
    buildProgress.isBuilding,
    state.setBuildLogs,
    state.loggedPhasesRef,
    state.lastCompletedCountRef
  ])

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
