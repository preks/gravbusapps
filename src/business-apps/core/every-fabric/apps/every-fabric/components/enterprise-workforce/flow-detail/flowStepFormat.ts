// Presentation helpers for the flow detail tab. Kept React-free so they can be
// unit tested in isolation.

import type { FlowDetailStep, FlowHistoryEvent } from './flowDetailTypes'

// Shown for fields the Custom Flow Engine does not return today (SLA, step due
// dates, step-level display names) so the UI is explicit about missing data.
export const NOT_AVAILABLE = 'Not available'

// `assignedTo` / `completedBy` can be sentinels rather than real ids; map them
// to readable text and mark them as placeholders (not a concrete person).
const ACTOR_SENTINELS: Record<string, string> = {
  AVAILABLE: 'Available to claim',
  UNASSIGNED: 'Unassigned',
  PENDING: 'Pending assignment',
  MULTIPLE: 'Multiple assignees'
}

export function formatMinutes(minutes: number | undefined): string | null {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 0) return null
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`
}

// Last history event carrying a resolved display name wins per step.
export function historyNameByStep(history: readonly FlowHistoryEvent[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const event of history) {
    if (typeof event.stepIndex === 'number' && event.userName) {
      map.set(event.stepIndex, event.userName)
    }
  }
  return map
}

export interface StepActor {
  label: string
  isPlaceholder: boolean
}

export function resolveStepActor(step: FlowDetailStep, nameByStep: Map<number, string>): StepActor {
  const resolvedName = nameByStep.get(step.stepIndex)
  if (resolvedName) return { label: resolvedName, isPlaceholder: false }
  const id = step.completedBy ?? step.assignedTo
  if (id) {
    const sentinel = ACTOR_SENTINELS[id.toUpperCase()]
    if (sentinel) return { label: sentinel, isPlaceholder: true }
    return { label: id, isPlaceholder: false }
  }
  return { label: NOT_AVAILABLE, isPlaceholder: true }
}

// "Step X of Y · NN%" from the flow progress block, when available.
export function progressSummary(
  currentStep: number | undefined,
  totalSteps: number | undefined,
  completedSteps: number | undefined,
  percentage: number | undefined,
  isComplete: boolean
): string | null {
  if (!totalSteps || totalSteps <= 0) return null
  if (isComplete) return `${totalSteps} of ${totalSteps} steps`
  const inferred = (completedSteps ?? 0) + 1
  const current = Math.min(currentStep ?? inferred, totalSteps)
  const base = `Step ${current} of ${totalSteps}`
  return typeof percentage === 'number' ? `${base} · ${Math.round(percentage)}%` : base
}
