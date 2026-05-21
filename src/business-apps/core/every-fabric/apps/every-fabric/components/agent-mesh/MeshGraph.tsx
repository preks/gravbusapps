import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ReactFlow, type Edge, type Node, type ReactFlowInstance } from '@xyflow/react'
import type { TraceModel } from '../../utils/traceModel'
import { isKindVisible, type MeshLayerKey } from './meshLayers'
import { computeRadialLayout, KIND_CATEGORY, NODE_SIZE } from './meshLayout'
import { MeshFlowEdge, type MeshFlowEdgeData } from './MeshFlowEdge'
import { MeshNode, type MeshNodeData } from './MeshNode'
import '@xyflow/react/dist/style.css'

const NODE_TYPES = { meshNode: MeshNode }
const EDGE_TYPES = { meshEdge: MeshFlowEdge }

const FIT_VIEW_PADDING = 0.12
const FIT_VIEW_OPTIONS = { padding: FIT_VIEW_PADDING, duration: 280 } as const

interface MeshGraphProps {
  model: TraceModel
  /** Currently visible layers (kinds outside any layer are always visible). */
  activeLayers: ReadonlySet<MeshLayerKey>
  /** Replay clock position used to highlight active edges and dim upcoming nodes. */
  positionMs: number
  /** Total replay duration; when 0, all nodes/edges render fully (no dimming). */
  durationMs: number
  /** Currently selected node id (for popover + highlight). */
  selectedNodeId: string | null
  /** When false, the clickable bubbles on edges are hidden (lines stay visible). */
  showEdgeLabels?: boolean
  /** Node id currently being hovered — drives the skill highlight dim/glow effect. */
  hoveredNodeId: string | null
  onSelectNode: (nodeId: string | null) => void
  /** Open the message panel for a given edge id. */
  onSelectEdge: (edgeId: string) => void
  onHoverNode: (nodeId: string | null) => void
  /** Fired when clicking empty canvas space — use to dismiss panels. */
  onPaneClick?: () => void
}

interface LayoutResult {
  flowNodes: Node<MeshNodeData>[]
  flowEdges: Edge<MeshFlowEdgeData>[]
}

function buildLayout(props: MeshGraphProps): LayoutResult {
  const {
    model,
    activeLayers,
    positionMs,
    durationMs,
    selectedNodeId,
    showEdgeLabels = true,
    hoveredNodeId,
    onSelectNode,
    onSelectEdge,
    onHoverNode
  } = props

  const visibleNodes = model.nodes.filter(n => isKindVisible(n.kind, activeLayers))
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
  const visibleEdges = model.edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))

  const { byId: positions } = computeRadialLayout(visibleNodes, visibleEdges)
  const isLive = durationMs <= 0
  const baseTimeMs = model.startedAt ? Date.parse(model.startedAt) : 0
  const cutoffSeq = (() => {
    if (isLive) return Number.POSITIVE_INFINITY
    const target = baseTimeMs + positionMs
    let candidate = -1
    for (const frame of model.frames) {
      const ts = Date.parse(frame.timestamp)
      if (Number.isNaN(ts)) continue
      if (ts <= target) candidate = Math.max(candidate, frame.seq)
    }
    return candidate
  })()

  // Skill names per agent: collect from skill_load edges
  const skillNamesByAgent = new Map<string, string[]>()
  for (const edge of model.edges) {
    if (edge.kind !== 'skill_load') continue
    const existing = skillNamesByAgent.get(edge.source) ?? []
    if (edge.label && !existing.includes(edge.label)) existing.push(edge.label)
    skillNamesByAgent.set(edge.source, existing)
  }

  // Hover highlight: compute which node IDs should glow vs dim
  const highlightedNodeIds = new Set<string>()
  const highlightedEdgeIds = new Set<string>()
  if (hoveredNodeId) {
    highlightedNodeIds.add(hoveredNodeId)
    for (const edge of visibleEdges) {
      if (edge.source === hoveredNodeId || edge.target === hoveredNodeId) {
        highlightedNodeIds.add(edge.source)
        highlightedNodeIds.add(edge.target)
        highlightedEdgeIds.add(edge.id)
      }
    }
  }
  const isHoverActive = hoveredNodeId !== null

  const flowNodes: Node<MeshNodeData>[] = visibleNodes.map(node => {
    const size = NODE_SIZE[node.kind]
    const pos = positions.get(node.id) ?? { x: 0, y: 0 }
    const reactFlowPos = { x: pos.x, y: pos.y }
    const isUpcoming = !isLive && node.firstSeenSeq > cutoffSeq && node.kind !== 'orchestrator'
    const recentlyActive =
      !isLive &&
      node.firstSeenSeq <= cutoffSeq &&
      node.lastSeenSeq >= cutoffSeq &&
      node.lastSeenSeq - node.firstSeenSeq >= 0
    const isActive = isLive ? node.status === 'running' : recentlyActive
    const category =
      node.metadata?.category && typeof node.metadata.category === 'string'
        ? node.metadata.category.toUpperCase()
        : KIND_CATEGORY[node.kind]
    return {
      id: node.id,
      type: 'meshNode',
      position: reactFlowPos,
      data: {
        label: node.label,
        category,
        kind: node.kind,
        status: node.status,
        size,
        isSelected: selectedNodeId === node.id,
        isActive,
        isUpcoming,
        skillNames: skillNamesByAgent.get(node.id) ?? [],
        isDimmed: isHoverActive && !highlightedNodeIds.has(node.id),
        isHighlighted: isHoverActive && highlightedNodeIds.has(node.id) && node.id !== hoveredNodeId,
        onSelect: () => onSelectNode(selectedNodeId === node.id ? null : node.id),
        onHoverStart: () => onHoverNode(node.id),
        onHoverEnd: () => onHoverNode(null)
      },
      width: size,
      height: size,
      draggable: false,
      connectable: false
    }
  })

  const filteredEdges = visibleEdges
    .filter(edge => isLive || edge.seq <= cutoffSeq)
    .filter(edge => edge.kind !== 'completion')

  const pairCounts = new Map<string, number>()
  const pairIndexes = new Map<string, number>()
  for (const edge of filteredEdges) {
    const key = [edge.source, edge.target].sort((a, b) => a.localeCompare(b)).join('::')
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
  }

  const flowEdges: Edge<MeshFlowEdgeData>[] = filteredEdges.map(edge => {
    const pairKey = [edge.source, edge.target].sort((a, b) => a.localeCompare(b)).join('::')
    const bubbleTotal = pairCounts.get(pairKey) ?? 1
    const bubbleIndex = pairIndexes.get(pairKey) ?? 0
    pairIndexes.set(pairKey, bubbleIndex + 1)

    const isActive = !isLive && edge.seq === cutoffSeq
    const isFailed = edge.status === 'failed'
    const isResolved = !!edge.resolvedAt
    const hasDetail = !!edge.label && edge.label.trim().length > 0
    const sourcePos = positions.get(edge.source) ?? { x: 0, y: 0 }
    const targetPos = positions.get(edge.target) ?? { x: 0, y: 0 }
    const sourceNode = model.nodes.find(n => n.id === edge.source)
    const targetNode = model.nodes.find(n => n.id === edge.target)
    const sourceRadius = sourceNode ? NODE_SIZE[sourceNode.kind] / 2 : 32
    const targetRadius = targetNode ? NODE_SIZE[targetNode.kind] / 2 : 32
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'meshEdge',
      data: {
        kind: edge.kind,
        label: edge.label,
        isActive,
        isResolved,
        isFailed,
        hasDetail,
        sourceCenter: { x: sourcePos.x, y: sourcePos.y, radius: sourceRadius },
        targetCenter: { x: targetPos.x, y: targetPos.y, radius: targetRadius },
        bubbleIndex,
        bubbleTotal,
        showBubble: showEdgeLabels,
        isDimmed: isHoverActive && !highlightedEdgeIds.has(edge.id),
        onSelect: () => onSelectEdge(edge.id)
      },
      animated: false
    }
  })

  // Spread parallel edges (multiple calls between the same pair of nodes) so
  // their bubbles do not stack. The undirected key collapses A→B and B→A so
  // bubbles on the same geometric line are distributed together.
  const edgesByPair = new Map<string, Edge<MeshFlowEdgeData>[]>()
  for (const edge of flowEdges) {
    const key = [edge.source, edge.target].sort((a, b) => a.localeCompare(b)).join('::')
    const list = edgesByPair.get(key) ?? []
    list.push(edge)
    edgesByPair.set(key, list)
  }
  for (const group of edgesByPair.values()) {
    if (group.length <= 1) continue
    group.forEach((edge, i) => {
      if (!edge.data) return
      edge.data = {
        ...edge.data,
        bubbleIndex: i,
        bubbleTotal: group.length
      }
    })
  }

  return { flowNodes, flowEdges }
}

/** Stable identity arrays so `nodeOrigin` doesn't churn on every render. */
const NODE_ORIGIN: [number, number] = [0.5, 0.5]

export const MeshGraph: React.FC<MeshGraphProps> = props => {
  const { flowNodes, flowEdges } = useMemo(() => buildLayout(props), [props])

  const containerRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<ReactFlowInstance<MeshNodeData, MeshFlowEdgeData> | null>(null)

  const handleInit = useCallback((instance: ReactFlowInstance<MeshNodeData, MeshFlowEdgeData>) => {
    flowRef.current = instance
    // Initial fit happens via `fitView` prop; this ensures consistent options
    // (padding/duration) right after the first node positions are known.
    instance.fitView(FIT_VIEW_OPTIONS)
  }, [])

  // Re-fit whenever the graph's *shape* changes — number of nodes / edges, or
  // a different selection that re-renders the layout. Doing it on every layout
  // re-render keeps the visualisation centred as new agents come online.
  const fingerprint = `${flowNodes.length}:${flowEdges.length}`
  useEffect(() => {
    if (!flowRef.current) return
    flowRef.current.fitView(FIT_VIEW_OPTIONS)
  }, [fingerprint])

  // Re-fit on container resize (sidebar collapse, window resize, panel
  // resize…). React Flow handles its own resize internally for the viewport,
  // but does *not* re-call fitView, so the layout would otherwise drift to a
  // corner when the canvas grows or shrinks.
  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      flowRef.current?.fitView(FIT_VIEW_OPTIONS)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="gba:relative gba:h-full gba:w-full gba:rounded-[1.5rem] gba:border gba:border-border/60 gba:bg-gradient-to-br gba:from-background gba:to-muted/30 gba:overflow-hidden"
      data-testid="mesh-graph"
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodeOrigin={NODE_ORIGIN}
        nodesDraggable={false}
        nodesConnectable={false}
        selectNodesOnDrag={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        minZoom={0.3}
        maxZoom={1.8}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        proOptions={{ hideAttribution: true }}
        onInit={handleInit}
        onPaneClick={() => {
          props.onSelectNode(null)
          props.onPaneClick?.()
        }}
      />
    </div>
  )
}
