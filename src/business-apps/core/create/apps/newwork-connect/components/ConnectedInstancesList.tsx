import React from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import type {
  ConnectorProviderODM,
  ExternalConnectionHealthResponse,
  ExternalConnectionODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import {
  CONSUMER_TYPE_OPTIONS,
  getConnectionConsumerTypes,
  getConnectionId,
  getConnectionProviderId,
  getProviderTitle,
  inferProviderIdFromConnection
} from './connectCatalog'
import { ConnectorLogo } from './ConnectorLogo'

type HealthState = Pick<ExternalConnectionHealthResponse, 'success' | 'message'>

interface ConnectedInstancesListProps {
  connections: ExternalConnectionODM[]
  providerById: Record<string, ConnectorProviderODM>
  testingConnectionId: string | null
  healthResults: Record<string, HealthState>
  onEdit: (connection: ExternalConnectionODM) => void
  onDelete: (connection: ExternalConnectionODM) => void
  onTest: (connection: ExternalConnectionODM) => void
  t: (key: string, args?: Record<string, unknown>) => string
  testIdPrefix: string
}

export const ConnectedInstancesList: React.FC<ConnectedInstancesListProps> = ({
  connections,
  providerById,
  testingConnectionId,
  healthResults,
  onEdit,
  onDelete,
  onTest,
  t,
  testIdPrefix
}) => {
  if (!connections.length) {
    return (
      <div
        className="gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:p-4 gba:text-sm gba:text-muted-foreground gba:text-center"
        data-testid={`${testIdPrefix}-empty`}
      >
        {t('connect-group-empty')}
      </div>
    )
  }

  return (
    <div className="gba:space-y-2" data-testid={`${testIdPrefix}-list`}>
      {connections.map(connection => {
        const connectionId = getConnectionId(connection)
        const resolvedProviderId = getConnectionProviderId(connection) || inferProviderIdFromConnection(connection)
        const provider = providerById[resolvedProviderId]
        const healthState = connectionId ? healthResults[connectionId] : undefined

        return (
          <div
            key={connectionId}
            className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-3"
            data-testid={`${testIdPrefix}-item-${connectionId}`}
          >
            <div className="gba:flex gba:items-center gba:gap-3">
              <ConnectorLogo providerId={resolvedProviderId} size="sm" />
              <div className="gba:min-w-0 gba:flex-1">
                <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
                  <span className="gba:text-sm gba:font-medium gba:text-card-foreground">{connection.name}</span>
                  {connection.internal ? <Badge variant="secondary">{t('connect-badge-internal')}</Badge> : null}
                  {connection.managed ? <Badge variant="secondary">{t('connect-badge-managed')}</Badge> : null}
                  <Badge variant={connection.active !== false ? 'success' : 'destructive'}>
                    {connection.active !== false ? t('connect-status-active') : t('connect-status-inactive')}
                  </Badge>
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {provider
                    ? getProviderTitle(t, provider)
                    : connection.connectorName || connection.connector_name || t('connect-custom')}
                  {connection.description ? ` — ${connection.description}` : ''}
                </div>
                {getConnectionConsumerTypes(connection).length > 0 ? (
                  <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1">
                    {getConnectionConsumerTypes(connection).map(ct => {
                      const option = CONSUMER_TYPE_OPTIONS.find(o => o.value === ct)
                      return (
                        <span
                          key={ct}
                          className="gba:inline-block gba:rounded gba:bg-muted gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:leading-tight gba:text-muted-foreground"
                        >
                          {option ? t(option.labelKey) : ct}
                        </span>
                      )
                    })}
                  </div>
                ) : null}
              </div>
              <div className="gba:flex gba:shrink-0 gba:gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onTest(connection)}
                  disabled={testingConnectionId === connectionId}
                  data-testid={`${testIdPrefix}-test-${connectionId}`}
                >
                  {testingConnectionId === connectionId ? t('connect-test-running') : t('connect-test')}
                </Button>
                {!connection.internal ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(connection)}
                    data-testid={`${testIdPrefix}-edit-${connectionId}`}
                  >
                    {t('edit')}
                  </Button>
                ) : null}
                {!connection.internal ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(connection)}
                    data-testid={`${testIdPrefix}-delete-${connectionId}`}
                  >
                    {t('connect-delete')}
                  </Button>
                ) : null}
              </div>
            </div>
            {healthState ? (
              <div
                className={
                  healthState.success
                    ? 'gba:mt-2 gba:ml-12 gba:text-xs gba:text-success'
                    : 'gba:mt-2 gba:ml-12 gba:text-xs gba:text-destructive'
                }
                data-testid={`${testIdPrefix}-health-${connectionId}`}
              >
                {healthState.message}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
