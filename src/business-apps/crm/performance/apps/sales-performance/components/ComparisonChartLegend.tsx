import React from 'react'
import { cn } from '@newwork/nw-design-system'

export interface ComparisonChartLegendItem {
  id: string
  name: string
  color: string
}

interface ComparisonChartLegendProps {
  items: ComparisonChartLegendItem[]
  dataTestId?: string
}

const COMPACT_LEGEND_THRESHOLD = 4

export const ComparisonChartLegend: React.FC<ComparisonChartLegendProps> = ({
  items,
  dataTestId = 'comparison-chart-legend'
}) => {
  if (items.length === 0) {
    return null
  }

  const isCompact = items.length > COMPACT_LEGEND_THRESHOLD

  return (
    <div
      className={cn('gba:mt-3 gba:border-t gba:pt-3', isCompact && 'gba:max-h-28 gba:overflow-y-auto gba:pr-1')}
      data-testid={dataTestId}
    >
      <div
        className={cn(
          isCompact
            ? 'gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:xl:grid-cols-4 gba:gap-x-3 gba:gap-y-1.5'
            : 'gba:flex gba:flex-wrap gba:items-center gba:justify-center gba:gap-x-4 gba:gap-y-2'
        )}
      >
        {items.map(item => (
          <div key={item.id} className="gba:flex gba:items-center gba:gap-1.5 gba:min-w-0" title={item.name}>
            <span
              className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className={cn('gba:text-muted-foreground gba:truncate', isCompact ? 'gba:text-xs' : 'gba:text-sm')}>
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ComparisonChartLegend
