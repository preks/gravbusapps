import React, { useMemo, useState } from 'react'
import { Button, Input, useTranslation } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { MEMORY_NAMESPACES, type MemoryNamespace } from '../settings/agentSettings.types'
import { MemoryListSkeleton } from '../settings/components/SkeletonLoader'
import type { MemoryLensEntry } from './memoryLensModel'
import { MEMORY_LENS_NAMESPACE_LABELS } from './memoryLensModel'
import { MemoryEntryCard } from './MemoryEntryCard'
import { memoryNamespaceEmptyLabel } from './memoryNamespaceI18n'
import translations from '../../_i18n'

type NamespaceTab = MemoryNamespace | 'all'

interface MemoryBrowserProps {
  entries: MemoryLensEntry[]
  total: number
  query: string
  searching: boolean
  loadingMore: boolean
  hasMore: boolean
  activeTopic: string | null
  onSelectTopic: (topic: string | null) => void
  onQueryChange: (value: string) => void
  onSearch: (value: string) => void
  onLoadMore: () => void
  onDelete: (key: string, namespace: MemoryNamespace) => void
}

const TOP_TOPIC_LIMIT = 6

const topTopics = (entries: MemoryLensEntry[]): string[] => {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_TOPIC_LIMIT)
    .map(([tag]) => tag)
}

export const MemoryBrowser: React.FC<MemoryBrowserProps> = ({
  entries,
  total,
  query,
  searching,
  loadingMore,
  hasMore,
  activeTopic,
  onSelectTopic,
  onQueryChange,
  onSearch,
  onLoadMore,
  onDelete
}) => {
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState<NamespaceTab>('all')

  const tabs: Array<{ id: NamespaceTab; label: string; count: number }> = useMemo(
    () => [
      { id: 'all', label: t('memory-lens-browser-all'), count: entries.length },
      ...MEMORY_NAMESPACES.map(namespace => ({
        id: namespace as NamespaceTab,
        label: MEMORY_LENS_NAMESPACE_LABELS[namespace],
        count: entries.filter(entry => entry.namespace === namespace).length
      }))
    ],
    [entries, t]
  )

  const topics = useMemo(() => topTopics(entries), [entries])

  const visibleEntries = useMemo(() => {
    let filteredEntries = entries
    if (activeTab !== 'all') filteredEntries = filteredEntries.filter(entry => entry.namespace === activeTab)
    if (activeTopic) filteredEntries = filteredEntries.filter(entry => (entry.tags ?? []).includes(activeTopic))
    return filteredEntries
  }, [entries, activeTab, activeTopic])

  const emptyLabel =
    activeTab === 'all' ? t('memory-lens-browser-empty-filters') : memoryNamespaceEmptyLabel(activeTab, t)

  return (
    <section className="gba:rounded-2xl gba:bg-card" data-testid="memory-lens-browser">
      <div className="gba:flex gba:flex-col gba:gap-4 gba:px-6 gba:pt-6 sm:gba:flex-row sm:gba:items-center sm:gba:justify-between sm:gba:px-8">
        <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">
          Memories
          <span className="gba:ml-2 gba:font-normal gba:text-muted-foreground gba:tabular-nums">{total}</span>
        </h2>
        <div className="gba:relative gba:w-full sm:gba:w-72">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 -gba:translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <Input
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && onSearch(query)}
            placeholder="Search memories"
            className="gba:h-9 gba:rounded-lg gba:border-transparent gba:bg-background gba:pl-9 gba:text-sm"
            data-testid="memory-lens-search"
          />
        </div>
      </div>

      <div className="gba:mt-4 gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:px-6 sm:gba:px-8">
        <div className="gba:inline-flex gba:items-center gba:gap-0.5 gba:rounded-lg gba:bg-background gba:p-0.5">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:px-3 gba:py-1.5 gba:text-[13px] gba:font-medium gba:transition-colors ${
                  isActive
                    ? 'gba:bg-card gba:text-foreground gba:shadow-sm'
                    : 'gba:text-muted-foreground gba:hover:text-foreground'
                }`}
                data-testid={`memory-lens-tab-${tab.id}`}
              >
                {tab.label}
                <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">{tab.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {topics.length > 0 && (
        <div className="gba:mt-3 gba:flex gba:flex-wrap gba:items-center gba:gap-1.5 gba:px-6 sm:gba:px-8">
          {topics.map(topic => {
            const isActive = activeTopic === topic
            return (
              <button
                key={topic}
                type="button"
                onClick={() => onSelectTopic(isActive ? null : topic)}
                className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2.5 gba:py-1 gba:text-xs gba:transition-colors ${
                  isActive
                    ? 'gba:bg-foreground gba:text-background'
                    : 'gba:bg-background gba:text-muted-foreground gba:hover:text-foreground'
                }`}
                data-testid={`memory-lens-topic-${topic}`}
              >
                {topic}
                {isActive && <XIcon className="gba:h-3 gba:w-3" />}
              </button>
            )
          })}
        </div>
      )}

      <div className="gba:mt-4 gba:divide-y gba:divide-border/50 gba:border-t gba:border-border/50">
        {searching ? (
          <div className="gba:px-6 gba:py-4 sm:gba:px-8">
            <MemoryListSkeleton />
          </div>
        ) : visibleEntries.length === 0 ? (
          <p className="gba:px-6 gba:py-14 gba:text-center gba:text-sm gba:text-muted-foreground sm:gba:px-8">
            {emptyLabel}
          </p>
        ) : (
          visibleEntries.map(entry => (
            <MemoryEntryCard key={`${entry.namespace}-${entry.key}`} entry={entry} onDelete={onDelete} />
          ))
        )}
      </div>

      {hasMore && !searching && (
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:border-t gba:border-border/50 gba:px-6 gba:py-4 sm:gba:px-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
            disabled={loadingMore}
            data-testid="memory-lens-load-more"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
          <span className="gba:text-xs gba:text-muted-foreground gba:tabular-nums">
            {entries.length} of {total}
          </span>
        </div>
      )}
    </section>
  )
}
