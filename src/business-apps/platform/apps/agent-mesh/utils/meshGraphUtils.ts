import { MarkerType } from '@xyflow/react'
import type { AgentRegistryEntry, Connection } from '../types/agentMesh'

export interface MeshEdgeColors {
  active: string
  inactive: string
  selected: string
}

export interface MergedEdge {
  edgeId: string
  source: string
  target: string
  sourceName: string
  targetName: string
  isBidirectional: boolean
  connectionIds: string[]
  isActive: boolean
}

export function mergeConnectionsToEdges(connections: Connection[]): MergedEdge[] {
  const pairMap = new Map<string, Connection[]>()
  connections.forEach(c => {
    const ids = [c.caller_id, c.callee_id].sort((a, b) => a.localeCompare(b))
    const pairKey = `${ids[0]}__${ids[1]}`
    const existing = pairMap.get(pairKey) || []
    existing.push(c)
    pairMap.set(pairKey, existing)
  })

  const result: MergedEdge[] = []
  pairMap.forEach(conns => {
    if (conns.length >= 2) {
      const first = conns[0]
      result.push({
        edgeId: first.connection_id,
        source: first.caller_id,
        target: first.callee_id,
        sourceName: first.caller_name,
        targetName: first.callee_name,
        isBidirectional: true,
        connectionIds: conns.map(c => c.connection_id),
        isActive: conns.some(c => c.status === 'active')
      })
    } else {
      const c = conns[0]
      result.push({
        edgeId: c.connection_id,
        source: c.caller_id,
        target: c.callee_id,
        sourceName: c.caller_name,
        targetName: c.callee_name,
        isBidirectional: c.config.direction === 'bidirectional',
        connectionIds: [c.connection_id],
        isActive: c.status === 'active'
      })
    }
  })
  return result
}

export interface BuildMeshNodesAndEdgesOptions {
  selectedEdgeId?: string | null
  onRemove?: (agentId: string) => Promise<void>
}

export function buildMeshNodesAndEdges(
  meshAgents: AgentRegistryEntry[],
  mergedEdges: MergedEdge[],
  positions: Record<string, { x: number; y: number }>,
  edgeColors: MeshEdgeColors,
  options: BuildMeshNodesAndEdgesOptions = {}
): {
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: {
      agent: AgentRegistryEntry
      status: 'online'
      activeQueries: number
      onRemove?: (agentId: string) => Promise<void>
    }
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    type: string
    selected: boolean
    markerEnd: { type: MarkerType; color: string; width: number; height: number }
    markerStart?: { type: MarkerType; color: string; width: number; height: number }
    style: { stroke: string; strokeWidth: number; strokeLinecap: 'round' }
  }>
} {
  const { selectedEdgeId = null, onRemove } = options

  const nodes = meshAgents.map(agent => ({
    id: agent.id,
    type: 'agentNode' as const,
    position: positions[agent.id] || { x: 0, y: 0 },
    data: {
      agent,
      status: 'online' as const,
      activeQueries: 0,
      onRemove
    }
  }))

  const edges = mergedEdges.map(me => {
    const isSelected = me.edgeId === selectedEdgeId
    const baseColor = me.isActive ? edgeColors.active : edgeColors.inactive
    const color = isSelected ? edgeColors.selected : baseColor
    return {
      id: me.edgeId,
      source: me.source,
      target: me.target,
      type: 'smoothstep',
      selected: isSelected,
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 20, height: 20 },
      ...(me.isBidirectional ? { markerStart: { type: MarkerType.ArrowClosed, color, width: 20, height: 20 } } : {}),
      style: {
        stroke: color,
        strokeWidth: isSelected ? 3 : 2,
        strokeLinecap: 'round' as const
      }
    }
  })

  return { nodes, edges }
}
