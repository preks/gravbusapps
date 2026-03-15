import React, { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner
} from '@newwork/nw-design-system'
import { ArrowRight, Cable, CheckCircle2, DatabaseZap, FolderOpen, Plug } from 'lucide-react'
import type {
  ConnectorProviderODM,
  ExternalConnectionLane
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { ConnectorLogo } from '@/business-apps/core/create/apps/newwork-connect/components/ConnectorLogo'
import type { ConnectorSummary } from '../../types'

const connectorNameToProviderId: Record<string, string> = {
  'nw-connector-sap': 'anypoint-connect.sap',
  'nw-connector-salesforce': 'anypoint-connect.salesforce',
  'nw-connector-postgresql': 'anypoint-connect.postgresql',
  'nw-connector-mysql': 'anypoint-connect.mysql',
  'nw-connector-oracle': 'anypoint-connect.oracle',
  'nw-connector-mongodb': 'anypoint-connect.mongodb',
  'nw-connector-snowflake': 'anypoint-connect.snowflake',
  'nw-connector-hubspot': 'anypoint-connect.hubspot',
  'nw-connector-dynamics365': 'anypoint-connect.dynamics365',
  'nw-connector-servicenow': 'anypoint-connect.servicenow'
}

const connectorDisplayName: Record<string, string> = {
  'nw-connector-sap': 'SAP S/4HANA',
  'nw-connector-salesforce': 'Salesforce',
  'nw-connector-postgresql': 'PostgreSQL',
  'nw-connector-mysql': 'MySQL',
  'nw-connector-oracle': 'Oracle',
  'nw-connector-mongodb': 'MongoDB',
  'nw-connector-snowflake': 'Snowflake',
  'nw-connector-hubspot': 'HubSpot',
  'nw-connector-dynamics365': 'Dynamics 365',
  'nw-connector-servicenow': 'ServiceNow'
}

export interface SharedConnectionOption {
  id: string
  name: string
}

export interface ConnectorSelectorProps {
  connectors: ConnectorSummary[]
  providers?: ConnectorProviderODM[]
  selectedId: string | null
  onSelect: (connector: ConnectorSummary) => void
  connectionOptions?: SharedConnectionOption[]
  selectedConnectionId?: string | null
  onConnectionChange?: (connectionId: string | null) => void
  isLoadingConnections?: boolean
  connectionError?: string | null
  onNext: () => void
  isLoading: boolean
  error?: string | null
  'data-testid'?: string
}

const LANES: ExternalConnectionLane[] = ['anypoint_connect', 'data_bridge', 'mcp_servers']

const LANE_META: Record<
  ExternalConnectionLane,
  { title: string; description: string; Icon: React.FC<{ className?: string }> }
> = {
  anypoint_connect: { title: 'AnyPoint Connect', description: 'Structured data', Icon: DatabaseZap },
  data_bridge: { title: 'DataBridge', description: 'Unstructured sources', Icon: FolderOpen },
  mcp_servers: { title: 'MCP', description: 'Tool endpoints', Icon: Cable }
}

export const ConnectorSelector: React.FC<ConnectorSelectorProps> = ({
  connectors,
  providers = [],
  selectedId,
  onSelect,
  connectionOptions = [],
  selectedConnectionId = null,
  onConnectionChange,
  isLoadingConnections = false,
  connectionError = null,
  onNext,
  isLoading,
  error,
  'data-testid': testId = 'connector-selector'
}) => {
  const [activeLane, setActiveLane] = useState<ExternalConnectionLane | null>(null)

  const { providersByLane, providerConnectorIds } = useMemo(() => {
    const grouped: Record<ExternalConnectionLane, ConnectorProviderODM[]> = {
      anypoint_connect: [],
      data_bridge: [],
      mcp_servers: []
    }
    const ids = new Set<string>()
    const connectorIds = new Set(connectors.map(c => c.id))

    providers.forEach(p => {
      const cid = p.connectorId || p.connector_id
      if (cid && connectorIds.has(cid) && p.lane && grouped[p.lane]) {
        grouped[p.lane].push(p)
        ids.add(cid)
      }
    })
    return { providersByLane: grouped, providerConnectorIds: ids }
  }, [connectors, providers])

  const customConnectors = useMemo(
    () => connectors.filter(c => !providerConnectorIds.has(c.id)),
    [connectors, providerConnectorIds]
  )

  const handleProviderSelect = (provider: ConnectorProviderODM) => {
    const cid = provider.connectorId || provider.connector_id
    const match = connectors.find(c => c.id === cid)
    if (match) onSelect(match)
  }

  const activeProviders = activeLane ? providersByLane[activeLane] : []
  const visibleLanes = LANES.filter(lane => providersByLane[lane].length > 0)

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={testId}>
        <Spinner size="md" />
        <span className="gba:ml-2 gba:text-sm gba:text-muted-foreground">Loading connectors...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:py-8 gba:text-center" data-testid={testId}>
        <p className="gba:text-sm gba:text-destructive">{error}</p>
      </div>
    )
  }

  if (!connectors.length && !providers.length) {
    return (
      <div className="gba:py-8 gba:text-center gba:space-y-2" data-testid={testId}>
        <Plug className="gba:w-8 gba:h-8 gba:mx-auto gba:text-muted-foreground" />
        <p className="gba:text-sm gba:text-muted-foreground">
          No data sources connected yet. Go to NEWWORK CONNECT to set up a connection (SAP, Salesforce, PostgreSQL,
          etc.) and enable &quot;Board Import&quot;.
        </p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Lane category cards — only show lanes that have providers for this consumer */}
      {visibleLanes.length > 0 && (
      <div className={`gba:grid gba:gap-2 ${visibleLanes.length === 1 ? 'gba:grid-cols-1' : visibleLanes.length === 2 ? 'gba:grid-cols-2' : 'gba:grid-cols-3'}`}>
        {visibleLanes.map(lane => {
          const { title, description, Icon } = LANE_META[lane]
          const count = providersByLane[lane].length
          const isActive = activeLane === lane
          return (
            <Card
              key={lane}
              className={`gba:cursor-pointer gba:transition-colors ${isActive ? 'gba:border-primary gba:bg-accent' : ''}`}
              onClick={() => setActiveLane(isActive ? null : lane)}
              data-testid={`${testId}-lane-${lane}`}
            >
              <CardHeader className="gba:p-3 gba:pb-1">
                <Icon className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:mb-1" />
                <CardTitle className="gba:text-xs">{title}</CardTitle>
                <CardDescription className="gba:text-[10px]">{description}</CardDescription>
              </CardHeader>
              <CardContent className="gba:px-3 gba:pb-3 gba:pt-0">
                {count > 0 && (
                  <Badge variant="secondary" className="gba:text-[10px]">
                    {count}
                  </Badge>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      )}

      {/* Preconfigured providers for selected lane */}
      {activeLane && activeProviders.length > 0 && (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs gba:text-muted-foreground">Preconfigured</Label>
          <div className="gba:space-y-1">
            {activeProviders.map(p => {
              const pid = p.providerId || p.provider_id
              const cid = p.connectorId || p.connector_id
              const isSelected = selectedId === cid
              return (
                <button
                  key={pid}
                  type="button"
                  className={`gba:relative gba:w-full gba:text-left gba:rounded-xl gba:border gba:p-4 gba:transition-all ${
                    isSelected
                      ? 'gba:border-primary gba:bg-accent gba:ring-1 gba:ring-primary'
                      : 'gba:border-border gba:hover:border-primary/40 gba:hover:bg-accent/50'
                  }`}
                  onClick={() => handleProviderSelect(p)}
                  data-testid={`${testId}-provider-${pid}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <ConnectorLogo providerId={pid} size="sm" />
                    <div className="gba:min-w-0 gba:flex-1">
                      <div className="gba:text-sm gba:font-semibold gba:truncate">{p.name}</div>
                      {p.description && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{p.description}</div>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-primary gba:shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Custom connectors */}
      {customConnectors.length > 0 && (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs gba:text-muted-foreground">{activeLane ? 'Custom' : 'Connectors'}</Label>
          <div className="gba:space-y-1">
            {customConnectors.map(c => {
              const isSelected = selectedId === c.id
              const providerId = connectorNameToProviderId[c.name] || connectorNameToProviderId[c.id] || c.name
              const displayName = connectorDisplayName[c.name] || connectorDisplayName[c.id] || c.name
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`gba:relative gba:w-full gba:text-left gba:rounded-xl gba:border gba:p-4 gba:transition-all ${
                    isSelected
                      ? 'gba:border-primary gba:bg-accent gba:ring-1 gba:ring-primary'
                      : 'gba:border-border gba:hover:border-primary/40 gba:hover:bg-accent/50'
                  }`}
                  onClick={() => onSelect(c)}
                  data-testid={`${testId}-option-${c.id}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <ConnectorLogo providerId={providerId} size="sm" />
                    <div className="gba:min-w-0 gba:flex-1">
                      <div className="gba:text-sm gba:font-semibold gba:truncate">{displayName}</div>
                      {c.description && (
                        <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{c.description}</div>
                      )}
                    </div>
                    {isSelected && <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-primary gba:shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Shared connection picker — hidden for MCP connectors (connection IS the source) */}
      {selectedId && onConnectionChange && (isLoadingConnections || connectionOptions.length > 0) ? (
        <div className="gba:space-y-2">
          <Label className="gba:text-xs">Shared connection</Label>
          <Select
            value={selectedConnectionId || '__none__'}
            onValueChange={value => onConnectionChange(value === '__none__' ? null : value)}
          >
            <SelectTrigger className="gba:h-9" data-testid={`${testId}-shared-connection`}>
              <SelectValue
                placeholder={isLoadingConnections ? 'Loading shared connections...' : 'Use connector defaults'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Use connector defaults</SelectItem>
              {connectionOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {connectionError ? (
            <div className="gba:text-xs gba:text-destructive" data-testid={`${testId}-shared-connection-error`}>
              {connectionError}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="gba:flex gba:justify-end gba:pt-2">
        <Button size="sm" onClick={onNext} disabled={!selectedId} data-testid={`${testId}-next`}>
          Configure <ArrowRight className="gba:w-3 gba:h-3 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
