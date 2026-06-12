import { useCallback, useEffect, useRef, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import {
  CONNECT_LANES,
  getConnectionId,
  inferProviderIdFromConnection
} from '@/business-apps/core/create/apps/newwork-connect/components/connectCatalog'
import { isFlowBotFabricRuntime } from '../utils/fabricRuntime'
import { resolveConnectorScope, type ConnectorScope } from '../components/connectors/connectorPickerUtils'

export interface ExternalConnection {
  connection_id: string
  name: string
  description?: string
  kind: 'mcp' | 'structured' | 'unstructured'
  lane: 'mcp_servers' | 'anypoint_connect' | 'data_bridge'
  providerIdForLogo: string
  active: boolean
  scope: ConnectorScope
  managed?: boolean
  internal?: boolean
}

export interface UseFabricConnectorsReturn {
  availableConnectors: ExternalConnection[]
  activeConnectors: ExternalConnection[]
  activeConnectionIds: Set<string>
  toggleConnector: (connectionId: string) => void
  /** Seed the active set from an external list (e.g. loaded session state).
   * Only applies if the current active set is empty to avoid overriding user choices. */
  hydrateActiveIds: (ids: string[]) => void
  isLoading: boolean
  error: Error | null
}

export const useFabricConnectors = (accessToken: string): UseFabricConnectorsReturn => {
  const client = usePromptManagerClient(accessToken)
  const flowBotRuntime = isFlowBotFabricRuntime()
  const [availableConnectors, setAvailableConnectors] = useState<ExternalConnection[]>([])
  const [activeConnectionIds, setActiveConnectionIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const hasHydratedActiveIdsRef = useRef(false)

  const fetchConnectors = useCallback(async () => {
    if (flowBotRuntime) {
      setAvailableConnectors([])
      setError(null)
      setIsLoading(false)
      return
    }
    if (!accessToken) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getExternalConnections({ limit: 100, returnTotalRecords: true })

      const connections = result?.data || []

      const visible = connections.filter(c => c.active !== false)

      const mapped: ExternalConnection[] = visible.map(c => {
        const scope = resolveConnectorScope(c)
        return {
          connection_id: getConnectionId(c),
          name: c.name,
          description: c.description,
          kind: c.kind,
          lane: c.lane,
          providerIdForLogo: inferProviderIdFromConnection(c),
          active: c.active ?? true,
          scope,
          managed: c.managed === true,
          internal: c.internal === true
        }
      })

      const sorted = [...mapped]
      sorted.sort((a, b) => {
        const laneIndexA = CONNECT_LANES.indexOf(a.lane)
        const laneIndexB = CONNECT_LANES.indexOf(b.lane)
        const laneA = laneIndexA >= 0 ? laneIndexA : 99
        const laneB = laneIndexB >= 0 ? laneIndexB : 99
        if (laneA !== laneB) return laneA - laneB
        if (a.scope !== b.scope) {
          return a.scope === 'custom' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })

      setAvailableConnectors(sorted)
    } catch (err) {
      console.error('Failed to fetch external connections:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client, flowBotRuntime])

  useEffect(() => {
    fetchConnectors().catch(() => undefined)
  }, [fetchConnectors])

  useEffect(() => {
    const platformIds = availableConnectors.filter(c => c.scope === 'platform').map(c => c.connection_id)
    if (platformIds.length === 0) return

    setActiveConnectionIds(prev => {
      const next = new Set(prev)
      let changed = false
      for (const id of platformIds) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [availableConnectors])

  const toggleConnector = useCallback(
    (connectionId: string) => {
      const connector = availableConnectors.find(c => c.connection_id === connectionId)
      if (connector?.scope === 'platform') return

      setActiveConnectionIds(prev => {
        const next = new Set(prev)
        if (next.has(connectionId)) {
          next.delete(connectionId)
        } else {
          next.add(connectionId)
        }
        return next
      })
    },
    [availableConnectors]
  )

  const hydrateActiveIds = useCallback((ids: string[]) => {
    if (ids.length === 0 || hasHydratedActiveIdsRef.current) return
    hasHydratedActiveIdsRef.current = true

    setActiveConnectionIds(prev => {
      const next = new Set(prev)
      let changed = false
      for (const id of ids) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  const activeConnectors = availableConnectors.filter(c => activeConnectionIds.has(c.connection_id))

  return {
    availableConnectors,
    activeConnectors,
    activeConnectionIds,
    toggleConnector,
    hydrateActiveIds,
    isLoading,
    error
  }
}
