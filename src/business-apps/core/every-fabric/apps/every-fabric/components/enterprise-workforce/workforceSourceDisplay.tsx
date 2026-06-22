// Shared presentation for a run's trigger source ("what caused it"): an icon
// plus a human label. Kept tiny and reusable so the command-center feed and
// any future run lists stay consistent. Phosphor icons only (DS rule).

import { ClockIcon, CursorClickIcon, EnvelopeIcon, LightningIcon, QuestionIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { WorkforceRunSource } from './workforceTypes'

export interface SourceVisual {
  icon: Icon
  /** FTL message key for the human label; translate at the call site with `t()`. */
  labelKey: string
}

const SOURCE_VISUALS: Record<WorkforceRunSource, SourceVisual> = {
  manual: { icon: CursorClickIcon, labelKey: 'source-manual' },
  schedule: { icon: ClockIcon, labelKey: 'source-schedule' },
  webhook: { icon: LightningIcon, labelKey: 'source-webhook' },
  inbound_email: { icon: EnvelopeIcon, labelKey: 'source-inbound-email' }
}

export function sourceVisual(source: WorkforceRunSource | null | undefined): SourceVisual {
  if (source && source in SOURCE_VISUALS) return SOURCE_VISUALS[source]
  return { icon: QuestionIcon, labelKey: 'source-unknown' }
}
