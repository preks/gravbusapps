import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass, X, ArrowClockwise } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { CanonicalProviderToolEntry, RelatedToolRef } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import {
  compareToolCategories,
  formatCategoryLabel,
  formatToolDisplayName,
  formatToolSourceLabel
} from './toolCategoryLabels'
import { ToolCompanions } from './ToolCompanions'

export interface AddToolsModalProps {
  open: boolean
  onClose: () => void
  accessToken?: string
  /** Current tools already attached to the skill draft — pre-checked on open. */
  alreadySelected: string[]
  /** Called with the full desired set of tool names when the user clicks Add. */
  onAdd: (toolNames: string[]) => void
}

interface ToolOption {
  id: string
  ref: string
  /** LLM-facing canonical (runtime) name. Kept for search, not display. */
  name: string
  /** Human-facing label shown as the primary text (no source prefix). */
  displayName: string
  description?: string
  source: CanonicalProviderToolEntry['source']
  sourceLabel: string
  /** Raw category id from the backend — used for filter equality and grouping. */
  categoryId: string
  /** Friendly user-facing label for display. */
  categoryLabel: string
  tags: string[]
  riskLevel?: string
  requiresAuth?: boolean
  supportsHitl?: boolean
  supportsArtifacts?: boolean
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  /** True when globally disabled — still attachable, but blocked at runtime. */
  disabled?: boolean
  /** Companion tools this one usually needs first (e.g. id/value lookups). */
  relatedTools: RelatedToolRef[]
}

const ALL_FILTER = '__all__'
const UNCATEGORIZED = 'uncategorized'

const readCapabilityString = (caps: Record<string, unknown> | undefined, key: string): string | undefined => {
  const value = caps?.[key]
  return typeof value === 'string' ? value : undefined
}

const readCapabilityBool = (caps: Record<string, unknown> | undefined, key: string): boolean | undefined => {
  const value = caps?.[key]
  return typeof value === 'boolean' ? value : undefined
}

interface SchemaParam {
  name: string
  type: string
  required: boolean
  description?: string
}

/** Input/output JSON schema for one tool, fetched on demand for the preview. */
interface ToolSchema {
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
}

/**
 * Best-effort human-readable type label for one JSON-Schema property.
 * Tool schemas come from several sources (pydantic ``model_json_schema``,
 * FlowBot/Functions catalogs, MCP) so the shapes differ — handle plain
 * ``type``, arrays, ``anyOf``/``oneOf`` unions, ``$ref``, and ``enum``.
 */
const schemaTypeLabel = (prop: unknown): string => {
  if (!prop || typeof prop !== 'object') return 'any'
  const p = prop as Record<string, unknown>
  if (typeof p.type === 'string') {
    if (p.type === 'array' && p.items) return `${schemaTypeLabel(p.items)}[]`
    return p.type
  }
  if (Array.isArray(p.type)) return (p.type as unknown[]).map(String).join(' | ')
  if (Array.isArray(p.anyOf)) return (p.anyOf as unknown[]).map(schemaTypeLabel).join(' | ')
  if (Array.isArray(p.oneOf)) return (p.oneOf as unknown[]).map(schemaTypeLabel).join(' | ')
  if (typeof p.$ref === 'string') return p.$ref.split('/').pop() ?? 'object'
  if (Array.isArray(p.enum)) return 'enum'
  return 'any'
}

/**
 * Flatten a JSON-Schema object into a readable parameter list. Returns an
 * empty array when the schema has no ``properties`` (e.g. a no-arg tool or
 * an unrecognized shape) — the caller renders a friendly fallback.
 */
const extractSchemaParams = (schema: Record<string, unknown> | undefined): SchemaParam[] => {
  if (!schema || typeof schema !== 'object') return []
  const props = schema.properties
  if (!props || typeof props !== 'object') return []
  const required = Array.isArray(schema.required)
    ? new Set((schema.required as unknown[]).map(String))
    : new Set<string>()
  return Object.entries(props as Record<string, unknown>).map(([name, raw]) => {
    const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return {
      name,
      type: schemaTypeLabel(p),
      required: required.has(name),
      description: typeof p.description === 'string' ? p.description : undefined
    }
  })
}

const canonicalToToolOption = (entry: CanonicalProviderToolEntry): ToolOption => {
  const categoryId = entry.category ?? UNCATEGORIZED
  return {
    id: entry.tool_ref,
    ref: entry.tool_ref,
    name: entry.canonical_name,
    displayName: formatToolDisplayName(entry.display_name, entry.canonical_name),
    description: entry.description,
    source: entry.source,
    sourceLabel: entry.execution_backend || formatToolSourceLabel(entry.source),
    categoryId,
    categoryLabel: formatCategoryLabel(entry.category),
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    riskLevel: readCapabilityString(entry.capabilities, 'risk_level'),
    requiresAuth: readCapabilityBool(entry.capabilities, 'requires_auth'),
    supportsHitl: readCapabilityBool(entry.capabilities, 'supports_hitl'),
    supportsArtifacts: readCapabilityBool(entry.capabilities, 'supports_artifacts'),
    inputSchema: entry.input_schema,
    outputSchema: entry.output_schema,
    disabled: entry.disabled === true,
    relatedTools: Array.isArray(entry.related_tools) ? entry.related_tools : []
  }
}

export const AddToolsModal: React.FC<AddToolsModalProps> = ({ open, onClose, accessToken, alreadySelected, onAdd }) => {
  const promptManagerClient = usePromptManagerClient(accessToken ?? '')
  const [tools, setTools] = useState<ToolOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())
  const [previewTool, setPreviewTool] = useState<ToolOption | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_FILTER)
  // Per-tool schemas fetched on demand for the preview pane. The list itself
  // is loaded lite (no schemas) to keep the payload small; the schema for a
  // single tool is hydrated only when it is previewed.
  const [schemaByRef, setSchemaByRef] = useState<Record<string, ToolSchema>>({})
  const [schemaLoading, setSchemaLoading] = useState(false)

  const fetchTools = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // The v2 endpoint is the single source — flowbot, functions,
      // prompt_manager (native), mcp, and builtin all flow through one
      // response with category pre-populated. Loaded lite (no input/output
      // schema): the preview pane re-hydrates one tool's schema on demand.
      const canonicalTools = await promptManagerClient.getCanonicalProviderTools({ includeSchema: false })
      setTools(canonicalTools.map(canonicalToToolOption))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools')
    } finally {
      setLoading(false)
    }
  }, [promptManagerClient])

  // Hydrate the previewed tool's schema lazily. Results are cached both in this
  // component (schemaByRef) and in the client (per-ref memo), so re-previewing
  // a tool never re-hits the network. A stale-response guard keeps a slow fetch
  // from overwriting a newer preview selection.
  useEffect(() => {
    const ref = previewTool?.ref
    if (!ref || schemaByRef[ref]) {
      setSchemaLoading(false)
      return
    }
    let cancelled = false
    setSchemaLoading(true)
    promptManagerClient
      .getCanonicalProviderToolDetail(ref)
      .then(detail => {
        if (cancelled) return
        setSchemaByRef(prev => ({
          ...prev,
          [ref]: {
            inputSchema: detail.input_schema ?? {},
            outputSchema: detail.output_schema ?? {}
          }
        }))
      })
      .catch(() => {
        // Leave the entry unset so a later preview can retry; the pane simply
        // shows "no parameters" rather than blocking the whole modal.
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [previewTool, schemaByRef, promptManagerClient])

  useEffect(() => {
    if (!open) return
    setSearch('')
    setCategoryFilter(ALL_FILTER)
    setLocalSelected(new Set(alreadySelected))
    void fetchTools()
  }, [alreadySelected, fetchTools, open])

  // Live category list — only render pills for buckets that actually
  // have at least one tool. ``compareToolCategories`` puts business
  // domains first and ``uncategorized`` last.
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const tool of tools) {
      counts.set(tool.categoryId, (counts.get(tool.categoryId) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, label: formatCategoryLabel(id === UNCATEGORIZED ? null : id), count }))
      .sort((a, b) => compareToolCategories(a.id, b.id))
  }, [tools])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tools.filter(tool => {
      if (categoryFilter !== ALL_FILTER && tool.categoryId !== categoryFilter) return false
      if (!q) return true
      if (tool.ref.toLowerCase().includes(q)) return true
      if (tool.name.toLowerCase().includes(q)) return true
      if (tool.displayName.toLowerCase().includes(q)) return true
      if ((tool.description ?? '').toLowerCase().includes(q)) return true
      if (tool.categoryLabel.toLowerCase().includes(q)) return true
      if (tool.sourceLabel.toLowerCase().includes(q)) return true
      if (tool.tags.some(tag => tag.toLowerCase().includes(q))) return true
      return false
    })
  }, [tools, search, categoryFilter])

  // Group filtered entries by category so the user always sees a
  // domain-led layout. Inside a single-category filter view there's
  // only one section so the header doubles as a confirmation of which
  // bucket is active.
  const grouped = useMemo(() => {
    const map = new Map<string, ToolOption[]>()
    for (const tool of filtered) {
      const list = map.get(tool.categoryId) ?? []
      list.push(tool)
      map.set(tool.categoryId, list)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => compareToolCategories(a, b))
      .map(([id, items]) => ({
        id,
        label: formatCategoryLabel(id === UNCATEGORIZED ? null : id),
        items: items.sort((a, b) => a.displayName.localeCompare(b.displayName))
      }))
  }, [filtered])

  // Preview pane is open by default: keep it pointed at a valid, currently
  // visible tool. When the filter changes (or the list first loads), default
  // to the first visible tool; only reset when the current preview is no
  // longer in the filtered set so an explicit user selection is preserved.
  useEffect(() => {
    if (filtered.length === 0) {
      setPreviewTool(null)
      return
    }
    setPreviewTool(prev => (prev && filtered.some(tool => tool.id === prev.id) ? prev : filtered[0]))
  }, [filtered])

  const toggleItem = (toolRef: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev)
      if (next.has(toolRef)) next.delete(toolRef)
      else next.add(toolRef)
      return next
    })
  }

  // Add-only (companion "Add" / "Add all") — never removes an existing pick.
  const addItems = useCallback((refs: string[]) => {
    setLocalSelected(prev => {
      const next = new Set(prev)
      for (const ref of refs) next.add(ref)
      return next
    })
  }, [])

  const setSectionSelection = useCallback((refs: string[], select: boolean) => {
    setLocalSelected(prev => {
      const next = new Set(prev)
      for (const ref of refs) {
        if (select) next.add(ref)
        else next.delete(ref)
      }
      return next
    })
  }, [])

  const previewByRef = useCallback(
    (toolRef: string) => {
      const match = tools.find(t => t.ref === toolRef)
      if (match) setPreviewTool(match)
    },
    [tools]
  )

  const labelForRef = useCallback((toolRef: string) => tools.find(t => t.ref === toolRef)?.displayName, [tools])

  // Merge the lazily-fetched schema into the previewed tool so the preview pane
  // renders parameters without the list ever carrying schemas.
  const enrichedPreviewTool = useMemo<ToolOption | null>(() => {
    if (!previewTool) return null
    const schema = schemaByRef[previewTool.ref]
    if (!schema) return previewTool
    return { ...previewTool, inputSchema: schema.inputSchema, outputSchema: schema.outputSchema }
  }, [previewTool, schemaByRef])

  const handleAdd = () => {
    onAdd([...localSelected])
    onClose()
  }

  const handleClose = () => {
    onClose()
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/80 gba:backdrop-blur-sm gba:p-4"
      data-testid="add-tools-modal"
    >
      <button
        type="button"
        className="gba:absolute gba:inset-0 gba:cursor-default"
        onClick={handleClose}
        onKeyDown={e => {
          if (e.key === 'Escape') handleClose()
        }}
        tabIndex={-1}
        aria-label="Close dialog"
      />
      <div className="gba:relative gba:w-full gba:max-w-4xl gba:max-h-[80vh] gba:overflow-hidden gba:flex gba:rounded-xl gba:border gba:border-border gba:bg-background gba:shadow-xl">
        <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col">
          {/* Header */}
          <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border">
            <div>
              <h3 className="gba:text-sm gba:font-semibold">Add Tool to Skill</h3>
              <p className="gba:text-[11px] gba:text-muted-foreground">
                Pick by what the tool does. Source is shown for transparency only.
              </p>
            </div>
            <button
              type="button"
              className="gba:p-1 gba:rounded gba:hover:bg-muted"
              onClick={handleClose}
              data-testid="add-tools-modal-close"
            >
              <X className="gba:h-4 gba:w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="gba:px-4 gba:pt-3 gba:pb-2">
            <div className="gba:relative">
              <MagnifyingGlass className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tools — name, description, category, tag…"
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:pl-8 gba:pr-3 gba:py-2 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/30"
                data-testid="add-tools-modal-search"
              />
            </div>
          </div>

          {/* Category pill row — the only primary filter. Source is a per-row badge. */}
          {categories.length > 0 && (
            <div
              className="gba:px-4 gba:pb-2 gba:flex gba:flex-wrap gba:items-center gba:gap-1.5"
              data-testid="add-tools-modal-category-filter"
            >
              <span className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:mr-0.5">Category</span>
              <FilterPill
                label={`All (${tools.length})`}
                active={categoryFilter === ALL_FILTER}
                onClick={() => setCategoryFilter(ALL_FILTER)}
                testId="add-tools-modal-category-pill-all"
              />
              {categories.map(cat => (
                <FilterPill
                  key={cat.id}
                  label={`${cat.label} (${cat.count})`}
                  active={categoryFilter === cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  testId={`add-tools-modal-category-pill-${cat.id}`}
                />
              ))}
            </div>
          )}

          {/* Grouped list. Single scroll, sections per category. */}
          <div className="gba:flex-1 gba:overflow-y-auto gba:px-4 gba:pb-2">
            {loading && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:text-sm gba:text-muted-foreground">
                Loading tools…
              </div>
            )}

            {!loading && error && (
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:py-10">
                <p className="gba:text-sm gba:text-destructive">{error}</p>
                <Button variant="ghost" size="sm" onClick={() => void fetchTools()}>
                  <ArrowClockwise className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && grouped.length === 0 && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:text-sm gba:text-muted-foreground">
                {search.trim() || categoryFilter !== ALL_FILTER
                  ? 'No tools match the current filters.'
                  : 'No tools found.'}
              </div>
            )}

            {!loading && !error && grouped.length > 0 && (
              <div className="gba:py-1">
                {grouped.map(section => (
                  <ToolPickerSection
                    key={section.id}
                    sectionId={section.id}
                    label={section.label}
                    items={section.items}
                    selected={localSelected}
                    onToggle={toggleItem}
                    onPreview={setPreviewTool}
                    onSetSectionSelection={setSectionSelection}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action row */}
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-4 gba:py-3 gba:border-t gba:border-border">
            <span className="gba:text-[11px] gba:text-muted-foreground">
              {filtered.length} tool{filtered.length === 1 ? '' : 's'} · {localSelected.size} selected
            </span>
            <div className="gba:flex gba:gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose} data-testid="add-tools-modal-cancel">
                Cancel
              </Button>
              <Button size="sm" disabled={loading} onClick={handleAdd} data-testid="add-tools-modal-add">
                Add
              </Button>
            </div>
          </div>
        </div>
        <aside className="gba:w-80 gba:shrink-0 gba:border-l gba:border-border gba:bg-muted/15 gba:p-4 gba:overflow-y-auto">
          <ToolPreviewPane
            tool={enrichedPreviewTool}
            schemaLoading={schemaLoading}
            isSelected={ref => localSelected.has(ref)}
            onAddCompanion={ref => addItems([ref])}
            onAddCompanions={addItems}
            onOpenCompanion={previewByRef}
            resolveCompanionLabel={labelForRef}
          />
        </aside>
      </div>
    </div>
  )
}

interface ToolPickerSectionProps {
  sectionId: string
  label: string
  items: ToolOption[]
  selected: Set<string>
  onToggle: (toolRef: string) => void
  onPreview: (tool: ToolOption) => void
  onSetSectionSelection: (refs: string[], select: boolean) => void
}

const ToolPickerSection: React.FC<ToolPickerSectionProps> = ({
  sectionId,
  label,
  items,
  selected,
  onToggle,
  onPreview,
  onSetSectionSelection
}) => {
  const sectionRefs = items.map(tool => tool.ref)
  const selectedInSection = items.filter(tool => selected.has(tool.ref)).length
  const allSelected = items.length > 0 && selectedInSection === items.length

  return (
    <section className="gba:mb-4" data-testid={`add-tools-modal-section-${sectionId}`}>
      <div className="gba:sticky gba:top-0 gba:z-[1] gba:flex gba:items-center gba:justify-between gba:gap-2 gba:bg-background gba:py-1 gba:border-b gba:border-border/50">
        <h4 className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:min-w-0">
          {label}
          <span className="gba:ml-1.5 gba:font-normal gba:normal-case gba:text-muted-foreground/70">
            ({items.length})
          </span>
        </h4>
        {items.length > 0 && (
          <button
            type="button"
            className="gba:shrink-0 gba:text-[11px] gba:font-medium gba:text-primary gba:hover:underline"
            onClick={event => {
              event.stopPropagation()
              onSetSectionSelection(sectionRefs, !allSelected)
            }}
            data-testid={`add-tools-modal-section-select-all-${sectionId}`}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>
      <ul className="gba:space-y-1 gba:py-1">
        {items.map(tool => (
          <ToolPickerRow
            key={tool.id}
            tool={tool}
            checked={selected.has(tool.ref)}
            onToggle={onToggle}
            onPreview={onPreview}
          />
        ))}
      </ul>
    </section>
  )
}

interface ToolPickerRowProps {
  tool: ToolOption
  checked: boolean
  onToggle: (toolRef: string) => void
  onPreview: (tool: ToolOption) => void
}

const ToolPickerRow: React.FC<ToolPickerRowProps> = ({ tool, checked, onToggle, onPreview }) => (
  <li>
    <div
      role="button"
      tabIndex={0}
      className={[
        'gba:w-full gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:px-3 gba:py-2.5 gba:text-left gba:transition-colors',
        checked ? 'gba:bg-primary/8' : 'gba:hover:bg-muted/40'
      ].join(' ')}
      onClick={() => {
        onPreview(tool)
        onToggle(tool.ref)
      }}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onPreview(tool)
          onToggle(tool.ref)
        }
      }}
      data-testid={`add-tools-item-${tool.ref}`}
    >
      <span
        className={[
          'gba:flex-shrink-0 gba:mt-0.5 gba:w-4 gba:h-4 gba:rounded gba:border gba:flex gba:items-center gba:justify-center',
          checked ? 'gba:bg-primary gba:border-primary' : 'gba:border-border gba:bg-background'
        ].join(' ')}
        aria-hidden
      >
        {checked && (
          <svg
            className="gba:w-2.5 gba:h-2.5 gba:text-primary-foreground"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2,6 5,9 10,3" />
          </svg>
        )}
      </span>

      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
          <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate">{tool.displayName}</span>
          <span className="gba:text-[11px] gba:font-mono gba:text-muted-foreground/80 gba:bg-muted/40 gba:px-1.5 gba:py-0.5 gba:rounded">
            {tool.ref}
          </span>
          {/* Source is a small dim hint, not a primary navigation. */}
          <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground/80">via {tool.sourceLabel}</span>
          {tool.riskLevel && (
            <span className="gba:rounded-full gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary">
              {tool.riskLevel}
            </span>
          )}
          {tool.supportsHitl && (
            <span className="gba:rounded-full gba:bg-amber-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-amber-800">
              HITL
            </span>
          )}
          {tool.supportsArtifacts && (
            <span className="gba:rounded-full gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-blue-800">
              Artifacts
            </span>
          )}
          {tool.disabled && (
            <span
              className="gba:rounded-full gba:bg-destructive/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-destructive"
              data-testid={`add-tools-disabled-badge-${tool.ref}`}
            >
              Disabled
            </span>
          )}
        </div>
        {tool.description && (
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:line-clamp-2">{tool.description}</p>
        )}
        {(tool.inputSchema || tool.outputSchema) && (
          <button
            type="button"
            className="gba:mt-1 gba:text-[11px] gba:font-medium gba:text-primary gba:hover:underline"
            onClick={event => {
              event.stopPropagation()
              onPreview(tool)
            }}
          >
            Preview schema
          </button>
        )}
      </div>
    </div>
  </li>
)

interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
  testId?: string
}

const FilterPill: React.FC<FilterPillProps> = ({ label, active, onClick, testId }) => (
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

interface ToolPreviewPaneProps {
  tool: ToolOption | null
  /** True while the previewed tool's schema is being fetched on demand. */
  schemaLoading: boolean
  isSelected: (ref: string) => boolean
  onAddCompanion: (ref: string) => void
  onAddCompanions: (refs: string[]) => void
  onOpenCompanion: (ref: string) => void
  resolveCompanionLabel: (ref: string) => string | undefined
}

const ToolPreviewPane: React.FC<ToolPreviewPaneProps> = ({
  tool,
  schemaLoading,
  isSelected,
  onAddCompanion,
  onAddCompanions,
  onOpenCompanion,
  resolveCompanionLabel
}) => {
  const [showRaw, setShowRaw] = useState(false)

  if (!tool) {
    return (
      <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:text-center gba:text-xs gba:text-muted-foreground">
        Select a tool on the left to inspect what it does, its parameters, and its safety metadata.
      </div>
    )
  }

  const params = extractSchemaParams(tool.inputSchema)
  const hasSchema = Boolean(
    (tool.inputSchema && Object.keys(tool.inputSchema).length > 0) ||
      (tool.outputSchema && Object.keys(tool.outputSchema).length > 0)
  )

  return (
    <div className="gba:space-y-3" data-testid="add-tools-preview">
      <div>
        <p className="gba:text-sm gba:font-semibold gba:text-foreground">{tool.displayName}</p>
        <p className="gba:text-[11px] gba:font-mono gba:text-muted-foreground gba:break-all">{tool.ref}</p>
        <p className="gba:text-[11px] gba:text-muted-foreground gba:mt-1">
          {tool.categoryLabel} · via {tool.sourceLabel}
        </p>
        <div className="gba:mt-1.5 gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
          {tool.riskLevel && (
            <span className="gba:rounded-full gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary">
              {tool.riskLevel}
            </span>
          )}
          <span className="gba:rounded-full gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground">
            {tool.requiresAuth === false ? 'No auth' : 'Auth required'}
          </span>
          {tool.supportsHitl && (
            <span className="gba:rounded-full gba:bg-amber-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-amber-800">
              HITL
            </span>
          )}
          {tool.supportsArtifacts && (
            <span className="gba:rounded-full gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-blue-800">
              Artifacts
            </span>
          )}
          {tool.disabled && (
            <span className="gba:rounded-full gba:bg-destructive/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-destructive">
              Disabled
            </span>
          )}
        </div>
        {tool.disabled && (
          <p className="gba:mt-1.5 gba:text-[11px] gba:text-destructive">
            Globally disabled — it can still be attached, but the agent will not be able to call it until re-enabled on
            the Tools page.
          </p>
        )}
      </div>

      {tool.description && (
        <div>
          <p className="gba:mb-1 gba:text-[11px] gba:font-semibold gba:text-muted-foreground">What it does</p>
          <p className="gba:text-xs gba:text-foreground gba:leading-relaxed gba:whitespace-pre-line">
            {tool.description}
          </p>
        </div>
      )}

      <ToolCompanions
        relatedTools={tool.relatedTools}
        resolveLabel={resolveCompanionLabel}
        isSelected={isSelected}
        onAdd={onAddCompanion}
        onAddAll={onAddCompanions}
        onOpen={onOpenCompanion}
      />

      <div>
        <div className="gba:mb-1 gba:flex gba:items-center gba:justify-between">
          <p className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground">Parameters</p>
          {hasSchema && (
            <button
              type="button"
              className="gba:text-[10px] gba:font-medium gba:text-primary gba:hover:underline"
              onClick={() => setShowRaw(prev => !prev)}
              data-testid="add-tools-preview-toggle-raw"
            >
              {showRaw ? 'Show readable' : 'Show raw JSON'}
            </button>
          )}
        </div>

        {schemaLoading && !hasSchema ? (
          <p className="gba:text-xs gba:text-muted-foreground" data-testid="add-tools-preview-schema-loading">
            Loading parameters…
          </p>
        ) : showRaw ? (
          <div className="gba:space-y-2">
            <pre className="gba:max-h-48 gba:overflow-auto gba:rounded-lg gba:bg-background gba:p-2 gba:text-[11px]">
              {JSON.stringify(tool.inputSchema ?? {}, null, 2)}
            </pre>
            {tool.outputSchema && Object.keys(tool.outputSchema).length > 0 && (
              <>
                <p className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground">Output</p>
                <pre className="gba:max-h-40 gba:overflow-auto gba:rounded-lg gba:bg-background gba:p-2 gba:text-[11px]">
                  {JSON.stringify(tool.outputSchema, null, 2)}
                </pre>
              </>
            )}
          </div>
        ) : params.length === 0 ? (
          <p className="gba:text-xs gba:text-muted-foreground">No input parameters.</p>
        ) : (
          <ul className="gba:space-y-1.5">
            {params.map(param => (
              <li key={param.name} className="gba:rounded-md gba:bg-background gba:px-2 gba:py-1.5">
                <div className="gba:flex gba:items-baseline gba:gap-1.5">
                  <span className="gba:text-[11px] gba:font-mono gba:font-medium gba:text-foreground">
                    {param.name}
                  </span>
                  <span className="gba:text-[10px] gba:text-muted-foreground">{param.type}</span>
                  {param.required && (
                    <span className="gba:text-[10px] gba:font-medium gba:text-destructive">required</span>
                  )}
                </div>
                {param.description && (
                  <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground gba:leading-snug">
                    {param.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
