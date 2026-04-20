/**
 * Utility functions for build phase management
 */

import type { BuildPhase } from '../types'

/**
 * Get completed phases based on current phase
 */
export function getCompletedPhases(currentPhase: BuildPhase | null): BuildPhase[] {
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
}
