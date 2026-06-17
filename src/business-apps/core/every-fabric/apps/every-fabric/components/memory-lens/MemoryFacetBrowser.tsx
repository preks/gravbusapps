import React, { useEffect, useMemo, useState } from 'react'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import type { MemoryLensEntry } from './memoryLensModel'
import { facetIndex, type FacetKind } from './memoryLensDimensions'
import { MemoryEntryCard } from './MemoryEntryCard'

interface MemoryFacetBrowserProps {
  entries: MemoryLensEntry[]
  kind: FacetKind
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

const EMPTY_LABEL: Record<FacetKind, string> = {
  topic: 'No topics captured yet.',
  entity: 'No people or things captured yet.'
}

const prefix = (kind: FacetKind, label: string): string => (kind === 'topic' ? `#${label}` : label)

export const MemoryFacetBrowser: React.FC<MemoryFacetBrowserProps> = ({ entries, kind, onDelete }) => {
  const { items, byValue } = useMemo(() => facetIndex(entries, kind), [entries, kind])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setSelected(current => (current && byValue.has(current) ? current : (items[0]?.label ?? null)))
  }, [items, byValue])

  if (items.length === 0) {
    return (
      <section
        className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-8 gba:text-center"
        data-testid={`memory-lens-facet-${kind}`}
      >
        <p className="gba:text-sm gba:text-muted-foreground">{EMPTY_LABEL[kind]}</p>
      </section>
    )
  }

  const selectedEntries = selected ? (byValue.get(selected) ?? []) : []

  return (
    <section className="gba:grid gba:gap-4 lg:gba:grid-cols-[260px_1fr]" data-testid={`memory-lens-facet-${kind}`}>
      <div className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-2 gba:max-h-[60vh] gba:overflow-y-auto">
        {items.map(item => {
          const isActive = item.label === selected
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setSelected(item.label)}
              className={`gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-2 gba:rounded-lg gba:px-3 gba:py-2 gba:text-left gba:text-[13px] gba:transition-colors ${
                isActive
                  ? 'gba:bg-muted/70 gba:text-foreground gba:font-medium'
                  : 'gba:text-muted-foreground gba:hover:bg-muted/40'
              }`}
              data-testid={`memory-lens-facet-item-${item.label}`}
            >
              <span className="gba:truncate">{prefix(kind, item.label)}</span>
              <span className="gba:text-[11px] gba:text-muted-foreground/60">{item.count}</span>
            </button>
          )
        })}
      </div>

      <div className="gba:space-y-2">
        {selectedEntries.map(entry => (
          <MemoryEntryCard key={`${entry.namespace}-${entry.key}`} entry={entry} onDelete={onDelete} />
        ))}
      </div>
    </section>
  )
}
