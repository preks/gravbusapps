import { useCallback, useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import {
  CONNECT_LANES,
  getConnectionId,
  inferProviderIdFromConnection
} from '@/business-apps/core/create/apps/newwork-connect/components/connectCatalog'

export interface ExternalConnection {
  connection_id: string
  name: string
  description?: string
  kind: 'mcp' | 'structured' | 'unstructured'
  lane: 'mcp_servers' | 'anypoint_connect' | 'data_bridge'
  providerIdForLogo: string
  active: boolean
}

export interface UseFabricConnectorsReturn {
  availableConnectors: ExternalConnection[]
  activeConnectors: ExternalConnection[]
  toggleConnector: (connectionId: string) => void
  isLoading: boolean
  error: Error | null
}

export const useFabricConnectors = (accessToken: string): UseFabricConnectorsReturn => {
  const client = usePromptManagerClient(accessToken)
  const [availableConnectors, setAvailableConnectors] = useState<ExternalConnection[]>([])
  const [activeConnectionIds, setActiveConnectionIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchConnectors = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)
    try {
      const result = await client.getExternalConnections({ limit: 100, returnTotalRecords: true })

      const connections = result?.data || []

      const userConfigurable = connections.filter(c => {
        const internal = c.internal === true || c.managed === true
        return !internal
      })

      const mapped: ExternalConnection[] = userConfigurable.map(c => ({
        connection_id: getConnectionId(c),
        name: c.name,
        description: c.description,
        kind: c.kind,
        lane: c.lane,
        providerIdForLogo: inferProviderIdFromConnection(c),
        active: c.active ?? true
      }))

      const sorted = [...mapped]
      sorted.sort((a, b) => {
        const laneIndexA = CONNECT_LANES.indexOf(a.lane)
        const laneIndexB = CONNECT_LANES.indexOf(b.lane)
        const laneA = laneIndexA >= 0 ? laneIndexA : 99
        const laneB = laneIndexB >= 0 ? laneIndexB : 99
        if (laneA !== laneB) return laneA - laneB
        return a.name.localeCompare(b.name)
      })

      setAvailableConnectors(sorted)
    } catch (err) {
      console.error('Failed to fetch external connections:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client])

  useEffect(() => {
    fetchConnectors().catch(() => undefined)
  }, [fetchConnectors])

  const toggleConnector = useCallback((connectionId: string) => {
    setActiveConnectionIds(prev => {
      const next = new Set(prev)
      if (next.has(connectionId)) {
        next.delete(connectionId)
      } else {
        next.add(connectionId)
      }
      return next
    })
  }, [])

  const activeConnectors = availableConnectors.filter(c => activeConnectionIds.has(c.connection_id))

  return {
    availableConnectors,
    activeConnectors,
    toggleConnector,
    isLoading,
    error
  }
}
