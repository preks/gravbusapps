// Compact legend for the Flow Map explaining the node status colours, mirroring
// the case-relationship graph legend but using design-system tokens.

import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'

import translations from '../../../_i18n'

const STATUS_LEGEND: ReadonlyArray<{ key: string; dotClass: string }> = [
  { key: 'flow-legend-current', dotClass: 'gba:bg-info gba:ring-2 gba:ring-info/30' },
  { key: 'flow-legend-completed', dotClass: 'gba:bg-success' },
  { key: 'flow-legend-failed', dotClass: 'gba:bg-destructive' },
  { key: 'flow-legend-pending', dotClass: 'gba:bg-muted-foreground/40' }
]

export const FlowMapLegend: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation(translations)

  return (
    <div
      className={`gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-1.5 gba:text-xs gba:text-muted-foreground ${className}`}
      data-testid="flow-map-legend"
    >
      <span className="gba:font-medium gba:text-foreground">{t('flow-legend-status')}</span>
      {STATUS_LEGEND.map(item => (
        <div key={item.key} className="gba:flex gba:items-center gba:gap-1.5">
          <span className={`gba:h-2.5 gba:w-2.5 gba:rounded-full ${item.dotClass}`} aria-hidden />
          <span>{t(item.key)}</span>
        </div>
      ))}
    </div>
  )
}
