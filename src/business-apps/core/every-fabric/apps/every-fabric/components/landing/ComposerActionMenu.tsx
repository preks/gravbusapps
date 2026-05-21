/**
 * ComposerActionMenu — anchored plus-button menu for composer actions.
 *
 * Opens a small portal-positioned panel with:
 *  - "Add photos & files" → triggers the native file picker
 *  - "Connectors" → expands a side column showing grouped connector toggles
 *
 * Follows the same portal/fixed-positioning strategy as ModelSelector so the
 * panel escapes overflow:hidden on the composer card.
 */
import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { CaretRightIcon, PaperclipIcon, PlusIcon, PlugsIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import { ConnectorLogo } from '@/business-apps/core/create/apps/newwork-connect/components/ConnectorLogo'
import { CONNECT_LANES, LANE_CONFIG } from '@/business-apps/core/create/apps/newwork-connect/components/connectCatalog'
import { buildPlatformUrl, Navigation, navigateTo } from '@/common/utils/navigationUtils'
import translations from '@/business-apps/core/create/apps/newwork-connect/_i18n'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'
import { useFloatingPanel } from './useFloatingPanel'

// ── Positioning ───────────────────────────────────────────────────────────────

interface PanelCoords {
  top: number
  left: number
}

function computeMenuCoords(trigger: HTMLElement, panelEl: HTMLElement | null): PanelCoords {
  const rect = trigger.getBoundingClientRect()
  const panelH = panelEl?.offsetHeight ?? 80
  const panelW = panelEl?.offsetWidth ?? 200
  const top = rect.top - panelH - 6
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelW - 8))
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ComposerActionMenu: React.FC<ComposerActionMenuProps> = ({
  onTriggerFileUpload,
  availableConnectors,
  activeConnectorIds,
  onToggleConnector,
  isLoadingConnectors,
  variant = 'landing'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showConnectors, setShowConnectors] = useState(false)
  const [coords, setCoords] = useState<PanelCoords>({ top: 0, left: 0 })
  const { t } = useTranslation(translations)

  const isSmall = variant === 'workspace'
  const activeCount = availableConnectors.filter(c => activeConnectorIds.has(c.connection_id)).length

  const grouped = availableConnectors.reduce<Record<string, ExternalConnection[]>>((acc, conn) => {
    const lane = conn.lane || 'mcp_servers'
    if (!acc[lane]) acc[lane] = []
    acc[lane].push(conn)
    return acc
  }, {})
  const sortedLanes = CONNECT_LANES.filter(lane => grouped[lane]?.length > 0)

  const close = useCallback(() => {
    setIsOpen(false)
    setShowConnectors(false)
  }, [])

  const { triggerRef, panelRef } = useFloatingPanel({
    isOpen,
    onClose: close,
    onMeasure: useCallback((panelEl, triggerEl) => {
      setCoords(computeMenuCoords(triggerEl, panelEl))
    }, []),
    measureDeps: [showConnectors]
  })

  const hasConnectors = availableConnectors.length > 0 || isLoadingConnectors

  const panel = isOpen
    ? createPortal(
        <div
          ref={panelRef}
          style={{ top: coords.top, left: coords.left }}
          className="gba:fixed gba:z-9999 gba:flex gba:flex-row gba:items-end gba:rounded-2xl gba:border gba:border-foreground/12 gba:bg-white gba:shadow-[0_8px_32px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.07)] gba:overflow-hidden"
          data-testid="composer-action-menu-panel"
        >
          {/* Main menu column */}
          <div className="gba:min-w-[200px] gba:p-1.5 gba:space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onTriggerFileUpload()
                close()
              }}
              className="gba:w-full gba:flex gba:items-center gba:gap-2.5 gba:px-3 gba:py-2 gba:rounded-xl gba:text-left gba:text-[13px] gba:font-medium gba:text-foreground/80 gba:hover:bg-foreground/4.5 gba:hover:text-foreground gba:transition-colors gba:select-none"
              data-testid="composer-menu-upload"
            >
              <PaperclipIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-foreground/50" weight="regular" />
              Add photos &amp; files
            </button>

            {hasConnectors && (
              <>
                <div className="gba:h-px gba:bg-foreground/8 gba:mx-1" />
                <button
                  type="button"
                  onClick={() => setShowConnectors(v => !v)}
                  className={`gba:w-full gba:flex gba:items-center gba:gap-2.5 gba:px-3 gba:py-2 gba:rounded-xl gba:text-left gba:text-[13px] gba:font-medium gba:transition-colors gba:select-none ${
                    showConnectors
                      ? 'gba:bg-foreground/5.5 gba:text-foreground'
                      : 'gba:text-foreground/80 gba:hover:bg-foreground/4.5 gba:hover:text-foreground'
                  }`}
                  data-testid="composer-menu-connectors"
                >
                  <PlugsIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-foreground/50" weight="regular" />
                  <span className="gba:flex-1">Connectors</span>
                  {activeCount > 0 && (
                    <span className="gba:text-[10.5px] gba:font-semibold gba:tabular-nums gba:text-primary gba:bg-primary/10 gba:rounded-full gba:px-1.5 gba:leading-5 gba:h-5 gba:inline-flex gba:items-center">
                      {activeCount}
                    </span>
                  )}
                  <CaretRightIcon
                    className={`gba:h-3 gba:w-3 gba:shrink-0 gba:text-foreground/35 gba:transition-transform ${showConnectors ? 'gba:rotate-90' : ''}`}
                    weight="bold"
                  />
                </button>
              </>
            )}
          </div>

          {/* Connectors pane (side column) */}
          {showConnectors && (
            <div className="gba:w-64 gba:border-l gba:border-foreground/10 gba:flex gba:flex-col">
              <div className="gba:px-3 gba:pt-2.5 gba:pb-1">
                <span className="gba:text-[9.5px] gba:font-semibold gba:uppercase gba:tracking-[0.07em] gba:text-muted-foreground/50">
                  Connectors
                </span>
              </div>

              <div className="gba:overflow-y-auto gba:max-h-72 gba:px-1.5 gba:pb-1.5 gba:space-y-3">
                {isLoadingConnectors && (
                  <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
                    <SpinnerGapIcon className="gba:h-4 gba:w-4 gba:animate-spin gba:text-muted-foreground" />
                  </div>
                )}

                {!isLoadingConnectors && availableConnectors.length === 0 && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-4 gba:px-2">
                    No connectors available.
                  </p>
                )}

                {!isLoadingConnectors &&
                  sortedLanes.map(lane => {
                    const laneConfig = LANE_CONFIG[lane]
                    return (
                      <div key={lane}>
                        <h3 className="gba:text-[9.5px] gba:font-semibold gba:uppercase gba:tracking-[0.07em] gba:text-muted-foreground/50 gba:mb-1 gba:px-1.5">
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
                                className="gba:w-full gba:flex gba:items-center gba:gap-2.5 gba:px-2 gba:py-2 gba:rounded-xl gba:transition-colors gba:text-left gba:hover:bg-foreground/4.5"
                                data-testid={`composer-connector-${conn.connection_id}`}
                              >
                                <ConnectorLogo providerId={conn.providerIdForLogo} size="sm" />
                                <span className="gba:flex-1 gba:text-[12px] gba:font-medium gba:text-foreground gba:line-clamp-1">
                                  {conn.name}
                                </span>
                                {/* Toggle switch */}
                                <div
                                  className={`gba:shrink-0 gba:w-8 gba:h-4 gba:rounded-full gba:flex gba:items-center gba:p-0.5 gba:transition-colors ${
                                    isActive
                                      ? 'gba:bg-primary gba:justify-end'
                                      : 'gba:bg-foreground/20 gba:justify-start'
                                  }`}
                                  aria-hidden="true"
                                >
                                  <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-white gba:shadow-sm" />
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div className="gba:border-t gba:border-foreground/8 gba:px-3 gba:py-2.5">
                <button
                  type="button"
                  onClick={() => {
                    close()
                    navigateTo(buildPlatformUrl(Navigation.CREATE_CONNECT))
                  }}
                  className="gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:underline"
                  data-testid="composer-connector-manage"
                >
                  Manage connections
                </button>
              </div>
            </div>
          )}
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
          setIsOpen(o => !o)
          if (isOpen) return
          setShowConnectors(false)
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
