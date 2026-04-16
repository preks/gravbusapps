import { Button, useTranslation } from '@newwork/nw-design-system'
import { CheckIcon, PlugIcon, XIcon } from '@phosphor-icons/react'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'
import { ConnectorLogo } from '@/business-apps/core/create/apps/newwork-connect/components/ConnectorLogo'
import { CONNECT_LANES, LANE_CONFIG } from '@/business-apps/core/create/apps/newwork-connect/components/connectCatalog'
import translations from '@/business-apps/core/create/apps/newwork-connect/_i18n'
import { buildPlatformUrl, Navigation, navigateTo } from '@/common/utils/navigationUtils'

export interface ConnectorPickerSheetProps {
  isOpen: boolean
  onClose: () => void
  connectors: ExternalConnection[]
  activeConnectorIds: Set<string>
  onToggle: (connectionId: string) => void
  isLoading?: boolean
}

export const ConnectorPickerSheet: React.FC<ConnectorPickerSheetProps> = ({
  isOpen,
  onClose,
  connectors,
  activeConnectorIds,
  onToggle,
  isLoading
}) => {
  const { t } = useTranslation(translations)

  const grouped = connectors.reduce(
    (acc, conn) => {
      const lane = conn.lane || 'mcp_servers'
      if (!acc[lane]) acc[lane] = []
      acc[lane].push(conn)
      return acc
    },
    {} as Record<string, ExternalConnection[]>
  )

  const sortedLanes = CONNECT_LANES.filter(lane => grouped[lane]?.length > 0)

  return (
    <div
      className={`gba:fixed gba:bottom-20 sm:gba:bottom-24 gba:left-18 sm:gba:left-20 gba:z-40 gba:w-[18rem] gba:transition-all gba:duration-200 ${
        isOpen
          ? 'gba:opacity-100 gba:translate-x-0 gba:pointer-events-auto'
          : 'gba:opacity-0 -gba:translate-x-4 gba:pointer-events-none'
      }`}
      data-testid="connector-picker-panel"
    >
      <div className="gba:rounded-[1.5rem] gba:border gba:border-border/75 gba:bg-card/98 gba:backdrop-blur-md gba:shadow-[0_8px_24px_rgba(15,23,42,0.045)]">
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border/60">
          <div className="gba:flex gba:items-center gba:gap-2">
            <PlugIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">Connectors</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8 gba:rounded-full"
            onClick={onClose}
            data-testid="connector-picker-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </Button>
        </div>

        <div className="gba:max-h-[min(28rem,60vh)] gba:overflow-y-auto gba:p-3">
          {isLoading && (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:px-4 gba:py-8 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">Loading connectors...</p>
            </div>
          )}
          {!isLoading && connectors.length === 0 && (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:px-4 gba:py-8 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">No connectors available.</p>
            </div>
          )}
          {!isLoading && connectors.length > 0 && (
            <div className="gba:space-y-4">
              {sortedLanes.map(lane => {
                const laneConfig = LANE_CONFIG[lane]
                return (
                  <div key={lane}>
                    <h3 className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground/75 gba:mb-2 gba:px-1">
                      {t(laneConfig.titleKey)}
                    </h3>
                    <div className="gba:space-y-1">
                      {grouped[lane].map(conn => {
                        const isActive = activeConnectorIds.has(conn.connection_id)
                        return (
                          <button
                            key={conn.connection_id}
                            onClick={() => onToggle(conn.connection_id)}
                            className={`gba:w-full gba:flex gba:items-center gba:gap-2.5 gba:p-2.5 gba:rounded-xl gba:transition-all gba:text-left ${
                              isActive ? 'gba:bg-primary/8 gba:ring-1 gba:ring-primary/20' : 'gba:hover:bg-muted/45'
                            }`}
                            title={conn.description || conn.name}
                            data-testid={`connector-${conn.connection_id}`}
                          >
                            <ConnectorLogo providerId={conn.providerIdForLogo} size="sm" />
                            <div className="gba:flex-1 gba:min-w-0">
                              <div className="gba:text-xs gba:font-medium gba:text-foreground gba:line-clamp-1">
                                {conn.name}
                              </div>
                            </div>
                            {isActive && (
                              <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:shrink-0" weight="bold" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="gba:px-4 gba:py-2.5 gba:border-t gba:border-border/50 gba:text-center">
          <button
            onClick={() => {
              navigateTo(buildPlatformUrl(Navigation.CREATE_CONNECT))
            }}
            className="gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:underline"
            data-testid="connector-manage-link"
          >
            Manage connections
          </button>
        </div>
      </div>
    </div>
  )
}
