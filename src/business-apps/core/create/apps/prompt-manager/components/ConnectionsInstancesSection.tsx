import React from 'react'
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import type {
  ConnectorProviderODM,
  ExternalConnectionHealthResponse,
  ExternalConnectionLane,
  ExternalConnectionODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import {
  getConnectionId,
  getConnectionProviderId,
  getProviderTitle,
  inferProviderIdFromConnection
} from './connectionsCatalog'

type HealthState = Pick<ExternalConnectionHealthResponse, 'success' | 'message'>

interface ConnectionsInstancesSectionProps {
  connections: ExternalConnectionODM[]
  providerById: Record<string, ConnectorProviderODM>
  isLoading: boolean
  error: string | null
  searchInput: string
  laneFilter: 'all' | ExternalConnectionLane
  onSearchInputChange: (value: string) => void
  onLaneFilterChange: (value: 'all' | ExternalConnectionLane) => void
  onReload: () => void
  onEdit: (connection: ExternalConnectionODM) => void
  onDelete: (connection: ExternalConnectionODM) => void
  onTest: (connection: ExternalConnectionODM) => void
  onCreateCustom: () => void
  testingConnectionId: string | null
  healthResults: Record<string, HealthState>
  t: (key: string, args?: Record<string, unknown>) => string
}

export const ConnectionsInstancesSection: React.FC<ConnectionsInstancesSectionProps> = props => {
  const {
    connections,
    providerById,
    isLoading,
    error,
    searchInput,
    laneFilter,
    onSearchInputChange,
    onLaneFilterChange,
    onReload,
    onEdit,
    onDelete,
    onTest,
    onCreateCustom,
    testingConnectionId,
    healthResults,
    t
  } = props

  const counts = connections.reduce(
    (acc, connection) => {
      acc.total += 1
      acc[connection.lane] += 1
      return acc
    },
    {
      total: 0,
      mcp_servers: 0,
      data_bridge: 0,
      anypoint_connect: 0
    }
  )

  return (
    <div className="gba:space-y-4" data-testid="prompt-manager-connections-instances-section">
      <div className="gba:space-y-1">
        <div className="gba:text-lg gba:font-semibold">{t('connections-instances-title')}</div>
        <div className="gba:text-sm gba:text-muted-foreground">{t('connections-instances-description')}</div>
      </div>

      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">
        <Input
          value={searchInput}
          onChange={e => onSearchInputChange(e.target.value)}
          placeholder={t('connections-search-placeholder')}
          data-testid="prompt-manager-connections-search"
        />
        <Select value={laneFilter} onValueChange={value => onLaneFilterChange(value as 'all' | ExternalConnectionLane)}>
          <SelectTrigger className="gba:w-[220px]" data-testid="prompt-manager-connections-lane-filter">
            <SelectValue placeholder={t('connections-lane-all')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('connections-lane-all')}</SelectItem>
            <SelectItem value="mcp_servers">{t('connections-lane-mcp')}</SelectItem>
            <SelectItem value="data_bridge">{t('connections-lane-data-bridge')}</SelectItem>
            <SelectItem value="anypoint_connect">{t('connections-lane-anypoint')}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" onClick={onReload} data-testid="prompt-manager-connections-reload">
          {t('refresh')}
        </Button>
        <Button variant="outline" onClick={onCreateCustom} data-testid="prompt-manager-connections-custom-add">
          {t('connections-add-custom')}
        </Button>
      </div>

      <div className="gba:flex gba:flex-wrap gba:gap-2 gba:text-sm gba:text-muted-foreground">
        <span>{t('connections-count-total', { count: counts.total })}</span>
        <span>{t('connections-count-mcp', { count: counts.mcp_servers })}</span>
        <span>{t('connections-count-data-bridge', { count: counts.data_bridge })}</span>
        <span>{t('connections-count-anypoint', { count: counts.anypoint_connect })}</span>
      </div>

      {error ? (
        <div className="gba:text-destructive" data-testid="prompt-manager-connections-error">
          {error}
        </div>
      ) : !isLoading && !connections.length ? (
        <div
          className="gba:rounded-xl gba:border gba:border-dashed gba:border-border gba:p-6 gba:text-center gba:space-y-3"
          data-testid="prompt-manager-connections-empty"
        >
          <div className="gba:text-sm gba:font-medium">{t('connections-empty-title')}</div>
          <div className="gba:text-sm gba:text-muted-foreground">{t('connections-empty-description')}</div>
          <div>
            <Button variant="default" onClick={onCreateCustom} data-testid="prompt-manager-connections-empty-add">
              {t('connections-add-custom')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="gba:overflow-x-auto">
          <Table data-testid="prompt-manager-connections-table">
            <TableHeader>
              <TableRow className="gba:border-b">
                <TableHead>{t('column-name')}</TableHead>
                <TableHead>{t('connections-column-provider')}</TableHead>
                <TableHead>{t('connections-column-status')}</TableHead>
                <TableHead className="gba:w-[240px]">{t('connections-column-actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="gba:py-6">
                    <div className="gba:flex gba:justify-center" data-testid="prompt-manager-connections-loading">
                      <Spinner />
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                connections.map(connection => {
                  const connectionId = getConnectionId(connection)
                  const resolvedProviderId =
                    getConnectionProviderId(connection) || inferProviderIdFromConnection(connection)
                  const provider = providerById[resolvedProviderId]
                  const healthState = connectionId ? healthResults[connectionId] : undefined

                  return (
                    <TableRow key={connectionId} data-testid={`prompt-manager-connections-row-${connectionId}`}>
                      <TableCell className="gba:py-3">
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <span className="gba:font-medium">{connection.name}</span>
                            {connection.internal ? (
                              <Badge variant="secondary">{t('connections-badge-internal')}</Badge>
                            ) : null}
                            {connection.managed ? (
                              <Badge variant="secondary">{t('connections-badge-managed')}</Badge>
                            ) : null}
                          </div>
                          {connection.description ? (
                            <span className="gba:text-xs gba:text-muted-foreground">{connection.description}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-3">
                        <div className="gba:flex gba:flex-wrap gba:gap-2">
                          <Badge variant="secondary">
                            {provider
                              ? getProviderTitle(t, provider)
                              : connection.connectorName ||
                                connection.connector_name ||
                                t('connections-connector-custom')}
                          </Badge>
                          <Badge variant="secondary">
                            {connection.lane === 'mcp_servers'
                              ? t('connections-lane-mcp')
                              : connection.lane === 'data_bridge'
                                ? t('connections-lane-data-bridge')
                                : t('connections-lane-anypoint')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="gba:py-3">
                        <Badge variant={connection.active !== false ? 'success' : 'destructive'}>
                          {connection.active !== false
                            ? t('connections-status-active')
                            : t('connections-status-inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="gba:py-3">
                        <div className="gba:flex gba:flex-wrap gba:gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onTest(connection)}
                            disabled={testingConnectionId === connectionId}
                            data-testid={`prompt-manager-connections-test-${connectionId}`}
                          >
                            {testingConnectionId === connectionId
                              ? t('connections-test-running')
                              : t('connections-test')}
                          </Button>
                          {!connection.internal ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onEdit(connection)}
                              data-testid={`prompt-manager-connections-edit-${connectionId}`}
                            >
                              {t('edit')}
                            </Button>
                          ) : null}
                          {!connection.internal ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDelete(connection)}
                              data-testid={`prompt-manager-connections-delete-${connectionId}`}
                            >
                              {t('connections-delete')}
                            </Button>
                          ) : null}
                        </div>
                        {healthState ? (
                          <div
                            className={
                              healthState.success
                                ? 'gba:mt-2 gba:text-xs gba:text-success'
                                : 'gba:mt-2 gba:text-xs gba:text-destructive'
                            }
                            data-testid={`prompt-manager-connections-health-${connectionId}`}
                          >
                            {healthState.message}
                          </div>
                        ) : null}
                        {connection.internal ? (
                          <div className="gba:mt-2 gba:text-xs gba:text-muted-foreground">
                            {t('connections-internal-readonly')}
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
