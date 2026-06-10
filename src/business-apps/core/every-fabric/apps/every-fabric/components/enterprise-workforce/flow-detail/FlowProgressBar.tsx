// Compact step-progress bar for a flow (steps X/Y + percentage + a colored
// fill). Mirrors the progress bar used in the Services case-management Flows
// panel so the workforce flow views read the same. Color follows the flow
// status variant (green = done, red = failed, primary = running).

import React from 'react'

import type { ActionCardStatusVariant } from '../../../utils/actionCardTrace'

export interface FlowProgressBarProps {
  completedSteps?: number
  totalSteps?: number
  percentage?: number
  variant: ActionCardStatusVariant
}

const BAR_COLOR: Record<ActionCardStatusVariant, string> = {
  success: 'gba:bg-green-500',
  destructive: 'gba:bg-red-500',
  muted: 'gba:bg-muted-foreground',
  running: 'gba:bg-primary',
  pending: 'gba:bg-primary'
}

function resolvePercentage(completedSteps?: number, totalSteps?: number, percentage?: number): number {
  if (typeof percentage === 'number' && Number.isFinite(percentage)) return percentage
  if (totalSteps && totalSteps > 0) return ((completedSteps ?? 0) / totalSteps) * 100
  return 0
}

export const FlowProgressBar: React.FC<FlowProgressBarProps> = ({
  completedSteps,
  totalSteps,
  percentage,
  variant
}) => {
  if (!totalSteps || totalSteps <= 0) return null
  const pct = resolvePercentage(completedSteps, totalSteps, percentage)
  const clamped = Math.min(Math.max(pct, 0), 100)
  return (
    <div className="gba:space-y-1" data-testid="flow-progress-bar">
      <div className="gba:flex gba:items-center gba:justify-between gba:text-[11px]">
        <span className="gba:text-muted-foreground">
          {completedSteps ?? 0}/{totalSteps} steps
        </span>
        <span className="gba:font-medium gba:text-foreground">{Math.round(pct)}%</span>
      </div>
      <div className="gba:h-1.5 gba:w-full gba:overflow-hidden gba:rounded-full gba:bg-muted">
        {/* Width is data-driven, so it stays an inline style (no static class). */}
        <div
          className={`gba:h-full gba:rounded-full gba:transition-all ${BAR_COLOR[variant]}`}
          style={{ width: `${clamped}%` }}
          data-testid="flow-progress-fill"
        />
      </div>
    </div>
  )
}
