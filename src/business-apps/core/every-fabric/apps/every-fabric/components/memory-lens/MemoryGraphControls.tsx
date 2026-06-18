import React from 'react'
import { Badge, Button, Input } from '@newwork/nw-design-system'
import { ArrowsOutSimpleIcon, CircleIcon, HashIcon, MagnifyingGlassIcon, UsersIcon, XIcon } from '@phosphor-icons/react'
import { MEMORY_NAMESPACE_LABELS } from '../settings/agentSettings.types'
import { cleanMemoryBody, formatMemoryTitle } from './memoryLensModel'
import type { GraphNode } from './memoryGraphModel'
import type { GraphTotals } from './useMemoryGraph'

interface MemoryGraphControlsProps {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  searching: boolean
  matchCount: number | null
  totals: GraphTotals
  selected: GraphNode | null
  neighborCount: number
  hubHasMore: boolean
  loadingSelected: boolean
  onLoadMore: () => void
  onFit: () => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

const LegendDot: React.FC<{ children: React.ReactNode; swatch: React.ReactNode }> = ({ children, swatch }) => (
  <div className="gba:flex gba:items-center gba:gap-1.5">
    {swatch}
    <span className="gba:text-[11px] gba:text-muted-foreground">{children}</span>
  </div>
)

const HubDetail: React.FC<{
  node: GraphNode
  neighborCount: number
  hubHasMore: boolean
  loading: boolean
  onLoadMore: () => void
}> = ({ node, neighborCount, hubHasMore, loading, onLoadMore }) => (
  <>
    <div className="gba:flex gba:items-center gba:gap-2">
      {node.kind === 'topic' ? (
        <HashIcon className="gba:h-4 gba:w-4 gba:text-primary" />
      ) : (
        <UsersIcon className="gba:h-4 gba:w-4 gba:text-foreground" />
      )}
      <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">{node.label}</span>
    </div>
    <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-1.5">
      <Badge variant="outline">{node.kind === 'topic' ? 'Topic' : 'Person / thing'}</Badge>
      {typeof node.count === 'number' && <Badge variant="secondary">{node.count} memories</Badge>}
      <Badge variant="secondary">{neighborCount} loaded</Badge>
    </div>
    <p className="gba:mt-3 gba:text-xs gba:text-muted-foreground">
      Click connected nodes to keep exploring. {hubHasMore ? 'More memories are available for this hub.' : ''}
    </p>
    {hubHasMore && (
      <Button variant="outline" size="sm" className="gba:mt-3 gba:w-full" disabled={loading} onClick={onLoadMore}>
        {loading ? 'Loading…' : 'Load more memories'}
      </Button>
    )}
  </>
)

const MemoryDetail: React.FC<{ node: GraphNode; neighborCount: number }> = ({ node, neighborCount }) => {
  const entry = node.entry
  const tags = entry?.tags ?? []
  const entities = entry?.entities ?? []
  return (
    <>
      <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
        {node.namespace && <Badge variant="secondary">{MEMORY_NAMESPACE_LABELS[node.namespace]}</Badge>}
        {typeof node.salience === 'number' && <Badge variant="outline">Salience {node.salience}</Badge>}
      </div>
      <p className="gba:mt-2 gba:text-sm gba:font-semibold gba:text-foreground">
        {entry ? formatMemoryTitle(entry) : node.label}
      </p>
      {entry && (
        <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground gba:line-clamp-6">
          {cleanMemoryBody(entry.value)}
        </p>
      )}
      {(tags.length > 0 || entities.length > 0) && (
        <div className="gba:mt-2.5 gba:flex gba:flex-wrap gba:gap-1">
          {tags.slice(0, 10).map(tag => (
            <span
              key={`t-${tag}`}
              className="gba:rounded-full gba:bg-muted/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
          {entities.slice(0, 8).map(item => (
            <span
              key={`e-${item}`}
              className="gba:rounded-full gba:border gba:border-border/60 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      )}
      <p className="gba:mt-3 gba:text-[11px] gba:text-muted-foreground/70">Connected to {neighborCount} hub(s).</p>
    </>
  )
}

export const MemoryGraphControls: React.FC<MemoryGraphControlsProps> = ({
  query,
  onQueryChange,
  onSubmit,
  onClear,
  searching,
  matchCount,
  totals,
  selected,
  neighborCount,
  hubHasMore,
  loadingSelected,
  onLoadMore,
  onFit,
  searchInputRef
}) => (
  <div className="gba:pointer-events-none gba:absolute gba:inset-0">
    <div className="gba:pointer-events-auto gba:absolute gba:left-3 gba:top-3 gba:flex gba:items-center gba:gap-2">
      <div className="gba:relative gba:w-64 sm:gba:w-80">
        <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 -gba:translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />
        <Input
          // Bridge the React ref-typing gap between this app and the DS Input's ref prop.
          ref={searchInputRef as React.Ref<HTMLInputElement>}
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSubmit()
            if (e.key === 'Escape') onClear()
          }}
          placeholder="Search topics, people, dates, memories…"
          className="gba:h-9 gba:pl-9 gba:pr-8 gba:text-sm gba:rounded-full gba:bg-card gba:border-border/60 gba:shadow-sm"
          data-testid="memory-graph-search"
        />
        {query && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="gba:absolute gba:right-2.5 gba:top-1/2 -gba:translate-y-1/2 gba:text-muted-foreground/60 gba:hover:text-foreground"
          >
            <XIcon className="gba:h-3.5 gba:w-3.5" />
          </button>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={onFit} aria-label="Fit graph to view" data-testid="memory-graph-fit">
        <ArrowsOutSimpleIcon className="gba:h-3.5 gba:w-3.5" />
      </Button>
      {searching && <span className="gba:text-[11px] gba:text-muted-foreground">Searching…</span>}
      {!searching && matchCount !== null && (
        <span className="gba:text-[11px] gba:text-muted-foreground">{matchCount} match(es)</span>
      )}
    </div>

    <div className="gba:pointer-events-auto gba:absolute gba:left-3 gba:bottom-3 gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-1 gba:rounded-xl gba:border gba:border-border/60 gba:bg-card/90 gba:px-3 gba:py-2 gba:backdrop-blur">
      <LegendDot swatch={<span className="gba:h-2.5 gba:w-4 gba:rounded-full gba:bg-primary" />}>Topics</LegendDot>
      <LegendDot
        swatch={<span className="gba:h-2.5 gba:w-4 gba:rounded-full gba:border gba:border-border gba:bg-card" />}
      >
        People & things
      </LegendDot>
      <LegendDot swatch={<CircleIcon weight="fill" className="gba:h-2.5 gba:w-2.5 gba:text-muted-foreground" />}>
        Memories
      </LegendDot>
      <span className="gba:text-[11px] gba:text-muted-foreground/70">
        {`${totals.memories} memories · ${totals.topics} topics · ${totals.entities} people`}
      </span>
    </div>

    {selected && (
      <aside
        className="gba:pointer-events-auto gba:absolute gba:right-3 gba:top-3 gba:bottom-3 gba:w-72 gba:overflow-y-auto gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card/95 gba:p-4 gba:shadow-lg gba:backdrop-blur"
        data-testid="memory-graph-detail"
      >
        {selected.kind === 'memory' ? (
          <MemoryDetail node={selected} neighborCount={neighborCount} />
        ) : (
          <HubDetail
            node={selected}
            neighborCount={neighborCount}
            hubHasMore={hubHasMore}
            loading={loadingSelected}
            onLoadMore={onLoadMore}
          />
        )}
      </aside>
    )}
  </div>
)
