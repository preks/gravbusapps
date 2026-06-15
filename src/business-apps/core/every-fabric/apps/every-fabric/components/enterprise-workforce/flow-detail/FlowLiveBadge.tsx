// Animated "Live" badge shown while a Custom Flow Engine workflow is still running.

import React from 'react'

export interface FlowLiveBadgeProps {
  label?: string
}

export const FlowLiveBadge: React.FC<FlowLiveBadgeProps> = ({ label = 'Live' }) => (
  <span
    className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:bg-primary/10 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-primary"
    data-testid="flow-live-badge"
  >
    <span className="gba:relative gba:flex gba:h-2 gba:w-2" aria-hidden>
      <span className="gba:absolute gba:inline-flex gba:h-full gba:w-full gba:animate-ping gba:rounded-full gba:bg-primary/60" />
      <span className="gba:relative gba:inline-flex gba:h-2 gba:w-2 gba:rounded-full gba:bg-primary" />
    </span>
    {label}
  </span>
)
