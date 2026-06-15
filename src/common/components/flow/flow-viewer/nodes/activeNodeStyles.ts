// Highlight applied to the node that is currently executing, so the "current
// step" stands out on the Flow Map. The pulse is gated to the motion-safe
// variant so it honours prefers-reduced-motion. Selection styling wins.

import type { StepStatus } from '../types/viewerTypes'

export function activeNodeHighlightClass(status?: StepStatus, isSelected?: boolean): string {
  if (isSelected || status !== 'active') return ''
  return 'gba:ring-2 gba:ring-info/45 gba:ring-offset-2 gba:ring-offset-background gba:motion-safe:animate-pulse'
}
