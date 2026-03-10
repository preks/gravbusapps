import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNodesState, useEdgesState, type Node, type Edge } from '@xyflow/react'
import { getLayoutedPositions } from '@/common/utils/meshLayout'
import type {
  AgentRegistryEntry,
  Connection,
  ExecutionListItem,
  ExecutionAnalytics,
  ActiveAlert
} from '../types/agentMesh'
import { useAgentMeshClient } from './useAgentMeshClient'
import type { MeshEdgeColors } from './useMeshEdgeColors'
import { mergeConnectionsToEdges, buildMeshNodesAndEdges } from '../utils/meshGraphUtils'
export type { MergedEdge } from '../utils/meshGraphUtils'

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
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
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

  const mergedEdges = useMemo(() => mergeConnectionsToEdges(connections), [connections])

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
    const positions: Record<string, { x: number; y: number }> = {}
    meshAgents.forEach(agent => {
      positions[agent.id] =
        hasSavedPositions && saved[agent.id] ? saved[agent.id] : dagrePositions[agent.id] || { x: 0, y: 0 }
    })

    const { nodes: nextNodes, edges: nextEdges } = buildMeshNodesAndEdges(
      meshAgents,
      mergedEdges,
      positions,
      edgeColors,
      { selectedEdgeId, onRemove: editMode ? handleRemoveFromMesh : undefined }
    )
    setNodes(nextNodes)
    setEdges(nextEdges)
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
