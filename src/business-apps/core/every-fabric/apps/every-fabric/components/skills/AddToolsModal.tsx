import React, { useCallback, useEffect, useState } from 'react'
import { MagnifyingGlass, X, ArrowClockwise } from '@phosphor-icons/react'
import { Button } from '@newwork/nw-design-system'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { ProviderToolCatalogItem } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface AddToolsModalProps {
  open: boolean
  onClose: () => void
  accessToken?: string
  /** Current tools already attached to the skill draft — pre-checked on open. */
  alreadySelected: string[]
  /** Called with the full desired set of tool names when the user clicks Add. */
  onAdd: (toolNames: string[]) => void
}

const PAGE_SIZE = 10

interface ToolOption {
  id: string
  ref: string
  name: string
  description?: string
  provider: string
  riskLevel?: string
  requiresAuth?: boolean
  supportsHitl?: boolean
  supportsArtifacts?: boolean
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

const providerToToolOption = (tool: ProviderToolCatalogItem): ToolOption => ({
  id: tool.tool_ref,
  ref: tool.tool_ref,
  name: tool.name,
  description: tool.description,
  provider: tool.provider === 'functions' ? 'tools' : tool.provider,
  riskLevel: tool.capabilities?.risk_level,
  requiresAuth: tool.capabilities?.requires_auth,
  supportsHitl: tool.capabilities?.supports_hitl,
  supportsArtifacts: tool.capabilities?.supports_artifacts,
  inputSchema: tool.input_schema,
  outputSchema: tool.output_schema
})

export const AddToolsModal: React.FC<AddToolsModalProps> = ({ open, onClose, accessToken, alreadySelected, onAdd }) => {
  const promptManagerClient = usePromptManagerClient(accessToken ?? '')
  const [tools, setTools] = useState<ToolOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set())
  const [previewTool, setPreviewTool] = useState<ToolOption | null>(null)

  const fetchTools = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [flowbotTools, functionManagerTools, mcpTools, builtinTools] = await Promise.all([
        promptManagerClient.getFlowBotProviderTools().catch(() => [] as ProviderToolCatalogItem[]),
        promptManagerClient.getFunctionManagerTools().catch(() => [] as ProviderToolCatalogItem[]),
        promptManagerClient.getMcpProviderTools().catch(() => [] as ProviderToolCatalogItem[]),
        promptManagerClient.getBuiltinProviderTools().catch(() => [] as ProviderToolCatalogItem[])
      ])
      setTools([...flowbotTools, ...functionManagerTools, ...mcpTools, ...builtinTools].map(providerToToolOption))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tools')
    } finally {
      setLoading(false)
    }
  }, [promptManagerClient])

  // Reset and fetch when modal opens
  useEffect(() => {
    if (!open) return
    setSearch('')
    setPage(1)
    setLocalSelected(new Set(alreadySelected))
    void fetchTools()
  }, [alreadySelected, fetchTools, open])

  // Reset page when search changes
  useEffect(() => {
    setPage(1)
  }, [search])

  const filtered = tools.filter(tool => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      tool.ref.toLowerCase().includes(q) ||
      tool.name.toLowerCase().includes(q) ||
      (tool.description ?? '').toLowerCase().includes(q) ||
      tool.provider.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleItem = (toolRef: string) => {
    setLocalSelected(prev => {
      const next = new Set(prev)
      if (next.has(toolRef)) next.delete(toolRef)
      else next.add(toolRef)
      return next
    })
  }

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
            <h3 className="gba:text-sm gba:font-semibold">Add Provider Tool to Skill</h3>
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
                placeholder="Search by provider, ref, name, or description…"
                className="gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:pl-8 gba:pr-3 gba:py-2 gba:text-sm gba:text-foreground placeholder:gba:text-muted-foreground/50 focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-primary/30"
                data-testid="add-tools-modal-search"
              />
            </div>
          </div>

          {/* List */}
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

            {!loading && !error && pageItems.length === 0 && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-10 gba:text-sm gba:text-muted-foreground">
                {search.trim() ? 'No provider tools match your search.' : 'No provider tools found.'}
              </div>
            )}

            {!loading && !error && pageItems.length > 0 && (
              <ul className="gba:space-y-1 gba:py-1">
                {pageItems.map(tool => {
                  const checked = localSelected.has(tool.ref)
                  return (
                    <li key={tool.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        className={[
                          'gba:w-full gba:flex gba:items-start gba:gap-3 gba:rounded-lg gba:px-3 gba:py-2.5 gba:text-left gba:transition-colors',
                          checked ? 'gba:bg-primary/8' : 'gba:hover:bg-muted/40'
                        ].join(' ')}
                        onClick={() => toggleItem(tool.ref)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            toggleItem(tool.ref)
                          }
                        }}
                        data-testid={`add-tools-item-${tool.ref}`}
                      >
                        {/* Checkbox */}
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

                        {/* Text */}
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                              {tool.ref}
                            </span>
                            <span className="gba:flex-shrink-0 gba:rounded-full gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-muted-foreground">
                              {tool.provider}
                            </span>
                            {tool.riskLevel && (
                              <span className="gba:flex-shrink-0 gba:rounded-full gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-primary">
                                {tool.riskLevel}
                              </span>
                            )}
                            {tool.supportsHitl && (
                              <span className="gba:flex-shrink-0 gba:rounded-full gba:bg-amber-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-amber-800">
                                HITL
                              </span>
                            )}
                            {tool.supportsArtifacts && (
                              <span className="gba:flex-shrink-0 gba:rounded-full gba:bg-blue-100 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:text-blue-800">
                                Artifacts
                              </span>
                            )}
                          </div>
                          {tool.description && (
                            <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">
                              {tool.description}
                            </p>
                          )}
                          {(tool.inputSchema || tool.outputSchema) && (
                            <button
                              type="button"
                              className="gba:mt-1 gba:text-[11px] gba:font-medium gba:text-primary gba:hover:underline"
                              onClick={event => {
                                event.stopPropagation()
                                setPreviewTool(tool)
                              }}
                            >
                              Preview schema
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && filtered.length > 0 && (
            <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:border-t gba:border-border/60">
              <span className="gba:text-xs gba:text-muted-foreground">
                Page {page} of {totalPages} ({filtered.length} total)
              </span>
              <div className="gba:flex gba:gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-7 gba:text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  data-testid="add-tools-modal-prev"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gba:h-7 gba:text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  data-testid="add-tools-modal-next"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Action row */}
          <div className="gba:flex gba:items-center gba:justify-end gba:gap-2 gba:px-4 gba:py-3 gba:border-t gba:border-border">
            <Button variant="ghost" size="sm" onClick={handleClose} data-testid="add-tools-modal-cancel">
              Cancel
            </Button>
            <Button size="sm" disabled={loading} onClick={handleAdd} data-testid="add-tools-modal-add">
              Add
            </Button>
          </div>
        </div>
        <aside className="gba:w-80 gba:shrink-0 gba:border-l gba:border-border gba:bg-muted/15 gba:p-4 gba:overflow-y-auto">
          {previewTool ? (
            <div className="gba:space-y-3">
              <div>
                <p className="gba:text-xs gba:font-semibold gba:text-foreground">{previewTool.ref}</p>
                <p className="gba:text-[11px] gba:text-muted-foreground">Provider schema preview</p>
              </div>
              <div>
                <p className="gba:mb-1 gba:text-[11px] gba:font-semibold gba:text-muted-foreground">Input schema</p>
                <pre className="gba:max-h-60 gba:overflow-auto gba:rounded-lg gba:bg-background gba:p-2 gba:text-[11px]">
                  {JSON.stringify(previewTool.inputSchema ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="gba:mb-1 gba:text-[11px] gba:font-semibold gba:text-muted-foreground">Output schema</p>
                <pre className="gba:max-h-60 gba:overflow-auto gba:rounded-lg gba:bg-background gba:p-2 gba:text-[11px]">
                  {JSON.stringify(previewTool.outputSchema ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:text-center gba:text-xs gba:text-muted-foreground">
              Select “Preview schema” on a provider tool to inspect arguments, output, HITL, and artifact metadata
              before attaching it.
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
