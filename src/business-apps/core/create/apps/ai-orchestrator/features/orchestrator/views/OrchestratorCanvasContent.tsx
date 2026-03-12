/**
 * OrchestratorCanvasContent - Renders the right-side canvas content
 * based on the current orchestrator view state.
 */

import React from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'
import type { OrchestratorState } from '../hooks/useOrchestratorState'
import type { UseOrchestratorClientResult } from '../hooks/useOrchestratorClient'
import type { UseBuildProgressResult } from '../hooks/useBuildProgress'
import type { OrchestratorHandlers } from '../hooks/useOrchestratorHandlers'
import type { BuildPhase } from '../types'
import { AnalyzingView, ReviewView, BuildingView, CompleteView, ErrorView } from '../components/state-views'
import { CanvasHeader } from '../components/canvas/CanvasHeader'

interface OrchestratorCanvasContentProps {
  state: OrchestratorState
  orchestratorClient: UseOrchestratorClientResult
  buildProgress: UseBuildProgressResult
  handlers: OrchestratorHandlers
  completedPhases: BuildPhase[]
  accessToken: string
  userInfo?: any
  builtBy?: any
  builtByLoading?: boolean
  previewRefreshToken: number
  isRestoringSession?: boolean
  onPublish?: () => Promise<void> | void
}

export const OrchestratorCanvasContent: React.FC<OrchestratorCanvasContentProps> = ({
  state,
  orchestratorClient,
  buildProgress,
  handlers,
  completedPhases,
  accessToken,
  userInfo,
  builtBy,
  builtByLoading,
  previewRefreshToken,
  isRestoringSession = false,
  onPublish
}) => {
  // Determine title based on state
  const getTitle = () => {
    switch (state.viewState) {
      case 'analyzing':
        return 'Analyzing...'
      case 'review':
        return 'Build Plan'
      case 'building':
        return 'Building'
      case 'complete':
        return 'Build Results'
      case 'error':
        return 'Build Error'
      default:
        return ''
    }
  }

  // Determine header actions based on state
  const getHeaderActions = () => {
    if (state.viewState === 'review') {
      return (
        <Button variant="ghost" size="sm" onClick={handlers.handleReset} disabled={orchestratorClient.isAnalyzing}>
          ← Start Over
        </Button>
      )
    }
    if (state.viewState === 'building' && buildProgress.isBuilding) {
      return (
        <Button variant="outline" size="sm" onClick={buildProgress.cancelBuild}>
          Cancel Build
        </Button>
      )
    }
    return null
  }

  const renderContent = () => {
    switch (state.viewState) {
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
            onStartBuild={handlers.handleStartBuild}
            onCancel={handlers.handleCancel}
            onReanalyze={handlers.handleReanalyze}
            onEditModalOpen={() => state.setIsEditModalOpen(true)}
            onEditModalClose={() => {
              state.setIsEditModalOpen(false)
              state.setEditError(null)
            }}
            onEditPlan={handlers.handleEditPlan}
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
            buildLogs={buildProgress.buildLogs}
            phaseMessage={buildProgress.phaseMessage}
            isBuilding={buildProgress.isBuilding}
            tiles={buildProgress.tiles}
            isProgressEstimated={buildProgress.isProgressEstimated}
            appMetadata={orchestratorClient.currentPlan?.appMetadata}
          />
        )

      case 'complete':
        if (!orchestratorClient.currentPlan) return null
        return (
          <CompleteView
            components={orchestratorClient.currentPlan.components}
            jobId={orchestratorClient.currentPlan?.jobId}
            buildDuration={buildProgress.buildDuration}
            prompt={state.userPrompt}
            accessToken={accessToken}
            userInfo={userInfo}
            builtBy={builtBy}
            builtByLoading={builtByLoading}
            previewRefreshToken={previewRefreshToken}
            onReset={handlers.handleReset}
            appMetadata={orchestratorClient.currentPlan.appMetadata}
            analysis={orchestratorClient.currentPlan.analysis}
            userSummary={orchestratorClient.currentPlan.userSummary}
            createdAt={orchestratorClient.currentPlan.createdAt}
            isPublishing={orchestratorClient.isPublishing}
            publishSuccess={orchestratorClient.publishSuccess}
            publishError={orchestratorClient.publishError}
            onPublish={onPublish ?? orchestratorClient.publishApp}
            isRestoringSession={isRestoringSession}
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
            jobId={orchestratorClient.currentPlan?.jobId}
            buildDuration={buildProgress.buildDuration}
            onReset={handlers.handleReset}
            onRetry={handlers.handleRetry}
            onModifyPlan={() => state.setViewState('review')}
          />
        )

      case 'idle':
        return (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4 gba:text-center gba:px-8">
            <div className="gba:w-14 gba:h-14 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <Sparkles className="gba:w-7 gba:h-7 gba:text-primary" />
            </div>
            <div className="gba:space-y-1.5">
              <p className="gba:text-base gba:font-semibold gba:text-foreground">SELECT A SESSION</p>
              <p className="gba:text-sm gba:text-muted-foreground gba:max-w-xs gba:leading-relaxed">
                Choose a previous session from the list to view its build results and preview.
              </p>
            </div>
          </div>
        )

      default:
        return <AnalyzingView thinkingSteps={state.thinkingSteps} analysisProgress={state.analysisProgress} />
    }
  }

  return (
    <>
      <CanvasHeader title={getTitle()} actions={getHeaderActions()} />
      <div className="gba:flex-1 gba:overflow-hidden">{renderContent()}</div>
    </>
  )
}
