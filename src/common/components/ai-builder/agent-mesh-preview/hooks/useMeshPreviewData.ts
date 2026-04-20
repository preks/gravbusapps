import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { getLayoutedPositions } from '@/common/utils/meshLayout'
import {
  mergeConnectionsToEdges,
  buildMeshNodesAndEdges,
  type MeshEdgeColors
} from '@/business-apps/platform/apps/agent-mesh/utils/meshGraphUtils'
import type { AgentRegistryEntry, Connection } from '@/business-apps/platform/apps/agent-mesh/types/agentMesh'

const DEFAULT_EDGE_COLORS: MeshEdgeColors = {
  active: '#22c55e',
  inactive: '#71717a',
  selected: '#3b82f6'
}

function stubAgent(id: string, name: string): AgentRegistryEntry {
  return {
    id,
    name,
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
}

export interface UseMeshPreviewDataResult {
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: unknown
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    [key: string]: unknown
  }>
  agents: AgentRegistryEntry[]
  loading: boolean
  error: string | null
  /** Refetch registry, connections, and layout (e.g. after creating a connection). */
  loadData: () => Promise<void>
}

export function useMeshPreviewData(accessToken: string, agentIds: string[]): UseMeshPreviewDataResult {
  const promptManagerClient = usePromptManagerClient(accessToken)
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(!!agentIds.length)
  const [error, setError] = useState<string | null>(null)

  const [savedLayout, setSavedLayout] = useState<Array<{ agent_id: string; x: number; y: number }>>([])

  const loadData = useCallback(async () => {
    if (!agentIds.length) return
    setLoading(true)
    setError(null)
    try {
      const [registryRes, connectionsRes, layoutRes] = await Promise.allSettled([
        promptManagerClient.getAgentRegistry({}),
        promptManagerClient.getMeshConnections(),
        promptManagerClient.getMeshLayout()
      ])

      const registry = registryRes.status === 'fulfilled' ? registryRes.value : []
      const allConnections = connectionsRes.status === 'fulfilled' ? connectionsRes.value : []
      const layoutData = layoutRes.status === 'fulfilled' ? layoutRes.value : null
      setSavedLayout(layoutData?.positions ?? [])

      const idSet = new Set(agentIds)
      const filteredAgents = registry.filter((a: AgentRegistryEntry) => idSet.has(a.id))
      const filteredConnections = allConnections.filter(
        (c: Connection) => idSet.has(c.caller_id) && idSet.has(c.callee_id)
      )

      const byId = new Map<string, AgentRegistryEntry>(filteredAgents.map(a => [a.id, a]))
      const nameById = new Map<string, string>()
      filteredConnections.forEach((c: Connection) => {
        if (c.caller_id && c.caller_name) nameById.set(c.caller_id, c.caller_name)
        if (c.callee_id && c.callee_name) nameById.set(c.callee_id, c.callee_name)
      })

      const meshAgents: AgentRegistryEntry[] = agentIds.map(id => {
        const found = byId.get(id)
        if (found) return found
        return stubAgent(id, nameById.get(id) ?? id)
      })

      setAgents(meshAgents)
      setConnections(filteredConnections)
    } catch (err) {
      setError((err as Error)?.message ?? 'Failed to load mesh data')
    } finally {
      setLoading(false)
    }
  }, [promptManagerClient, agentIds.join(',')])

  useEffect(() => {
    if (!agentIds.length) {
      setAgents([])
      setConnections([])
      setSavedLayout([])
      setLoading(false)
      setError(null)
      return
    }
    loadData()
  }, [loadData, agentIds.length])

  const { nodes, edges } = useMemo(() => {
    if (agents.length === 0) return { nodes: [], edges: [] }

    const dagrePositions = getLayoutedPositions(agents, connections)
    const savedMap = new Map(savedLayout.map(p => [p.agent_id, { x: p.x, y: p.y }]))
    const positions: Record<string, { x: number; y: number }> = {}
    agents.forEach(a => {
      positions[a.id] = savedMap.get(a.id) ?? dagrePositions[a.id] ?? { x: 0, y: 0 }
    })

    const mergedEdges = mergeConnectionsToEdges(connections)
    const result = buildMeshNodesAndEdges(agents, mergedEdges, positions, DEFAULT_EDGE_COLORS, {})
    return { nodes: result.nodes, edges: result.edges }
  }, [agents, connections, savedLayout])

  return {
    nodes,
    edges,
    agents,
    loading,
    error,
    loadData
  }
}
