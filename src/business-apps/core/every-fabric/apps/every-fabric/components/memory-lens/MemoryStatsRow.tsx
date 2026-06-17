import React from 'react'
import { relativeDate, type MemoryStats } from './memoryLensModel'

interface MemoryStatsRowProps {
  stats: MemoryStats
}

interface Tile {
  id: string
  label: string
  value: string
  hint?: string
}

const StatTile: React.FC<{ tile: Tile }> = ({ tile }) => (
  <div
    className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:px-3.5 gba:py-3"
    data-testid={`memory-lens-stat-${tile.id}`}
  >
    <p className="gba:text-[11px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground/70">
      {tile.label}
    </p>
    <p className="gba:mt-1 gba:text-2xl gba:font-semibold gba:leading-none gba:text-foreground">{tile.value}</p>
    {tile.hint && <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground/70">{tile.hint}</p>}
  </div>
)

export const MemoryStatsRow: React.FC<MemoryStatsRowProps> = ({ stats }) => {
  const lastUpdatedLabel = relativeDate(stats.lastUpdated) || 'No activity'

  const tiles: Tile[] = [
    { id: 'total', label: 'Total memories', value: String(stats.total), hint: 'Across all namespaces' },
    ...stats.perNamespace.map(entry => ({
      id: entry.namespace,
      label: entry.label,
      value: String(entry.count)
    })),
    { id: 'high-salience', label: 'High salience', value: String(stats.highSalienceCount), hint: 'Importance 7+' },
    { id: 'recency', label: 'Last updated', value: lastUpdatedLabel }
  ]

  return (
    <div
      className="gba:grid gba:grid-cols-2 gba:gap-2.5 sm:gba:grid-cols-3 lg:gba:grid-cols-4 xl:gba:grid-cols-7"
      data-testid="memory-lens-stats"
    >
      {tiles.map(tile => (
        <StatTile key={tile.id} tile={tile} />
      ))}
    </div>
  )
}
