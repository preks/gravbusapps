// Read-only tools catalog for the enterprise agent.
//
// The catalog groups every picker-attachable tool by **business
// domain** (HR, CRM, Investments, …) — same buckets the runtime selector
// uses — so author intent, not provider lineage, drives navigation.
// Source (flowbot, functions, prompt_manager, mcp, builtin) is shown
// as a small per-row hint for transparency only.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { SpinnerGapIcon, WrenchIcon, LinkIcon, CircleIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { CanonicalProviderToolEntry, ToolODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import {
  compareToolCategories,
  formatCategoryLabel,
  formatToolDisplayName,
  formatToolSourceLabel
} from '../skills/toolCategoryLabels'
import { ToolCompanions } from '../skills/ToolCompanions'
import { FlowBindingsManager } from './FlowBindingsManager'

/** DOM id for a tool row, used by the "open companion details" jump. */
const toolRowId = (toolRef: string): string => `tools-tab-row-${toolRef}`

interface ToolsTabProps {
  accessToken: string
}

interface ProviderCapabilitiesView {
  risk_level?: string
  requires_auth?: boolean
  supports_hitl?: boolean
  supports_artifacts?: boolean
}

const ALL_FILTER = '__all__'
const UNCATEGORIZED = 'uncategorized'

const readProviderCapabilities = (caps: Record<string, unknown>): ProviderCapabilitiesView => ({
  risk_level: typeof caps.risk_level === 'string' ? caps.risk_level : undefined,
  requires_auth: typeof caps.requires_auth === 'boolean' ? caps.requires_auth : undefined,
  supports_hitl: typeof caps.supports_hitl === 'boolean' ? caps.supports_hitl : undefined,
  supports_artifacts: typeof caps.supports_artifacts === 'boolean' ? caps.supports_artifacts : undefined
})

export const ToolsTab: React.FC<ToolsTabProps> = ({ accessToken }) => {
  const client = usePromptManagerClient(accessToken)
  const [tools, setTools] = useState<ToolODM[]>([])
  const [providerTools, setProviderTools] = useState<CanonicalProviderToolEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER)
  const [togglingName, setTogglingName] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)
  const [highlightRef, setHighlightRef] = useState<string | null>(null)

  // Jump from a "Works with" companion link to that tool's own row. Clear
  // filters first so a companion in another category becomes visible.
  const openToolDetail = useCallback((toolRef: string) => {
    setSearch('')
    setCategoryFilter(ALL_FILTER)
    setHighlightRef(toolRef)
  }, [])

  const labelForRef = useCallback(
    (toolRef: string) => {
      const match = providerTools.find(t => t.tool_ref === toolRef)
      return match ? formatToolDisplayName(match.display_name, match.canonical_name) : undefined
    },
    [providerTools]
  )

  const loadTools = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [page, canonicalTools] = await Promise.all([
        client.getTools({ limit: 100 }),
        client.getCanonicalProviderTools().catch(() => [] as CanonicalProviderToolEntry[])
      ])
      setTools(page.data)
      setProviderTools(canonicalTools)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools')
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    void loadTools()
  }, [loadTools])

  // Disable/enable is keyed by canonical (LLM) name on the backend, so a
  // single toggle flips every entry that shares that canonical name (the
  // same capability can surface under more than one tool_ref).
  const handleToggleDisabled = useCallback(
    async (tool: CanonicalProviderToolEntry) => {
      const nextDisabled = !tool.disabled
      setTogglingName(tool.canonical_name)
      setToggleError(null)
      try {
        await client.setToolAvailability(tool.canonical_name, nextDisabled)
        setProviderTools(prev =>
          prev.map(entry =>
            entry.canonical_name === tool.canonical_name ? { ...entry, disabled: nextDisabled } : entry
          )
        )
      } catch (err) {
        setToggleError(
          err instanceof Error ? err.message : `Failed to ${nextDisabled ? 'disable' : 'enable'} ${tool.canonical_name}`
        )
      } finally {
        setTogglingName(null)
      }
    },
    [client]
  )

  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const tool of providerTools) {
      const id = tool.category ?? UNCATEGORIZED
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({
        id,
        label: formatCategoryLabel(id === UNCATEGORIZED ? null : id),
        count
      }))
      .sort((a, b) => compareToolCategories(a.id, b.id))
  }, [providerTools])

  const filteredProviderTools = useMemo(() => {
    const q = search.trim().toLowerCase()
    return providerTools.filter(tool => {
      const id = tool.category ?? UNCATEGORIZED
      if (categoryFilter !== ALL_FILTER && id !== categoryFilter) return false
      if (!q) return true
      if (tool.tool_ref.toLowerCase().includes(q)) return true
      if (tool.canonical_name.toLowerCase().includes(q)) return true
      if (formatToolDisplayName(tool.display_name, tool.canonical_name).toLowerCase().includes(q)) return true
      if ((tool.description ?? '').toLowerCase().includes(q)) return true
      if (formatCategoryLabel(tool.category).toLowerCase().includes(q)) return true
      if ((tool.execution_backend || formatToolSourceLabel(tool.source)).toLowerCase().includes(q)) return true
      if ((tool.tags ?? []).some(tag => tag.toLowerCase().includes(q))) return true
      return false
    })
  }, [providerTools, search, categoryFilter])

  useEffect(() => {
    if (!highlightRef) return
    const frame = globalThis.requestAnimationFrame(() => {
      const el = document.getElementById(toolRowId(highlightRef))
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const timer = globalThis.setTimeout(() => setHighlightRef(prev => (prev === highlightRef ? null : prev)), 1600)
    return () => {
      globalThis.cancelAnimationFrame(frame)
      globalThis.clearTimeout(timer)
    }
  }, [highlightRef])

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, CanonicalProviderToolEntry[]>()
    for (const tool of filteredProviderTools) {
      const id = tool.category ?? UNCATEGORIZED
      const list = map.get(id) ?? []
      list.push(tool)
      map.set(id, list)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => compareToolCategories(a, b))
      .map(([id, items]) => ({
        id,
        label: formatCategoryLabel(id === UNCATEGORIZED ? null : id),
        items: items.sort((a, b) =>
          formatToolDisplayName(a.display_name, a.canonical_name).localeCompare(
            formatToolDisplayName(b.display_name, b.canonical_name)
          )
        )
      }))
  }, [filteredProviderTools])

  if (isLoading) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-3">
        <SpinnerGapIcon className="gba:h-8 gba:w-8 gba:animate-spin gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">Loading tools...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4">
        <p className="gba:text-sm gba:text-destructive">{error}</p>
        <Button variant="secondary" size="sm" onClick={() => void loadTools()}>
          Retry
        </Button>
      </div>
    )
  }

  if (tools.length === 0 && providerTools.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-3">
        <WrenchIcon className="gba:h-10 gba:w-10 gba:text-muted-foreground/50" />
        <p className="gba:text-sm gba:text-muted-foreground">No tools configured yet.</p>
      </div>
    )
  }

  return (
    <div className="gba:max-w-5xl gba:mx-auto gba:px-4 sm:gba:px-6 lg:gba:px-8 gba:py-6 sm:gba:py-8">
      <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">
        Tools available to enterprise agents, grouped by business domain.
      </p>
      <p className="gba:text-xs gba:text-muted-foreground/80 gba:mb-4">
        The bold name is what the agent sees; the monospace badge is the persisted skill ref. The small grey “via …”
        hint shows where each tool is sourced from.
      </p>

      {providerTools.length > 0 && (
        <div className="gba:mb-4 gba:space-y-2">
          <div className="gba:relative">
            <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tools — name, description, category, tag…"
              className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:pl-8 gba:pr-3 gba:py-2 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/30"
              data-testid="tools-tab-search"
            />
          </div>
          {categoriesWithCounts.length > 1 && (
            <div
              className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5"
              data-testid="tools-tab-category-filter"
            >
              <span className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:mr-0.5">Category</span>
              <CategoryPill
                label={`All (${providerTools.length})`}
                active={categoryFilter === ALL_FILTER}
                onClick={() => setCategoryFilter(ALL_FILTER)}
                testId="tools-tab-category-pill-all"
              />
              {categoriesWithCounts.map(cat => (
                <CategoryPill
                  key={cat.id}
                  label={`${cat.label} (${cat.count})`}
                  active={categoryFilter === cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  testId={`tools-tab-category-pill-${cat.id}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {toggleError && (
        <div
          className="gba:mb-4 gba:rounded-lg gba:border gba:border-destructive/40 gba:bg-destructive/10 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          data-testid="tools-tab-toggle-error"
        >
          {toggleError}
        </div>
      )}

      <div className="gba:space-y-6">
        {providerTools.length > 0 && (
          <section>
            {filteredProviderTools.length === 0 ? (
              <div className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:py-6 gba:text-center gba:text-sm gba:text-muted-foreground">
                No tools match the current filters.
              </div>
            ) : (
              groupedByCategory.map(section => (
                <ToolsTabSection
                  key={section.id}
                  sectionId={section.id}
                  label={section.label}
                  entries={section.items}
                  togglingName={togglingName}
                  highlightRef={highlightRef}
                  onToggleDisabled={handleToggleDisabled}
                  onOpenTool={openToolDetail}
                  resolveLabel={labelForRef}
                />
              ))
            )}
          </section>
        )}

        <FlowBindingsManager client={client} onOpenTool={openToolDetail} resolveLabel={labelForRef} />

        {tools.length > 0 && (
          <section>
            <h4 className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground gba:mb-2 gba:tracking-wide">
              Configured tool integrations
            </h4>
            <div className="gba:grid gba:gap-3">
              {tools.map(tool => (
                <div
                  key={tool._id ?? tool.code ?? tool.name}
                  className="gba:flex gba:items-start gba:gap-4 gba:rounded-lg gba:border gba:border-border gba:p-4 gba:bg-card"
                >
                  <div className="gba:flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-lg gba:bg-muted gba:shrink-0">
                    <WrenchIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
                  </div>
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                      <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{tool.name}</span>
                      {tool.code && (
                        <span className="gba:text-[11px] gba:font-mono gba:text-muted-foreground gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded">
                          {tool.code}
                        </span>
                      )}
                      {tool.internal && (
                        <span className="gba:text-[11px] gba:font-medium gba:text-blue-700 gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:rounded">
                          Built-in
                        </span>
                      )}
                    </div>
                    {tool.description && (
                      <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2 gba:mb-2">
                        {tool.description}
                      </p>
                    )}
                    <div className="gba:flex gba:items-center gba:gap-3 gba:text-[11px] gba:text-muted-foreground">
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <LinkIcon className="gba:h-3 gba:w-3" />
                        {tool.type.toUpperCase()} · {tool.config.transport}
                      </span>
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <CircleIcon
                          weight="fill"
                          className={`gba:h-2 gba:w-2 ${tool.active !== false ? 'gba:text-green-500' : 'gba:text-muted-foreground/40'}`}
                        />
                        {tool.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

interface ToolsTabSectionProps {
  sectionId: string
  label: string
  entries: CanonicalProviderToolEntry[]
  togglingName: string | null
  highlightRef: string | null
  onToggleDisabled: (tool: CanonicalProviderToolEntry) => void
  onOpenTool: (toolRef: string) => void
  resolveLabel: (toolRef: string) => string | undefined
}

const ToolsTabSection: React.FC<ToolsTabSectionProps> = ({
  sectionId,
  label,
  entries,
  togglingName,
  highlightRef,
  onToggleDisabled,
  onOpenTool,
  resolveLabel
}) => (
  <div className="gba:mb-5" data-testid={`tools-tab-section-${sectionId}`}>
    <h4 className="gba:text-xs gba:font-semibold gba:uppercase gba:text-muted-foreground gba:mb-2 gba:tracking-wide">
      {label}
      <span className="gba:ml-1.5 gba:font-normal gba:normal-case gba:text-muted-foreground/70">
        ({entries.length})
      </span>
    </h4>
    <div className="gba:grid gba:gap-3">
      {entries.map(tool => {
        const capabilities = readProviderCapabilities(tool.capabilities)
        const sourceLabel = tool.execution_backend || formatToolSourceLabel(tool.source)
        const isDisabled = tool.disabled === true
        const isToggling = togglingName === tool.canonical_name
        const isHighlighted = highlightRef === tool.tool_ref
        return (
          <div
            key={tool.tool_ref}
            id={toolRowId(tool.tool_ref)}
            data-testid={`tools-tab-row-${tool.tool_ref}`}
            className={[
              'gba:flex gba:items-start gba:gap-4 gba:rounded-lg gba:border gba:p-4 gba:bg-card gba:transition-all',
              isDisabled ? 'gba:border-border/60 gba:opacity-60' : 'gba:border-border',
              isHighlighted ? 'gba:ring-2 gba:ring-primary/60' : ''
            ].join(' ')}
          >
            <div className="gba:flex gba:items-center gba:justify-center gba:h-10 gba:w-10 gba:rounded-lg gba:bg-primary/10 gba:shrink-0">
              <WrenchIcon className="gba:h-5 gba:w-5 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1 gba:flex-wrap">
                <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">
                  {formatToolDisplayName(tool.display_name, tool.canonical_name)}
                </span>
                <span className="gba:text-[11px] gba:font-mono gba:text-muted-foreground gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded">
                  {tool.tool_ref}
                </span>
                {/* Source is a small dim hint, not the headline. */}
                <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground/80">via {sourceLabel}</span>
                {capabilities.risk_level && (
                  <span className="gba:text-[11px] gba:font-medium gba:text-amber-700 gba:bg-amber-100 gba:px-1.5 gba:py-0.5 gba:rounded">
                    {capabilities.risk_level}
                  </span>
                )}
                {isDisabled && (
                  <span
                    className="gba:text-[11px] gba:font-medium gba:text-destructive gba:bg-destructive/10 gba:px-1.5 gba:py-0.5 gba:rounded"
                    data-testid={`tools-tab-disabled-badge-${tool.tool_ref}`}
                  >
                    Disabled
                  </span>
                )}
              </div>
              {tool.description && (
                <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2 gba:mb-2">{tool.description}</p>
              )}
              <div className="gba:flex gba:items-center gba:gap-3 gba:text-[11px] gba:text-muted-foreground">
                <span>{capabilities.requires_auth === false ? 'No auth required' : 'Auth required'}</span>
                {capabilities.supports_hitl && <span>HITL</span>}
                {capabilities.supports_artifacts && <span>Artifacts</span>}
              </div>
              {tool.related_tools && tool.related_tools.length > 0 && (
                <div className="gba:mt-2">
                  <ToolCompanions
                    relatedTools={tool.related_tools}
                    resolveLabel={resolveLabel}
                    onOpen={onOpenTool}
                    compact
                  />
                </div>
              )}
            </div>
            <Button
              variant={isDisabled ? 'secondary' : 'ghost'}
              size="sm"
              disabled={isToggling}
              onClick={() => onToggleDisabled(tool)}
              data-testid={`tools-tab-toggle-${tool.tool_ref}`}
              className="gba:shrink-0"
            >
              {isToggling ? '…' : isDisabled ? 'Enable' : 'Disable'}
            </Button>
          </div>
        )
      })}
    </div>
  </div>
)

interface CategoryPillProps {
  label: string
  active: boolean
  onClick: () => void
  testId?: string
}

const CategoryPill: React.FC<CategoryPillProps> = ({ label, active, onClick, testId }) => (
  <button
    type="button"
    onClick={onClick}
    data-testid={testId}
    className={[
      'gba:rounded-full gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:font-medium gba:transition-colors',
      active
        ? 'gba:bg-primary gba:text-primary-foreground'
        : 'gba:bg-muted gba:text-muted-foreground gba:hover:bg-muted/70'
    ].join(' ')}
  >
    {label}
  </button>
)
