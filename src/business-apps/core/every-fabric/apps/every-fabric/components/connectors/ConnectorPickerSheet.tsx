import { Button, useTranslation } from '@newwork/nw-design-system'
import { PlugIcon, XIcon } from '@phosphor-icons/react'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'
import { buildPlatformUrl, Navigation, navigateTo } from '@/common/utils/navigationUtils'
import { ConnectorPickerLaneList } from './ConnectorPickerLaneList'
import translations from '../../_i18n'

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
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">{t('connectors-picker-title')}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8 gba:rounded-full"
            onClick={onClose}
            data-testid="connector-picker-close"
            aria-label={t('connectors-picker-close-aria')}
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </Button>
        </div>

        <div className="gba:max-h-[min(28rem,60vh)] gba:overflow-y-auto gba:p-3">
          {isLoading && (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:px-4 gba:py-8 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">{t('connectors-picker-loading')}</p>
            </div>
          )}
          {!isLoading && connectors.length === 0 && (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:px-4 gba:py-8 gba:text-center">
              <p className="gba:text-sm gba:text-muted-foreground">{t('connectors-picker-empty')}</p>
            </div>
          )}
          {!isLoading && connectors.length > 0 && (
            <div className="gba:space-y-4">
              <ConnectorPickerLaneList
                connectors={connectors}
                activeConnectorIds={activeConnectorIds}
                onToggle={onToggle}
                variant="sheet"
              />
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
            {t('landing-composer-manage-connections')}
          </button>
        </div>
      </div>
    </div>
  )
}
