import { useState, useCallback, useEffect, useRef } from 'react'
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
import dagre from 'dagre'
import { Button } from '@newwork/nw-design-system'
import { Edit, Eye, Plus, LayoutGrid, Trash2 } from 'lucide-react'
import { AgentNode } from './AgentNode'
import { ConnectionEdge } from './ConnectionEdge'
import { MeshSidebar } from './MeshSidebar'
import { LiveCommunicationFeed } from './LiveCommunicationFeed'
import type {
  AgentRegistryEntry,
  Connection,
  ExecutionListItem,
  ExecutionAnalytics,
  ActiveAlert,
  MeshView
} from '../../types/agentMesh'
import { useAgentMeshClient } from '../../hooks/useAgentMeshClient'
import type { UserInfoProps } from '@/common/BusinessAppContext'
import { useUserAvatar } from '@/business-apps/platform/apps/nexus/hooks/useUserAvatar'

const nodeTypes = { agentNode: AgentNode }
const edgeTypes = { connectionEdge: ConnectionEdge }

interface MeshDashboardProps {
  accessToken: string
  userInfo?: UserInfoProps
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

export const MeshDashboard: React.FC<MeshDashboardProps> = ({ accessToken, userInfo, onNavigate }) => {
  const api = useAgentMeshClient(accessToken)
  const userAvatarUrl = useUserAvatar(userInfo?.employeeDetails?.employeeId, accessToken)
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [executions, setExecutions] = useState<ExecutionListItem[]>([])
  const [analytics, setAnalytics] = useState<ExecutionAnalytics | null>(null)
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [editMode, setEditMode] = useState(false)
  const [feedExpanded, setFeedExpanded] = useState(true)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const savedPositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [connectSource, setConnectSource] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [agentsData, connectionsData, executionsData, analyticsData, alertsData, layoutData] = await Promise.all([
        api.getAgentRegistry(),
        api.getConnections(),
        api.getExecutions({ limit: 50 }),
        api.getExecutionAnalytics({ days: 1 }),
        api.getActiveAlerts(),
        api.getMeshLayout()
      ])
      setAgents(agentsData)
      setConnections(connectionsData)
      setExecutions(executionsData)
      setAnalytics(analyticsData)
      setAlerts(alertsData)

      // Build saved positions map
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

  // Build React Flow nodes from agents with dagre layout or saved positions
  useEffect(() => {
    const dagrePositions = getLayoutedPositions(agents, connections)
    const saved = savedPositionsRef.current
    const hasSavedPositions = Object.keys(saved).length > 0

    const newNodes = agents.map(agent => ({
      id: agent.id,
      type: 'agentNode',
      position: hasSavedPositions && saved[agent.id] ? saved[agent.id] : dagrePositions[agent.id] || { x: 0, y: 0 },
      data: {
        agent,
        status: 'online' as const,
        activeQueries: 0
      }
    }))
    setNodes(newNodes)

    const newEdges = connections.map(c => ({
      id: c.connection_id,
      source: c.caller_id,
      target: c.callee_id,
      type: 'connectionEdge',
      animated: c.config.direction === 'bidirectional',
      selected: c.connection_id === selectedEdgeId,
      data: {
        status: c.status,
        callCount: c.stats?.total_calls || 0,
        isActive: c.status === 'active',
        direction: c.config.direction
      }
    }))
    setEdges(newEdges)
  }, [agents, connections, setNodes, setEdges, selectedEdgeId])

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
    const dagrePositions = getLayoutedPositions(agents, connections)
    setNodes(prev =>
      prev.map(n => ({
        ...n,
        position: dagrePositions[n.id] || n.position
      }))
    )
    const positions = Object.entries(dagrePositions).map(([id, pos]) => ({ agent_id: id, ...pos }))
    savedPositionsRef.current = dagrePositions
    api.saveMeshLayout(positions).catch(() => {})
  }, [agents, connections, setNodes, api])

  // Connection creation via drag-to-handle
  const onConnect = useCallback(
    async (params: RFConnection) => {
      if (!params.source || !params.target || params.source === params.target) return
      const sourceAgent = agents.find(a => a.id === params.source)
      const targetAgent = agents.find(a => a.id === params.target)
      if (!sourceAgent || !targetAgent) return

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
    [agents, api, loadData]
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
      setConnectSource(null)
    },
    [editMode, connectSource, agents, api, loadData]
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
        <div className="gba:flex-1 gba:relative">
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
            edgeTypes={edgeTypes}
            fitView
            connectOnClick={false}
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
            agents={agents}
            alerts={alerts}
            analytics={analytics}
            onNavigate={v => onNavigate(v as MeshView)}
          />
        </div>
      </div>

      {feedExpanded && (
        <div className="gba:border-t gba:border-border gba:h-48 gba:overflow-hidden">
          <LiveCommunicationFeed
            executions={executions}
            userInfo={userInfo}
            userAvatarUrl={userAvatarUrl}
            onTraceClick={cid => onNavigate('traces', { correlationId: cid })}
          />
        </div>
      )}

      <div className="gba:flex gba:justify-center gba:py-1 gba:border-t gba:border-border">
        <Button variant="ghost" size="sm" onClick={() => setFeedExpanded(!feedExpanded)} data-testid="mesh-feed-toggle">
          {feedExpanded ? 'Hide Feed' : 'Show Feed'}
        </Button>
      </div>
    </div>
  )
}
