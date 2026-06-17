import React, { useMemo } from 'react'
import { CalendarBlankIcon } from '@phosphor-icons/react'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import type { MemoryLensEntry } from './memoryLensModel'
import { groupByDay } from './memoryLensDimensions'
import { MemoryEntryCard } from './MemoryEntryCard'

interface MemoryDiaryProps {
  entries: MemoryLensEntry[]
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

const DayDivider: React.FC<{ label: string; count: number }> = ({ label, count }) => (
  <div className="gba:sticky gba:top-0 gba:z-10 gba:flex gba:items-center gba:gap-2 gba:bg-background/95 gba:py-1.5 gba:backdrop-blur">
    <span className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted/60 gba:text-muted-foreground">
      <CalendarBlankIcon className="gba:h-3.5 gba:w-3.5" />
    </span>
    <h3 className="gba:text-[13px] gba:font-semibold gba:text-foreground">{label}</h3>
    <span className="gba:text-[11px] gba:text-muted-foreground/60">
      {count} {count === 1 ? 'memory' : 'memories'}
    </span>
  </div>
)

export const MemoryDiary: React.FC<MemoryDiaryProps> = ({ entries, onDelete }) => {
  const { dated, undated } = useMemo(() => groupByDay(entries), [entries])

  if (dated.length === 0 && undated.length === 0) {
    return (
      <section
        className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-8 gba:text-center"
        data-testid="memory-lens-diary"
      >
        <p className="gba:text-sm gba:text-muted-foreground">No diary entries yet for this period.</p>
      </section>
    )
  }

  return (
    <section className="gba:space-y-5" data-testid="memory-lens-diary">
      {dated.map(group => (
        <div key={group.key} className="gba:relative gba:space-y-2">
          <DayDivider label={group.label} count={group.entries.length} />
          {group.entries.map(entry => (
            <MemoryEntryCard
              key={`${entry.namespace}-${entry.key}`}
              entry={entry}
              showDate={false}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}

      {undated.length > 0 && (
        <div className="gba:relative gba:space-y-2">
          <DayDivider label="No date" count={undated.length} />
          {undated.map(entry => (
            <MemoryEntryCard
              key={`${entry.namespace}-${entry.key}`}
              entry={entry}
              showDate={false}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </section>
  )
}
