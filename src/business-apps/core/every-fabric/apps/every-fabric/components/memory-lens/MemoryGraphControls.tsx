import React from 'react'
import { Button, Input, useTranslation } from '@newwork/nw-design-system'
import { ArrowsOutSimpleIcon, CircleIcon, MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react'
import { MemoryGraphDetail } from './MemoryGraphDetail'
import type { GraphNode } from './memoryGraphModel'
import type { GraphTotals } from './useMemoryGraph'
import translations from '../../_i18n'

interface MemoryGraphControlsProps {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  searching: boolean
  matchCount: number | null
  totals: GraphTotals
  selected: GraphNode | null
  neighbors: GraphNode[]
  accessToken: string
  hubHasMore: boolean
  loadingSelected: boolean
  onLoadMore: () => void
  onSelectNode: (id: string) => void
  onCloseDetail: () => void
  onFit: () => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

const LegendDot: React.FC<{ children: React.ReactNode; swatch: React.ReactNode }> = ({ children, swatch }) => (
  <div className="gba:flex gba:items-center gba:gap-1.5">
    {swatch}
    <span className="gba:text-[11px] gba:text-muted-foreground">{children}</span>
  </div>
)

export const MemoryGraphControls: React.FC<MemoryGraphControlsProps> = ({
  query,
  onQueryChange,
  onSubmit,
  onClear,
  searching,
  matchCount,
  totals,
  selected,
  neighbors,
  accessToken,
  hubHasMore,
  loadingSelected,
  onLoadMore,
  onSelectNode,
  onCloseDetail,
  onFit,
  searchInputRef
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:pointer-events-none gba:absolute gba:inset-0">
      <div className="gba:pointer-events-auto gba:absolute gba:left-3 gba:top-3 gba:flex gba:items-center gba:gap-2">
        <div className="gba:relative gba:w-64 sm:gba:w-80">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 -gba:translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground/60" />
          <Input
            ref={searchInputRef as React.Ref<HTMLInputElement>}
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onSubmit()
              if (e.key === 'Escape') onClear()
            }}
            placeholder={t('memory-lens-graph-controls-search')}
            className="gba:h-9 gba:pl-9 gba:pr-8 gba:text-sm gba:rounded-full gba:bg-card gba:border-border/60 gba:shadow-sm"
            data-testid="memory-graph-search"
          />
          {query && (
            <button
              type="button"
              onClick={onClear}
              aria-label={t('memory-lens-graph-controls-clear-aria')}
              className="gba:absolute gba:right-2.5 gba:top-1/2 -gba:translate-y-1/2 gba:text-muted-foreground/60 gba:hover:text-foreground"
            >
              <XIcon className="gba:h-3.5 gba:w-3.5" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onFit}
          aria-label={t('memory-lens-graph-controls-fit-aria')}
          data-testid="memory-graph-fit"
        >
          <ArrowsOutSimpleIcon className="gba:h-3.5 gba:w-3.5" />
        </Button>
        {searching && (
          <span className="gba:text-[11px] gba:text-muted-foreground">{t('memory-lens-graph-controls-searching')}</span>
        )}
        {!searching && matchCount !== null && (
          <span className="gba:text-[11px] gba:text-muted-foreground">
            {t('memory-lens-graph-controls-matches', { count: matchCount })}
          </span>
        )}
      </div>

      <div className="gba:pointer-events-auto gba:absolute gba:left-3 gba:bottom-3 gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-1 gba:rounded-xl gba:border gba:border-border/60 gba:bg-card/90 gba:px-3 gba:py-2 gba:backdrop-blur">
        <LegendDot swatch={<span className="gba:h-2.5 gba:w-4 gba:rounded-full gba:bg-primary" />}>
          {t('memory-lens-graph-legend-topics')}
        </LegendDot>
        <LegendDot
          swatch={<span className="gba:h-2.5 gba:w-4 gba:rounded-full gba:border gba:border-border gba:bg-card" />}
        >
          {t('memory-lens-graph-legend-entities')}
        </LegendDot>
        <LegendDot swatch={<CircleIcon weight="fill" className="gba:h-2.5 gba:w-2.5 gba:text-muted-foreground" />}>
          {t('memory-lens-graph-legend-memories')}
        </LegendDot>
        <span className="gba:text-[11px] gba:text-muted-foreground/70">
          {`${totals.memories} · ${totals.topics} · ${totals.entities}`}
        </span>
      </div>

      {selected && (
        <MemoryGraphDetail
          node={selected}
          neighbors={neighbors}
          accessToken={accessToken}
          hubHasMore={hubHasMore}
          loading={loadingSelected}
          onLoadMore={onLoadMore}
          onSelectNode={onSelectNode}
          onClose={onCloseDetail}
        />
      )}
    </div>
  )
}
