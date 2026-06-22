import { PlugsConnected } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

export interface ActiveConnectorInfo {
  connection_id: string
  name: string
  kind: string
  providerIdForLogo?: string
}

interface WorkspaceConnectorIndicatorProps {
  connectors: ActiveConnectorInfo[]
  maxVisible?: number
}

export const WorkspaceConnectorIndicator: React.FC<WorkspaceConnectorIndicatorProps> = ({
  connectors,
  maxVisible = 5
}) => {
  const { t } = useTranslation(translations)

  if (!connectors || connectors.length === 0) return null

  const visibleConnectors = connectors.slice(0, maxVisible)
  const remainingCount = connectors.length - maxVisible
  const fullText = connectors.map(c => c.name).join(', ')

  return (
    <div
      className="gba:inline-flex gba:items-start gba:gap-1.5 gba:px-3 gba:py-2 gba:rounded-xl gba:border gba:border-border/60 gba:bg-background/92 gba:backdrop-blur-md gba:text-xs gba:font-medium gba:transition-colors"
      data-testid="fabric-workspace-connector-indicator"
      title={t('workspace-connector-connected', { names: fullText })}
    >
      <PlugsConnected className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:mt-0.5 gba:shrink-0" weight="bold" />
      <div className="gba:flex gba:flex-col gba:gap-0.5">
        {visibleConnectors.map(connector => (
          <span
            key={connector.connection_id}
            className="gba:text-foreground gba:max-w-[120px] gba:truncate"
            title={connector.name}
          >
            {connector.name}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="gba:text-muted-foreground">{t('workspace-connector-more', { count: remainingCount })}</span>
        )}
      </div>
    </div>
  )
}
