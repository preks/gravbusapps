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
  isBuilding?: boolean
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
  isBuilding = false,
  className,
  'data-testid': testId = 'phase-timeline'
}) => {
  // Get the current stage value or default to first phase
  const currentStage = currentPhase || 'discovery'

  // In automatic mode (while building) the spinning Loader handles feedback;
  // only pass activeStageProgress in manual mode (build complete/paused).
  const activeStageProgress = !isBuilding && currentPhase ? overallProgress : undefined

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
    <div data-testid={testId} className={cn('gba:min-w-0', className)}>
      <div className="gba:overflow-x-auto gba:min-w-0 gba:-mx-1 gba:md:mx-0">
        <StageProgression
          currentStage={currentStage}
          orientation="horizontal"
          variant="card"
          mode={isBuilding ? 'automatic' : 'manual'}
          activeStageProgress={activeStageProgress}
        >
          {phases.map(phase => {
            const isDisabled = getPhaseDisabled(phase.value)

            return (
              <StageItem
                key={phase.value}
                value={phase.value}
                title={phase.title}
                description={phase.description}
                disabled={isDisabled}
                tooltip={phase.tooltip}
              />
            )
          })}
        </StageProgression>
      </div>
    </div>
  )
}

export default PhaseTimeline
