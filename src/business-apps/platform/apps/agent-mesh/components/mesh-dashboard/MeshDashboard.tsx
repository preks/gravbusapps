import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection as RFConnection
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './mesh-edges.css'
import dagre from 'dagre'
import { Button } from '@newwork/nw-design-system'
import { Edit, Eye, Plus, LayoutGrid, Trash2 } from 'lucide-react'
import { AgentNode } from './AgentNode'
import { MeshSidebar } from './MeshSidebar'
import type {
  AgentRegistryEntry,
  Connection,
  ExecutionListItem,
  ExecutionAnalytics,
  ActiveAlert,
  MeshView
} from '../../types/agentMesh'
import { useAgentMeshClient } from '../../hooks/useAgentMeshClient'

const nodeTypes = { agentNode: AgentNode }

interface MeshDashboardProps {
  accessToken: string
  onNavigate: (view: MeshView, params?: Record<string, string>) => void
}

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

export const MeshDashboard: React.FC<MeshDashboardProps> = ({ accessToken, onNavigate }) => {
  const api = useAgentMeshClient(accessToken)
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [executions, setExecutions] = useState<ExecutionListItem[]>([])
  const [analytics, setAnalytics] = useState<ExecutionAnalytics | null>(null)
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [editMode, setEditMode] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const savedPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [connectSource, setConnectSource] = useState<string | null>(null)

  // Resolve design-system token colours from the DOM so we can use them as
  // literal stroke values on SVG edges.  This avoids any dependency on CSS
  // class resolution, CSS-variable names, or `currentColor` inheritance inside
  // the ReactFlow SVG tree – which differs between local and deployed bundles.
  const [edgeColors, setEdgeColors] = useState({ active: '#22c55e', inactive: '#71717a' })
  useLayoutEffect(() => {
    const probe = document.createElement('div')
    probe.style.position = 'absolute'
    probe.style.width = '0'
    probe.style.height = '0'
    probe.style.overflow = 'hidden'
    document.body.appendChild(probe)

    probe.className = 'gba:text-success'
    const active = getComputedStyle(probe).color
    probe.className = 'gba:text-muted-foreground'
    const inactive = getComputedStyle(probe).color

    document.body.removeChild(probe)
    setEdgeColors({
      active: active || '#22c55e',
      inactive: inactive || '#71717a'
    })
  }, [])

  const loadData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        // In some environments the registry list is scoped; explicitly request mesh agents.
        api.getAgentRegistry({ agentType: 'everyai' }),
        api.getConnections(),
        api.getExecutions({ limit: 50 }),
        api.getExecutionAnalytics({ days: 1 }),
        api.getActiveAlerts(),
        api.getMeshLayout()
      ])

      const getValue = <T,>(r: PromiseSettledResult<T>, fallback: T, label: string): T => {
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

  // Mesh agents = agents with connections OR saved in the layout
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

    // Important: ReactFlow won't render an edge unless both source+target nodes exist.
    // If the registry response is scoped/missing some IDs, create placeholders so edges still render.
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

  // Remove an agent from the mesh (delete connections + remove from layout)
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

  // Build React Flow nodes from agents with dagre layout or saved positions
  useEffect(() => {
    const dagrePositions = getLayoutedPositions(meshAgents, connections)
    const saved = savedPositionsRef.current
    const hasSavedPositions = Object.keys(saved).length > 0

    const newNodes = meshAgents.map(agent => ({
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
    setNodes(newNodes)

    const newEdges = connections.map(c => {
      const isActive = c.status === 'active'
      const isBidi = c.config.direction === 'bidirectional'
      return {
        id: c.connection_id,
        source: c.caller_id,
        target: c.callee_id,
        type: 'smoothstep',
        animated: isBidi,
        selected: c.connection_id === selectedEdgeId,
        style: {
          stroke: isActive ? edgeColors.active : edgeColors.inactive,
          strokeWidth: 2,
          strokeLinecap: 'round' as const
        }
      }
    })
    setEdges(newEdges)
  }, [meshAgents, connections, setNodes, setEdges, selectedEdgeId, editMode, handleRemoveFromMesh, edgeColors])

  // Debounce-save positions when nodes move
  const handleNodesChange: typeof onNodesChange = useCallback(
    changes => {
      onNodesChange(changes)
      const hasDrag = changes.some((c: { type: string }) => c.type === 'position')
      if (!hasDrag) return

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        const current = nodes
        if (current.length === 0) return
        const positions = current.map(n => ({ agent_id: n.id, x: n.position.x, y: n.position.y }))
        savedPositionsRef.current = Object.fromEntries(positions.map(p => [p.agent_id, { x: p.x, y: p.y }]))
        api.saveMeshLayout(positions).catch(() => {})
      }, 1500)
    },
    [onNodesChange, nodes, api]
  )

  const handleAutoLayout = useCallback(() => {
    const dagrePositions = getLayoutedPositions(meshAgents, connections)
    setNodes(prev =>
      prev.map(n => ({
        ...n,
        position: dagrePositions[n.id] || n.position
      }))
    )
    const positions = Object.entries(dagrePositions).map(([id, pos]) => ({ agent_id: id, ...pos }))
    savedPositionsRef.current = dagrePositions
    api.saveMeshLayout(positions).catch(() => {})
  }, [meshAgents, connections, setNodes, api])

  // Connection creation via drag-to-handle
  const onConnect = useCallback(
    async (params: RFConnection) => {
      if (!params.source || !params.target || params.source === params.target) return
      const sourceAgent = agents.find(a => a.id === params.source)
      const targetAgent = agents.find(a => a.id === params.target)
      if (!sourceAgent || !targetAgent) return
      const alreadyExists = connections.some(c => c.caller_id === sourceAgent.id && c.callee_id === targetAgent.id)
      if (alreadyExists) return

      try {
        await api.createConnection({
          caller_id: sourceAgent.id,
          caller_name: sourceAgent.name,
          callee_id: targetAgent.id,
          callee_name: targetAgent.name
        })
        loadData()
      } catch (err) {
        console.error('Failed to create connection:', err)
      }
    },
    [agents, connections, api, loadData]
  )

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: { id: string }) => {
      if (editMode) {
        setSelectedEdgeId(prev => (prev === edge.id ? null : edge.id))
      }
    },
    [editMode]
  )

  const handleDeleteConnection = useCallback(async () => {
    if (!selectedEdgeId) return
    try {
      await api.deleteConnection(selectedEdgeId)
      setSelectedEdgeId(null)
      loadData()
    } catch (err) {
      console.error('Failed to delete connection:', err)
    }
  }, [selectedEdgeId, api, loadData])

  const handleNodeClick = useCallback(
    async (_: React.MouseEvent, node: { id: string }) => {
      setSelectedEdgeId(null)
      if (!editMode) return

      if (!connectSource) {
        setConnectSource(node.id)
        return
      }

      if (connectSource === node.id) {
        setConnectSource(null)
        return
      }

      const sourceAgent = agents.find(a => a.id === connectSource)
      const targetAgent = agents.find(a => a.id === node.id)
      if (!sourceAgent || !targetAgent) {
        setConnectSource(null)
        return
      }

      const alreadyExists = connections.some(c => c.caller_id === sourceAgent.id && c.callee_id === targetAgent.id)
      if (!alreadyExists) {
        try {
          await api.createConnection({
            caller_id: sourceAgent.id,
            caller_name: sourceAgent.name,
            callee_id: targetAgent.id,
            callee_name: targetAgent.name
          })
          loadData()
        } catch (err) {
          console.error('Failed to create connection:', err)
        }
      }
      setConnectSource(null)
    },
    [editMode, connectSource, agents, connections, api, loadData]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="mesh-dashboard">
      <div className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-3">
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Agent Mesh</h2>
          {editMode && !connectSource && !selectedEdgeId && (
            <span className="gba:text-xs gba:text-muted-foreground gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
              Click an agent to connect, drag between handles, or click a line to select it
            </span>
          )}
          {editMode && connectSource && (
            <span className="gba:text-xs gba:text-primary gba:bg-primary/10 gba:px-2 gba:py-1 gba:rounded">
              Now click the target agent to connect from &quot;{agents.find(a => a.id === connectSource)?.name}&quot;
              <button
                className="gba:ml-2 gba:text-muted-foreground gba:hover:text-foreground"
                onClick={() => setConnectSource(null)}
              >
                ×
              </button>
            </span>
          )}
          {editMode && selectedEdgeId && (
            <span className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-destructive gba:bg-destructive/10 gba:px-2 gba:py-1 gba:rounded">
              Connection selected
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConnection}
                data-testid="mesh-delete-connection"
              >
                <Trash2 className="gba:w-3 gba:h-3 gba:mr-1" /> Remove
              </Button>
              <button
                className="gba:ml-1 gba:text-muted-foreground gba:hover:text-foreground"
                onClick={() => setSelectedEdgeId(null)}
              >
                ×
              </button>
            </span>
          )}
        </div>
        <div className="gba:flex gba:gap-2">
          <Button variant="outline" size="sm" onClick={handleAutoLayout} data-testid="mesh-auto-layout">
            <LayoutGrid className="gba:w-4 gba:h-4 gba:mr-1" /> Auto Layout
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)} data-testid="mesh-edit-toggle">
            {editMode ? <Eye className="gba:w-4 gba:h-4 gba:mr-1" /> : <Edit className="gba:w-4 gba:h-4 gba:mr-1" />}
            {editMode ? 'View Mode' : 'Edit Mode'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('registry')} data-testid="mesh-add-agent">
            <Plus className="gba:w-4 gba:h-4 gba:mr-1" /> Agent
          </Button>
        </div>
      </div>

      <div className="gba:flex gba:flex-1 gba:overflow-hidden">
        <div className="gba:flex-1 gba:relative gba:min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={() => {
              setSelectedEdgeId(null)
              setConnectSource(null)
            }}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            connectOnClick={false}
            onlyRenderVisibleElements={false}
            className="gba:w-full gba:h-full"
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
          {/* Connection legend */}
          <div
            className="gba:absolute gba:bottom-2 gba:left-2 gba:bg-card/90 gba:border gba:border-border gba:rounded gba:px-3 gba:py-2 gba:text-[10px] gba:text-muted-foreground gba:space-y-1 gba:z-10"
            data-testid="mesh-legend"
          >
            <div className="gba:flex gba:items-center gba:gap-2">
              <svg width="24" height="6">
                <line x1="0" y1="3" x2="24" y2="3" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>One-way</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <svg width="24" height="6">
                <line x1="0" y1="3" x2="24" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4,3" />
              </svg>
              <span>Bidirectional</span>
            </div>
          </div>
        </div>
        <div className="gba:w-72 gba:border-l gba:border-border gba:overflow-y-auto">
          <MeshSidebar
            agents={meshAgents}
            alerts={alerts}
            analytics={analytics}
            executions={executions}
            connections={connections}
            onNavigate={v => onNavigate(v as MeshView)}
          />
        </div>
      </div>
    </div>
  )
}
