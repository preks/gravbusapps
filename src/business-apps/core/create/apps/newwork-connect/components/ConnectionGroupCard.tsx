import React from 'react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import type {
  ConnectorProviderODM,
  ExternalConnectionHealthResponse,
  ExternalConnectionLane,
  ExternalConnectionODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { ConnectedInstancesList } from './ConnectedInstancesList'
import { LANE_CONFIG } from './connectCatalog'
import { LaneLogo } from './ConnectorLogo'

type HealthState = Pick<ExternalConnectionHealthResponse, 'success' | 'message'>

interface ConnectionGroupCardProps {
  lane: ExternalConnectionLane
  providers: ConnectorProviderODM[]
  connections: ExternalConnectionODM[]
  providerById: Record<string, ConnectorProviderODM>
  testingConnectionId: string | null
  healthResults: Record<string, HealthState>
  onConnectNew: (lane: ExternalConnectionLane) => void
  onEdit: (connection: ExternalConnectionODM) => void
  onDelete: (connection: ExternalConnectionODM) => void
  onTest: (connection: ExternalConnectionODM) => void
  t: (key: string, args?: Record<string, unknown>) => string
}

export const ConnectionGroupCard: React.FC<ConnectionGroupCardProps> = ({
  lane,
  providers,
  connections,
  providerById,
  testingConnectionId,
  healthResults,
  onConnectNew,
  onEdit,
  onDelete,
  onTest,
  t
}) => {
  const config = LANE_CONFIG[lane]

  return (
    <Card className="gba:flex gba:flex-col gba:h-full" data-testid={`newwork-connect-group-card-${lane}`}>
      <CardHeader className="gba:space-y-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
          <div className="gba:flex gba:items-center gba:gap-4">
            <LaneLogo lane={lane} />
            <div className="gba:space-y-0.5">
              <CardTitle className="gba:text-xl">{t(config.titleKey)}</CardTitle>
              <CardDescription className="gba:text-sm">{t(config.descriptionKey)}</CardDescription>
            </div>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Badge variant="secondary">{t('connect-count', { count: connections.length })}</Badge>
            <span className="gba:text-xs gba:text-muted-foreground">
              {t(config.availableProvidersKey, { count: providers.length })}
            </span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => onConnectNew(lane)}
            data-testid={`newwork-connect-group-connect-${lane}`}
          >
            <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
            {t('connect-new')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1">
        <ConnectedInstancesList
          connections={connections}
          providerById={providerById}
          testingConnectionId={testingConnectionId}
          healthResults={healthResults}
          onEdit={onEdit}
          onDelete={onDelete}
          onTest={onTest}
          t={t}
          testIdPrefix={`newwork-connect-group-${lane}`}
        />
      </CardContent>
    </Card>
  )
}
