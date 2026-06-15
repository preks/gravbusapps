// Compact legend for the Flow Map explaining the node status colours, mirroring
// the case-relationship graph legend but using design-system tokens.

import React from 'react'

const STATUS_LEGEND: ReadonlyArray<{ label: string; dotClass: string }> = [
  { label: 'Current', dotClass: 'gba:bg-info gba:ring-2 gba:ring-info/30' },
  { label: 'Completed', dotClass: 'gba:bg-success' },
  { label: 'Failed', dotClass: 'gba:bg-destructive' },
  { label: 'Pending', dotClass: 'gba:bg-muted-foreground/40' }
]

export const FlowMapLegend: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-1.5 gba:text-xs gba:text-muted-foreground ${className}`}
    data-testid="flow-map-legend"
  >
    <span className="gba:font-medium gba:text-foreground">Status:</span>
    {STATUS_LEGEND.map(item => (
      <div key={item.label} className="gba:flex gba:items-center gba:gap-1.5">
        <span className={`gba:h-2.5 gba:w-2.5 gba:rounded-full ${item.dotClass}`} aria-hidden />
        <span>{item.label}</span>
      </div>
    ))}
  </div>
)
