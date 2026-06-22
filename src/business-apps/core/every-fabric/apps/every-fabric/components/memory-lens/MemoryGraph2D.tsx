import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BrainIcon } from '@phosphor-icons/react'
import { useMemoryGraph } from './useMemoryGraph'
import { useGraphTokens } from './useGraphTokens'
import { useForceGraph } from './useForceGraph'
import { MemoryGraphControls } from './MemoryGraphControls'
import translations from '../../_i18n'

interface MemoryGraph2DProps {
  accessToken: string
}

const linkEndId = (end: string | { id: string }): string => (typeof end === 'string' ? end : end.id)

export const MemoryGraph2D: React.FC<MemoryGraph2DProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    nodes,
    links,
    totals,
    overviewLoading,
    searching,
    error,
    loadingIds,
    selectedId,
    select,
    expandNode,
    loadMore,
    hubHasMore,
    searchServer
  } = useMemoryGraph(accessToken)

  const palette = useGraphTokens(containerRef)

  const [query, setQuery] = useState('')
  const [matchIds, setMatchIds] = useState<Set<string> | null>(null)

  const focusIds = useMemo(() => {
    if (!selectedId) return null
    const set = new Set<string>([selectedId])
    for (const link of links) {
      const source = linkEndId(link.source)
      const target = linkEndId(link.target)
      if (source === selectedId) set.add(target)
      else if (target === selectedId) set.add(source)
    }
    return set
  }, [selectedId, links])

  const { hoverId, fitView, focusOn } = useForceGraph({
    containerRef,
    canvasRef,
    nodes,
    links,
    palette,
    selectedId,
    focusIds,
    matchIds,
    onPick: expandNode
  })

  const selected = useMemo(() => nodes.find(node => node.id === selectedId) ?? null, [nodes, selectedId])
  const neighbors = useMemo(() => {
    if (!focusIds) return []
    return nodes.filter(node => node.id !== selectedId && focusIds.has(node.id))
  }, [nodes, focusIds, selectedId])
  const loadingSelected = selectedId ? loadingIds.has(selectedId) : false

  const handleSelectNode = useCallback(
    (id: string) => {
      const target = nodes.find(node => node.id === id)
      if (!target) return
      expandNode(target)
      window.setTimeout(() => focusOn(id, 1.8), 60)
    },
    [nodes, expandNode, focusOn]
  )

  const handleSubmit = useCallback(async () => {
    const ids = await searchServer(query)
    setMatchIds(ids)
    const first = [...ids][0]
    if (first) {
      select(first)
      // Allow the simulation to seed/position any freshly merged node first.
      window.setTimeout(() => focusOn(first, 1.8), 360)
    }
  }, [query, searchServer, select, focusOn])

  const handleClear = useCallback(() => {
    setQuery('')
    setMatchIds(null)
    select(null)
  }, [select])

  useEffect(() => {
    const onKey = (evt: KeyboardEvent) => {
      const target = evt.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (evt.key === '/' && !typing) {
        evt.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      ref={containerRef}
      className="gba:relative gba:h-[70vh] gba:min-h-96 gba:w-full gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border/60 gba:bg-background"
      data-testid="memory-graph"
    >
      <canvas ref={canvasRef} className="gba:absolute gba:inset-0 gba:h-full gba:w-full" aria-hidden="true" />

      {!overviewLoading && nodes.length > 0 && (
        <MemoryGraphControls
          query={query}
          onQueryChange={setQuery}
          onSubmit={() => void handleSubmit()}
          onClear={handleClear}
          searching={searching}
          matchCount={matchIds ? matchIds.size : null}
          totals={totals}
          selected={selected}
          neighbors={neighbors}
          accessToken={accessToken}
          hubHasMore={selected ? hubHasMore(selected.id) : false}
          loadingSelected={loadingSelected}
          onLoadMore={() => selected && loadMore(selected)}
          onSelectNode={handleSelectNode}
          onCloseDetail={() => select(null)}
          onFit={fitView}
          searchInputRef={searchInputRef}
        />
      )}

      {overviewLoading && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:text-muted-foreground">
          <BrainIcon className="gba:h-8 gba:w-8 gba:animate-pulse" />
          <p className="gba:text-sm">{t('memory-lens-graph-loading')}</p>
        </div>
      )}

      {!overviewLoading && nodes.length === 0 && (
        <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:px-6 gba:text-center">
          <BrainIcon className="gba:h-8 gba:w-8 gba:text-muted-foreground/60" />
          <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('memory-lens-graph-empty-title')}</p>
          <p className="gba:max-w-sm gba:text-xs gba:text-muted-foreground">{t('memory-lens-graph-empty-desc')}</p>
        </div>
      )}

      {error && (
        <div
          className="gba:pointer-events-none gba:absolute gba:bottom-3 gba:left-1/2 -gba:translate-x-1/2 gba:rounded-full gba:border gba:border-destructive/40 gba:bg-destructive/10 gba:px-3.5 gba:py-1.5 gba:text-[12px] gba:text-destructive"
          data-testid="memory-graph-error"
        >
          {error}
        </div>
      )}

      {hoverId && (
        <span className="gba:pointer-events-none gba:absolute gba:right-3 gba:bottom-3 gba:rounded-full gba:bg-card/80 gba:px-2 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground/70 gba:backdrop-blur">
          {t('memory-lens-graph-click-explore')}
        </span>
      )}
    </div>
  )
}
