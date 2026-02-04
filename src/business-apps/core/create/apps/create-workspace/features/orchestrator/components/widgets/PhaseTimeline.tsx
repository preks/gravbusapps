/**
 * PhaseTimeline - Visual timeline for build phases using NW Design System StageProgression
 * Shows current phase and completed phases with progress tracking
 */

import React from 'react'
import { StageProgression, StageItem, cn } from '@newwork/nw-design-system'
import type { BuildPhase } from '../../types'

export interface PhaseTimelineProps {
  currentPhase: BuildPhase | null
  completedPhases: BuildPhase[]
  overallProgress?: number
  className?: string
  'data-testid'?: string
}

interface PhaseConfig {
  value: BuildPhase
  title: string
  description: string
  tooltip: string
}

const phases: PhaseConfig[] = [
  {
    value: 'discovery',
    title: 'Discovery',
    description: 'Finding resources',
    tooltip: 'Analyzing project structure and discovering existing resources'
  },
  {
    value: 'building',
    title: 'Building',
    description: 'Creating components',
    tooltip: 'Building and generating new components and services'
  },
  {
    value: 'wiring',
    title: 'Connecting',
    description: 'Linking dependencies',
    tooltip: 'Connecting components and configuring relationships'
  },
  {
    value: 'complete',
    title: 'Complete',
    description: 'Build finished',
    tooltip: 'All components successfully built and connected'
  }
]

export const PhaseTimeline: React.FC<PhaseTimelineProps> = ({
  currentPhase,
  completedPhases,
  overallProgress,
  className,
  'data-testid': testId = 'phase-timeline'
}) => {
  // Get the current stage value or default to first phase
  const currentStage = currentPhase || 'discovery'

  // Calculate progress for active stage (only show progress for current phase)
  const activeStageProgress = currentPhase ? overallProgress : undefined

  // Determine if a phase should be disabled (hasn't been reached yet)
  const getPhaseDisabled = (phaseValue: BuildPhase): boolean => {
    if (completedPhases.includes(phaseValue)) return false
    if (currentPhase === phaseValue) return false

    // Disable if it's after the current phase
    const phaseOrder: BuildPhase[] = ['discovery', 'building', 'wiring', 'complete']
    const currentIndex = currentPhase ? phaseOrder.indexOf(currentPhase) : 0
    const phaseIndex = phaseOrder.indexOf(phaseValue)

    return phaseIndex > currentIndex
  }

  return (
    <div data-testid={testId} className={cn('gba:relative', className)}>
      <StageProgression
        currentStage={currentStage}
        orientation="horizontal"
        variant="default"
        mode="manual"
        activeStageProgress={activeStageProgress}
        className="gba:gap-0"
      >
        {phases.map((phase, index) => {
          const isDisabled = getPhaseDisabled(phase.value)
          const isCompleted = completedPhases.includes(phase.value)

          return (
            <React.Fragment key={phase.value}>
              <StageItem
                value={phase.value}
                title={phase.title}
                description={phase.description}
                disabled={isDisabled}
                tooltip={phase.tooltip}
                className={cn(
                  // Monochrome styling overrides
                  'gba:border-0 gba:bg-transparent',
                  'gba:min-w-[140px]'
                )}
              />

              {/* Connector line between stages */}
              {index < phases.length - 1 && (
                <div
                  className={cn(
                    'gba:h-0.5 gba:w-8 gba:transition-all gba:duration-300 gba:self-center gba:shrink-0',
                    isCompleted ? 'gba:bg-foreground' : 'gba:bg-border'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </StageProgression>
    </div>
  )
}

export default PhaseTimeline
