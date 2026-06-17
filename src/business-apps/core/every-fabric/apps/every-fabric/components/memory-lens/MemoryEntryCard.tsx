import React from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import { MEMORY_NAMESPACE_LABELS } from '../settings/agentSettings.types'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import { cleanMemoryBody, formatMemoryTitle, relativeDate, type MemoryLensEntry } from './memoryLensModel'

interface MemoryEntryCardProps {
  entry: MemoryLensEntry
  showScore?: boolean
  showNamespace?: boolean
  showDate?: boolean
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

export const MemoryEntryCard: React.FC<MemoryEntryCardProps> = ({
  entry,
  showScore = false,
  showNamespace = true,
  showDate = true,
  onDelete
}) => {
  const when = relativeDate(entry.occurredAt || entry.updatedAt)
  const tags = entry.tags ?? []
  const entities = entry.entities ?? []
  const salience = typeof entry.salience === 'number' ? entry.salience : null
  const score = typeof entry.score === 'number' ? entry.score : null

  return (
    <div
      className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:p-3 gba:hover:bg-muted/20 gba:transition-colors"
      data-testid={`memory-lens-entry-${entry.key}`}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">{formatMemoryTitle(entry)}</p>
            {showNamespace && (
              <span className="gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground">
                {MEMORY_NAMESPACE_LABELS[entry.namespace]}
              </span>
            )}
            {showDate && when && <span className="gba:text-[10px] gba:text-muted-foreground/70">{when}</span>}
          </div>
          <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground gba:line-clamp-3">
            {cleanMemoryBody(entry.value)}
          </p>
          {(tags.length > 0 || entities.length > 0) && (
            <div className="gba:mt-1.5 gba:flex gba:flex-wrap gba:gap-1">
              {tags.slice(0, 8).map(tag => (
                <span
                  key={`tag-${tag}`}
                  className="gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
              {entities.slice(0, 6).map(entity => (
                <span
                  key={`entity-${entity}`}
                  className="gba:rounded-full gba:border gba:border-border/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
                >
                  {entity}
                </span>
              ))}
            </div>
          )}
          <div className="gba:mt-1.5 gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-0.5 gba:text-[10px] gba:text-muted-foreground/70">
            {salience !== null && <span>Salience {salience}</span>}
            {showScore && score !== null && <span>Score {score.toFixed(2)}</span>}
            <span className="gba:font-mono gba:truncate">{entry.key}</span>
          </div>
        </div>
        <button
          onClick={() => onDelete(entry.key, entry.namespace)}
          className="gba:flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-full gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:shrink-0"
          data-testid={`memory-lens-delete-${entry.key}`}
          aria-label={`Delete memory: ${formatMemoryTitle(entry)}`}
        >
          <TrashIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
      </div>
    </div>
  )
}
