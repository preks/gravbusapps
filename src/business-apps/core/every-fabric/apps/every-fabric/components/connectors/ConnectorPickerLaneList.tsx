import { useTranslation } from '@newwork/nw-design-system'
import { CheckIcon } from '@phosphor-icons/react'
import { ConnectorLogo } from '@/business-apps/core/create/apps/newwork-connect/components/ConnectorLogo'
import { LANE_CONFIG } from '@/business-apps/core/create/apps/newwork-connect/components/connectCatalog'
import translations from '@/business-apps/core/create/apps/newwork-connect/_i18n'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'
import {
  getPlatformBadgeKey,
  getSortedLanesWithConnectors,
  groupConnectorsByLaneAndScope
} from './connectorPickerUtils'

export interface ConnectorPickerLaneListProps {
  connectors: ExternalConnection[]
  activeConnectorIds: Set<string>
  onToggle: (connectionId: string) => void
  variant?: 'sheet' | 'menu'
  testIdPrefix?: string
}

const LANE_HEADER_CLASS = {
  sheet:
    'gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wider gba:text-muted-foreground/75 gba:mb-2 gba:px-1',
  menu: 'gba:text-[9.5px] gba:font-semibold gba:uppercase gba:tracking-[0.07em] gba:text-muted-foreground/50 gba:mb-1 gba:px-1.5'
} as const

const SECTION_HEADER_CLASS = {
  sheet:
    'gba:text-[9px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground/60 gba:mb-1 gba:px-1 gba:mt-1',
  menu: 'gba:text-[9px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground/55 gba:mb-0.5 gba:px-1.5 gba:mt-1'
} as const

export const ConnectorPickerLaneList: React.FC<ConnectorPickerLaneListProps> = ({
  connectors,
  activeConnectorIds,
  onToggle,
  variant = 'sheet',
  testIdPrefix = 'connector'
}) => {
  const { t } = useTranslation(translations)
  const grouped = groupConnectorsByLaneAndScope(connectors)
  const sortedLanes = getSortedLanesWithConnectors(grouped)
  const isMenu = variant === 'menu'

  return (
    <>
      {sortedLanes.map(lane => {
        const laneConfig = LANE_CONFIG[lane]
        const laneGroup = grouped[lane]
        const showSectionHeaders = laneGroup.custom.length > 0 && laneGroup.platform.length > 0

        const renderConnector = (conn: ExternalConnection) => {
          const isActive = activeConnectorIds.has(conn.connection_id)
          const isPlatform = conn.scope === 'platform'
          const badgeKey = getPlatformBadgeKey(conn)

          return (
            <button
              key={conn.connection_id}
              type="button"
              onClick={() => onToggle(conn.connection_id)}
              disabled={isPlatform}
              className={`gba:w-full gba:flex gba:items-center gba:gap-2.5 gba:rounded-xl gba:transition-all gba:text-left ${
                isMenu ? 'gba:px-2 gba:py-2 gba:hover:bg-foreground/4.5' : 'gba:p-2.5 gba:hover:bg-muted/45'
              } ${
                isActive && !isMenu ? 'gba:bg-primary/8 gba:ring-1 gba:ring-primary/20' : ''
              } ${isPlatform ? 'gba:cursor-default gba:opacity-90' : ''}`}
              title={conn.description || conn.name}
              data-testid={`${testIdPrefix}-${conn.connection_id}`}
            >
              <ConnectorLogo providerId={conn.providerIdForLogo} size="sm" />
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:min-w-0">
                  <span
                    className={`gba:line-clamp-1 gba:font-medium gba:text-foreground ${
                      isMenu ? 'gba:text-[12px]' : 'gba:text-xs'
                    }`}
                  >
                    {conn.name}
                  </span>
                  {badgeKey && (
                    <span className="gba:shrink-0 gba:rounded-full gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[9px] gba:font-medium gba:text-muted-foreground">
                      {t(badgeKey)}
                    </span>
                  )}
                </div>
              </div>
              {isMenu ? (
                <div
                  className={`gba:shrink-0 gba:w-8 gba:h-4 gba:rounded-full gba:flex gba:items-center gba:p-0.5 gba:transition-colors ${
                    isActive ? 'gba:bg-primary gba:justify-end' : 'gba:bg-foreground/20 gba:justify-start'
                  }`}
                  aria-hidden="true"
                >
                  <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-white gba:shadow-sm" />
                </div>
              ) : (
                isActive && <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:shrink-0" weight="bold" />
              )}
            </button>
          )
        }

        return (
          <div key={lane}>
            <h3 className={LANE_HEADER_CLASS[variant]}>{t(laneConfig.titleKey)}</h3>
            <div className={isMenu ? 'gba:space-y-0.5' : 'gba:space-y-1'}>
              {showSectionHeaders && laneGroup.custom.length > 0 && (
                <p className={SECTION_HEADER_CLASS[variant]}>{t('connect-picker-section-yours')}</p>
              )}
              {laneGroup.custom.map(renderConnector)}

              {showSectionHeaders && laneGroup.platform.length > 0 && (
                <p className={SECTION_HEADER_CLASS[variant]}>{t('connect-picker-section-platform')}</p>
              )}
              {!showSectionHeaders && laneGroup.platform.length > 0 && laneGroup.custom.length === 0 && (
                <p className={SECTION_HEADER_CLASS[variant]}>{t('connect-picker-section-platform')}</p>
              )}
              {laneGroup.platform.map(renderConnector)}
            </div>
          </div>
        )
      })}
    </>
  )
}
