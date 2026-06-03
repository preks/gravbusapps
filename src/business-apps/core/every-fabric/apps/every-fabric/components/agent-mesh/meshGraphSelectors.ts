// Shared graph-shape selectors used by both the 2D React Flow renderer
// (`MeshGraph.tsx`) and the 3D R3F renderer (`Mesh3DGraph.tsx`). Keeping the
// visibility / highlight / dim / skill-name derivation in one place guarantees
// the two views stay in lock-step as users toggle layers, hover nodes, or
// scrub the replay clock.

import {
  ORCHESTRATOR_NODE_ID,
  type MeshEdge,
  type MeshNode,
  type MeshNodeKind,
  type TraceModel
} from '../../utils/traceModel'
import { isKindVisible, type MeshLayerKey } from './meshLayers'
import { KIND_CATEGORY } from './meshLayout'
import type { MeshLiveActivity } from './liveMeshActivity'

export interface MeshGraphDerivedInput {
  model: TraceModel
  activeLayers: ReadonlySet<MeshLayerKey>
  positionMs: number
  durationMs: number
  selectedNodeId: string | null
  hoveredNodeId: string | null
  nodeActivityById?: ReadonlyMap<string, MeshLiveActivity>
  edgeActivityById?: ReadonlyMap<string, MeshLiveActivity>
}

/**
 * Per-node derived flags. Mirrors the data the 2D path used to compute inline
 * inside `MeshGraph.buildLayout` so both renderers share identical semantics.
 */
export interface DerivedNode {
  node: MeshNode
  /** Kind category label (e.g. "ENTERPRISE AGENT"), respecting metadata override. */
  category: string
  /** Replay clock says this node hasn't appeared yet. */
  isUpcoming: boolean
  /** Replay window says the node is currently producing work, or status === running when live. */
  isActive: boolean
  /** Selected via popover. */
  isSelected: boolean
  /** Skill names attached to an agent (drives the colored dots under the label). */
  skillNames: string[]
  /** Hover dim — true when another node is hovered and this one isn't in its skill path. */
  isDimmed: boolean
  /** Hover highlight — true when this node is part of the hover skill path (excluding the hovered node itself). */
  isHighlighted: boolean
  /** True when this node is the one the user is currently hovering. */
  isHovered: boolean
  /** Number of currently live sessions touching this aggregate node. */
  liveCount: number
  /** Log-scaled activity heat in [0,1], used for glow intensity. */
  activityHeat: number
  /** Label for the latest live activity associated with this node. */
  activityLabel?: string
}

export interface DerivedEdge {
  edge: MeshEdge
  isUpcoming: boolean
  isActive: boolean
  isFailed: boolean
  isResolved: boolean
  isDimmed: boolean
  hasDetail: boolean
  /** Position in the parallel-edges group for the source/target pair (undirected). */
  bubbleIndex: number
  /** Total parallel edges in the source/target pair (undirected). */
  bubbleTotal: number
  /** Number of currently live sessions touching this aggregate edge/path. */
  liveCount: number
  /** Log-scaled activity heat in [0,1], used for pulse density/intensity. */
  activityHeat: number
  /** Label for the latest live activity associated with this edge/path. */
  activityLabel?: string
}

export interface MeshGraphDerived {
  visibleNodes: MeshNode[]
  visibleEdges: MeshEdge[]
  /** Visible edges excluding the synthetic `completion` records (kept internal). */
  drawableEdges: MeshEdge[]
  derivedNodes: DerivedNode[]
  derivedEdges: DerivedEdge[]
  derivedNodeById: Map<string, DerivedNode>
  derivedEdgeById: Map<string, DerivedEdge>
  skillNamesByAgent: Map<string, string[]>
  /** Sorted set of node ids visible *and* in the highlight set when hover is active. */
  highlightedNodeIds: ReadonlySet<string>
  highlightedEdgeIds: ReadonlySet<string>
  isLive: boolean
}

/** Active replay window — same constant as the 2D code path used inline. */
export const ACTIVE_WINDOW_MS = 500

function categoryFor(node: MeshNode): string {
  const category = node.metadata?.category
  if (category && typeof category === 'string') return category.toUpperCase()
  return KIND_CATEGORY[node.kind as MeshNodeKind]
}

function undirectedPairKey(sourceId: string, targetId: string): string {
  return [sourceId, targetId].sort((a, b) => a.localeCompare(b)).join('::')
}

function activityHeat(liveCount: number): number {
  if (liveCount <= 0) return 0
  return Math.min(1, Math.log1p(liveCount) / Math.log(6))
}

export function deriveMeshGraph(input: MeshGraphDerivedInput): MeshGraphDerived {
  const {
    model,
    activeLayers,
    positionMs,
    durationMs,
    selectedNodeId,
    hoveredNodeId,
    nodeActivityById,
    edgeActivityById
  } = input

  const visibleNodes = model.nodes.filter(n => isKindVisible(n.kind, activeLayers))
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
  const visibleEdges = model.edges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))

  const isLive = durationMs <= 0
  const cutoffMs = positionMs + 1

  // Skill names per agent, mirrors MeshGraph.buildLayout
  const skillNamesByAgent = new Map<string, string[]>()
  for (const edge of model.edges) {
    if (edge.kind !== 'skill_load') continue
    const existing = skillNamesByAgent.get(edge.source) ?? []
    if (edge.label && !existing.includes(edge.label)) existing.push(edge.label)
    skillNamesByAgent.set(edge.source, existing)
  }

  // Hover highlight propagation
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

  const derivedNodes: DerivedNode[] = visibleNodes.map(node => {
    const isUpcoming = !isLive && node.offsetMs > cutoffMs && node.kind !== 'orchestrator'
    const recentlyActive = !isLive && node.offsetMs <= cutoffMs && node.lastOffsetMs >= positionMs
    const liveActivity = nodeActivityById?.get(node.id)
    const liveCount = liveActivity?.liveCount ?? 0
    const isActive = liveCount > 0 || (isLive ? node.status === 'running' : recentlyActive)
    return {
      node,
      category: categoryFor(node),
      isUpcoming,
      isActive,
      isSelected: selectedNodeId === node.id,
      skillNames: skillNamesByAgent.get(node.id) ?? [],
      isDimmed: isHoverActive && !highlightedNodeIds.has(node.id),
      isHighlighted: isHoverActive && highlightedNodeIds.has(node.id) && node.id !== hoveredNodeId,
      isHovered: node.id === hoveredNodeId,
      liveCount,
      activityHeat: activityHeat(liveCount),
      activityLabel: liveActivity?.activityLabel
    }
  })

  const derivedNodeById = new Map<string, DerivedNode>()
  for (const d of derivedNodes) derivedNodeById.set(d.node.id, d)

  const drawableEdges = visibleEdges.filter(edge => edge.kind !== 'completion')

  const pairCounts = new Map<string, number>()
  for (const edge of drawableEdges) {
    const key = undirectedPairKey(edge.source, edge.target)
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
  }

  // First pass: compute upcoming/active/dim flags
  const pairIndexes = new Map<string, number>()
  const derivedEdges: DerivedEdge[] = drawableEdges.map(edge => {
    const pairKey = undirectedPairKey(edge.source, edge.target)
    const bubbleTotal = pairCounts.get(pairKey) ?? 1
    const bubbleIndex = pairIndexes.get(pairKey) ?? 0
    pairIndexes.set(pairKey, bubbleIndex + 1)

    const edgeUpcoming = !isLive && edge.offsetMs > cutoffMs
    const exactEdgeActivity = edgeActivityById?.get(edge.id)
    const sourceActivity = nodeActivityById?.get(edge.source)
    const targetActivity = nodeActivityById?.get(edge.target)
    const hasLiveActivityInput = !!nodeActivityById || !!edgeActivityById
    const sourceNode = derivedNodeById.get(edge.source)?.node
    const targetNode = derivedNodeById.get(edge.target)?.node
    const hasRunningEndpoint = sourceNode?.status === 'running' || targetNode?.status === 'running'
    const connectedLiveCount =
      exactEdgeActivity?.liveCount ??
      (!hasLiveActivityInput && isLive
        ? edge.source === ORCHESTRATOR_NODE_ID
          ? (targetActivity?.liveCount ?? 0)
          : edge.target === ORCHESTRATOR_NODE_ID
            ? (sourceActivity?.liveCount ?? 0)
            : Math.max(sourceActivity?.liveCount ?? 0, targetActivity?.liveCount ?? 0)
        : 0)
    const liveEdgeActive =
      isLive &&
      (connectedLiveCount > 0 ||
        (!hasLiveActivityInput && hasRunningEndpoint && !edge.resolvedAt && edge.status !== 'failed'))
    const replayEdgeActive = !isLive && !edgeUpcoming && edge.offsetMs >= positionMs - ACTIVE_WINDOW_MS
    const edgeActive = liveEdgeActive || replayEdgeActive
    const isFailed = edge.status === 'failed'
    const isResolved = !!edge.resolvedAt
    const isDimmed = isHoverActive && !highlightedEdgeIds.has(edge.id)
    const hasDetail = !!edge.label && edge.label.trim().length > 0
    return {
      edge,
      isUpcoming: edgeUpcoming,
      isActive: edgeActive,
      isFailed,
      isResolved,
      isDimmed,
      hasDetail,
      bubbleIndex,
      bubbleTotal,
      liveCount: connectedLiveCount,
      activityHeat: activityHeat(connectedLiveCount),
      activityLabel:
        exactEdgeActivity?.activityLabel ??
        (!hasLiveActivityInput ? (sourceActivity?.activityLabel ?? targetActivity?.activityLabel) : undefined)
    }
  })

  // Spread parallel edges so bubbles don't stack on the same geometric line.
  // Mirrors the second pass in `MeshGraph.buildLayout`.
  const edgesByPair = new Map<string, DerivedEdge[]>()
  for (const d of derivedEdges) {
    const key = undirectedPairKey(d.edge.source, d.edge.target)
    const list = edgesByPair.get(key) ?? []
    list.push(d)
    edgesByPair.set(key, list)
  }
  for (const group of edgesByPair.values()) {
    if (group.length <= 1) continue
    group.forEach((d, i) => {
      d.bubbleIndex = i
      d.bubbleTotal = group.length
    })
  }

  const derivedEdgeById = new Map<string, DerivedEdge>()
  for (const d of derivedEdges) derivedEdgeById.set(d.edge.id, d)

  return {
    visibleNodes,
    visibleEdges,
    drawableEdges,
    derivedNodes,
    derivedEdges,
    derivedNodeById,
    derivedEdgeById,
    skillNamesByAgent,
    highlightedNodeIds,
    highlightedEdgeIds,
    isLive
  }
}
