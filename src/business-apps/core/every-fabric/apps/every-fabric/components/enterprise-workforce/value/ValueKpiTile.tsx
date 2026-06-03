// A single business-value KPI tile for the Value Scoreboard.
//
// Presentational only: an icon, the headline value, a label, an optional hint
// line, and an optional "estimated" chip for KPIs derived from the assumptions
// module. Styling stays on design-system semantic tokens (no raw hex).

import type { Icon } from '@phosphor-icons/react'
import React from 'react'

export type ValueTone = 'default' | 'positive' | 'warning'

export interface ValueKpiTileProps {
  icon: Icon
  label: string
  value: string
  hint?: string
  estimated?: boolean
  tone?: ValueTone
  testId?: string
}

const TONE_VALUE_CLASS: Record<ValueTone, string> = {
  default: 'gba:text-foreground',
  positive: 'gba:text-emerald-700 gba:dark:text-emerald-300',
  warning: 'gba:text-amber-700 gba:dark:text-amber-300'
}

const TONE_ICON_CLASS: Record<ValueTone, string> = {
  default: 'gba:bg-muted gba:text-muted-foreground',
  positive: 'gba:bg-emerald-500/15 gba:text-emerald-700 gba:dark:text-emerald-300',
  warning: 'gba:bg-amber-500/15 gba:text-amber-700 gba:dark:text-amber-300'
}

export const ValueKpiTile: React.FC<ValueKpiTileProps> = ({
  icon: IconComponent,
  label,
  value,
  hint,
  estimated = false,
  tone = 'default',
  testId
}) => {
  return (
    <div
      className="gba:flex gba:flex-col gba:gap-2 gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:p-4"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:gap-2">
        <span
          className={`gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-lg ${TONE_ICON_CLASS[tone]}`}
        >
          <IconComponent className="gba:h-4 gba:w-4" weight="bold" />
        </span>
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{label}</span>
        {estimated && (
          <span
            className="gba:ml-auto gba:rounded-full gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground"
            title="Derived from workspace value assumptions"
            data-testid={testId ? `${testId}-estimated` : undefined}
          >
            Estimated
          </span>
        )}
      </div>
      <p className={`gba:text-2xl gba:font-semibold gba:leading-none ${TONE_VALUE_CLASS[tone]}`}>{value}</p>
      {hint && <p className="gba:text-[11px] gba:text-muted-foreground">{hint}</p>}
    </div>
  )
}
