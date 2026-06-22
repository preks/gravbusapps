import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { TrashIcon } from '@phosphor-icons/react'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import { formatMemoryTitle, fullDateTime, type MemoryLensEntry } from './memoryLensModel'
import { MemoryMarkdownBody } from './MemoryMarkdownBody'
import { memoryNamespaceLabel } from './memoryNamespaceI18n'
import translations from '../../_i18n'

interface MemoryDetailPanelProps {
  entry: MemoryLensEntry | null
  accessToken: string
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

export const MemoryDetailPanel: React.FC<MemoryDetailPanelProps> = ({ entry, accessToken, onDelete }) => {
  const { t } = useTranslation(translations)

  if (!entry) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:rounded-2xl gba:border gba:border-dashed gba:border-border/60 gba:bg-card/40 gba:p-6 gba:text-center"
        data-testid="memory-lens-detail-empty"
      >
        <p className="gba:text-[12px] gba:text-muted-foreground">{t('memory-lens-detail-select')}</p>
      </div>
    )
  }

  const title = formatMemoryTitle(entry)
  const when = fullDateTime(entry.occurredAt || entry.updatedAt)
  const tags = entry.tags ?? []
  const entities = entry.entities ?? []
  const salience = typeof entry.salience === 'number' ? entry.salience : null

  return (
    <div
      className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-4"
      data-testid="memory-lens-detail"
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
        <div className="gba:min-w-0 gba:flex-1">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">{title}</h3>
          <div className="gba:mt-1 gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-[10px] gba:text-muted-foreground">
            <span className="gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5">
              {memoryNamespaceLabel(entry.namespace, t)}
            </span>
            {when && <span>{when}</span>}
            {salience !== null && <span>{t('memory-lens-entry-salience', { score: salience })}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(entry.key, entry.namespace)}
          className="gba:flex gba:h-7 gba:w-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground gba:transition-colors"
          data-testid="memory-lens-detail-delete"
          aria-label={t('memory-lens-detail-delete-aria')}
        >
          <TrashIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
      </div>

      <div className="gba:mt-2">
        <MemoryMarkdownBody body={entry.value} accessToken={accessToken} />
      </div>

      {(tags.length > 0 || entities.length > 0) && (
        <div className="gba:mt-3 gba:flex gba:flex-wrap gba:gap-1">
          {tags.map(tag => (
            <span
              key={`tag-${tag}`}
              className="gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
          {entities.map(person => (
            <span
              key={`entity-${person}`}
              className="gba:rounded-full gba:border gba:border-border/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
            >
              {person}
            </span>
          ))}
        </div>
      )}

      <p className="gba:mt-3 gba:break-all gba:font-mono gba:text-[10px] gba:text-muted-foreground/50">{entry.key}</p>
    </div>
  )
}
