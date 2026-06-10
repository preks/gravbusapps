/**
 * ComposerActionMenu — anchored plus-button picker for composer actions.
 *
 * Opens a single rich popover ("Add to this session") with three sections,
 * in priority order:
 *  1. Work with an agent → prominent compact agent cards (search + select)
 *  2. Files & images      → triggers the native file picker
 *  3. Connectors          → collapsed summary that expands grouped toggles
 *
 * Follows the same portal/fixed-positioning strategy as ModelSelector so the
 * panel escapes overflow:hidden on the composer card.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CaretRightIcon,
  CheckIcon,
  HeadCircuitIcon,
  MagnifyingGlassIcon,
  PaperclipIcon,
  PlusIcon,
  PlugsIcon,
  SpinnerGapIcon,
  XIcon
} from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import { ConnectorLogo } from '@/business-apps/core/create/apps/newwork-connect/components/ConnectorLogo'
import { CONNECT_LANES, LANE_CONFIG } from '@/business-apps/core/create/apps/newwork-connect/components/connectCatalog'
import { buildPlatformUrl, Navigation, navigateTo } from '@/common/utils/navigationUtils'
import translations from '@/business-apps/core/create/apps/newwork-connect/_i18n'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'
import type { SpecialistAgent } from '../../types/enterpriseAgent'
import { useFloatingPanel } from './useFloatingPanel'

// ── Positioning ───────────────────────────────────────────────────────────────

interface PanelCoords {
  top: number
  left: number
}

const getViewportWidth = (): number => globalThis.window?.innerWidth ?? 0

function computeMenuCoords(trigger: HTMLElement, panelEl: HTMLElement | null): PanelCoords {
  const rect = trigger.getBoundingClientRect()
  const panelH = panelEl?.offsetHeight ?? 360
  const panelW = panelEl?.offsetWidth ?? 460
  // Anchor above the trigger; clamp into the viewport so a tall panel never
  // clips off the top (the panel scrolls internally instead).
  const top = Math.max(8, rect.top - panelH - 6)
  const left = Math.max(8, Math.min(rect.left, getViewportWidth() - panelW - 8))
  return { top, left }
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ComposerActionMenuProps {
  onTriggerFileUpload: () => void
  availableConnectors: ExternalConnection[]
  activeConnectorIds: Set<string>
  onToggleConnector: (connectionId: string) => void
  isLoadingConnectors: boolean
  variant?: 'landing' | 'workspace'
  /** Enterprise agent picker — when omitted, the agent section is hidden. */
  availableAgents?: SpecialistAgent[]
  selectedAgentId?: string
  onSelectAgent?: (agent: SpecialistAgent) => void
  onClearAgent?: () => void
  isLoadingAgents?: boolean
  /** Called when the picker opens so the caller can lazily load agents. */
  onOpenAgents?: () => void
}

// ── Section primitives ──────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="gba:text-[10px] gba:font-bold gba:uppercase gba:tracking-[0.08em] gba:text-foreground/55">
    {children}
  </span>
)

interface AgentCardProps {
  agent: SpecialistAgent
  isSelected: boolean
  onSelect: () => void
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, isSelected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`gba:group gba:flex gba:min-h-[86px] gba:flex-col gba:gap-2 gba:rounded-xl gba:border gba:p-2.5 gba:text-left gba:shadow-[0_1px_2px_rgba(15,23,42,0.04)] gba:transition-all ${
      isSelected
        ? 'gba:border-sky-500/55 gba:bg-sky-50/90 gba:ring-2 gba:ring-sky-500/20'
        : 'gba:border-sky-500/15 gba:bg-linear-to-br gba:from-white gba:to-sky-50/40 gba:hover:-translate-y-px gba:hover:border-sky-400/45 gba:hover:shadow-[0_8px_22px_rgba(14,165,233,0.12)]'
    }`}
    data-testid={`composer-agent-${agent.id}`}
    title={agent.display_name}
  >
    <div className="gba:flex gba:items-start gba:gap-2">
      <span
        className={`gba:flex gba:h-7 gba:w-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:ring-1 ${
          isSelected
            ? 'gba:bg-sky-600 gba:text-white gba:ring-sky-600/20'
            : 'gba:bg-white gba:text-sky-700 gba:ring-sky-500/20 gba:shadow-sm'
        }`}
      >
        <HeadCircuitIcon className="gba:h-4 gba:w-4" weight="regular" />
      </span>
      <span className="gba:min-w-0 gba:flex-1">
        <span className="gba:flex gba:items-center gba:gap-1">
          <span className="gba:flex-1 gba:truncate gba:text-[12.5px] gba:font-bold gba:text-foreground">
            {agent.display_name}
          </span>
          {isSelected && <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-sky-700" weight="bold" />}
        </span>
        {agent.domain && (
          <span className="gba:mt-0.5 gba:block gba:truncate gba:text-[10.5px] gba:font-semibold gba:uppercase gba:tracking-wider gba:text-sky-700/70">
            {agent.domain}
          </span>
        )}
      </span>
    </div>
    {agent.description && (
      <span className="gba:line-clamp-2 gba:text-[11px] gba:leading-snug gba:text-foreground/62">
        {agent.description}
      </span>
    )}
  </button>
)

// ── Component ─────────────────────────────────────────────────────────────────

export const ComposerActionMenu: React.FC<ComposerActionMenuProps> = ({
  onTriggerFileUpload,
  availableConnectors,
  activeConnectorIds,
  onToggleConnector,
  isLoadingConnectors,
  variant = 'landing',
  availableAgents,
  selectedAgentId,
  onSelectAgent,
  onClearAgent,
  isLoadingAgents = false,
  onOpenAgents
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [connectorsExpanded, setConnectorsExpanded] = useState(false)
  const [agentSearch, setAgentSearch] = useState('')
  const [coords, setCoords] = useState<PanelCoords>({ top: 0, left: 0 })
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const { t } = useTranslation(translations)

  const isSmall = variant === 'workspace'
  const activeCount = availableConnectors.filter(c => activeConnectorIds.has(c.connection_id)).length
  const agentsEnabled = typeof onSelectAgent === 'function'
  const selectedAgent = availableAgents?.find(a => a.id === selectedAgentId)

  const filteredAgents = useMemo(() => {
    const query = agentSearch.trim().toLowerCase()
    const list = availableAgents ?? []
    if (!query) return list
    return list.filter(agent => {
      const haystack =
        `${agent.display_name} ${agent.description} ${agent.domain} ${agent.tags.join(' ')}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [availableAgents, agentSearch])

  const grouped = availableConnectors.reduce<Record<string, ExternalConnection[]>>((acc, conn) => {
    const lane = conn.lane || 'mcp_servers'
    if (!acc[lane]) acc[lane] = []
    acc[lane].push(conn)
    return acc
  }, {})
  const sortedLanes = CONNECT_LANES.filter(lane => grouped[lane]?.length > 0)

  const close = useCallback(() => {
    setIsOpen(false)
    setConnectorsExpanded(false)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    setConnectorsExpanded(false)
    setAgentSearch('')
    onOpenAgents?.()
  }, [onOpenAgents])

  const { triggerRef, panelRef } = useFloatingPanel({
    isOpen,
    onClose: close,
    onMeasure: useCallback((panelEl, triggerEl) => {
      setCoords(computeMenuCoords(triggerEl, panelEl))
    }, []),
    measureDeps: [connectorsExpanded, filteredAgents.length, isLoadingAgents, isLoadingConnectors, !!selectedAgent]
  })

  const hasConnectors = availableConnectors.length > 0 || isLoadingConnectors

  useEffect(() => {
    if (!connectorsExpanded) return

    const browserWindow = globalThis.window
    if (!browserWindow) return

    const frame = browserWindow.requestAnimationFrame(() => {
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) return

      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      })
    })

    return () => browserWindow.cancelAnimationFrame(frame)
  }, [connectorsExpanded, sortedLanes.length, isLoadingConnectors])

  const panel = isOpen
    ? createPortal(
        <div
          ref={panelRef}
          style={{ top: coords.top, left: coords.left }}
          className="gba:fixed gba:z-9999 gba:flex gba:max-h-[min(560px,82vh)] gba:w-[min(460px,calc(100vw-16px))] gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-foreground/12 gba:bg-white gba:shadow-[0_18px_48px_rgba(15,23,42,0.16),0_2px_10px_rgba(15,23,42,0.07)]"
          data-testid="composer-action-menu-panel"
        >
          {/* Header */}
          <div className="gba:shrink-0 gba:border-b gba:border-foreground/8 gba:bg-linear-to-br gba:from-foreground/3 gba:via-white gba:to-white gba:px-4 gba:pb-3 gba:pt-3">
            <h2 className="gba:text-[13px] gba:font-bold gba:text-foreground">Add to this session</h2>
            <p className="gba:mt-0.5 gba:text-[11px] gba:font-medium gba:text-foreground/58">
              Choose an agent, attach files, or connect data.
            </p>
          </div>

          <div
            ref={scrollContainerRef}
            className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-3.5 gba:overflow-y-auto gba:px-4 gba:py-3.5"
          >
            {/* Section 1 — Agents */}
            {agentsEnabled && (
              <section data-testid="composer-section-agents">
                <div className="gba:mb-2 gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <SectionLabel>Work with an agent</SectionLabel>
                  {selectedAgent && (
                    <button
                      type="button"
                      onClick={() => onClearAgent?.()}
                      className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:transition-colors gba:hover:text-foreground"
                      data-testid="composer-agent-clear"
                    >
                      <XIcon className="gba:h-3 gba:w-3" weight="bold" />
                      Clear
                    </button>
                  )}
                </div>

                <div className="gba:mb-2 gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:border gba:border-foreground/10 gba:bg-foreground/2.5 gba:px-2.5 gba:py-1.5 gba:transition-colors gba:focus-within:border-ring gba:focus-within:bg-white gba:focus-within:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]">
                  <MagnifyingGlassIcon
                    className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-foreground/45"
                    weight="bold"
                  />
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={event => setAgentSearch(event.target.value)}
                    placeholder="Search agents…"
                    className="gba:w-full gba:bg-transparent gba:text-[12px] gba:font-medium gba:text-foreground gba:placeholder:text-foreground/42 gba:outline-none"
                    data-testid="composer-agent-search"
                  />
                </div>

                {isLoadingAgents && (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                    <SpinnerGapIcon className="gba:h-5 gba:w-5 gba:animate-spin gba:text-muted-foreground" />
                  </div>
                )}

                {!isLoadingAgents && filteredAgents.length === 0 && (
                  <p className="gba:rounded-xl gba:border gba:border-dashed gba:border-foreground/12 gba:px-3 gba:py-6 gba:text-center gba:text-[12px] gba:text-muted-foreground">
                    {(availableAgents?.length ?? 0) === 0 ? 'No agents available.' : 'No agents match your search.'}
                  </p>
                )}

                {!isLoadingAgents && filteredAgents.length > 0 && (
                  <div className="gba:grid gba:max-h-[280px] gba:grid-cols-2 gba:gap-2 gba:overflow-y-auto gba:pr-0.5">
                    {filteredAgents.map(agent => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        isSelected={agent.id === selectedAgentId}
                        onSelect={() => {
                          onSelectAgent?.(agent)
                          close()
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Section 2 — Files & images */}
            <section data-testid="composer-section-files">
              <div className="gba:mb-2">
                <SectionLabel>Files &amp; images</SectionLabel>
              </div>
              <button
                type="button"
                onClick={() => {
                  onTriggerFileUpload()
                  close()
                }}
                className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-xl gba:border gba:border-foreground/12 gba:bg-white gba:px-3 gba:py-2.5 gba:text-left gba:shadow-[0_1px_2px_rgba(15,23,42,0.04)] gba:transition-colors gba:hover:border-foreground/20 gba:hover:bg-foreground/3"
                data-testid="composer-menu-upload"
              >
                <span className="gba:flex gba:h-7 gba:w-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-foreground/5 gba:text-foreground/70 gba:ring-1 gba:ring-foreground/8">
                  <PaperclipIcon className="gba:h-4 gba:w-4" weight="regular" />
                </span>
                <span className="gba:min-w-0 gba:flex-1">
                  <span className="gba:block gba:text-[12.5px] gba:font-medium gba:text-foreground">
                    Add photos &amp; files
                  </span>
                  <span className="gba:block gba:text-[11px] gba:text-foreground/55">PDFs, images, and documents</span>
                </span>
              </button>
            </section>

            {/* Section 3 — Connectors */}
            {hasConnectors && (
              <section data-testid="composer-section-connectors">
                <div className="gba:mb-2">
                  <SectionLabel>Connectors</SectionLabel>
                </div>
                <button
                  type="button"
                  onClick={() => setConnectorsExpanded(prev => !prev)}
                  className={`gba:flex gba:w-full gba:items-center gba:gap-3 gba:rounded-xl gba:border gba:px-3 gba:py-2.5 gba:text-left gba:shadow-[0_1px_2px_rgba(15,23,42,0.04)] gba:transition-colors ${
                    connectorsExpanded
                      ? 'gba:border-foreground/20 gba:bg-foreground/4'
                      : 'gba:border-foreground/12 gba:bg-white gba:hover:border-foreground/20 gba:hover:bg-foreground/3'
                  }`}
                  data-testid="composer-menu-connectors"
                >
                  <span className="gba:flex gba:h-7 gba:w-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-foreground/5 gba:text-foreground/70 gba:ring-1 gba:ring-foreground/8">
                    <PlugsIcon className="gba:h-4 gba:w-4" weight="regular" />
                  </span>
                  <span className="gba:min-w-0 gba:flex-1">
                    <span className="gba:block gba:text-[12.5px] gba:font-semibold gba:text-foreground">
                      Connectors
                    </span>
                    <span className="gba:block gba:text-[11px] gba:text-foreground/55">
                      {activeCount > 0 ? `${activeCount} active` : 'Connect external data sources'}
                    </span>
                  </span>
                  {activeCount > 0 && (
                    <span className="gba:inline-flex gba:h-5 gba:shrink-0 gba:items-center gba:rounded-full gba:bg-foreground/8 gba:px-1.5 gba:text-[10.5px] gba:font-bold gba:tabular-nums gba:text-foreground/70">
                      {activeCount}
                    </span>
                  )}
                  <CaretRightIcon
                    className={`gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-foreground/35 gba:transition-transform ${
                      connectorsExpanded ? 'gba:rotate-90' : ''
                    }`}
                    weight="bold"
                  />
                </button>

                {connectorsExpanded && (
                  <div className="gba:mt-1.5 gba:rounded-xl gba:border gba:border-foreground/8 gba:bg-foreground/2.5 gba:p-1.5">
                    <div className="gba:max-h-[220px] gba:space-y-3 gba:overflow-y-auto gba:px-0.5 gba:py-0.5">
                      {isLoadingConnectors && (
                        <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
                          <SpinnerGapIcon className="gba:h-4 gba:w-4 gba:animate-spin gba:text-muted-foreground" />
                        </div>
                      )}

                      {!isLoadingConnectors && availableConnectors.length === 0 && (
                        <p className="gba:px-2 gba:py-4 gba:text-center gba:text-xs gba:text-muted-foreground">
                          No connectors available.
                        </p>
                      )}

                      {!isLoadingConnectors &&
                        sortedLanes.map(lane => {
                          const laneConfig = LANE_CONFIG[lane]
                          return (
                            <div key={lane}>
                              <h3 className="gba:mb-1 gba:px-1.5 gba:text-[9.5px] gba:font-semibold gba:uppercase gba:tracking-[0.07em] gba:text-muted-foreground/50">
                                {t(laneConfig.titleKey)}
                              </h3>
                              <div className="gba:space-y-0.5">
                                {grouped[lane].map(conn => {
                                  const isActive = activeConnectorIds.has(conn.connection_id)
                                  return (
                                    <button
                                      key={conn.connection_id}
                                      type="button"
                                      onClick={() => onToggleConnector(conn.connection_id)}
                                      className="gba:flex gba:w-full gba:items-center gba:gap-2.5 gba:rounded-lg gba:px-2 gba:py-1.5 gba:text-left gba:transition-colors gba:hover:bg-foreground/5"
                                      data-testid={`composer-connector-${conn.connection_id}`}
                                    >
                                      <ConnectorLogo providerId={conn.providerIdForLogo} size="sm" />
                                      <span className="gba:flex-1 gba:line-clamp-1 gba:text-[12px] gba:font-medium gba:text-foreground">
                                        {conn.name}
                                      </span>
                                      <div
                                        className={`gba:flex gba:h-4 gba:w-8 gba:shrink-0 gba:items-center gba:rounded-full gba:p-0.5 gba:transition-colors ${
                                          isActive
                                            ? 'gba:justify-end gba:bg-foreground/80'
                                            : 'gba:justify-start gba:bg-foreground/20'
                                        }`}
                                        aria-hidden="true"
                                      >
                                        <div className="gba:h-3 gba:w-3 gba:rounded-full gba:bg-white gba:shadow-sm" />
                                      </div>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    <div className="gba:mt-1 gba:border-t gba:border-foreground/8 gba:px-2 gba:pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          close()
                          navigateTo(buildPlatformUrl(Navigation.CREATE_CONNECT))
                        }}
                        className="gba:text-xs gba:text-muted-foreground gba:underline gba:transition-colors gba:hover:text-foreground"
                        data-testid="composer-connector-manage"
                      >
                        Manage connections
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <div className="gba:relative gba:shrink-0" data-testid="composer-action-menu-trigger">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (isOpen) {
            close()
          } else {
            open()
          }
        }}
        className={`gba:flex gba:items-center gba:justify-center ${
          isSmall ? 'gba:h-7 gba:w-7' : 'gba:h-8 gba:w-8'
        } gba:rounded-md gba:bg-white gba:text-foreground gba:hover:bg-white gba:transition-colors gba:shrink-0`}
        title="Add"
        data-testid="fabric-input-add"
      >
        <PlusIcon className={isSmall ? 'gba:h-3.5 gba:w-3.5' : 'gba:h-4 gba:w-4'} weight="bold" />
      </button>

      {panel}
    </div>
  )
}
