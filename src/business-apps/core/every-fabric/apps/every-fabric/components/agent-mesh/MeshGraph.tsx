import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ReactFlow, type Edge, type Node, type ReactFlowInstance } from '@xyflow/react'
import {
  ORCHESTRATOR_NODE_ID,
  type MeshEdge,
  type MeshNode as MeshNodeModel,
  type MeshNodeKind,
  type TraceModel
} from '../../utils/traceModel'
import { isKindVisible, type MeshLayerKey } from './meshLayers'
import { MeshFlowEdge, type MeshFlowEdgeData } from './MeshFlowEdge'
import { MeshNode, type MeshNodeData } from './MeshNode'
import '@xyflow/react/dist/style.css'

const NODE_TYPES = { meshNode: MeshNode }
const EDGE_TYPES = { meshEdge: MeshFlowEdge }

/** Diameter (px) of the circular badge per node kind. */
const NODE_SIZE: Record<MeshNodeKind, number> = {
  orchestrator: 88,
  subagent: 64,
  expert: 64,
  skill: 56,
  tool: 44
}

/** Pixel radius of the inner (agents) and outer (tools/skills) rings. */
const RING_INNER = 280
const RING_OUTER = 520
/** Extra radial offset applied per "depth bucket" inside a ring (subagents of subagents). */
const RING_INNER_DEPTH_STEP = 140
/**
 * When a tool/skill shares an angle with its parent agent, push it sideways
 * by this much so its label does not stack on top of the agent's label.
 */
const PERIPHERAL_ANGULAR_NUDGE = Math.PI / 12 // 15°

/**
 * fitView padding in **viewport units** (0..1). Each side eats this fraction
 * of the viewport, so the actual content area is `1 - 2 * padding`. We also
 * need slack for labels that render *outside* the node bounding boxes.
 */
const FIT_VIEW_PADDING = 0.12

/** Single source of truth for fitView so live + refit calls stay aligned. */
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
  onSelectNode: (nodeId: string | null) => void
  /** Open the message modal for a given edge id. */
  onSelectEdge: (edgeId: string) => void
}

interface RadialPositions {
  byId: Map<string, { x: number; y: number }>
}

const KIND_CATEGORY: Record<MeshNodeKind, string> = {
  orchestrator: 'ORCHESTRATOR',
  subagent: 'AGENT',
  expert: 'EXPERT',
  skill: 'SKILL',
  tool: 'TOOL'
}

const isAgentKind = (kind: MeshNodeKind): boolean => kind === 'subagent' || kind === 'expert'
const isPeripheralKind = (kind: MeshNodeKind): boolean => kind === 'tool' || kind === 'skill'

/**
 * Radial layout that always wraps the orchestrator in a full ring:
 *
 * - Orchestrator is pinned at (0, 0).
 * - Specialist agents (sub-agent + expert kinds) sit on the **inner** ring at
 *   `RING_INNER`, evenly distributed around the full circle, ordered by
 *   first-seen so the layout is stable across renders.
 * - Sub-agents that are children of *other* sub-agents (depth ≥ 2 in the
 *   delegation tree) get pushed slightly outward by `RING_INNER_DEPTH_STEP`
 *   while keeping the same angle as their parent — gives the "Pipeline →
 *   Data & BI" stacked look from the reference design.
 * - Tools / skills sit on the **outer** ring at `RING_OUTER`, anchored to
 *   their parent agent's angle when known so they cluster on the correct
 *   side. Unparented peripherals fan out around the bottom.
 *
 * The earlier BFS-tree layout collapsed to a vertical chain when each node
 * had a single child; this kind-based layout always produces a ring even
 * when the trace is a strict chain (orchestrator → A → B → tool).
 */
function computeRadialLayout(visibleNodes: MeshNodeModel[], visibleEdges: MeshEdge[]): RadialPositions {
  const byId = new Map<string, { x: number; y: number }>()
  if (visibleNodes.length === 0) return { byId }

  byId.set(ORCHESTRATOR_NODE_ID, { x: 0, y: 0 })

  const visibleIdSet = new Set(visibleNodes.map(n => n.id))

  // Adjacency (excluding completion + self-loops) for BFS depth + parent lookup.
  const childrenByParent = new Map<string, string[]>()
  const parentByChild = new Map<string, string>()
  for (const edge of visibleEdges) {
    if (edge.kind === 'completion') continue
    if (edge.source === edge.target) continue
    if (!visibleIdSet.has(edge.source) || !visibleIdSet.has(edge.target)) continue
    const list = childrenByParent.get(edge.source) ?? []
    if (!list.includes(edge.target)) list.push(edge.target)
    childrenByParent.set(edge.source, list)
    if (!parentByChild.has(edge.target)) parentByChild.set(edge.target, edge.source)
  }

  // BFS depths from the orchestrator (used for "depth bucket" on the inner ring).
  const depthByNode = new Map<string, number>([[ORCHESTRATOR_NODE_ID, 0]])
  const queue = [ORCHESTRATOR_NODE_ID]
  while (queue.length > 0) {
    const id = queue.shift()!
    const d = depthByNode.get(id)!
    for (const childId of childrenByParent.get(id) ?? []) {
      if (depthByNode.has(childId)) continue
      depthByNode.set(childId, d + 1)
      queue.push(childId)
    }
  }

  const others = visibleNodes.filter(n => n.id !== ORCHESTRATOR_NODE_ID)
  const agents = others.filter(n => isAgentKind(n.kind)).sort((a, b) => a.firstSeenSeq - b.firstSeenSeq)
  const peripherals = others.filter(n => isPeripheralKind(n.kind))
  const unknowns = others.filter(n => !isAgentKind(n.kind) && !isPeripheralKind(n.kind))

  const angleByNode = new Map<string, number>()

  // ---- Inner ring: agents -------------------------------------------------
  // Pick the start angle that gives the most pleasant geometry for the count:
  //   1 agent  → top (-π/2)
  //   2 agents → left + right (π and 0) so the line between them does not
  //              run vertically through the orchestrator's label
  //   3 agents → top + bottom-right + bottom-left (an upward-pointing triad)
  //   4+       → evenly distributed starting at the top
  //
  // For all cases we additionally bump nodes that are *deeper* in the
  // delegation tree outward by `RING_INNER_DEPTH_STEP` so a sub-agent's
  // sub-agent does not collide with its parent.
  const agentCount = agents.length
  const startAngleForCount = (count: number): number => {
    if (count === 2) return Math.PI // first agent goes left, second right (left + π = 0)
    if (count === 3) return -Math.PI / 2
    return -Math.PI / 2
  }

  if (agentCount > 0) {
    const startAngle = startAngleForCount(agentCount)
    agents.forEach((node, i) => {
      const angle = startAngle + (i * 2 * Math.PI) / agentCount
      angleByNode.set(node.id, angle)
      const depth = depthByNode.get(node.id) ?? 1
      const radius = RING_INNER + Math.max(0, depth - 1) * RING_INNER_DEPTH_STEP
      byId.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
    })
  }

  // ---- Outer ring: peripherals (tools + skills) ---------------------------
  // Group peripherals by parent so we can spread siblings across a small arc.
  const peripheralsByParent = new Map<string, MeshNodeModel[]>()
  for (const node of peripherals) {
    const parentId = parentByChild.get(node.id) ?? '__none__'
    const list = peripheralsByParent.get(parentId) ?? []
    list.push(node)
    peripheralsByParent.set(parentId, list)
  }

  for (const [parentId, group] of peripheralsByParent) {
    const parentAngle = angleByNode.get(parentId)
    if (parentAngle === undefined || parentId === '__none__') continue

    if (group.length === 1) {
      // Single peripheral: nudge sideways from the parent's exact angle so
      // its label does not stack on top of the parent agent's label.
      // Direction is chosen to push *away* from vertical (cleaner aesthetics).
      const direction = Math.cos(parentAngle) >= 0 ? 1 : -1
      const angle = parentAngle + direction * PERIPHERAL_ANGULAR_NUDGE
      angleByNode.set(group[0].id, angle)
      byId.set(group[0].id, { x: Math.cos(angle) * RING_OUTER, y: Math.sin(angle) * RING_OUTER })
      continue
    }

    // Multiple peripherals on the same parent: fan them across an arc that
    // grows with the count, capped at ~72° so they stay near their parent.
    const arcSize = Math.min(Math.PI / 2.5, 0.22 * group.length)
    group.forEach((node, i) => {
      const offset = (i / (group.length - 1) - 0.5) * arcSize
      const angle = parentAngle + offset
      angleByNode.set(node.id, angle)
      byId.set(node.id, { x: Math.cos(angle) * RING_OUTER, y: Math.sin(angle) * RING_OUTER })
    })
  }

  // ---- Tail: orphans (no known parent) + unknown kinds --------------------
  const tail = [...peripherals.filter(n => !byId.has(n.id)), ...unknowns.filter(n => !byId.has(n.id))]
  if (tail.length > 0) {
    // Distribute around the bottom hemisphere, evenly spread by ~30° per node.
    const step = 0.5
    const startAngle = Math.PI / 2 - ((tail.length - 1) * step) / 2
    tail.forEach((node, i) => {
      const angle = startAngle + i * step
      byId.set(node.id, { x: Math.cos(angle) * RING_OUTER, y: Math.sin(angle) * RING_OUTER })
    })
  }

  return { byId }
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
    onSelectNode,
    onSelectEdge
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

  const flowNodes: Node<MeshNodeData>[] = visibleNodes.map(node => {
    const size = NODE_SIZE[node.kind]
    const pos = positions.get(node.id) ?? { x: 0, y: 0 }
    // With `nodeOrigin={[0.5, 0.5]}` on <ReactFlow> the position is treated as
    // the *centre* of the node rather than its top-left corner, so we can
    // hand the layout coordinates straight through.
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
        onSelect: () => onSelectNode(selectedNodeId === node.id ? null : node.id)
      },
      width: size,
      height: size,
      draggable: false,
      connectable: false,
      selectable: false
    }
  })

  const flowEdges: Edge<MeshFlowEdgeData>[] = visibleEdges
    .filter(edge => isLive || edge.seq <= cutoffSeq)
    .filter(edge => edge.kind !== 'completion')
    .map(edge => {
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
          // Index/total are filled in below once we know all parallel edges
          // for this node pair. Defaults are safe for the single-edge case.
          bubbleIndex: 0,
          bubbleTotal: 1,
          showBubble: showEdgeLabels,
          onSelect: () => onSelectEdge(edge.id)
        },
        // React Flow's animated path stroke fights our SVG `<animateMotion>`,
        // so we keep `animated: false` and drive the moving dot ourselves.
        animated: false
      }
    })

  // Spread parallel edges (multiple calls between the same pair of nodes) so
  // their bubbles do not stack. The undirected key collapses A→B and B→A so
  // bubbles on the same geometric line are distributed together.
  const edgesByPair = new Map<string, Edge<MeshFlowEdgeData>[]>()
  for (const edge of flowEdges) {
    const key = [edge.source, edge.target].sort().join('::')
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
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        minZoom={0.3}
        maxZoom={1.8}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        proOptions={{ hideAttribution: true }}
        onInit={handleInit}
        onPaneClick={() => props.onSelectNode(null)}
      />
    </div>
  )
}
