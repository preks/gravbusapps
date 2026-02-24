/**
 * Static layout utilities for the App Flow diagram.
 *
 * Edge routing strategy:
 *  - Adjacent layers (diff=1): direct smooth bezier — clean horizontal arc
 *  - Cross-layer (diff>1): arc through the "highway zone" between header pills
 *    and the first row of nodes, so they never cross intermediate boxes
 */

import type { ComponentSpec, ComponentType } from '../../../types/components'

export const TYPE_LAYER_ORDER: ComponentType[] = ['data_model', 'function', 'agent', 'flow', 'screen']

// ── Layout constants ──────────────────────────────────────────────────────────
export const NODE_W = 170
export const NODE_H = 134 // tall enough for header + 2-line name + 3-line desc
export const NODE_V_GAP = 16
export const LAYER_H_GAP = 72
export const PAD_X = 28
/** Extra top space: header pills (≈28px) + arc highway zone + breathing room */
export const PAD_TOP = 96
export const PAD_BOTTOM = 32
/**
 * Y-start of the cross-layer arc highway.
 * Header pills are ~28px tall; starting at 52 leaves a clear 24px gap below them
 * so wires never visually clash with the pill labels.
 */
const ARC_ZONE_Y_START = 52
const ARC_ZONE_STEP = 8 // vertical step between stacked arcs

// ── Colors ────────────────────────────────────────────────────────────────────
export const TYPE_COLORS: Record<ComponentType, string> = {
  data_model: '#6366f1',
  function: '#f59e0b',
  agent: '#8b5cf6',
  flow: '#14b8a6',
  screen: '#10b981'
}

export const TYPE_BG_COLORS: Record<ComponentType, string> = {
  data_model: 'rgba(99,102,241,0.10)',
  function: 'rgba(245,158,11,0.10)',
  agent: 'rgba(139,92,246,0.10)',
  flow: 'rgba(20,184,166,0.10)',
  screen: 'rgba(16,185,129,0.10)'
}

export const TYPE_LAYER_LABELS: Record<ComponentType, string> = {
  data_model: 'Data',
  function: 'Logic',
  agent: 'AI',
  flow: 'Workflow',
  screen: 'Interface'
}

export const EDGE_LABELS: Partial<Record<string, string>> = {
  'data_model->screen': 'Displays data',
  'data_model->function': 'Reads data',
  'data_model->data_model': 'Related',
  'data_model->agent': 'Data source',
  'data_model->flow': 'Uses data',
  'function->agent': 'AI tool',
  'function->flow': 'Workflow step',
  'function->screen': 'Provides data',
  'agent->flow': 'AI step',
  'agent->screen': 'Powers',
  'flow->screen': 'Updates UI'
}

function edgeLabel(src: ComponentType, tgt: ComponentType): string {
  return EDGE_LABELS[`${src}->${tgt}`] ?? 'Connected to'
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DiagramNode {
  id: string
  component: ComponentSpec
  layerIndex: number
  indexInLayer: number
  x: number
  y: number
}

export interface DiagramEdge {
  id: string
  sourceId: string
  targetId: string
  label: string
  color: string
  /** Edges crossing 2+ layer columns route through the top arc highway */
  isCrossLayer: boolean
  /** Absolute Y of the arc (only used when isCrossLayer=true) */
  arcY: number
}

export interface DiagramLayout {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  presentLayers: ComponentType[]
  totalWidth: number
  totalHeight: number
}

// ── Builder helpers ───────────────────────────────────────────────────────────

function groupByType(components: ComponentSpec[]): Record<string, ComponentSpec[]> {
  const byType: Record<string, ComponentSpec[]> = {}
  for (const comp of components) {
    if (!byType[comp.type]) byType[comp.type] = []
    byType[comp.type].push(comp)
  }
  return byType
}

function buildNodes(
  presentLayers: ComponentType[],
  byType: Record<string, ComponentSpec[]>
): { nodes: DiagramNode[]; nodeById: Map<string, DiagramNode> } {
  const nodes: DiagramNode[] = []
  const nodeById = new Map<string, DiagramNode>()
  for (const [layerIndex, type] of presentLayers.entries()) {
    const layerComps = byType[type] ?? []
    const x = PAD_X + layerIndex * (NODE_W + LAYER_H_GAP)
    for (const [nodeIndex, comp] of layerComps.entries()) {
      const y = PAD_TOP + nodeIndex * (NODE_H + NODE_V_GAP)
      const node: DiagramNode = { id: comp.id, component: comp, layerIndex, indexInLayer: nodeIndex, x, y }
      nodes.push(node)
      nodeById.set(comp.id, node)
    }
  }
  return { nodes, nodeById }
}

function addComponentDependencyEdges(comp: ComponentSpec, tryAddEdge: (srcId: string, tgtId: string) => void): void {
  for (const depId of comp.dependencies ?? []) tryAddEdge(depId, comp.id)
  if (comp.type !== 'screen') return
  const dmIds = comp.metadata?.dataModelIds as string[] | undefined
  if (Array.isArray(dmIds)) {
    for (const dmId of dmIds) tryAddEdge(dmId, comp.id)
  }
}

function inferMissingEdges(
  nodes: DiagramNode[],
  outgoingIds: Set<string>,
  presentLayers: ComponentType[],
  tryAddEdge: (srcId: string, tgtId: string) => void
): void {
  for (const node of nodes) {
    if (outgoingIds.has(node.id)) continue
    const nextLayerIdx = node.layerIndex + 1
    if (nextLayerIdx >= presentLayers.length) continue
    const nextLayerType = presentLayers[nextLayerIdx]
    for (const target of nodes.filter(n => n.component.type === nextLayerType)) {
      tryAddEdge(node.id, target.id)
    }
  }
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildDiagram(components: ComponentSpec[]): DiagramLayout {
  const presentLayers = TYPE_LAYER_ORDER.filter(t => components.some(c => c.type === t))
  const byType = groupByType(components)
  const byId = new Map(components.map(c => [c.id, c]))

  const { nodes, nodeById } = buildNodes(presentLayers, byType)

  // Canvas size
  const maxInLayer = Math.max(...presentLayers.map(t => (byType[t] ?? []).length), 1)
  const totalWidth = PAD_X * 2 + presentLayers.length * NODE_W + (presentLayers.length - 1) * LAYER_H_GAP
  const totalHeight = PAD_TOP + maxInLayer * (NODE_H + NODE_V_GAP) - NODE_V_GAP + PAD_BOTTOM

  // Edges — classify by layer span
  const edgeSet = new Set<string>()
  const directEdges: DiagramEdge[] = []
  const crossEdges: DiagramEdge[] = []

  function tryAddEdge(srcId: string, tgtId: string) {
    const key = `${srcId}->${tgtId}`
    if (edgeSet.has(key) || srcId === tgtId) return
    const src = byId.get(srcId)
    const tgt = byId.get(tgtId)
    const srcNode = nodeById.get(srcId)
    const tgtNode = nodeById.get(tgtId)
    if (!src || !tgt || !srcNode || !tgtNode) return
    edgeSet.add(key)
    const layerDiff = Math.abs(tgtNode.layerIndex - srcNode.layerIndex)
    const edge: DiagramEdge = {
      id: key,
      sourceId: srcId,
      targetId: tgtId,
      label: edgeLabel(src.type, tgt.type),
      color: TYPE_COLORS[src.type],
      isCrossLayer: layerDiff > 1,
      arcY: 0
    }
    if (edge.isCrossLayer) crossEdges.push(edge)
    else directEdges.push(edge)
  }

  for (const comp of components) {
    addComponentDependencyEdges(comp, tryAddEdge)
  }

  // Structural inference pass: any component with no outgoing edges (i.e. the backend
  // didn't populate dependencies / wiring data) gets connected to all components in
  // the immediately next present layer so the diagram always shows flow.
  const outgoingIds = new Set([...directEdges, ...crossEdges].map(e => e.sourceId))
  inferMissingEdges(nodes, outgoingIds, presentLayers, tryAddEdge)

  // Assign arc Y — stagger within the highway zone between header pills and nodes
  // Longer spans get deeper arcs so shorter spans are visually above them
  crossEdges.sort((a, b) => {
    const spanA = Math.abs((nodeById.get(a.targetId)?.layerIndex ?? 0) - (nodeById.get(a.sourceId)?.layerIndex ?? 0))
    const spanB = Math.abs((nodeById.get(b.targetId)?.layerIndex ?? 0) - (nodeById.get(b.sourceId)?.layerIndex ?? 0))
    return spanA - spanB // shorter spans get smaller arcY (closer to headers)
  })
  crossEdges.forEach((edge, i) => {
    edge.arcY = ARC_ZONE_Y_START + i * ARC_ZONE_STEP
  })

  return {
    nodes,
    edges: [...directEdges, ...crossEdges],
    presentLayers,
    totalWidth,
    totalHeight
  }
}

// ── SVG path helpers ──────────────────────────────────────────────────────────

const CORNER_R = 7 // corner radius for rounded right-angle bends
const HIGHWAY_EX = 18 // short horizontal exit/entry distance for highway paths

/**
 * Builds an SVG path string through a series of waypoints with rounded corners.
 * All segments are axis-aligned (horizontal or vertical).
 */
function orthoPath(waypoints: [number, number][], r: number): string {
  if (waypoints.length === 0) return ''
  let d = `M ${waypoints[0][0]},${waypoints[0][1]}`

  for (let i = 1; i < waypoints.length; i++) {
    const [px, py] = waypoints[i - 1]
    const [cx, cy] = waypoints[i]
    const next = waypoints[i + 1]

    if (!next) {
      d += ` L ${cx},${cy}`
      continue
    }

    const [nx, ny] = next
    const dx1 = cx - px,
      dy1 = cy - py
    const dx2 = nx - cx,
      dy2 = ny - cy

    const seg1 = Math.hypot(dx1, dy1)
    const seg2 = Math.hypot(dx2, dy2)
    const ar = Math.min(r, seg1 / 2, seg2 / 2)

    if (ar < 1) {
      d += ` L ${cx},${cy}`
      continue
    }

    const s1 = ar / seg1
    const s2 = ar / seg2
    // Approach corner
    d += ` L ${cx - dx1 * s1},${cy - dy1 * s1}`
    // Rounded corner via quadratic bezier
    d += ` Q ${cx},${cy} ${cx + dx2 * s2},${cy + dy2 * s2}`
  }
  return d
}

export function getEdgePath(edge: DiagramEdge, src: DiagramNode, tgt: DiagramNode): string {
  const sx = src.x + NODE_W
  const sy = src.y + NODE_H / 2
  const tx = tgt.x
  const ty = tgt.y + NODE_H / 2

  if (edge.isCrossLayer) {
    // Highway routing: exit right → up to arc zone → across → down → enter
    const arcY = edge.arcY
    return orthoPath(
      [
        [sx, sy],
        [sx + HIGHWAY_EX, sy],
        [sx + HIGHWAY_EX, arcY],
        [tx - HIGHWAY_EX, arcY],
        [tx - HIGHWAY_EX, ty],
        [tx, ty]
      ],
      CORNER_R
    )
  }

  if (Math.abs(sy - ty) < 1) {
    // Same row — straight horizontal line
    return `M ${sx},${sy} L ${tx},${ty}`
  }
  // Z-shape: right → down/up → right, split at midpoint
  const midX = (sx + tx) / 2
  return orthoPath(
    [
      [sx, sy],
      [midX, sy],
      [midX, ty],
      [tx, ty]
    ],
    CORNER_R
  )
}

/** Midpoint of the path for edge label placement */
export function getEdgeMidpoint(edge: DiagramEdge, src: DiagramNode, tgt: DiagramNode): { x: number; y: number } {
  const sx = src.x + NODE_W
  const sy = src.y + NODE_H / 2
  const tx = tgt.x
  const ty = tgt.y + NODE_H / 2

  if (edge.isCrossLayer) {
    // Label sits just below the horizontal highway segment (clear of header pills)
    return { x: (sx + tx) / 2, y: edge.arcY + 12 }
  }
  // Label sits beside the vertical segment
  const midX = (sx + tx) / 2
  return { x: midX + 4, y: (sy + ty) / 2 - 10 }
}
