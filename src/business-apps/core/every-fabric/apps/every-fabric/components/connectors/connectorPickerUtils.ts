import { CONNECT_LANES } from '@/business-apps/core/create/apps/newwork-connect/components/connectCatalog'
import type { ExternalConnection } from '../../hooks/useFabricConnectors'

export type ConnectorScope = 'platform' | 'custom'

export interface ConnectorLaneGroup {
  custom: ExternalConnection[]
  platform: ExternalConnection[]
}

export function resolveConnectorScope(connection: {
  internal?: boolean | null
  managed?: boolean | null
}): ConnectorScope {
  if (connection.internal === true || connection.managed === true) {
    return 'platform'
  }
  return 'custom'
}

export function groupConnectorsByLaneAndScope(connectors: ExternalConnection[]): Record<string, ConnectorLaneGroup> {
  const byLane: Record<string, ConnectorLaneGroup> = {}

  for (const conn of connectors) {
    const lane = conn.lane || 'mcp_servers'
    if (!byLane[lane]) {
      byLane[lane] = { custom: [], platform: [] }
    }
    if (conn.scope === 'platform') {
      byLane[lane].platform.push(conn)
    } else {
      byLane[lane].custom.push(conn)
    }
  }

  return byLane
}

export function getSortedLanesWithConnectors(grouped: Record<string, ConnectorLaneGroup>): string[] {
  return CONNECT_LANES.filter(lane => {
    const group = grouped[lane]
    return group && (group.custom.length > 0 || group.platform.length > 0)
  })
}

export function getPlatformBadgeKey(
  conn: ExternalConnection
): 'connect-badge-internal' | 'connect-badge-managed' | null {
  if (conn.scope !== 'platform') return null
  if (conn.internal) return 'connect-badge-internal'
  if (conn.managed) return 'connect-badge-managed'
  return 'connect-badge-managed'
}
