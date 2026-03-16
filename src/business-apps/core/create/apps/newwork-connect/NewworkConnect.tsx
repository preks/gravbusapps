import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type {
  ConnectorProviderInstantiationDetails,
  ConnectorProviderODM,
  ExternalConnectionDetails,
  ExternalConnectionHealthResponse,
  ExternalConnectionLane,
  ExternalConnectionODM
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { PremiumHeroShell } from '@/common/components/premium-hero/PremiumHeroShell'
import { ConnectedInstancesList } from './components/ConnectedInstancesList'
import { ConnectionSetupDialog } from './components/ConnectionSetupDialog'
import { ConnectorLogo, LaneLogo } from './components/ConnectorLogo'
import { ProviderPickerDialog } from './components/ProviderPickerDialog'
import {
  CONNECT_LANES,
  LANE_CONFIG,
  getConnectionId,
  getConnectionProviderId,
  getProviderId,
  getProviderDescription,
  getProviderTitle,
  inferProviderIdFromConnection
} from './components/connectCatalog'
import translations from './_i18n'

type EditorState =
  | { mode: 'create'; provider: ConnectorProviderODM }
  | { mode: 'edit'; connection: ExternalConnectionODM }
  | null
type HealthState = Pick<ExternalConnectionHealthResponse, 'success' | 'message'>

export const NewworkConnect: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const clientRef = useRef(client)
  clientRef.current = client
  const [providers, setProviders] = useState<ConnectorProviderODM[]>([])
  const [connections, setConnections] = useState<ExternalConnectionODM[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [providerPickerLane, setProviderPickerLane] = useState<ExternalConnectionLane | null>(null)
  const [editorState, setEditorState] = useState<EditorState>(null)
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null)
  const [healthResults, setHealthResults] = useState<Record<string, HealthState>>({})
  const [activeTab, setActiveTab] = useState<ExternalConnectionLane>('anypoint_connect')

  const loadProviders = useCallback(async () => {
    try {
      const result = await clientRef.current.getConnectorProviders({ limit: 100, offset: 0, returnTotalRecords: true })
      setProviders(result.data || [])
    } catch {
      setProviders([])
    }
  }, [])

  const loadConnections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await clientRef.current.getExternalConnections({ limit: 100, offset: 0, returnTotalRecords: true })
      setConnections(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('connect-load-failed'))
      setConnections([])
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void Promise.allSettled([loadProviders(), loadConnections()])
  }, [loadConnections, loadProviders])

  const providerById = useMemo(
    () =>
      providers.reduce<Record<string, ConnectorProviderODM>>((acc, provider) => {
        const pid = getProviderId(provider)
        if (pid) acc[pid] = provider
        return acc
      }, {}),
    [providers]
  )

  const resolvedEditorProvider = useMemo(() => {
    if (!editorState) return null
    if (editorState.mode === 'create') return editorState.provider
    const pid = getConnectionProviderId(editorState.connection) || inferProviderIdFromConnection(editorState.connection)
    return providerById[pid] || null
  }, [editorState, providerById])

  const handleSelectProvider = useCallback((provider: ConnectorProviderODM) => {
    setProviderPickerLane(null)
    setEditorState({ mode: 'create', provider })
  }, [])

  const handleEdit = useCallback((connection: ExternalConnectionODM) => {
    setEditorState({ mode: 'edit', connection })
  }, [])

  const handleDelete = useCallback(
    async (connection: ExternalConnectionODM) => {
      const connectionId = getConnectionId(connection)
      if (!connectionId) return
      await clientRef.current.deleteExternalConnection(connectionId)
      await loadConnections()
    },
    [loadConnections]
  )

  const handleTest = useCallback(
    async (connection: ExternalConnectionODM) => {
      const connectionId = getConnectionId(connection)
      if (!connectionId) return
      setTestingConnectionId(connectionId)
      try {
        const result = await clientRef.current.getExternalConnectionHealth(connectionId)
        setHealthResults(prev => ({ ...prev, [connectionId]: { success: result.success, message: result.message } }))
      } catch (err) {
        setHealthResults(prev => ({
          ...prev,
          [connectionId]: { success: false, message: err instanceof Error ? err.message : t('connect-test-failed') }
        }))
      } finally {
        setTestingConnectionId(null)
      }
    },
    [t]
  )

  const handleCreateConnection = useCallback(
    async (providerId: string, payload: ConnectorProviderInstantiationDetails) => {
      await clientRef.current.instantiateConnectorProvider(providerId, payload)
      setEditorState(null)
      await loadConnections()
    },
    [loadConnections]
  )

  const handleUpdateConnection = useCallback(
    async (connectionId: string, payload: ExternalConnectionDetails) => {
      await clientRef.current.putExternalConnection(connectionId, payload)
      setEditorState(null)
      await loadConnections()
    },
    [loadConnections]
  )

  const connectionsByLane = useMemo(
    () =>
      CONNECT_LANES.reduce<Record<ExternalConnectionLane, ExternalConnectionODM[]>>(
        (acc, lane) => {
          acc[lane] = connections.filter(c => c.lane === lane)
          return acc
        },
        { anypoint_connect: [], data_bridge: [], mcp_servers: [] }
      ),
    [connections]
  )

  const providersByLane = useMemo(
    () =>
      CONNECT_LANES.reduce<Record<ExternalConnectionLane, ConnectorProviderODM[]>>(
        (acc, lane) => {
          acc[lane] = providers.filter(p => p.lane === lane)
          return acc
        },
        { anypoint_connect: [], data_bridge: [], mcp_servers: [] }
      ),
    [providers]
  )

  return (
    <div className="gba:h-full gba:w-full gba:overflow-auto gba:bg-background" data-testid="newwork-connect-app">
      {/* ── Premium Hero with 3 lane cards ── */}
      <PremiumHeroShell height="auto" data-testid="newwork-connect-hero">
        <div className="gba:max-w-7xl gba:mx-auto gba:px-8 gba:pt-10 gba:pb-8">
          <span className="gba:block gba:text-xs gba:font-medium gba:text-inverse/60 gba:uppercase gba:tracking-wider gba:mb-2">
            NEWWORK
          </span>
          <h1
            className="gba:font-funnel-display gba:text-3xl gba:sm:text-4xl gba:font-light gba:text-inverse gba:tracking-tight"
            data-testid="newwork-connect-hero-title"
          >
            {t('connect-page-title')}
          </h1>
          <p className="gba:text-sm gba:text-inverse/60 gba:mt-1 gba:mb-8">{t('connect-page-description')}</p>

          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-5">
            {CONNECT_LANES.map(lane => {
              const config = LANE_CONFIG[lane]
              const laneConnections = connectionsByLane[lane]
              const activeCount = laneConnections.filter(c => c.active !== false).length

              return (
                <Card
                  key={lane}
                  variant="surface"
                  className="gba:backdrop-blur-xl gba:border-inverse/10"
                  data-testid={`newwork-connect-hero-card-${lane}`}
                >
                  <CardHeader className="gba:pb-3">
                    <div className="gba:flex gba:items-center gba:gap-4">
                      <LaneLogo lane={lane} />
                      <div className="gba:min-w-0 gba:flex-1">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <CardTitle className="gba:font-funnel-display gba:text-lg gba:font-light gba:tracking-tight">
                            {t(config.titleKey)}
                          </CardTitle>
                          <span
                            className="gba:inline-flex gba:items-center gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-semibold gba:bg-desk-badge-golden gba:text-desk-badge-golden-foreground"
                            data-testid={`newwork-connect-hero-count-${lane}`}
                          >
                            {activeCount} {t('connect-active-suffix')}
                          </span>
                        </div>
                        <CardDescription className="gba:text-xs">{t(config.descriptionKey)}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="gba:pt-0">
                    {laneConnections.length > 0 ? (
                      <div className="gba:space-y-1.5">
                        {laneConnections.map(conn => {
                          const connId = getConnectionId(conn)
                          const pid = getConnectionProviderId(conn) || inferProviderIdFromConnection(conn)
                          return (
                            <div
                              key={connId}
                              className="gba:flex gba:items-center gba:gap-2.5 gba:py-1.5"
                              data-testid={`newwork-connect-hero-instance-${connId}`}
                            >
                              <ConnectorLogo providerId={pid} size="sm" />
                              <div className="gba:min-w-0 gba:flex-1">
                                <span className="gba:text-sm gba:font-medium gba:text-card-foreground gba:truncate gba:block">
                                  {conn.name}
                                </span>
                              </div>
                              <span
                                className={`gba:inline-block gba:h-2 gba:w-2 gba:rounded-full gba:shrink-0 ${
                                  conn.active !== false ? 'gba:bg-success' : 'gba:bg-destructive'
                                }`}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="gba:text-xs gba:text-muted-foreground gba:italic">{t('connect-group-empty')}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </PremiumHeroShell>

      {/* ── Available connectors (tabbed) ── */}
      <div>
        <div className="gba:max-w-7xl gba:mx-auto gba:px-8 gba:py-6">
          {error ? (
            <div className="gba:text-destructive gba:mb-4" data-testid="newwork-connect-error">
              {error}
            </div>
          ) : null}

          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ExternalConnectionLane)}>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-5">
              <TabsList data-testid="newwork-connect-tabs">
                {CONNECT_LANES.map(lane => (
                  <TabsTrigger key={lane} value={lane} data-testid={`newwork-connect-tab-${lane}`}>
                    {t(LANE_CONFIG[lane].titleKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {CONNECT_LANES.map(lane => (
              <TabsContent key={lane} value={lane}>
                <div className="gba:space-y-6">
                  {/* Connected instances for this lane */}
                  {connectionsByLane[lane].length > 0 ? (
                    <div data-testid={`newwork-connect-instances-${lane}`}>
                      <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-3">
                        {t('connect-connected-title')}
                      </h3>
                      <ConnectedInstancesList
                        connections={connectionsByLane[lane]}
                        providerById={providerById}
                        testingConnectionId={testingConnectionId}
                        healthResults={healthResults}
                        onEdit={handleEdit}
                        onDelete={c => void handleDelete(c)}
                        onTest={c => void handleTest(c)}
                        t={t}
                        testIdPrefix={`newwork-connect-group-${lane}`}
                      />
                    </div>
                  ) : null}

                  {/* Provider catalog grid */}
                  <div>
                    <h3 className="gba:text-sm gba:font-semibold gba:text-foreground gba:mb-3">
                      {t('connect-available-title')}
                    </h3>
                    <div
                      className="gba:grid gba:grid-cols-2 gba:sm:grid-cols-3 gba:md:grid-cols-4 gba:lg:grid-cols-5 gba:gap-3"
                      data-testid={`newwork-connect-catalog-${lane}`}
                    >
                      {providersByLane[lane].map(provider => {
                        const pid = getProviderId(provider)
                        return (
                          <button
                            key={pid}
                            type="button"
                            className="gba:flex gba:flex-col gba:items-center gba:gap-2.5 gba:rounded-xl gba:border gba:border-border gba:bg-card gba:p-4 gba:text-center gba:transition-colors gba:hover:bg-accent gba:hover:border-accent"
                            onClick={() => handleSelectProvider(provider)}
                            data-testid={`newwork-connect-provider-select-${pid}`}
                          >
                            <ConnectorLogo providerId={pid} size="lg" />
                            <div className="gba:min-w-0 gba:w-full">
                              <div className="gba:text-sm gba:font-medium gba:text-card-foreground gba:truncate">
                                {getProviderTitle(t, provider)}
                              </div>
                              <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:mt-0.5">
                                {getProviderDescription(t, provider)}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="gba:text-sm gba:text-muted-foreground" data-testid="newwork-connect-loading">
                      {t('loading')}
                    </div>
                  ) : null}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      <ProviderPickerDialog
        open={!!providerPickerLane}
        lane={providerPickerLane}
        providers={providers}
        onClose={() => setProviderPickerLane(null)}
        onSelectProvider={handleSelectProvider}
        t={t}
      />

      <ConnectionSetupDialog
        editorState={editorState}
        provider={resolvedEditorProvider}
        onClose={() => setEditorState(null)}
        onCreate={handleCreateConnection}
        onUpdate={handleUpdateConnection}
        t={t}
      />
    </div>
  )
}

export default NewworkConnect
