import React, { useMemo } from 'react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@newwork/nw-design-system'
import type {
  ConnectorProviderODM,
  ExternalConnectionLane
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { getProviderDescription, getProviderId, getProviderTitle, laneOrder } from './connectionsCatalog'

interface ConnectionsCatalogSectionProps {
  providers: ConnectorProviderODM[]
  onConnect: (provider: ConnectorProviderODM) => void
  t: (key: string, args?: Record<string, unknown>) => string
}

const laneTitleKeys: Record<ExternalConnectionLane, string> = {
  mcp_servers: 'connections-lane-mcp',
  data_bridge: 'connections-lane-data-bridge',
  anypoint_connect: 'connections-lane-anypoint'
}

const laneDescriptionKeys: Record<ExternalConnectionLane, string> = {
  mcp_servers: 'connections-catalog-lane-mcp-description',
  data_bridge: 'connections-catalog-lane-data-bridge-description',
  anypoint_connect: 'connections-catalog-lane-anypoint-description'
}

export const ConnectionsCatalogSection: React.FC<ConnectionsCatalogSectionProps> = ({ providers, onConnect, t }) => {
  const groupedProviders = useMemo(() => {
    return laneOrder.map(lane => ({
      lane,
      items: providers.filter(provider => provider.lane === lane)
    }))
  }, [providers])

  return (
    <div className="gba:space-y-4" data-testid="prompt-manager-connections-provider-section">
      <div className="gba:space-y-1">
        <div className="gba:text-lg gba:font-semibold">{t('connections-catalog-title')}</div>
        <div className="gba:text-sm gba:text-muted-foreground">{t('connections-catalog-description')}</div>
      </div>

      {groupedProviders.map(group => (
        <div
          key={group.lane}
          className="gba:space-y-3"
          data-testid={`prompt-manager-connections-provider-lane-${group.lane}`}
        >
          <div className="gba:flex gba:flex-col gba:gap-1">
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:text-sm gba:font-semibold">{t(laneTitleKeys[group.lane])}</div>
              <Badge variant="secondary">{group.items.length}</Badge>
            </div>
            <div className="gba:text-sm gba:text-muted-foreground">{t(laneDescriptionKeys[group.lane])}</div>
          </div>

          <div className="gba:grid gba:gap-3 gba:md:grid-cols-2 gba:xl:grid-cols-3">
            {group.items.map(provider => {
              const providerId = getProviderId(provider)
              return (
                <Card
                  key={providerId}
                  className="gba:h-full"
                  data-testid={`prompt-manager-connections-provider-card-${providerId}`}
                >
                  <CardHeader className="gba:space-y-2">
                    <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                      <CardTitle className="gba:text-base">{getProviderTitle(t, provider)}</CardTitle>
                      <Badge variant="secondary">
                        {provider.kind === 'mcp'
                          ? t('connections-kind-mcp')
                          : provider.kind === 'structured'
                            ? t('connections-kind-structured')
                            : t('connections-kind-unstructured')}
                      </Badge>
                    </div>
                    <CardDescription>{getProviderDescription(t, provider)}</CardDescription>
                  </CardHeader>
                  <CardContent className="gba:flex gba:h-full gba:flex-col gba:justify-end gba:gap-4">
                    <div>
                      <Button
                        variant="default"
                        onClick={() => onConnect(provider)}
                        data-testid={`prompt-manager-connections-provider-connect-${providerId}`}
                      >
                        {t('connections-connect')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
