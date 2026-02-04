/**
 * OrchestratorView - Main container for the AI Orchestrator feature
 *
 * Manages the orchestrator workflow:
 * 1. User enters a prompt
 * 2. AI analyzes and generates build plan
 * 3. User reviews plan (optional questions)
 * 4. Build executes with progress tiles
 * 5. Completion summary
 */

import React, { useCallback, useState } from 'react'
import { Button, Card, CardContent, cn } from '@newwork/nw-design-system'
import { Sparkles, ArrowLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { useOrchestratorClient } from '../hooks/useOrchestratorClient'
import { useBuildProgress } from '../hooks/useBuildProgress'
import { BuildPlanReview } from '../components/widgets/BuildPlanReview'
import { ProgressTilesGrid } from '../components/progress/ProgressTilesGrid'
import type { OrchestratorViewState } from '../types'

export interface OrchestratorViewProps {
  accessToken: string
  initialPrompt?: string
  onBack?: () => void
  onComplete?: (success: boolean) => void
  'data-testid'?: string
}

/**
 * OrchestratorView component
 */
export const OrchestratorView: React.FC<OrchestratorViewProps> = ({
  accessToken,
  initialPrompt = '',
  onBack,
  onComplete,
  'data-testid': testId = 'orchestrator-view'
}) => {
  const [viewState, setViewState] = useState<OrchestratorViewState>(initialPrompt ? 'analyzing' : 'idle')
  const [prompt, setPrompt] = useState(initialPrompt)

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
      onComplete?.(success)
    },
    onError: () => {
      setViewState('error')
    }
  })

  // Analyze prompt
  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) return

    setViewState('analyzing')
    const response = await analyze(prompt.trim())

    if (response.success && response.plan) {
      setViewState('review')
    } else {
      setViewState('error')
    }
  }, [prompt, analyze])

  // Re-analyze with answers
  const handleReanalyze = useCallback(
    async (answers: Record<string, string>) => {
      setViewState('analyzing')
      const response = await reanalyze(answers)

      if (response.success && response.plan) {
        setViewState('review')
      } else {
        setViewState('error')
      }
    },
    [reanalyze]
  )

  // Start build
  const handleStartBuild = useCallback(
    async (skipComponents?: string[]) => {
      setViewState('building')
      await startBuild(skipComponents)
    },
    [startBuild]
  )

  // Cancel and go back
  const handleCancel = useCallback(() => {
    cancelBuild()
    clearPlan()
    setViewState('idle')
    setPrompt('')
  }, [cancelBuild, clearPlan])

  // Reset and try again
  const handleReset = useCallback(() => {
    resetProgress()
    clearPlan()
    setViewState('idle')
    setPrompt('')
  }, [resetProgress, clearPlan])

  // Handle initial prompt on mount
  React.useEffect(() => {
    if (initialPrompt && viewState === 'analyzing') {
      handleAnalyze()
    }
  }, [initialPrompt, viewState, handleAnalyze])

  return (
    <div className="gba:w-full gba:max-w-5xl gba:mx-auto gba:p-6" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-8">
        <div className="gba:flex gba:items-center gba:gap-3">
          {onBack && viewState === 'idle' && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-1" />
              Back
            </Button>
          )}
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-foreground gba:flex gba:items-center gba:gap-2">
              <Sparkles className="gba:w-6 gba:h-6 gba:text-info" />
              AI Orchestrator
            </h1>
            <p className="gba:text-muted-foreground">Describe what you want to build and let AI create it for you</p>
          </div>
        </div>

        {viewState !== 'idle' && viewState !== 'analyzing' && (
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="gba:w-4 gba:h-4 gba:mr-2" />
            Start Over
          </Button>
        )}
      </div>

      {/* Idle State - Prompt Input */}
      {viewState === 'idle' && (
        <Card className="gba:border-dashed">
          <CardContent className="gba:p-8">
            <div className="gba:space-y-4">
              <label className="gba:block gba:text-sm gba:font-medium gba:text-foreground">
                What do you want to build?
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe what you need... For example: 'Create a lead management system with a capture form, AI qualification assistant, and approval workflow'"
                className={cn(
                  'gba:w-full gba:min-h-[150px] gba:p-4 gba:rounded-lg',
                  'gba:border gba:border-input gba:bg-background',
                  'gba:text-foreground gba:placeholder-muted-foreground',
                  'gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-ring',
                  'gba:resize-none'
                )}
                data-testid={`${testId}-prompt-input`}
              />
              <div className="gba:flex gba:justify-end">
                <Button onClick={handleAnalyze} disabled={!prompt.trim()} className="gba:min-w-[150px]">
                  <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
                  Analyze & Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyzing State */}
      {viewState === 'analyzing' && (
        <Card>
          <CardContent className="gba:p-12 gba:text-center">
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
              <div className="gba:relative">
                <Sparkles className="gba:w-12 gba:h-12 gba:text-info gba:animate-pulse" />
                <div className="gba:absolute gba:inset-0 gba:animate-ping gba:opacity-30">
                  <Sparkles className="gba:w-12 gba:h-12 gba:text-info" />
                </div>
              </div>
              <div>
                <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Analyzing your request...</h3>
                <p className="gba:text-muted-foreground">
                  The AI is understanding what you need and planning the components to build
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review State */}
      {viewState === 'review' && currentPlan && (
        <BuildPlanReview
          plan={currentPlan}
          onConfirm={handleStartBuild}
          onCancel={handleCancel}
          onReanalyze={handleReanalyze}
          isLoading={isAnalyzing}
          data-testid={`${testId}-plan-review`}
        />
      )}

      {/* Building State */}
      {viewState === 'building' && (
        <div className="gba:space-y-6">
          <ProgressTilesGrid
            tiles={tiles}
            overallProgress={overallProgress}
            completedCount={completedCount}
            failedCount={failedCount}
            reusedCount={reusedCount}
            totalCount={totalCount}
            isBuilding={isBuilding}
            currentPhase={currentPhase}
            phaseMessage={phaseMessage}
            data-testid={`${testId}-progress-grid`}
          />

          <div className="gba:flex gba:justify-end">
            <Button variant="outline" onClick={cancelBuild} disabled={!isBuilding}>
              Cancel Build
            </Button>
          </div>
        </div>
      )}

      {/* Complete State */}
      {viewState === 'complete' && (
        <div className="gba:space-y-6">
          <Card>
            <CardContent className="gba:p-8 gba:text-center">
              <CheckCircle2 className="gba:w-16 gba:h-16 gba:text-success gba:mx-auto gba:mb-4" />
              <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">Build Complete!</h2>
              <p className="gba:text-muted-foreground">
                Successfully created {completedCount} component{completedCount !== 1 ? 's' : ''}
                {reusedCount > 0 && ` (${reusedCount} reused)`}
              </p>
            </CardContent>
          </Card>

          <ProgressTilesGrid
            tiles={tiles}
            overallProgress={100}
            completedCount={completedCount}
            failedCount={failedCount}
            reusedCount={reusedCount}
            totalCount={totalCount}
            isBuilding={false}
            data-testid={`${testId}-progress-grid`}
          />
        </div>
      )}

      {/* Error State */}
      {viewState === 'error' && (
        <div className="gba:space-y-6">
          <Card className="gba:border-destructive">
            <CardContent className="gba:p-8 gba:text-center">
              <XCircle className="gba:w-16 gba:h-16 gba:text-destructive gba:mx-auto gba:mb-4" />
              <h2 className="gba:text-2xl gba:font-bold gba:text-foreground gba:mb-2">
                {buildError ? 'Build Failed' : 'Analysis Failed'}
              </h2>
              <p className="gba:text-destructive">{buildError || analyzeError || 'An error occurred'}</p>
            </CardContent>
          </Card>

          {currentPlan && (
            <ProgressTilesGrid
              tiles={tiles}
              overallProgress={overallProgress}
              completedCount={completedCount}
              failedCount={failedCount}
              reusedCount={reusedCount}
              totalCount={totalCount}
              isBuilding={false}
              data-testid={`${testId}-progress-grid`}
            />
          )}

          <div className="gba:flex gba:justify-center gba:gap-3">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="gba:w-4 gba:h-4 gba:mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrchestratorView
