import { X } from '@phosphor-icons/react'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'
import { ConnectorLogo } from '@/business-apps/core/create/apps/newwork-connect/components/ConnectorLogo'

export interface ActiveConnectorChipsProps {
  connectors: ExternalConnection[]
  onRemove: (connectionId: string) => void
}

export const ActiveConnectorChips: React.FC<ActiveConnectorChipsProps> = ({ connectors, onRemove }) => {
  if (connectors.length === 0) return null

  return (
    <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:px-5 gba:pb-2">
      {connectors.map(conn => (
        <button
          key={conn.connection_id}
          onClick={() => onRemove(conn.connection_id)}
          className="gba:inline-flex gba:items-center gba:gap-1.5 gba:h-7 gba:pl-1.5 gba:pr-2.5 gba:rounded-full gba:bg-primary/10 gba:text-primary gba:text-xs gba:font-medium gba:hover:bg-primary/20 gba:transition-colors"
          title={conn.description || conn.name}
          data-testid={`active-connector-${conn.connection_id}`}
        >
          <div className="gba:scale-75 gba:origin-left">
            <ConnectorLogo providerId={conn.providerIdForLogo} size="sm" />
          </div>
          <span className="gba:line-clamp-1">{conn.name}</span>
          <X className="gba:h-3 gba:w-3 gba:ml-0.5" weight="bold" />
        </button>
      ))}
    </div>
  )
}
