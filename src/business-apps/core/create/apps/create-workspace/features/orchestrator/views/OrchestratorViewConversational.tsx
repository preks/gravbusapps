/**
 * OrchestratorViewConversational - Autonomous full-screen orchestrator
 *
 * Features:
 * - Full-screen canvas with direct input
 * - Clean state transitions (idle → analyzing → review → building → complete/error)
 * - Professional, tool-focused design (not chatbot-style)
 */

import React from 'react'
import { useOrchestratorClient } from '../hooks/useOrchestratorClient'
import { useBuildProgress } from '../hooks/useBuildProgress'
import { useOrchestratorState } from '../hooks/useOrchestratorState'
import { useOrchestratorHandlers } from '../hooks/useOrchestratorHandlers'
import { useOrchestratorEffects } from '../hooks/useOrchestratorEffects'
import { IdleCanvas } from '../components/layouts'
import { AnalyzingView, ReviewView, BuildingView, CompleteView, ErrorView } from '../components/state-views'

export interface OrchestratorViewConversationalProps {
  accessToken: string
  userInfo?: any
  initialPrompt?: string
  onBack?: () => void
  onComplete?: (success: boolean) => void
  'data-testid'?: string
}

export const OrchestratorViewConversational: React.FC<OrchestratorViewConversationalProps> = ({
  accessToken,
  userInfo,
  initialPrompt = '',
  onBack,
  onComplete,
  'data-testid': testId = 'orchestrator-conversational'
}) => {
  // Initialize state
  const state = useOrchestratorState({ initialPrompt })

  // Orchestrator client
  const orchestratorClient = useOrchestratorClient({
    accessToken
  })

  // Build progress
  const buildProgress = useBuildProgress({
    client: orchestratorClient.client,
    plan: orchestratorClient.currentPlan,
    onComplete: success => {
      state.setViewState(success ? 'complete' : 'error')
      if (state.buildStartTime) {
        state.setBuildDuration(Date.now() - state.buildStartTime)
      }
      onComplete?.(success)
    },
    onError: (error: string) => {
      console.error('Build error:', error)
      state.setCapturedBuildError(error)
      state.setViewState('error')
      if (state.buildStartTime) {
        state.setBuildDuration(Date.now() - state.buildStartTime)
      }
    },
    onComponentUpdate: orchestratorClient.updateComponentProperties
  })

  // Event handlers
  const handlers = useOrchestratorHandlers({
    state,
    orchestratorClient,
    buildProgress,
    onComplete,
    onBack
  })

  // Side effects
  const { completedPhases } = useOrchestratorEffects({
    state,
    handlers,
    buildProgress,
    initialPrompt
  })

  // Render view based on state
  const renderView = () => {
    switch (state.viewState) {
      case 'idle':
        return <IdleCanvas onSubmit={handlers.handleAnalyze} isLoading={orchestratorClient.isAnalyzing} />

      case 'analyzing':
        return <AnalyzingView thinkingSteps={state.thinkingSteps} analysisProgress={state.analysisProgress} />

      case 'review':
        if (!orchestratorClient.currentPlan) return null
        return (
          <ReviewView
            plan={orchestratorClient.currentPlan}
            userPrompt={state.userPrompt}
            skippedCount={state.skippedCount}
            isEditModalOpen={state.isEditModalOpen}
            isSavingPlan={state.isSavingPlan}
            editError={state.editError}
            isAnalyzing={orchestratorClient.isAnalyzing}
            isRefining={orchestratorClient.isRefining}
            refinementSummary={orchestratorClient.refinementSummary}
            refineError={orchestratorClient.refineError}
            onStartBuild={handlers.handleStartBuild}
            onCancel={handlers.handleCancel}
            onReanalyze={handlers.handleReanalyze}
            onEditModalOpen={() => state.setIsEditModalOpen(true)}
            onEditModalClose={() => {
              state.setIsEditModalOpen(false)
              state.setEditError(null)
            }}
            onEditPlan={handlers.handleEditPlan}
            onRefine={handlers.handleRefine}
            onReset={handlers.handleReset}
            onSkippedComponentsChange={ids => state.setSkippedCount(ids.length)}
            onReanalyzePrompt={handlers.handleAnalyze}
          />
        )

      case 'building':
        return (
          <BuildingView
            currentPhase={buildProgress.currentPhase}
            completedPhases={completedPhases}
            overallProgress={buildProgress.overallProgress}
            completedCount={buildProgress.completedCount}
            reusedCount={buildProgress.reusedCount}
            totalCount={buildProgress.totalCount}
            failedCount={buildProgress.failedCount}
            buildLogs={state.buildLogs}
            phaseMessage={buildProgress.phaseMessage}
            isBuilding={buildProgress.isBuilding}
            tiles={buildProgress.tiles}
            onCancel={buildProgress.cancelBuild}
          />
        )

      case 'complete':
        if (!orchestratorClient.currentPlan) {
          console.warn('[OrchestratorView] No current plan in complete state')
          return null
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('[OrchestratorView] Rendering complete view:', {
            componentCount: orchestratorClient.currentPlan.components.length,
            components: orchestratorClient.currentPlan.components.map(c => ({
              id: c.id,
              name: c.name,
              type: c.type,
              status: c.status,
              published_file_count: c.published_file_count
            }))
          })
        }
        return (
          <CompleteView
            components={orchestratorClient.currentPlan.components}
            jobId={orchestratorClient.currentPlan?.job_id}
            buildDuration={state.buildDuration}
            accessToken={accessToken}
            userInfo={userInfo}
            onReset={handlers.handleReset}
          />
        )

      case 'error':
        return (
          <ErrorView
            error={
              state.capturedBuildError ||
              buildProgress.buildError ||
              orchestratorClient.analyzeError ||
              'An error occurred'
            }
            partialComponents={orchestratorClient.currentPlan?.components}
            jobId={orchestratorClient.currentPlan?.job_id}
            buildDuration={state.buildDuration}
            accessToken={accessToken}
            userInfo={userInfo}
            onReset={handlers.handleReset}
            onRetry={handlers.handleRetry}
            onModifyPlan={() => state.setViewState('review')}
          />
        )

      default:
        return <IdleCanvas onSubmit={handlers.handleAnalyze} isLoading={orchestratorClient.isAnalyzing} />
    }
  }

  return (
    <div className="gba:h-screen gba:overflow-hidden gba:bg-background" data-testid={testId}>
      {renderView()}
    </div>
  )
}

export default OrchestratorViewConversational
