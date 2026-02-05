/**
 * OrchestratorViewEnhanced - Enhanced orchestrator with premium UI/UX
 *
 * Features:
 * - AI thinking visualization
 * - Console-style build logs
 * - Phase timeline
 * - Success celebration
 * - Enhanced error recovery
 *
 * Refactored for better maintainability:
 * - Separated state management into custom hooks
 * - Split UI into view state components
 * - Extracted utilities for reusable logic
 * - Reduced main component to ~150 lines
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { useOrchestratorClient } from '../hooks/useOrchestratorClient'
import { useBuildProgress } from '../hooks/useBuildProgress'
import { useOrchestratorState } from '../hooks/useOrchestratorState'
import { useThinkingSteps } from '../hooks/useThinkingSteps'
import { useBuildLogs } from '../hooks/useBuildLogs'
import { getCompletedPhases } from '../utils/phaseUtils'
import { OrchestratorHeader } from './OrchestratorHeader'
import { IdleView, AnalyzingView, ReviewView, BuildingView } from './states'
import { SuccessState } from '../components/state-screens/SuccessState'
import { ErrorState } from '../components/state-screens/ErrorState'
import type { ComponentSpec } from '../types'

export interface OrchestratorViewEnhancedProps {
  accessToken: string
  initialPrompt?: string
  onBack?: () => void
  onComplete?: (success: boolean) => void
  'data-testid'?: string
}

/**
 * OrchestratorViewEnhanced component
 */
export const OrchestratorViewEnhanced: React.FC<OrchestratorViewEnhancedProps> = ({
  accessToken,
  initialPrompt = '',
  onBack,
  onComplete,
  'data-testid': testId = 'orchestrator-view-enhanced'
}) => {
  // Core state management
  const {
    viewState,
    prompt,
    buildDuration,
    setViewState,
    setPrompt,
    startBuildTimer,
    stopBuildTimer,
    resetState,
    hasTriggeredInitialAnalysis
  } = useOrchestratorState({ initialPrompt })

  // Orchestrator client
  const { isAnalyzing, analyzeError, currentPlan, analyze, reanalyze, clearPlan, client } = useOrchestratorClient({
    accessToken
  })

  // Build progress
  const {
    isBuilding,
    buildError,
    tiles,
    overallProgress,
    completedCount,
    failedCount,
    reusedCount,
    totalCount,
    currentPhase,
    phaseMessage,
    startBuild,
    cancelBuild,
    resetProgress
  } = useBuildProgress({
    client,
    plan: currentPlan,
    onComplete: success => {
      setViewState(success ? 'complete' : 'error')
      stopBuildTimer()
      onComplete?.(success)
    },
    onError: () => {
      setViewState('error')
      stopBuildTimer()
    }
  })

  // Thinking steps for analysis
  const {
    steps: thinkingSteps,
    progress: analysisProgress,
    completeAllSteps
  } = useThinkingSteps(viewState === 'analyzing')

  // Build logs
  const { logs: buildLogs, addLog, clearLogs } = useBuildLogs(isBuilding, currentPhase, completedCount)

  // Completed phases for timeline
  const completedPhases = useMemo(() => getCompletedPhases(currentPhase), [currentPhase])

  // Analyze prompt
  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) return

    setViewState('analyzing')
    const response = await analyze(prompt.trim())

    const hasValidPlan = response.success && response.plan
    if (hasValidPlan) {
      completeAllSteps()
      setTimeout(() => setViewState('review'), 500)
    } else {
      setViewState('error')
    }
  }, [prompt, analyze, setViewState, completeAllSteps])

  // Re-analyze with answers
  const handleReanalyze = useCallback(
    async (answers: Record<string, string>) => {
      setViewState('analyzing')
      const response = await reanalyze(answers)

      const hasValidPlan = response.success && response.plan
      if (hasValidPlan) {
        setViewState('review')
      } else {
        setViewState('error')
      }
    },
    [reanalyze, setViewState]
  )

  // Start build
  const handleStartBuild = useCallback(
    async (skipComponents?: string[]) => {
      setViewState('building')
      startBuildTimer()
      addLog('info', 'Build started...')
      await startBuild(skipComponents)
    },
    [startBuild, setViewState, startBuildTimer, addLog]
  )

  // Cancel and go back
  const handleCancel = useCallback(() => {
    cancelBuild()
    clearPlan()
    clearLogs()
    resetState()
  }, [cancelBuild, clearPlan, clearLogs, resetState])

  // Reset and try again
  const handleReset = useCallback(() => {
    resetProgress()
    clearPlan()
    clearLogs()
    resetState()
  }, [resetProgress, clearPlan, clearLogs, resetState])

  // Handle initial prompt on mount - only once
  useEffect(() => {
    const shouldAnalyze = initialPrompt && !hasTriggeredInitialAnalysis.current && !currentPlan
    if (shouldAnalyze) {
      hasTriggeredInitialAnalysis.current = true
      handleAnalyze()
    }
  }, [initialPrompt, handleAnalyze, currentPlan, hasTriggeredInitialAnalysis])

  return (
    <div className="gba:w-full gba:max-w-5xl gba:mx-auto gba:p-6" data-testid={testId}>
      {/* Header */}
      <OrchestratorHeader viewState={viewState} onBack={onBack} onReset={handleReset} />

      {/* Idle State - Prompt Input */}
      {viewState === 'idle' && (
        <IdleView
          prompt={prompt}
          onPromptChange={setPrompt}
          onAnalyze={handleAnalyze}
          data-testid={`${testId}-prompt-input`}
        />
      )}

      {/* Analyzing State - Enhanced with thinking steps */}
      {viewState === 'analyzing' && (
        <AnalyzingView steps={thinkingSteps} progress={analysisProgress} data-testid={`${testId}-thinking`} />
      )}

      {/* Review State */}
      {viewState === 'review' && currentPlan && (
        <ReviewView
          plan={currentPlan}
          onConfirm={handleStartBuild}
          onCancel={handleCancel}
          onReanalyze={handleReanalyze}
          isLoading={isAnalyzing}
          data-testid={`${testId}-plan-review`}
        />
      )}

      {/* Building State - Enhanced with console and timeline */}
      {viewState === 'building' && (
        <BuildingView
          currentPhase={currentPhase}
          completedPhases={completedPhases}
          overallProgress={overallProgress}
          completedCount={completedCount}
          reusedCount={reusedCount}
          failedCount={failedCount}
          totalCount={totalCount}
          isBuilding={isBuilding}
          phaseMessage={phaseMessage}
          tiles={tiles}
          logs={buildLogs}
          onCancel={cancelBuild}
          data-testid={`${testId}-building`}
        />
      )}

      {/* Complete State - Enhanced with celebration */}
      {viewState === 'complete' && currentPlan && (
        <SuccessState
          components={currentPlan.components}
          buildDuration={buildDuration}
          completedCount={completedCount}
          reusedCount={reusedCount}
          onBuildMore={handleReset}
          data-testid={`${testId}-success`}
        />
      )}

      {/* Error State - Enhanced with recovery */}
      {viewState === 'error' && (
        <ErrorState
          error={buildError || analyzeError || 'An error occurred'}
          partialComponents={currentPlan?.components.filter((c: ComponentSpec) => c.status === 'completed')}
          onRetry={handleReset}
          onModifyPlan={() => setViewState('review')}
          data-testid={`${testId}-error`}
        />
      )}
    </div>
  )
}

export default OrchestratorViewEnhanced
