/**
 * OrchestratorViewConversational - V0/Lovable-style conversational interface
 *
 * Features:
 * - Left: Chat panel with conversation history
 * - Right: Canvas with current work view (analyzing, reviewing, building, etc.)
 * - Clean, minimal, professional design
 */

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react'
import { Button } from '@newwork/nw-design-system'
import { useOrchestratorClient } from '../hooks/useOrchestratorClient'
import { useBuildProgress } from '../hooks/useBuildProgress'
import { useConversation } from '../hooks/useConversation'
import { ConversationalLayout, ChatPanel, Canvas, IdleCanvas } from './conversational'
import { ThinkingSteps, type ThinkingStep } from './ThinkingSteps'
import { BuildPlanReview } from './BuildPlanReview'
import { FloatingActionButton } from './FloatingActionButton'
import { ProgressTilesGrid } from './ProgressTilesGrid'
import { BuildConsoleLog, type BuildLogEntry } from './BuildConsoleLog'
import { PhaseTimeline } from './PhaseTimeline'
import { SuccessState } from './SuccessState'
import { ErrorState } from './ErrorState'
import type { OrchestratorViewState, BuildPhase } from '../types/orchestrator'

export interface OrchestratorViewConversationalProps {
  accessToken: string
  initialPrompt?: string
  onBack?: () => void
  onComplete?: (success: boolean) => void
  'data-testid'?: string
}

export const OrchestratorViewConversational: React.FC<OrchestratorViewConversationalProps> = ({
  accessToken,
  initialPrompt = '',
  onComplete,
  'data-testid': testId = 'orchestrator-conversational'
}) => {
  const [viewState, setViewState] = useState<OrchestratorViewState>(initialPrompt ? 'analyzing' : 'idle')
  const [chatInput, setChatInput] = useState('')
  const [buildStartTime, setBuildStartTime] = useState<number>(0)
  const [buildDuration, setBuildDuration] = useState<number>(0)
  const [buildLogs, setBuildLogs] = useState<BuildLogEntry[]>([])
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const [capturedBuildError, setCapturedBuildError] = useState<string | null>(null)
  const hasTriggeredInitialAnalysis = useRef(false)

  // Conversation management
  const { messages, addMessage, updateLastMessage, clearMessages } = useConversation()

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

      // Add completion message
      if (success) {
        addMessage({
          role: 'assistant',
          content: `Build complete! Your solution is ready with ${completedCount} components.`,
          metadata: { status: 'complete', componentCount: completedCount }
        })
      } else {
        addMessage({
          role: 'assistant',
          content: 'Build encountered errors. See details in the canvas.',
          metadata: { status: 'error' }
        })
      }

      onComplete?.(success)
    },
    onError: (error: string) => {
      console.error('Build error:', error)
      setCapturedBuildError(error)
      setViewState('error')
      if (buildStartTime) {
        setBuildDuration(Date.now() - buildStartTime)
      }

      // Add error message to chat
      addMessage({
        role: 'assistant',
        content: `Build failed: ${error}`,
        metadata: { status: 'error' }
      })
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

  // Build log tracking - use refs to avoid infinite loop
  const loggedPhasesRef = useRef<Set<BuildPhase>>(new Set())
  const lastCompletedCountRef = useRef(0)

  useEffect(() => {
    if (!isBuilding && !currentPhase) return

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })

    // Log phase transitions (only once per phase)
    if (currentPhase && !loggedPhasesRef.current.has(currentPhase)) {
      loggedPhasesRef.current.add(currentPhase)

      if (currentPhase === 'discovery') {
        setBuildLogs(prev => [...prev, { timestamp, type: 'info', message: 'Starting resource discovery phase...' }])
      } else if (currentPhase === 'building') {
        setBuildLogs(prev => [...prev, { timestamp, type: 'info', message: 'Starting component building phase...' }])
      } else if (currentPhase === 'wiring') {
        setBuildLogs(prev => [...prev, { timestamp, type: 'info', message: 'Starting component wiring phase...' }])
      }
    }

    // Log component completions (only when count increases)
    if (completedCount > lastCompletedCountRef.current) {
      lastCompletedCountRef.current = completedCount
      setBuildLogs(prev => [...prev, { timestamp, type: 'success', message: 'Component completed successfully' }])
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

  // Handle sending chat message
  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim()) return

    const userPrompt = chatInput.trim()

    // Add user message
    addMessage({ role: 'user', content: userPrompt })

    // Clear input
    setChatInput('')

    // Add AI thinking message
    addMessage({
      role: 'assistant',
      content: "I'll help you build that. Let me analyze your requirements...",
      isStreaming: true,
      metadata: { status: 'analyzing' }
    })

    // Start analysis
    setViewState('analyzing')
    const response = await analyze(userPrompt)

    if (response.success && response.plan) {
      setAnalysisProgress(100)
      setThinkingSteps(prev =>
        prev.map(s => ({ ...s, status: 'complete' as const, duration: Math.floor(Math.random() * 500 + 200) }))
      )

      // Update AI message with plan summary
      updateLastMessage({
        content: `Analysis complete! I've created a plan with ${response.plan.components.length} components.

Goal: ${response.plan.analysis.intent}

Review the plan in the canvas and let me know if you'd like to proceed.`,
        isStreaming: false,
        metadata: {
          status: 'planning',
          componentCount: response.plan.components.length,
          complexity: response.plan.analysis.complexity
        }
      })

      setTimeout(() => setViewState('review'), 500)
    } else {
      updateLastMessage({
        content: `I encountered an error while analyzing your request: ${analyzeError || 'Unknown error'}`,
        isStreaming: false,
        metadata: { status: 'error' }
      })
      setViewState('error')
    }
  }, [chatInput, addMessage, analyze, analyzeError, updateLastMessage])

  // Handle re-analyze
  const handleReanalyze = useCallback(
    async (answers: Record<string, string>) => {
      addMessage({
        role: 'assistant',
        content: 'Re-analyzing with your answers...',
        isStreaming: true
      })

      setViewState('analyzing')
      const response = await reanalyze(answers)

      if (response.success && response.plan) {
        updateLastMessage({
          content: `Updated plan with ${response.plan.components.length} components based on your answers.`,
          isStreaming: false,
          metadata: { componentCount: response.plan.components.length }
        })
        setViewState('review')
      } else {
        updateLastMessage({
          content: 'Error re-analyzing. Please try again.',
          isStreaming: false,
          metadata: { status: 'error' }
        })
        setViewState('error')
      }
    },
    [addMessage, reanalyze, updateLastMessage]
  )

  // Handle start build
  const handleStartBuild = useCallback(
    async (skipComponents?: string[]) => {
      addMessage({
        role: 'user',
        content: 'Start building'
      })

      addMessage({
        role: 'assistant',
        content: 'Starting build process...',
        metadata: { status: 'building' }
      })

      setViewState('building')
      setBuildStartTime(Date.now())
      setCapturedBuildError(null) // Clear previous errors
      setBuildLogs([
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'info',
          message: 'Build started...'
        }
      ])

      // Reset log tracking refs
      loggedPhasesRef.current.clear()
      lastCompletedCountRef.current = 0

      await startBuild(skipComponents)
    },
    [addMessage, startBuild]
  )

  // Handle cancel
  const handleCancel = useCallback(() => {
    cancelBuild()
    clearPlan()
    setViewState('idle')
    setBuildLogs([])
    loggedPhasesRef.current.clear()
    lastCompletedCountRef.current = 0
    hasTriggeredInitialAnalysis.current = false
  }, [cancelBuild, clearPlan])

  // Handle reset
  const handleReset = useCallback(() => {
    resetProgress()
    clearPlan()
    clearMessages()
    setViewState('idle')
    setChatInput('')
    setBuildLogs([])
    setThinkingSteps([])
    setBuildDuration(0)
    loggedPhasesRef.current.clear()
    lastCompletedCountRef.current = 0
    hasTriggeredInitialAnalysis.current = false
  }, [resetProgress, clearPlan, clearMessages])

  // Handle initial prompt on mount
  useEffect(() => {
    if (initialPrompt && !hasTriggeredInitialAnalysis.current && messages.length === 0) {
      hasTriggeredInitialAnalysis.current = true

      // Add user message
      addMessage({ role: 'user', content: initialPrompt })

      // Add AI thinking message
      addMessage({
        role: 'assistant',
        content: "I'll help you build that. Let me analyze your requirements...",
        isStreaming: true,
        metadata: { status: 'analyzing' }
      })

      // Start analysis
      setViewState('analyzing')

      // Call analyze
      const runAnalysis = async () => {
        const response = await analyze(initialPrompt)

        if (response.success && response.plan) {
          setAnalysisProgress(100)
          setThinkingSteps(prev =>
            prev.map(s => ({ ...s, status: 'complete' as const, duration: Math.floor(Math.random() * 500 + 200) }))
          )

          // Update AI message with plan summary
          updateLastMessage({
            content: `Analysis complete! I've created a plan with ${response.plan.components.length} components.

Goal: ${response.plan.analysis.intent}

Review the plan in the canvas and let me know if you'd like to proceed.`,
            isStreaming: false,
            metadata: {
              status: 'planning',
              componentCount: response.plan.components.length,
              complexity: response.plan.analysis.complexity
            }
          })

          setTimeout(() => setViewState('review'), 500)
        } else {
          updateLastMessage({
            content: `I encountered an error while analyzing your request: ${analyzeError || 'Unknown error'}`,
            isStreaming: false,
            metadata: { status: 'error' }
          })
          setViewState('error')
        }
      }

      runAnalysis()
    }
  }, [initialPrompt, messages.length, addMessage, analyze, analyzeError, updateLastMessage])

  // Render canvas based on state
  const renderCanvas = () => {
    switch (viewState) {
      case 'idle':
        return <IdleCanvas />

      case 'analyzing':
        return (
          <Canvas title="Analyzing" subtitle="Planning your solution">
            <ThinkingSteps
              steps={thinkingSteps}
              progress={analysisProgress}
              phaseMessage="Breaking down your request into components..."
            />
          </Canvas>
        )

      case 'review':
        return (
          <Canvas
            title="Review Plan"
            subtitle="Review the proposed components and make any adjustments"
            actions={
              <Button variant="ghost" onClick={handleCancel} disabled={isAnalyzing}>
                Cancel
              </Button>
            }
            showGradientFade={true}
            floatingAction={
              currentPlan && (
                <FloatingActionButton
                  label="Start Building"
                  count={currentPlan.components.length - skippedCount}
                  onClick={() => handleStartBuild()}
                  disabled={isAnalyzing}
                  variant="primary"
                />
              )
            }
          >
            {currentPlan && (
              <BuildPlanReview
                plan={currentPlan}
                onConfirm={handleStartBuild}
                onCancel={handleCancel}
                onReanalyze={handleReanalyze}
                isLoading={isAnalyzing}
                hideActions={true}
                onSkippedComponentsChange={ids => setSkippedCount(ids.length)}
              />
            )}
          </Canvas>
        )

      case 'building':
        return (
          <Canvas title="Building" subtitle="Creating your components">
            <div className="gba:space-y-6">
              <PhaseTimeline
                currentPhase={currentPhase}
                completedPhases={completedPhases}
                className="gba:sticky gba:top-4 gba:z-10 gba:bg-background gba:py-4"
              />

              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">Overall Progress</span>
                  <span className="gba:text-sm gba:font-semibold gba:text-foreground">{overallProgress}%</span>
                </div>
                <div className="gba:w-full gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                  <div
                    className="gba:h-full gba:bg-foreground gba:transition-all gba:duration-300 gba:ease-out"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {completedCount} completed • {reusedCount} reused • {totalCount - completedCount - reusedCount}{' '}
                  remaining
                </p>
              </div>

              <BuildConsoleLog logs={buildLogs} currentOperation={phaseMessage} isBuilding={isBuilding} />

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
              />

              <div className="gba:flex gba:justify-end">
                <Button variant="outline" onClick={cancelBuild} disabled={!isBuilding}>
                  Cancel Build
                </Button>
              </div>
            </div>
          </Canvas>
        )

      case 'complete':
        return (
          <Canvas title="Complete" subtitle="Your solution is ready">
            {currentPlan && (
              <SuccessState
                components={currentPlan.components}
                buildDuration={buildDuration}
                completedCount={completedCount}
                reusedCount={reusedCount}
                onBuildMore={handleReset}
              />
            )}
          </Canvas>
        )

      case 'error':
        return (
          <Canvas title="Error" subtitle="Something went wrong">
            <ErrorState
              error={capturedBuildError || buildError || analyzeError || 'An error occurred'}
              partialComponents={currentPlan?.components.filter(c => c.status === 'completed')}
              onRetry={handleReset}
              onModifyPlan={() => setViewState('review')}
            />
          </Canvas>
        )

      default:
        return <IdleCanvas />
    }
  }

  return (
    <ConversationalLayout
      chatPanel={
        <ChatPanel
          messages={messages}
          inputValue={chatInput}
          onInputChange={setChatInput}
          onSend={handleSendMessage}
          onReset={handleReset}
          isDisabled={viewState === 'analyzing' || viewState === 'building'}
          showResetButton={viewState !== 'idle'}
        />
      }
      canvas={renderCanvas()}
      data-testid={testId}
    />
  )
}

export default OrchestratorViewConversational
