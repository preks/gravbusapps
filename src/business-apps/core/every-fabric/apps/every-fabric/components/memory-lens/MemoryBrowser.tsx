import React, { useMemo, useState } from 'react'
import { Input } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, TrashIcon } from '@phosphor-icons/react'
import { MEMORY_NAMESPACES, MEMORY_NAMESPACE_EMPTY, MEMORY_NAMESPACE_LABELS } from '../settings/agentSettings.types'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import { MemoryListSkeleton } from '../settings/components/SkeletonLoader'
import { cleanMemoryBody, formatMemoryTitle, relativeDate, type MemoryLensEntry } from './memoryLensModel'

type NamespaceTab = MemoryNamespace | 'all'

interface MemoryBrowserProps {
  entries: MemoryLensEntry[]
  query: string
  searching: boolean
  hasQuery: boolean
  activeTopic: string | null
  onSelectTopic: (topic: string | null) => void
  onQueryChange: (value: string) => void
  onSearch: (value: string) => void
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

const EntryCard: React.FC<{
  entry: MemoryLensEntry
  showScore: boolean
  onDelete: (key: string, namespace: MemoryNamespace) => void
}> = ({ entry, showScore, onDelete }) => {
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
            <span className="gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground">
              {MEMORY_NAMESPACE_LABELS[entry.namespace]}
            </span>
            {when && <span className="gba:text-[10px] gba:text-muted-foreground/70">{when}</span>}
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

export const MemoryBrowser: React.FC<MemoryBrowserProps> = ({
  entries,
  query,
  searching,
  hasQuery,
  activeTopic,
  onSelectTopic,
  onQueryChange,
  onSearch,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<NamespaceTab>('all')

  const tabs: Array<{ id: NamespaceTab; label: string; count: number }> = useMemo(
    () => [
      { id: 'all', label: 'All', count: entries.length },
      ...MEMORY_NAMESPACES.map(namespace => ({
        id: namespace as NamespaceTab,
        label: MEMORY_NAMESPACE_LABELS[namespace],
        count: entries.filter(entry => entry.namespace === namespace).length
      }))
    ],
    [entries]
  )

  const visibleEntries = useMemo(() => {
    let list = entries
    if (activeTab !== 'all') list = list.filter(entry => entry.namespace === activeTab)
    if (activeTopic) list = list.filter(entry => (entry.tags ?? []).includes(activeTopic))
    return list
  }, [entries, activeTab, activeTopic])

  const emptyLabel = activeTab === 'all' ? 'No memories match the current filters.' : MEMORY_NAMESPACE_EMPTY[activeTab]

  return (
    <section
      className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-4"
      data-testid="memory-lens-browser"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:flex-wrap">
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">Memories</h2>
        <div className="gba:relative gba:w-full sm:gba:w-72">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 -gba:translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/50" />
          <Input
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch(query)}
            placeholder="Semantic search across all memory..."
            className="gba:h-8 gba:pl-9 gba:text-sm gba:rounded-full gba:bg-muted/30 gba:border-border/50"
            data-testid="memory-lens-search"
          />
        </div>
      </div>

      <div className="gba:mt-3 gba:flex gba:gap-4 gba:border-b gba:border-border/60 gba:overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`gba:-mb-px gba:flex gba:items-center gba:gap-1.5 gba:border-b-2 gba:px-0.5 gba:pb-2 gba:text-[13px] gba:font-semibold gba:whitespace-nowrap gba:transition-colors ${
              activeTab === tab.id
                ? 'gba:border-foreground gba:text-foreground'
                : 'gba:border-transparent gba:text-muted-foreground gba:hover:text-foreground'
            }`}
            data-testid={`memory-lens-tab-${tab.id}`}
          >
            {tab.label}
            <span className="gba:text-[11px] gba:text-muted-foreground/60">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTopic && (
        <div className="gba:mt-2.5">
          <button
            type="button"
            onClick={() => onSelectTopic(null)}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-foreground gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:text-background"
            data-testid="memory-lens-active-topic"
          >
            <span>#{activeTopic}</span>
            <span className="gba:text-background/70">clear</span>
          </button>
        </div>
      )}

      <div className="gba:mt-3 gba:space-y-2">
        {searching ? (
          <MemoryListSkeleton />
        ) : visibleEntries.length === 0 ? (
          <p className="gba:py-6 gba:text-center gba:text-xs gba:text-muted-foreground">{emptyLabel}</p>
        ) : (
          visibleEntries.map(entry => (
            <EntryCard key={`${entry.namespace}-${entry.key}`} entry={entry} showScore={hasQuery} onDelete={onDelete} />
          ))
        )}
      </div>
    </section>
  )
}
