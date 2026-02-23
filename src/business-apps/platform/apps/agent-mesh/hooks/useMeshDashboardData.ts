import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNodesState, useEdgesState, MarkerType } from '@xyflow/react'
import dagre from 'dagre'
import type {
  AgentRegistryEntry,
  Connection,
  ExecutionListItem,
  ExecutionAnalytics,
  ActiveAlert
} from '../types/agentMesh'
import { useAgentMeshClient } from './useAgentMeshClient'
import type { MeshEdgeColors } from './useMeshEdgeColors'

const NODE_WIDTH = 220
const NODE_HEIGHT = 100

function getLayoutedPositions(
  agents: AgentRegistryEntry[],
  connections: Connection[]
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 160 })
  g.setDefaultEdgeLabel(() => ({}))

  agents.forEach(a => g.setNode(a.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  connections.forEach(c => g.setEdge(c.caller_id, c.callee_id))
  dagre.layout(g)

  const positions: Record<string, { x: number; y: number }> = {}
  agents.forEach(a => {
    const node = g.node(a.id)
    if (node) {
      positions[a.id] = { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 }
    }
  })
  return positions
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

export function useMeshDashboardData(
  accessToken: string,
  edgeColors: MeshEdgeColors,
  selectedEdgeId: string | null,
  editMode: boolean
) {
  const api = useAgentMeshClient(accessToken)
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [executions, setExecutions] = useState<ExecutionListItem[]>([])
  const [analytics, setAnalytics] = useState<ExecutionAnalytics | null>(null)
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const savedPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        api.getAgentRegistry({ agentType: 'everyai' }),
        api.getConnections(),
        api.getExecutions({ limit: 50 }),
        api.getExecutionAnalytics({ days: 1 }),
        api.getActiveAlerts(),
        api.getMeshLayout()
      ])

      const getValue = <T>(r: PromiseSettledResult<T>, fallback: T, label: string): T => {
        if (r.status === 'fulfilled') return r.value
        console.error(`Failed to load ${label}:`, r.reason)
        return fallback
      }

      setAgents(getValue(results[0], [], 'agents'))
      setConnections(getValue(results[1], [], 'connections'))
      setExecutions(getValue(results[2], [], 'executions'))
      setAnalytics(getValue(results[3], null, 'analytics'))
      setAlerts(getValue(results[4], [], 'alerts'))

      const layoutData = getValue(results[5], { positions: [] }, 'layout')
      const posMap: Record<string, { x: number; y: number }> = {}
      if (layoutData?.positions) {
        for (const p of layoutData.positions) {
          posMap[p.agent_id] = { x: p.x, y: p.y }
        }
      }
      savedPositionsRef.current = posMap
    } catch (err) {
      console.error('Failed to load mesh data:', err)
    }
  }, [api])

  useEffect(() => {
    loadData()
  }, [loadData])

  const meshAgents = useMemo(() => {
    const meshIds = new Set<string>()
    connections.forEach(c => {
      meshIds.add(c.caller_id)
      meshIds.add(c.callee_id)
    })
    Object.keys(savedPositionsRef.current).forEach(id => meshIds.add(id))
    const byId = new Map(agents.map(a => [a.id, a]))
    const nameById = new Map<string, string>()
    connections.forEach(c => {
      if (c.caller_id && c.caller_name) nameById.set(c.caller_id, c.caller_name)
      if (c.callee_id && c.callee_name) nameById.set(c.callee_id, c.callee_name)
    })

    return Array.from(meshIds).map(id => {
      const found = byId.get(id)
      if (found) return found
      return {
        id,
        name: nameById.get(id) ?? id,
        description: '',
        agent_type: null,
        specialty: null,
        avatar: null,
        color: null,
        is_public: null,
        tags: [],
        agent_card: null,
        tools_count: 0,
        knowledge_sources_count: 0,
        outgoing_connections: [],
        incoming_connections: [],
        created_at: null
      }
    })
  }, [agents, connections])

  const mergedEdges: MergedEdge[] = useMemo(() => {
    const pairMap = new Map<string, Connection[]>()
    connections.forEach(c => {
      const ids = [c.caller_id, c.callee_id].sort()
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
  }, [connections])

  const handleRemoveFromMesh = useCallback(
    async (agentId: string) => {
      const agentConns = connections.filter(c => c.caller_id === agentId || c.callee_id === agentId)
      await Promise.allSettled(agentConns.map(c => api.deleteConnection(c.connection_id)))
      const remaining = Object.entries(savedPositionsRef.current)
        .filter(([id]) => id !== agentId)
        .map(([id, pos]) => ({ agent_id: id, x: pos.x, y: pos.y }))
      await api.saveMeshLayout(remaining).catch(() => {})
      await loadData()
    },
    [connections, api, loadData]
  )

  // Build React Flow nodes + edges from data
  useEffect(() => {
    const dagrePositions = getLayoutedPositions(meshAgents, connections)
    const saved = savedPositionsRef.current
    const hasSavedPositions = Object.keys(saved).length > 0

    setNodes(
      meshAgents.map(agent => ({
        id: agent.id,
        type: 'agentNode',
        position: hasSavedPositions && saved[agent.id] ? saved[agent.id] : dagrePositions[agent.id] || { x: 0, y: 0 },
        data: {
          agent,
          status: 'online' as const,
          activeQueries: 0,
          onRemove: editMode ? handleRemoveFromMesh : undefined
        }
      }))
    )

    setEdges(
      mergedEdges.map(me => {
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
          ...(me.isBidirectional
            ? { markerStart: { type: MarkerType.ArrowClosed, color, width: 20, height: 20 } }
            : {}),
          style: {
            stroke: color,
            strokeWidth: isSelected ? 3 : 2,
            strokeLinecap: 'round' as const
          }
        }
      })
    )
  }, [
    meshAgents,
    connections,
    mergedEdges,
    setNodes,
    setEdges,
    selectedEdgeId,
    editMode,
    handleRemoveFromMesh,
    edgeColors
  ])

  const handleNodesChange: typeof onNodesChange = useCallback(
    changes => {
      onNodesChange(changes)
      const hasDrag = changes.some((c: { type: string }) => c.type === 'position')
      if (!hasDrag) return

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        const current = nodes
        if (current.length === 0) return
        const positions = current.map(n => ({
          agent_id: n.id,
          x: n.position.x,
          y: n.position.y
        }))
        savedPositionsRef.current = Object.fromEntries(positions.map(p => [p.agent_id, { x: p.x, y: p.y }]))
        api.saveMeshLayout(positions).catch(() => {})
      }, 1500)
    },
    [onNodesChange, nodes, api]
  )

  const handleAutoLayout = useCallback(() => {
    const dagrePositions = getLayoutedPositions(meshAgents, connections)
    setNodes(prev => prev.map(n => ({ ...n, position: dagrePositions[n.id] || n.position })))
    const positions = Object.entries(dagrePositions).map(([id, pos]) => ({
      agent_id: id,
      ...pos
    }))
    savedPositionsRef.current = dagrePositions
    api.saveMeshLayout(positions).catch(() => {})
  }, [meshAgents, connections, setNodes, api])

  return {
    agents,
    connections,
    executions,
    analytics,
    alerts,
    nodes,
    edges,
    onEdgesChange,
    handleNodesChange,
    handleAutoLayout,
    meshAgents,
    mergedEdges,
    loadData
  }
}
