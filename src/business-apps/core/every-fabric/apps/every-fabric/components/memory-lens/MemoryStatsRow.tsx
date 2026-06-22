import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { relativeDate, type MemoryStats } from './memoryLensModel'
import { memoryNamespaceLabel } from './memoryNamespaceI18n'
import translations from '../../_i18n'

interface MemoryStatsRowProps {
  stats: MemoryStats
}

interface Metric {
  id: string
  label: string
  value: number
}

export const MemoryStatsRow: React.FC<MemoryStatsRowProps> = ({ stats }) => {
  const { t } = useTranslation(translations)
  const lastUpdatedLabel = relativeDate(stats.lastUpdated, t)

  const metrics: Metric[] = [
    { id: 'total', label: 'Total', value: stats.total },
    ...stats.perNamespace.map(entry => ({
      id: entry.namespace,
      label: entry.label === 'Domain facts' ? 'Facts' : memoryNamespaceLabel(entry.namespace, t),
      value: entry.count
    }))
  ]

  return (
    <section className="gba:rounded-2xl gba:bg-card gba:px-6 gba:py-5 sm:gba:px-8" data-testid="memory-lens-stats">
      <div className="gba:flex gba:flex-wrap gba:items-end gba:gap-x-10 gba:gap-y-5">
        {metrics.map(metric => (
          <div key={metric.id} className="gba:min-w-0" data-testid={`memory-lens-stat-${metric.id}`}>
            <p className="gba:text-2xl gba:font-semibold gba:leading-none gba:text-foreground gba:tabular-nums">
              {metric.value}
            </p>
            <p className="gba:mt-1.5 gba:text-xs gba:text-muted-foreground">{metric.label}</p>
          </div>
        ))}

        {lastUpdatedLabel && (
          <p className="gba:ml-auto gba:self-end gba:text-xs gba:text-muted-foreground">
            Last updated {lastUpdatedLabel}
          </p>
        )}
      </div>
    </section>
  )
}
