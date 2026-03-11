import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
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
import translations from '../_i18n'
import { ConnectionEditorDialog } from './ConnectionEditorDialog'
import { ConnectionsCatalogSection } from './ConnectionsCatalogSection'
import { ConnectionsInstancesSection } from './ConnectionsInstancesSection'
import {
  CUSTOM_MCP_PROVIDER_ID,
  CUSTOM_STRUCTURED_PROVIDER_ID,
  CUSTOM_UNSTRUCTURED_PROVIDER_ID,
  getConnectionId,
  getConnectionProviderId,
  getProviderId,
  inferProviderIdFromConnection
} from './connectionsCatalog'

type EditorState =
  | { mode: 'create'; provider: ConnectorProviderODM }
  | { mode: 'edit'; connection: ExternalConnectionODM }
  | null
type HealthState = Pick<ExternalConnectionHealthResponse, 'success' | 'message'>

export const ConnectionsSpace: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [laneFilter, setLaneFilter] = useState<'all' | ExternalConnectionLane>('all')
  const [providers, setProviders] = useState<ConnectorProviderODM[]>([])
  const [connections, setConnections] = useState<ExternalConnectionODM[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null)
  const [healthResults, setHealthResults] = useState<Record<string, HealthState>>({})
  const [editorState, setEditorState] = useState<EditorState>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const loadProviders = useCallback(async () => {
    try {
      const result = await client.getConnectorProviders({
        limit: 100,
        offset: 0,
        returnTotalRecords: true
      })
      setProviders(result.data || [])
    } catch {
      setProviders([])
    }
  }, [client])

  const loadConnections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getExternalConnections({
        search: search || null,
        lane: laneFilter === 'all' ? null : laneFilter,
        limit: 100,
        offset: 0,
        returnTotalRecords: true
      })
      setConnections(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('connections-load-failed'))
      setConnections([])
    } finally {
      setIsLoading(false)
    }
  }, [client, laneFilter, search, t])

  const loadData = useCallback(async () => {
    await Promise.allSettled([loadProviders(), loadConnections()])
  }, [loadConnections, loadProviders])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const providerById = useMemo(
    () =>
      providers.reduce<Record<string, ConnectorProviderODM>>((acc, provider) => {
        const providerId = getProviderId(provider)
        if (providerId) acc[providerId] = provider
        return acc
      }, {}),
    [providers]
  )

  const resolvedEditorProvider = useMemo(() => {
    if (!editorState) return null
    if (editorState.mode === 'create') return editorState.provider
    const providerId =
      getConnectionProviderId(editorState.connection) || inferProviderIdFromConnection(editorState.connection)
    return providerById[providerId] || null
  }, [editorState, providerById])

  const handleConnectProvider = useCallback((provider: ConnectorProviderODM) => {
    setEditorState({ mode: 'create', provider })
  }, [])

  const handleCreateCustom = useCallback(() => {
    const providerId =
      laneFilter === 'mcp_servers'
        ? CUSTOM_MCP_PROVIDER_ID
        : laneFilter === 'anypoint_connect'
          ? CUSTOM_UNSTRUCTURED_PROVIDER_ID
          : CUSTOM_STRUCTURED_PROVIDER_ID
    const provider = providerById[providerId]
    if (provider) {
      setEditorState({ mode: 'create', provider })
    }
  }, [laneFilter, providerById])

  const handleEdit = useCallback((connection: ExternalConnectionODM) => {
    setEditorState({ mode: 'edit', connection })
  }, [])

  const handleDelete = useCallback(
    async (connection: ExternalConnectionODM) => {
      const connectionId = getConnectionId(connection)
      if (!connectionId) return
      await client.deleteExternalConnection(connectionId)
      await loadConnections()
    },
    [client, loadConnections]
  )

  const handleTestConnection = useCallback(
    async (connection: ExternalConnectionODM) => {
      const connectionId = getConnectionId(connection)
      if (!connectionId) return
      setTestingConnectionId(connectionId)
      try {
        const result = await client.getExternalConnectionHealth(connectionId)
        setHealthResults(prev => ({
          ...prev,
          [connectionId]: { success: result.success, message: result.message }
        }))
      } catch (err) {
        setHealthResults(prev => ({
          ...prev,
          [connectionId]: {
            success: false,
            message: err instanceof Error ? err.message : t('connections-test-failed')
          }
        }))
      } finally {
        setTestingConnectionId(null)
      }
    },
    [client, t]
  )

  const handleCreateConnection = useCallback(
    async (providerId: string, payload: ConnectorProviderInstantiationDetails) => {
      await client.instantiateConnectorProvider(providerId, payload)
      setEditorState(null)
      await loadConnections()
    },
    [client, loadConnections]
  )

  const handleUpdateConnection = useCallback(
    async (connectionId: string, payload: ExternalConnectionDetails) => {
      await client.putExternalConnection(connectionId, payload)
      setEditorState(null)
      await loadConnections()
    },
    [client, loadConnections]
  )

  return (
    <Card data-testid="prompt-manager-connections-space">
      <CardHeader>
        <CardTitle>{t('connections-title')}</CardTitle>
        <CardDescription>{t('connections-description')}</CardDescription>
      </CardHeader>

      <CardContent className="gba:space-y-8">
        <ConnectionsCatalogSection providers={providers} onConnect={handleConnectProvider} t={t} />

        <ConnectionsInstancesSection
          connections={connections}
          providerById={providerById}
          isLoading={isLoading}
          error={error}
          searchInput={searchInput}
          laneFilter={laneFilter}
          onSearchInputChange={setSearchInput}
          onLaneFilterChange={setLaneFilter}
          onReload={() => void loadData()}
          onEdit={handleEdit}
          onDelete={connection => void handleDelete(connection)}
          onTest={connection => void handleTestConnection(connection)}
          onCreateCustom={handleCreateCustom}
          testingConnectionId={testingConnectionId}
          healthResults={healthResults}
          t={t}
        />
      </CardContent>

      <ConnectionEditorDialog
        editorState={editorState}
        provider={resolvedEditorProvider}
        onClose={() => setEditorState(null)}
        onCreate={handleCreateConnection}
        onUpdate={handleUpdateConnection}
        t={t}
      />
    </Card>
  )
}
