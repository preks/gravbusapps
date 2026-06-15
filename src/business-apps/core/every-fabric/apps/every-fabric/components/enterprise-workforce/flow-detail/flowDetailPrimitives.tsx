// Small shared presentational primitives for the Custom Flow Engine detail
// views (panel header, step rows). Extracted so FlowDetailPanel and
// FlowStepRow share one Field/StatusBadge implementation.

import React from 'react'

import { labelForStatusCode, variantForStatusCode, STATUS_BADGE_CLASS } from '../../../utils/actionCardTrace'

export const Field: React.FC<{ label: string; value: string; muted?: boolean; testId?: string }> = ({
  label,
  value,
  muted,
  testId
}) => (
  <div className="gba:min-w-0">
    <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
      {label}
    </p>
    <p
      className={`gba:truncate gba:text-xs ${muted ? 'gba:italic gba:text-muted-foreground' : 'gba:text-foreground'}`}
      data-testid={testId}
    >
      {value}
    </p>
  </div>
)

export const StatusBadge: React.FC<{ code: string; testId?: string }> = ({ code, testId }) => {
  const variant = variantForStatusCode(code)
  return (
    <span
      className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${STATUS_BADGE_CLASS[variant]}`}
      data-testid={testId}
      data-status-code={code}
    >
      {variant === 'running' && (
        <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-current gba:animate-pulse" aria-hidden />
      )}
      {labelForStatusCode(code)}
    </span>
  )
}
