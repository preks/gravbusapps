import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { TrashIcon } from '@phosphor-icons/react'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import {
  cleanMemoryBody,
  formatMemoryTitle,
  relativeDate,
  MEMORY_LENS_NAMESPACE_LABELS,
  type MemoryLensEntry
} from './memoryLensModel'
import translations from '../../_i18n'

interface MemoryEntryCardProps {
  entry: MemoryLensEntry
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

export const MemoryEntryCard: React.FC<MemoryEntryCardProps> = ({ entry, onDelete }) => {
  const { t } = useTranslation(translations)
  const when = relativeDate(entry.occurredAt || entry.updatedAt, t)
  const tags = entry.tags ?? []
  const entities = entry.entities ?? []
  const chips = [...tags.slice(0, 6), ...entities.slice(0, 4)]

  return (
    <article
      className="gba:group gba:flex gba:items-start gba:justify-between gba:gap-3 gba:px-6 gba:py-4 gba:transition-colors gba:hover:bg-muted/40 sm:gba:px-8"
      data-testid={`memory-lens-entry-${entry.key}`}
    >
      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:flex gba:items-baseline gba:gap-2.5">
          <h3 className="gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{formatMemoryTitle(entry)}</h3>
          <span className="gba:shrink-0 gba:text-xs gba:text-muted-foreground">
            {MEMORY_LENS_NAMESPACE_LABELS[entry.namespace]}
            {when ? ` · ${when}` : ''}
          </span>
        </div>
        <p className="gba:mt-1 gba:text-sm gba:leading-relaxed gba:text-muted-foreground gba:line-clamp-2">
          {cleanMemoryBody(entry.value)}
        </p>
        {chips.length > 0 && (
          <div className="gba:mt-2.5 gba:flex gba:flex-wrap gba:gap-1.5">
            {chips.map(chip => (
              <span
                key={chip}
                className="gba:rounded-full gba:bg-muted/70 gba:px-2 gba:py-0.5 gba:text-xs gba:text-muted-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => onDelete(entry.key, entry.namespace)}
        className="gba:flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:text-muted-foreground gba:opacity-0 gba:transition-all gba:hover:bg-muted gba:hover:text-foreground gba:group-hover:opacity-100 focus-visible:gba:opacity-100"
        data-testid={`memory-lens-delete-${entry.key}`}
        aria-label={`Delete memory: ${formatMemoryTitle(entry)}`}
      >
        <TrashIcon className="gba:h-4 gba:w-4" />
      </button>
    </article>
  )
}
