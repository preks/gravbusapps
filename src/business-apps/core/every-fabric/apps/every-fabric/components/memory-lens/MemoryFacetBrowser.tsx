import React, { useEffect, useMemo, useState } from 'react'
import { Input } from '@newwork/nw-design-system'
import { HashIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import type { MemoryLensEntry } from './memoryLensModel'
import { facetIndex, type FacetKind } from './memoryLensDimensions'
import { MemoryEntryCard } from './MemoryEntryCard'

interface MemoryFacetBrowserProps {
  entries: MemoryLensEntry[]
  kind: FacetKind
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

const COPY: Record<FacetKind, { empty: string; search: string; unit: string }> = {
  topic: { empty: 'No topics captured yet.', search: 'Search topics…', unit: 'topic' },
  entity: { empty: 'No people or things captured yet.', search: 'Search people & things…', unit: 'entry' }
}

const initials = (label: string): string => {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const FacetAvatar: React.FC<{ kind: FacetKind; label: string; large?: boolean }> = ({ kind, label, large }) => {
  const size = large ? 'gba:h-9 gba:w-9 gba:text-[13px]' : 'gba:h-7 gba:w-7 gba:text-[11px]'
  if (kind === 'topic') {
    return (
      <span
        className={`gba:flex gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted/70 gba:text-muted-foreground ${size}`}
      >
        <HashIcon className={large ? 'gba:h-4 gba:w-4' : 'gba:h-3.5 gba:w-3.5'} />
      </span>
    )
  }
  return (
    <span
      className={`gba:flex gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:font-semibold gba:text-foreground ${size}`}
    >
      {initials(label)}
    </span>
  )
}

export const MemoryFacetBrowser: React.FC<MemoryFacetBrowserProps> = ({ entries, kind, onDelete }) => {
  const { items, byValue } = useMemo(() => facetIndex(entries, kind), [entries, kind])
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setSelected(current => (current && byValue.has(current) ? current : (items[0]?.label ?? null)))
  }, [items, byValue])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter(item => item.label.toLowerCase().includes(term))
  }, [items, search])

  if (items.length === 0) {
    return (
      <section
        className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-8 gba:text-center"
        data-testid={`memory-lens-facet-${kind}`}
      >
        <p className="gba:text-sm gba:text-muted-foreground">{COPY[kind].empty}</p>
      </section>
    )
  }

  const selectedEntries = selected ? (byValue.get(selected) ?? []) : []

  return (
    <section className="gba:flex gba:flex-col gba:gap-4 gba:md:flex-row" data-testid={`memory-lens-facet-${kind}`}>
      <aside className="gba:w-full gba:shrink-0 gba:space-y-2 gba:md:w-64 gba:md:self-start gba:md:sticky gba:md:top-0">
        <div className="gba:space-y-2">
          <div className="gba:relative">
            <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:h-3.5 gba:w-3.5 gba:-translate-y-1/2 gba:text-muted-foreground/50" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={COPY[kind].search}
              className="gba:h-8 gba:rounded-full gba:border-border/50 gba:bg-muted/30 gba:pl-9 gba:text-sm"
              data-testid={`memory-lens-facet-search-${kind}`}
            />
          </div>

          <div className="gba:max-h-96 gba:space-y-0.5 gba:overflow-y-auto gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-1.5">
            {filtered.length === 0 ? (
              <p className="gba:px-3 gba:py-4 gba:text-center gba:text-xs gba:text-muted-foreground">No matches.</p>
            ) : (
              filtered.map(item => {
                const isActive = item.label === selected
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSelected(item.label)}
                    className={`gba:flex gba:w-full gba:items-center gba:gap-2.5 gba:rounded-lg gba:px-2 gba:py-1.5 gba:text-left gba:transition-colors ${
                      isActive ? 'gba:bg-muted' : 'gba:hover:bg-muted/50'
                    }`}
                    data-testid={`memory-lens-facet-item-${item.label}`}
                  >
                    <FacetAvatar kind={kind} label={item.label} />
                    <span
                      className={`gba:min-w-0 gba:flex-1 gba:truncate gba:text-[13px] ${
                        isActive ? 'gba:font-medium gba:text-foreground' : 'gba:text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="gba:shrink-0 gba:rounded-full gba:bg-muted/60 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:tabular-nums gba:text-muted-foreground">
                      {item.count}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </aside>

      <div className="gba:min-w-0 gba:flex-1">
        {selected ? (
          <>
            <div className="gba:mb-3 gba:flex gba:items-center gba:gap-3">
              <FacetAvatar kind={kind} label={selected} large />
              <div className="gba:min-w-0">
                <h2 className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">
                  {kind === 'topic' ? `#${selected}` : selected}
                </h2>
                <p className="gba:text-[11px] gba:text-muted-foreground">
                  {selectedEntries.length} {selectedEntries.length === 1 ? 'memory' : 'memories'}
                </p>
              </div>
            </div>
            <div className="gba:space-y-2">
              {selectedEntries.map(entry => (
                <MemoryEntryCard key={`${entry.namespace}-${entry.key}`} entry={entry} onDelete={onDelete} />
              ))}
            </div>
          </>
        ) : (
          <div className="gba:flex gba:items-center gba:justify-center gba:rounded-2xl gba:border gba:border-dashed gba:border-border/60 gba:bg-card/40 gba:p-8 gba:text-center">
            <p className="gba:text-[12px] gba:text-muted-foreground">Select an item to see its memories.</p>
          </div>
        )}
      </div>
    </section>
  )
}
