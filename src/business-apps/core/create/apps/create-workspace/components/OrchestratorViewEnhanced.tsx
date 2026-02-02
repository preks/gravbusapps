/**
 * OrchestratorViewEnhanced - Enhanced orchestrator with premium UI/UX
 *
 * Features:
 * - AI thinking visualization
 * - Console-style build logs
 * - Phase timeline
 * - Success celebration
 * - Enhanced error recovery
 */

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { Button, Card, CardContent, cn } from '@newwork/nw-design-system'
import { Sparkles, ArrowLeft, RotateCcw } from 'lucide-react'
import { useOrchestratorClient } from '../hooks/useOrchestratorClient'
import { useBuildProgress } from '../hooks/useBuildProgress'
import { BuildPlanReview } from './BuildPlanReview'
import { ProgressTilesGrid } from './ProgressTilesGrid'
import { ThinkingSteps, type ThinkingStep } from './ThinkingSteps'
import { BuildConsoleLog, type BuildLogEntry } from './BuildConsoleLog'
import { PhaseTimeline } from './PhaseTimeline'
import { SuccessState } from './SuccessState'
import { ErrorState } from './ErrorState'
import type { OrchestratorViewState, BuildPhase } from '../types/orchestrator'

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
  const [viewState, setViewState] = useState<OrchestratorViewState>(initialPrompt ? 'analyzing' : 'idle')
  const [prompt, setPrompt] = useState(initialPrompt)
  const [buildStartTime, setBuildStartTime] = useState<number>(0)
  const [buildDuration, setBuildDuration] = useState<number>(0)

  // Build logs state
  const [buildLogs, setBuildLogs] = useState<BuildLogEntry[]>([])

  // Thinking steps for analysis phase
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)

  // Track if initial analysis has been triggered to prevent duplicates
  const hasTriggeredInitialAnalysis = useRef(false)

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
      if (buildStartTime) {
        setBuildDuration(Date.now() - buildStartTime)
      }
      onComplete?.(success)
    },
    onError: () => {
      setViewState('error')
      if (buildStartTime) {
        setBuildDuration(Date.now() - buildStartTime)
      }
    }
  })

  // Initialize thinking steps when analysis starts
  useEffect(() => {
    if (viewState === 'analyzing') {
      setThinkingSteps([
        { id: '1', title: 'Understanding intent', detail: 'Analyzing your request...', status: 'active' },
        { id: '2', title: 'Identifying components', detail: 'Planning architecture...', status: 'pending' },
        { id: '3', title: 'Checking dependencies', detail: 'Analyzing requirements...', status: 'pending' },
        { id: '4', title: 'Generating plan', detail: 'Creating build strategy...', status: 'pending' }
      ])
      setAnalysisProgress(25)

      // Simulate progress (replace with real progress if available from backend)
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 90) return prev
          return Math.min(prev + 10, 90)
        })
        setThinkingSteps(prev => {
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
        })
      }, 1500)

      return () => clearInterval(progressInterval)
    }
  }, [viewState])

  // Track build events and convert to logs
  useEffect(() => {
    if (!isBuilding && !currentPhase) return

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })

    // Add phase change logs
    if (currentPhase === 'discovery') {
      if (buildLogs.length === 0 || !buildLogs.some(l => l.message.includes('Discovery'))) {
        setBuildLogs(prev => [
          ...prev,
          {
            timestamp,
            type: 'info',
            message: 'Starting resource discovery phase...'
          }
        ])
      }
    } else if (currentPhase === 'building') {
      if (!buildLogs.some(l => l.message.includes('Building'))) {
        setBuildLogs(prev => [
          ...prev,
          {
            timestamp,
            type: 'info',
            message: 'Starting component building phase...'
          }
        ])
      }
    } else if (currentPhase === 'wiring') {
      if (!buildLogs.some(l => l.message.includes('Wiring'))) {
        setBuildLogs(prev => [
          ...prev,
          {
            timestamp,
            type: 'info',
            message: 'Starting component wiring phase...'
          }
        ])
      }
    }

    // Add completion logs
    if (completedCount > 0 && !buildLogs.some(l => l.message.includes(`${completedCount} components`))) {
      const lastLog = buildLogs[buildLogs.length - 1]
      if (!lastLog || !lastLog.message.includes('completed successfully')) {
        setBuildLogs(prev => [
          ...prev,
          {
            timestamp,
            type: 'success',
            message: 'Component completed successfully'
          }
        ])
      }
    }
  }, [currentPhase, completedCount, isBuilding])

  // Completed phases for timeline
  const completedPhases = useMemo((): BuildPhase[] => {
    const phases: BuildPhase[] = []
    if (currentPhase === 'building' || currentPhase === 'wiring' || currentPhase === 'complete') {
      phases.push('discovery')
    }
    if (currentPhase === 'wiring' || currentPhase === 'complete') {
      phases.push('building')
    }
    if (currentPhase === 'complete') {
      phases.push('wiring')
    }
    return phases
  }, [currentPhase])

  // Analyze prompt
  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) return

    setViewState('analyzing')
    setAnalysisProgress(0)
    const response = await analyze(prompt.trim())

    if (response.success && response.plan) {
      setAnalysisProgress(100)
      setThinkingSteps(prev =>
        prev.map(s => ({ ...s, status: 'complete' as const, duration: Math.floor(Math.random() * 500 + 200) }))
      )
      setTimeout(() => setViewState('review'), 500)
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
      setBuildStartTime(Date.now())
      setBuildLogs([
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'info',
          message: 'Build started...'
        }
      ])
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
    setBuildLogs([])
    hasTriggeredInitialAnalysis.current = false // Reset the ref
  }, [cancelBuild, clearPlan])

  // Reset and try again
  const handleReset = useCallback(() => {
    resetProgress()
    clearPlan()
    setViewState('idle')
    setPrompt('')
    setBuildLogs([])
    setThinkingSteps([])
    setBuildDuration(0)
    hasTriggeredInitialAnalysis.current = false // Reset the ref
  }, [resetProgress, clearPlan])

  // Handle initial prompt on mount - only once
  useEffect(() => {
    if (initialPrompt && !hasTriggeredInitialAnalysis.current && !currentPlan) {
      hasTriggeredInitialAnalysis.current = true
      handleAnalyze()
    }
  }, [initialPrompt, handleAnalyze, currentPlan])

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

      {/* Analyzing State - Enhanced with thinking steps */}
      {viewState === 'analyzing' && (
        <ThinkingSteps
          steps={thinkingSteps}
          progress={analysisProgress}
          phaseMessage="Breaking down your request into components..."
          data-testid={`${testId}-thinking`}
        />
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

      {/* Building State - Enhanced with console and timeline */}
      {viewState === 'building' && (
        <div className="gba:space-y-6">
          {/* Phase timeline */}
          <PhaseTimeline
            currentPhase={currentPhase}
            completedPhases={completedPhases}
            className="gba:sticky gba:top-4 gba:z-10 gba:bg-background gba:py-4"
            data-testid={`${testId}-phase-timeline`}
          />

          {/* Overall progress */}
          <div className="gba:space-y-2">
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:text-sm gba:font-medium gba:text-foreground">Overall Progress</span>
              <span className="gba:text-sm gba:font-semibold gba:text-foreground">{overallProgress}%</span>
            </div>
            <div className="gba:w-full gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
              <div
                className="gba:h-full gba:bg-info gba:transition-all gba:duration-300 gba:ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">
              {completedCount} completed • {reusedCount} reused • {totalCount - completedCount - reusedCount} remaining
            </p>
          </div>

          {/* Console log */}
          <BuildConsoleLog
            logs={buildLogs}
            currentOperation={phaseMessage}
            isBuilding={isBuilding}
            data-testid={`${testId}-console`}
          />

          {/* Component tiles */}
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
          partialComponents={currentPlan?.components.filter(c => c.status === 'completed')}
          onRetry={handleReset}
          onModifyPlan={() => setViewState('review')}
          data-testid={`${testId}-error`}
        />
      )}
    </div>
  )
}

export default OrchestratorViewEnhanced
