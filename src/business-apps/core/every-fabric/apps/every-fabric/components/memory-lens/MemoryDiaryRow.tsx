import React from 'react'
import { cleanMemoryBody, formatMemoryTitle, timeLabel, type MemoryLensEntry } from './memoryLensModel'

interface MemoryDiaryRowProps {
  entry: MemoryLensEntry
  active: boolean
  onSelect: () => void
}

export const MemoryDiaryRow: React.FC<MemoryDiaryRowProps> = ({ entry, active, onSelect }) => {
  const snippet = cleanMemoryBody(entry.value)
  const when = timeLabel(entry.occurredAt || entry.updatedAt)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`gba:group gba:flex gba:w-full gba:items-start gba:gap-3 gba:rounded-lg gba:px-3 gba:py-2 gba:text-left gba:transition-colors ${
        active ? 'gba:bg-muted' : 'gba:hover:bg-muted/50'
      }`}
      data-testid={`memory-lens-diary-row-${entry.key}`}
    >
      <span
        className={`gba:mt-2 gba:h-1.5 gba:w-1.5 gba:shrink-0 gba:rounded-full gba:transition-colors ${
          active ? 'gba:bg-foreground' : 'gba:bg-foreground/30 gba:group-hover:bg-foreground/50'
        }`}
      />
      <span className="gba:min-w-0 gba:flex-1">
        <span className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-[13px] gba:font-medium gba:text-foreground">
            {formatMemoryTitle(entry)}
          </span>
          {when && (
            <span className="gba:shrink-0 gba:tabular-nums gba:text-[10px] gba:text-muted-foreground/60">{when}</span>
          )}
        </span>
        {snippet && (
          <span className="gba:mt-0.5 gba:block gba:truncate gba:text-[11px] gba:text-muted-foreground">{snippet}</span>
        )}
      </span>
    </button>
  )
}
