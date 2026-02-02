/**
 * PhaseTimeline - Visual timeline for build phases
 * Shows current phase and completed phases
 */

import React from 'react'
import { Check, Loader2, Clock, type LucideIcon } from 'lucide-react'
import { cn } from '@newwork/nw-design-system'
import type { BuildPhase } from '../types/orchestrator'

export interface PhaseTimelineProps {
  currentPhase: BuildPhase | null
  completedPhases: BuildPhase[]
  className?: string
  'data-testid'?: string
}

interface PhaseConfig {
  id: BuildPhase
  label: string
  icon: LucideIcon
  color: string
}

const phases: PhaseConfig[] = [
  { id: 'discovery', label: 'Discovery', icon: Clock, color: 'info' },
  { id: 'building', label: 'Building', icon: Loader2, color: 'info' },
  { id: 'wiring', label: 'Connecting', icon: Loader2, color: 'info' },
  { id: 'complete', label: 'Complete', icon: Check, color: 'success' }
]

export const PhaseTimeline: React.FC<PhaseTimelineProps> = ({
  currentPhase,
  completedPhases,
  className,
  'data-testid': testId = 'phase-timeline'
}) => {
  const getPhaseStatus = (phase: BuildPhase): 'complete' | 'active' | 'pending' => {
    if (completedPhases.includes(phase)) return 'complete'
    if (currentPhase === phase) return 'active'
    return 'pending'
  }

  return (
    <div className={cn('gba:flex gba:items-center gba:gap-2', className)} data-testid={testId}>
      {phases.map((phase, index) => {
        const status = getPhaseStatus(phase.id)
        const Icon = phase.icon

        return (
          <React.Fragment key={phase.id}>
            {/* Phase step - Monochrome */}
            <div
              className={cn(
                'gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-full gba:transition-all gba:duration-300 gba:border',
                status === 'complete' && 'gba:bg-foreground gba:text-background gba:border-foreground',
                status === 'active' && 'gba:bg-foreground/10 gba:text-foreground gba:border-foreground/20',
                status === 'pending' && 'gba:bg-transparent gba:text-muted-foreground gba:border-border'
              )}
            >
              <Icon
                className={cn(
                  'gba:w-4 gba:h-4',
                  status === 'active' && 'gba:animate-spin',
                  status === 'complete' && 'gba:animate-none'
                )}
              />
              <span className="gba:text-sm gba:font-medium">{phase.label}</span>
            </div>

            {/* Connector line - Monochrome */}
            {index < phases.length - 1 && (
              <div
                className={cn(
                  'gba:h-0.5 gba:w-8 gba:transition-all gba:duration-300',
                  status === 'complete' ? 'gba:bg-foreground' : 'gba:bg-border'
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default PhaseTimeline
