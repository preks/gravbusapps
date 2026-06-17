import React, { useMemo, useState } from 'react'
import { Input } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { MEMORY_NAMESPACES, MEMORY_NAMESPACE_EMPTY, MEMORY_NAMESPACE_LABELS } from '../settings/agentSettings.types'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import { MemoryListSkeleton } from '../settings/components/SkeletonLoader'
import type { MemoryLensEntry } from './memoryLensModel'
import { MemoryEntryCard } from './MemoryEntryCard'

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
            <MemoryEntryCard
              key={`${entry.namespace}-${entry.key}`}
              entry={entry}
              showScore={hasQuery}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </section>
  )
}
