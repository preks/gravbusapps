// Compact search for the agent-mesh canvas. Filters nodes by label substring
// and lets the user jump to one by selecting it from a dropdown of matches.
// Selecting a node uses the same `onSelectNode` path as clicking a node,
// which means the existing 2D/3D selection visuals (popover, highlight ring,
// neighbour labels in 3D) all trigger automatically.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrainIcon, LightbulbIcon, MagnifyingGlassIcon, WrenchIcon, XIcon } from '@phosphor-icons/react'
import type { MeshNode, MeshNodeKind } from '../../utils/traceModel'
import { useAgentMeshI18n } from './useAgentMeshI18n'

interface MeshSearchProps {
  nodes: readonly MeshNode[]
  onSelectNode: (id: string) => void
}

const MAX_RESULTS = 12

function iconForKind(kind: MeshNodeKind) {
  switch (kind) {
    case 'skill':
      return LightbulbIcon
    case 'tool':
      return WrenchIcon
    case 'orchestrator':
    case 'subagent':
    case 'expert':
    default:
      return BrainIcon
  }
}

export const MeshSearch: React.FC<MeshSearchProps> = ({ nodes, onSelectNode }) => {
  const { t, nodeCategoryLabel } = useAgentMeshI18n()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = query.trim().toLowerCase()

  // Match by label substring. Sort: exact prefix matches first, then by
  // shorter label so the user lands on the most likely target.
  const results = useMemo(() => {
    if (trimmed.length === 0) return []
    const matches: { node: MeshNode; score: number }[] = []
    for (const node of nodes) {
      const lower = node.label.toLowerCase()
      const idx = lower.indexOf(trimmed)
      if (idx === -1) continue
      // Lower score = better match.
      const score = idx * 1000 + lower.length
      matches.push({ node, score })
    }
    matches.sort((a, b) => a.score - b.score)
    return matches.slice(0, MAX_RESULTS).map(m => m.node)
  }, [nodes, trimmed])

  // Reset highlight when result list changes.
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Global Cmd/Ctrl+K shortcut to focus the search.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSelect = useCallback(
    (node: MeshNode) => {
      onSelectNode(node.id)
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
    },
    [onSelectNode]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (results.length === 0 ? 0 : (i + 1) % results.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length))
    } else if (e.key === 'Enter') {
      const node = results[activeIndex]
      if (node) {
        e.preventDefault()
        handleSelect(node)
      }
    } else if (e.key === 'Escape') {
      if (query.length > 0) {
        setQuery('')
      } else {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
  }

  const showDropdown = open && trimmed.length > 0

  return (
    <div ref={containerRef} className="gba:relative" data-testid="mesh-search">
      <div className="gba:relative gba:flex gba:items-center">
        <MagnifyingGlassIcon
          className="gba:pointer-events-none gba:absolute gba:left-2.5 gba:h-4 gba:w-4 gba:text-muted-foreground"
          weight="bold"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('agent-mesh-search-placeholder')}
          className="gba:h-8 gba:w-[240px] gba:rounded-lg gba:border gba:border-border/60 gba:bg-card/95 gba:backdrop-blur gba:pl-8 gba:pr-7 gba:text-[12px] gba:text-foreground gba:placeholder:text-muted-foreground gba:shadow-sm gba:outline-none gba:transition-colors focus:gba:border-primary/60 focus:gba:ring-2 focus:gba:ring-primary/20"
          aria-label={t('agent-mesh-search-aria')}
          data-testid="mesh-search-input"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="gba:absolute gba:right-1 gba:inline-flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
            aria-label={t('agent-mesh-search-clear')}
          >
            <XIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          className="gba:absolute gba:right-0 gba:top-9 gba:z-20 gba:w-[280px] gba:overflow-hidden gba:rounded-lg gba:border gba:border-border/60 gba:bg-card/95 gba:backdrop-blur gba:shadow-lg"
          role="listbox"
          data-testid="mesh-search-results"
        >
          {results.length === 0 ? (
            <div className="gba:px-3 gba:py-2 gba:text-[12px] gba:text-muted-foreground">
              {t('agent-mesh-search-no-matches', { query })}
            </div>
          ) : (
            <ul className="gba:max-h-[320px] gba:overflow-y-auto gba:py-1">
              {results.map((node, i) => {
                const Icon = iconForKind(node.kind)
                const isActive = i === activeIndex
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => handleSelect(node)}
                      className={`gba:flex gba:w-full gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:text-left gba:text-[12px] gba:transition-colors ${
                        isActive
                          ? 'gba:bg-muted/70 gba:text-foreground'
                          : 'gba:text-foreground/90 gba:hover:bg-muted/40'
                      }`}
                      data-testid={`mesh-search-result-${i}`}
                    >
                      <Icon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground" weight="bold" />
                      <span className="gba:flex-1 gba:truncate gba:font-medium">{node.label}</span>
                      <span className="gba:shrink-0 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground">
                        {nodeCategoryLabel(node.kind)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
