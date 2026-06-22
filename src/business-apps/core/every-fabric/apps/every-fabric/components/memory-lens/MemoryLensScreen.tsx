import React, { useState } from 'react'
import { Badge, Button, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeftIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { useMemoryLens } from './useMemoryLens'
import { MemoryProfileCard } from './MemoryProfileCard'
import { MemoryStatsRow } from './MemoryStatsRow'
import { MemoryBrowser } from './MemoryBrowser'
import { MemoryDimensionTabs, type MemoryLensView } from './MemoryDimensionTabs'
import { MemoryDiary } from './MemoryDiary'
import { MemoryFacetBrowser } from './MemoryFacetBrowser'
import { MemoryListSkeleton } from '../settings/components/SkeletonLoader'
import { MemoryGraph2D } from './MemoryGraph2D'
import type { MemoryNamespace } from '../settings/agentSettings.types'
import translations from '../../_i18n'

interface MemoryLensScreenProps {
  accessToken: string
  onBack: () => void
}

export const MemoryLensScreen: React.FC<MemoryLensScreenProps> = ({ accessToken, onBack }) => {
  const { t } = useTranslation(translations)
  const {
    entries,
    stats,
    profile,
    loading,
    searching,
    regenerating,
    loadingMore,
    hasMore,
    error,
    query,
    setQuery,
    search,
    refresh,
    loadMore,
    remove,
    regenerate,
    fetchRange
  } = useMemoryLens(accessToken)

  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<MemoryLensView>('overview')
  const onRemove = (key: string, namespace: MemoryNamespace) => void remove(key, namespace)

  return (
    <div
      className="gba:flex gba:h-full gba:w-full gba:flex-col gba:bg-background gba:p-4 sm:gba:p-6 lg:gba:p-8"
      data-testid="memory-lens-screen"
    >
      <header className="gba:mx-auto gba:flex gba:w-full gba:max-w-7xl gba:items-start gba:gap-4 gba:mb-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to workspace"
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:shrink-0 gba:rounded-full gba:text-muted-foreground gba:hover:bg-muted gba:hover:text-foreground gba:transition-colors gba:mt-0.5"
          data-testid="memory-lens-back"
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
        </button>
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <h1 className="gba:text-2xl gba:font-semibold gba:tracking-tight gba:text-foreground">
              Every&apos;s memory
            </h1>
            <Badge variant="outline">{t('memory-lens-dev-badge')}</Badge>
          </div>
          <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
            What Every has learned from working with you.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} data-testid="memory-lens-refresh">
          <ArrowsClockwiseIcon className={`gba:h-3.5 gba:w-3.5 gba:mr-1.5 ${loading ? 'gba:animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      <div className="gba:mx-auto gba:w-full gba:max-w-7xl gba:flex-1 gba:min-h-0 gba:overflow-y-auto">
        {error && (
          <div
            className="gba:mb-4 gba:rounded-xl gba:border gba:border-destructive/40 gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-sm gba:text-destructive"
            data-testid="memory-lens-error"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="gba:space-y-4">
            <div className="gba:h-40 gba:rounded-2xl gba:bg-card gba:animate-pulse" />
            <div className="gba:h-20 gba:rounded-2xl gba:bg-card gba:animate-pulse" />
            <MemoryListSkeleton />
          </div>
        ) : (
          <div className="gba:space-y-6">
            <MemoryDimensionTabs active={activeView} onChange={setActiveView} />

            {activeView === 'overview' && (
              <div className="gba:space-y-4">
                <MemoryProfileCard
                  profile={profile}
                  regenerating={regenerating}
                  onRegenerate={() => void regenerate()}
                />
                <MemoryStatsRow stats={stats} />
                <MemoryBrowser
                  entries={entries}
                  total={stats.total}
                  query={query}
                  searching={searching}
                  loadingMore={loadingMore}
                  hasMore={hasMore}
                  activeTopic={activeTopic}
                  onSelectTopic={setActiveTopic}
                  onQueryChange={setQuery}
                  onSearch={value => void search(value)}
                  onLoadMore={() => void loadMore()}
                  onDelete={onRemove}
                />
              </div>
            )}

            {activeView === 'diary' && (
              <MemoryDiary fetchRange={fetchRange} accessToken={accessToken} onDelete={onRemove} />
            )}
            {activeView === 'topics' && <MemoryFacetBrowser entries={entries} kind="topic" onDelete={onRemove} />}
            {activeView === 'people' && <MemoryFacetBrowser entries={entries} kind="entity" onDelete={onRemove} />}
            {activeView === 'graph' && <MemoryGraph2D accessToken={accessToken} />}
          </div>
        )}
      </div>
    </div>
  )
}
