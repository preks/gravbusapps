import { useCallback } from 'react'
import type { OrchestratorState } from './useOrchestratorState'
import type { UseOrchestratorClientResult } from './useOrchestratorClient'
import type { UseBuildProgressResult } from './useBuildProgress'
import type { ComponentSpec } from '../types'

export interface OrchestratorHandlerDeps {
  state: OrchestratorState
  orchestratorClient: UseOrchestratorClientResult
  buildProgress: UseBuildProgressResult
  onComplete?: (success: boolean) => void
  onBack?: () => void
}

export interface OrchestratorHandlers {
  handleAnalyze: (prompt: string) => Promise<void>
  handleReanalyze: (answers: Record<string, string>) => Promise<void>
  handleEditPlan: (updatedComponents: ComponentSpec[]) => Promise<void>
  handleRefine: (feedback: string) => Promise<void>
  handleStartBuild: (skipComponents?: string[]) => Promise<void>
  handleCancel: () => void
  handleReset: () => void
}

export const useOrchestratorHandlers = ({
  state,
  orchestratorClient,
  buildProgress,
  onBack
}: OrchestratorHandlerDeps): OrchestratorHandlers => {
  // Handle analyze prompt (from idle state input)
  const handleAnalyze = useCallback(
    async (prompt: string) => {
      state.setUserPrompt(prompt)
      state.setViewState('analyzing')

      const response = await orchestratorClient.analyze(prompt)

      if (response.success && response.plan) {
        state.setAnalysisProgress(100)
        state.setThinkingSteps(prev =>
          prev.map(s => ({ ...s, status: 'complete' as const, duration: Math.floor(Math.random() * 500 + 200) }))
        )
        setTimeout(() => state.setViewState('review'), 500)
      } else {
        state.setViewState('error')
      }
    },
    [orchestratorClient.analyze, state]
  )

  // Handle re-analyze
  const handleReanalyze = useCallback(
    async (answers: Record<string, string>) => {
      state.setViewState('analyzing')
      const response = await orchestratorClient.reanalyze(answers)

      if (response.success && response.plan) {
        state.setViewState('review')
      } else {
        state.setViewState('error')
      }
    },
    [orchestratorClient.reanalyze, state]
  )

  // Handle edit plan
  const handleEditPlan = useCallback(
    async (updatedComponents: ComponentSpec[]) => {
      if (!orchestratorClient.currentPlan) return

      state.setIsSavingPlan(true)
      state.setEditError(null)

      try {
        await orchestratorClient.updatePlan(orchestratorClient.currentPlan.job_id, {
          components: updatedComponents,
          update_reason: 'User modified plan from UI'
        })

        // Close modal on success
        state.setIsEditModalOpen(false)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update plan'
        state.setEditError(errorMessage)
        console.error('Edit plan error:', error)
      } finally {
        state.setIsSavingPlan(false)
      }
    },
    [orchestratorClient.currentPlan, orchestratorClient.updatePlan, state]
  )

  // Handle refine plan
  const handleRefine = useCallback(
    async (feedback: string) => {
      if (!orchestratorClient.currentPlan) return

      await orchestratorClient.refinePlan(orchestratorClient.currentPlan.job_id, feedback)
      // Plan is automatically updated by the hook
      // Summary is shown in the UI
    },
    [orchestratorClient.currentPlan, orchestratorClient.refinePlan]
  )

  // Handle start build
  const handleStartBuild = useCallback(
    async (skipComponents?: string[]) => {
      state.setViewState('building')
      state.setBuildStartTime(Date.now())
      state.setCapturedBuildError(null)
      state.setBuildLogs([
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'info',
          message: 'Build started...'
        }
      ])

      // Reset log tracking refs
      state.loggedPhasesRef.current.clear()
      state.lastCompletedCountRef.current = 0

      await buildProgress.startBuild(skipComponents)
    },
    [buildProgress.startBuild, state]
  )

  // Handle cancel
  const handleCancel = useCallback(() => {
    buildProgress.cancelBuild()
    orchestratorClient.clearPlan()
    state.setViewState('idle')
    state.setBuildLogs([])
    state.loggedPhasesRef.current.clear()
    state.lastCompletedCountRef.current = 0
    state.hasTriggeredInitialAnalysis.current = false
  }, [buildProgress.cancelBuild, orchestratorClient.clearPlan, state])

  // Handle reset - Navigate back to landing page
  const handleReset = useCallback(() => {
    // If onBack callback provided, use it to navigate back to landing
    if (onBack) {
      onBack()
      return
    }

    // Otherwise, reset to idle state (fallback)
    buildProgress.resetProgress()
    orchestratorClient.clearPlan()
    state.setViewState('idle')
    state.setUserPrompt('')
    state.setBuildLogs([])
    state.setThinkingSteps([])
    state.setBuildDuration(0)
    state.setCapturedBuildError(null)
    state.loggedPhasesRef.current.clear()
    state.lastCompletedCountRef.current = 0
    state.hasTriggeredInitialAnalysis.current = false
  }, [onBack, buildProgress.resetProgress, orchestratorClient.clearPlan, state])

  return {
    handleAnalyze,
    handleReanalyze,
    handleEditPlan,
    handleRefine,
    handleStartBuild,
    handleCancel,
    handleReset
  }
}
