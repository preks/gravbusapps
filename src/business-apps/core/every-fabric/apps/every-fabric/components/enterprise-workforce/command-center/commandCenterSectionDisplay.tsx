// Shared presentation for the command-center sections so the jump bar and the
// section headers stay in sync. Phosphor icons only (DS rule). Tone maps to
// design-system semantic tokens — no hardcoded colors.

import { CheckCircleIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { WorkforceFeedSectionId } from '../workforceFeedModel'

export type SectionTone = 'warning' | 'primary' | 'muted'

export interface SectionVisual {
  icon: Icon
  /** Text color for the icon + count, keyed to a semantic token. */
  toneClass: string
}

const TONE_CLASS: Record<SectionTone, string> = {
  warning: 'gba:text-amber-700 gba:dark:text-amber-300',
  primary: 'gba:text-primary',
  muted: 'gba:text-muted-foreground'
}

const SECTION_VISUALS: Record<WorkforceFeedSectionId, { icon: Icon; tone: SectionTone }> = {
  needsYou: { icon: WarningCircleIcon, tone: 'warning' },
  active: { icon: SpinnerGapIcon, tone: 'primary' },
  recentlyDone: { icon: CheckCircleIcon, tone: 'muted' }
}

export function sectionVisual(id: WorkforceFeedSectionId): SectionVisual {
  const { icon, tone } = SECTION_VISUALS[id]
  return { icon, toneClass: TONE_CLASS[tone] }
}
