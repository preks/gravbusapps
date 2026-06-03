// Shared presentation for a run's trigger source ("what caused it"): an icon
// plus a human label. Kept tiny and reusable so the command-center feed and
// any future run lists stay consistent. Phosphor icons only (DS rule).

import { ClockIcon, CursorClickIcon, EnvelopeIcon, LightningIcon, QuestionIcon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { WorkforceRunSource } from './workforceTypes'

export interface SourceVisual {
  icon: Icon
  label: string
}

const SOURCE_VISUALS: Record<WorkforceRunSource, SourceVisual> = {
  manual: { icon: CursorClickIcon, label: 'Manual run' },
  schedule: { icon: ClockIcon, label: 'Scheduled' },
  webhook: { icon: LightningIcon, label: 'Webhook' },
  inbound_email: { icon: EnvelopeIcon, label: 'Inbound email' }
}

export function sourceVisual(source: WorkforceRunSource | null | undefined): SourceVisual {
  if (source && source in SOURCE_VISUALS) return SOURCE_VISUALS[source]
  return { icon: QuestionIcon, label: 'Unknown source' }
}
