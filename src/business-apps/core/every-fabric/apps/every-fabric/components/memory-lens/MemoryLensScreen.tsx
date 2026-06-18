import React, { useState } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { ArrowLeftIcon, ArrowsClockwiseIcon, BrainIcon } from '@phosphor-icons/react'
import { useMemoryLens } from './useMemoryLens'
import { MemoryProfileCard } from './MemoryProfileCard'
import { MemoryStatsRow } from './MemoryStatsRow'
import { MemoryInsights } from './MemoryInsights'
import { MemoryBrowser } from './MemoryBrowser'
import { MemoryDimensionTabs, type MemoryLensView } from './MemoryDimensionTabs'
import { MemoryDiary } from './MemoryDiary'
import { MemoryCalendar } from './MemoryCalendar'
import { MemoryFacetBrowser } from './MemoryFacetBrowser'
import { MemoryListSkeleton } from '../settings/components/SkeletonLoader'
import { MemoryGraph2D } from './MemoryGraph2D'
import type { MemoryNamespace } from '../settings/agentSettings.types'

interface MemoryLensScreenProps {
  accessToken: string
  onBack: () => void
}

export const MemoryLensScreen: React.FC<MemoryLensScreenProps> = ({ accessToken, onBack }) => {
  const {
    entries,
    stats,
    profile,
    loading,
    searching,
    regenerating,
    error,
    query,
    setQuery,
    search,
    refresh,
    remove,
    regenerate,
    fetchRange
  } = useMemoryLens(accessToken)

  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<MemoryLensView>('overview')
  const hasQuery = query.trim().length > 0 && query.trim() !== '*'
  const onRemove = (key: string, namespace: MemoryNamespace) => void remove(key, namespace)

  return (
    <div
      className="gba:flex gba:h-full gba:w-full gba:flex-col gba:bg-background gba:p-4 sm:gba:p-5 lg:gba:p-6"
      data-testid="memory-lens-screen"
    >
      <header className="gba:flex gba:items-start gba:gap-4 gba:mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to workspace"
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:shrink-0 gba:rounded-full gba:border gba:border-border/60 gba:bg-background gba:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:mt-1"
          data-testid="memory-lens-back"
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
        </button>
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <BrainIcon className="gba:h-5 gba:w-5 gba:text-foreground" />
            <h1 className="gba:text-[22px] gba:font-semibold gba:leading-tight gba:text-foreground">
              What we know about you
            </h1>
            <Badge variant="outline">dev</Badge>
          </div>
          <p className="gba:mt-0.5 gba:text-[13px] gba:text-muted-foreground gba:truncate">
            Everything the agent remembers about you — profile brief, preferences, learned facts, patterns and diary.
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          <Button variant="outline" size="sm" onClick={() => void refresh()} data-testid="memory-lens-refresh">
            <ArrowsClockwiseIcon className={`gba:h-3.5 gba:w-3.5 gba:mr-1.5 ${loading ? 'gba:animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:pr-0.5">
        {error && (
          <div
            className="gba:mb-3 gba:rounded-xl gba:border gba:border-destructive/40 gba:bg-destructive/10 gba:px-3.5 gba:py-2.5 gba:text-[13px] gba:text-destructive"
            data-testid="memory-lens-error"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="gba:space-y-4">
            <div className="gba:h-32 gba:rounded-2xl gba:border gba:border-border/60 gba:bg-muted/20 gba:animate-pulse" />
            <MemoryListSkeleton />
          </div>
        ) : (
          <div className="gba:space-y-4">
            <MemoryDimensionTabs active={activeView} onChange={setActiveView} />

            {activeView === 'overview' && (
              <div className="gba:space-y-4">
                <MemoryProfileCard
                  profile={profile}
                  regenerating={regenerating}
                  onRegenerate={() => void regenerate()}
                />
                <MemoryStatsRow stats={stats} />
                <MemoryInsights stats={stats} activeTopic={activeTopic} onSelectTopic={setActiveTopic} />
                <MemoryBrowser
                  entries={entries}
                  query={query}
                  searching={searching}
                  hasQuery={hasQuery}
                  activeTopic={activeTopic}
                  onSelectTopic={setActiveTopic}
                  onQueryChange={setQuery}
                  onSearch={value => void search(value)}
                  onDelete={onRemove}
                />
              </div>
            )}

            {activeView === 'diary' && <MemoryDiary entries={entries} onDelete={onRemove} />}
            {activeView === 'calendar' && <MemoryCalendar fetchRange={fetchRange} onDelete={onRemove} />}
            {activeView === 'topics' && <MemoryFacetBrowser entries={entries} kind="topic" onDelete={onRemove} />}
            {activeView === 'people' && <MemoryFacetBrowser entries={entries} kind="entity" onDelete={onRemove} />}
            {activeView === 'graph' && <MemoryGraph2D accessToken={accessToken} />}
          </div>
        )}
      </div>
    </div>
  )
}
