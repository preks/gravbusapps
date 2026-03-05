import { useCallback } from 'react'
import type { ThinkingStep } from '../components/widgets/ThinkingSteps'
import type { OrchestratorState } from './useOrchestratorState'
import type { UseOrchestratorClientResult } from './useOrchestratorClient'
import type { UseBuildProgressResult } from './useBuildProgress'
import type { ComponentSpec } from '../types'

function createBumpAnalysisProgress(state: OrchestratorState) {
  return (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return
    const normalized = Math.max(0, Math.min(100, Math.floor(value)))
    state.setAnalysisProgress(prev => Math.max(prev, normalized))
  }
}

function mapThinkingStepsWithProgress(
  prev: ThinkingStep[],
  stepIndex: number,
  stepStartTimes: Record<number, number>,
  timestamp: number,
  detail: string | undefined
): ThinkingStep[] {
  return prev.map((step, index) => {
    if (index < stepIndex) {
      const startTime = stepStartTimes[index]
      const duration = startTime ? timestamp - startTime : undefined
      return step.status === 'complete' ? step : { ...step, status: 'complete' as const, duration }
    }
    if (index === stepIndex) {
      return { ...step, status: 'active' as const, detail: detail ?? step.detail }
    }
    return { ...step, status: 'pending' as const }
  })
}

/** Build createdBy payload from userInfo for build API */
function buildCreatedByFromUserInfo(userInfo: any):
  | undefined
  | {
      id: string
      employeeId?: string
      firstName?: string
      lastName?: string
      displayName?: string
      email?: string
      consentToStorePii: boolean
    } {
  if (!userInfo) return undefined
  return {
    id: userInfo.id || userInfo.employeeDetails?.employeeId || 'unknown',
    employeeId: userInfo.employeeDetails?.employeeId,
    firstName: userInfo.givenName || userInfo.employeeDetails?.firstName,
    lastName: userInfo.familyName || userInfo.employeeDetails?.lastName,
    displayName:
      [userInfo.givenName, userInfo.familyName].filter(Boolean).join(' ') ||
      userInfo.userName ||
      userInfo.employeeDetails?.displayName,
    email: userInfo.email || userInfo.employeeDetails?.email,
    consentToStorePii: true
  }
}

/** Set building state, clear refs, and initial log entry */
function prepareBuildRun(state: OrchestratorState, logMessage: string): void {
  state.setViewState('building')
  state.setBuildStartTime(Date.now())
  state.setCapturedBuildError(null)
  state.setBuildLogs([
    {
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type: 'info',
      message: logMessage
    }
  ])
  state.loggedPhasesRef.current.clear()
  state.lastCompletedCountRef.current = 0
}

export interface OrchestratorHandlerDeps {
  state: OrchestratorState
  orchestratorClient: UseOrchestratorClientResult
  buildProgress: UseBuildProgressResult
  userInfo?: any
  onComplete?: (success: boolean) => void
  onBack?: () => void
}

export interface OrchestratorHandlers {
  handleAnalyze: (prompt: string) => Promise<void>
  handleReanalyze: (answers: Record<string, string>) => Promise<void>
  handleEditPlan: (updatedComponents: ComponentSpec[]) => Promise<void>
  handleRefine: (feedback: string) => Promise<void>
  handleStartBuild: (skipComponents?: string[]) => Promise<void>
  handleRetry: () => Promise<void>
  handleCancel: () => void
  handleReset: () => void
}

export const useOrchestratorHandlers = ({
  state,
  orchestratorClient,
  buildProgress,
  userInfo,
  onBack
}: OrchestratorHandlerDeps): OrchestratorHandlers => {
  // Handle analyze prompt (from idle state input)
  const handleAnalyze = useCallback(
    async (prompt: string) => {
      const bumpAnalysisProgress = createBumpAnalysisProgress(state)

      // Track step start times for duration calculation
      const stepStartTimes: Record<number, number> = {}

      state.setUserPrompt(prompt)
      state.setChatActive(true)
      state.setViewState('analyzing')
      state.setCapturedBuildError(null)

      const response = await orchestratorClient.analyzeStream(prompt, undefined, event => {
        bumpAnalysisProgress(event.progress)

        const detail = typeof event.content === 'string' ? event.content : undefined
        const timestamp = event.timestamp ? new Date(event.timestamp).getTime() : Date.now()

        let stepIndex: number | null = null

        switch (event.type) {
          case 'analysis_started':
            stepIndex = 0
            break
          case 'planning_started':
            stepIndex = 1
            break
          case 'discovery_started':
          case 'discovery_completed':
            stepIndex = 2
            break
          case 'llm_started':
          case 'llm_completed':
          case 'plan_parsed':
          case 'plan_ready':
            stepIndex = 3
            break
          case 'error':
            if (detail) {
              state.setCapturedBuildError(detail)
            }
            return
          default:
            return
        }

        if (stepIndex !== null) {
          const currentStepIndex = stepIndex
          if (!stepStartTimes[currentStepIndex]) {
            stepStartTimes[currentStepIndex] = timestamp
          }
          state.setThinkingSteps(prev =>
            mapThinkingStepsWithProgress(prev, currentStepIndex, stepStartTimes, timestamp, detail)
          )
        }
      })

      if (response.success && response.plan) {
        state.setAnalysisProgress(100)
        // Mark all steps complete with final durations
        state.setThinkingSteps(prev =>
          prev.map((s, index) => {
            const startTime = stepStartTimes[index]
            const duration = startTime ? Date.now() - startTime : undefined
            return { ...s, status: 'complete' as const, duration }
          })
        )
        setTimeout(() => state.setViewState('review'), 250)
      } else {
        if (response.error) {
          state.setCapturedBuildError(response.error)
        }
        state.setViewState('error')
      }
    },
    [orchestratorClient.analyzeStream, state]
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
    [orchestratorClient, state]
  )

  // Handle edit plan
  const handleEditPlan = useCallback(
    async (updatedComponents: ComponentSpec[]) => {
      if (!orchestratorClient.currentPlan) return

      state.setIsSavingPlan(true)
      state.setEditError(null)

      try {
        await orchestratorClient.updatePlan(orchestratorClient.currentPlan.jobId, {
          components: updatedComponents,
          updateReason: 'User modified plan from UI'
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

      await orchestratorClient.refinePlan(orchestratorClient.currentPlan.jobId, feedback)
      // Plan is automatically updated by the hook
      // Summary is shown in the UI
    },
    [orchestratorClient.currentPlan, orchestratorClient.refinePlan]
  )

  // Handle start build
  const handleStartBuild = useCallback(
    async (skipComponents?: string[]) => {
      prepareBuildRun(state, 'Build started...')
      const sessionId = orchestratorClient.lastSessionId
      const repoId = orchestratorClient.lastRepoId
      const createdBy = buildCreatedByFromUserInfo(userInfo)
      await buildProgress.startBuild(skipComponents, sessionId ?? undefined, repoId ?? undefined, createdBy)
    },
    [buildProgress.startBuild, orchestratorClient.lastSessionId, orchestratorClient.lastRepoId, state, userInfo]
  )

  // Handle retry - Re-execute the same build plan
  const handleRetry = useCallback(async () => {
    buildProgress.resetProgress()
    prepareBuildRun(state, 'Retrying build...')
    const sessionId = orchestratorClient.lastSessionId
    const repoId = orchestratorClient.lastRepoId
    const createdBy = buildCreatedByFromUserInfo(userInfo)
    await buildProgress.startBuild(undefined, sessionId ?? undefined, repoId ?? undefined, createdBy)
  }, [buildProgress, orchestratorClient.lastSessionId, orchestratorClient.lastRepoId, state, userInfo])

  // Handle cancel
  const handleCancel = useCallback(() => {
    buildProgress.cancelBuild()
    orchestratorClient.clearPlan()
    state.setViewState('idle')
    state.setChatActive(false)
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
    state.setChatActive(false)
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
    handleRetry,
    handleCancel,
    handleReset
  }
}
