import { useMemo } from 'react'
import { ReactFlow, MarkerType, type Edge, type Node } from '@xyflow/react'
import dagre from 'dagre'
import type { DelegationNode } from '../../../types/delegation'
import { AgentDelegationNode, type AgentDelegationNodeData } from './AgentDelegationNode'
import '@xyflow/react/dist/style.css'

const NODE_WIDTH = 160
const NODE_HEIGHT = 80
const NODE_SEP = 24
const RANK_SEP = 40

const NODE_TYPES = { agentDelegation: AgentDelegationNode }

interface LayoutResult {
  nodes: Node<AgentDelegationNodeData>[]
  edges: Edge[]
  graphHeight: number
}

function computeLayout(root: DelegationNode): LayoutResult {
  const hasGrandchildren = root.children.some(c => c.children.length > 0)
  const showRoot = hasGrandchildren || root.children.length === 0

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: NODE_SEP, ranksep: RANK_SEP })
  g.setDefaultEdgeLabel(() => ({}))

  const allNodes: DelegationNode[] = []
  function collect(node: DelegationNode, includeNode: boolean) {
    if (includeNode) allNodes.push(node)
    node.children.forEach(child => collect(child, true))
  }
  collect(root, showRoot)

  allNodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))

  if (showRoot) {
    root.children.forEach(child => g.setEdge(root.id, child.id))
  }
  allNodes.forEach(n => {
    if (n.id === root.id) return
    n.children.forEach(child => g.setEdge(n.id, child.id))
  })

  dagre.layout(g)

  const graphMeta = g.graph()
  const graphHeight = (graphMeta.height ?? 200) + 40

  const nodeIdSet = new Set(allNodes.map(n => n.id))

  const nodes: Node<AgentDelegationNodeData>[] = allNodes.map(n => {
    const pos = g.node(n.id)
    return {
      id: n.id,
      type: 'agentDelegation',
      position: { x: (pos?.x ?? 0) - NODE_WIDTH / 2, y: (pos?.y ?? 0) - NODE_HEIGHT / 2 },
      data: {
        name: n.name,
        task: n.task,
        status: n.status,
        kind: n.kind,
        durationMs: n.durationMs,
        toolCount: n.toolsUsed.length
      },
      draggable: false,
      connectable: false,
      selectable: false
    }
  })

  const edges: Edge[] = []
  function addEdges(parent: DelegationNode) {
    if (!nodeIdSet.has(parent.id)) {
      parent.children.forEach(addEdges)
      return
    }
    parent.children.forEach(child => {
      if (!nodeIdSet.has(child.id)) return
      const isRunning = child.status === 'running'
      edges.push({
        id: `${parent.id}->${child.id}`,
        source: parent.id,
        target: child.id,
        type: 'smoothstep',
        animated: isRunning,
        markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: 'var(--border)' },
        style: {
          stroke: isRunning ? 'var(--primary)' : 'var(--border)',
          strokeWidth: isRunning ? 2 : 1.5
        }
      })
      addEdges(child)
    })
  }
  addEdges(root)

  return { nodes, edges, graphHeight }
}

interface DelegationTreeViewProps {
  root: DelegationNode
}

export const DelegationTreeView: React.FC<DelegationTreeViewProps> = ({ root }) => {
  const { nodes, edges, graphHeight } = useMemo(() => computeLayout(root), [root])

  const canvasHeight = Math.max(120, Math.min(graphHeight, 400))

  return (
    <div
      className="gba:w-full gba:overflow-hidden gba:rounded-md gba:border gba:border-border/40 gba:bg-muted/20"
      style={{ height: canvasHeight }}
      data-testid="delegation-tree-view"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        minZoom={0.4}
        maxZoom={1.5}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  )
}
