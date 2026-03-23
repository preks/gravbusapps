/**
 * Static layout utilities for the App Flow diagram.
 *
 * Edge routing strategy:
 *  - Same layer (stacked nodes in one column): vertical spine from bottom of source
 *    to top of target (or symmetric when target is above), not the inter-column Z
 *  - Adjacent layers (diff=1): orthogonal Z — exit right center → gutter → enter left
 *  - Cross-layer (diff>1): arc through the "highway zone" between header pills
 *    and the first row of nodes. Direction-aware: forward (target to the right) exits
 *    the source on the right and enters the target on the left; backward edges mirror
 *    (exit left, enter right) so paths never jog away from the target first.
 *    Stacked sources use row stagger; multiple cross-layer edges from the *same* node
 *    get extra horizontal stem slots. data_model→screen exits higher on the card
 *    than the default right-center so it does not overlap the blue Z-path to function.
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

// ── Colors: NEWWORK design system tokens (changeable from theme) ───────────────
// Uses var(--nw-*) from @newwork/nw-design-system/dist/styles/colors.css
export const TYPE_COLORS: Record<ComponentType, string> = {
  data_model: 'var(--nw-info)',
  function: 'var(--nw-warning)',
  agent: 'var(--nw-ai-1)',
  flow: 'var(--nw-success)',
  screen: 'var(--nw-success-on-card)'
}

export const TYPE_BG_COLORS: Record<ComponentType, string> = {
  data_model: 'color-mix(in srgb, var(--nw-info) 18%, transparent)',
  function: 'color-mix(in srgb, var(--nw-warning) 18%, transparent)',
  agent: 'color-mix(in srgb, var(--nw-ai-1) 18%, transparent)',
  flow: 'color-mix(in srgb, var(--nw-success) 18%, transparent)',
  screen: 'color-mix(in srgb, var(--nw-success-on-card) 18%, transparent)'
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
  /**
   * 0-based slot when several cross-layer edges leave the same source — extra stem
   * offset so paths do not stack (e.g. data→flow vs data→screen).
   */
  crossStemSlot: number
  /** Bidirectional arrows (both ends have markers) */
  isBidirectional: boolean
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
    // Only connect to nodes in the next layer (not same layer)
    for (const target of nodes.filter(n => n.layerIndex === nextLayerIdx && n.component.type === nextLayerType)) {
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

    // Skip same-layer data_model → data_model connections to avoid visual clutter
    // When both models connect to downstream components, the relationship is implied
    if (srcNode.layerIndex === tgtNode.layerIndex && src.type === 'data_model' && tgt.type === 'data_model') {
      return
    }

    edgeSet.add(key)
    const layerDiff = Math.abs(tgtNode.layerIndex - srcNode.layerIndex)
    // Bidirectional arrows for data_model ↔ screen connections
    const isBidirectional = src.type === 'data_model' && tgt.type === 'screen'
    const edge: DiagramEdge = {
      id: key,
      sourceId: srcId,
      targetId: tgtId,
      label: edgeLabel(src.type, tgt.type),
      color: TYPE_COLORS[src.type],
      isCrossLayer: layerDiff > 1,
      arcY: 0,
      crossStemSlot: 0,
      isBidirectional
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

  const crossBySource = new Map<string, DiagramEdge[]>()
  for (const e of crossEdges) {
    const s = nodeById.get(e.sourceId)
    const t = nodeById.get(e.targetId)
    if (!s || !t) continue
    const list = crossBySource.get(e.sourceId) ?? []
    list.push(e)
    crossBySource.set(e.sourceId, list)
  }
  for (const list of crossBySource.values()) {
    list.sort((a, b) => a.targetId.localeCompare(b.targetId))
    list.forEach((e, slot) => {
      e.crossStemSlot = slot
    })
  }

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
/** Exported for tests — horizontal stub length before turning onto the cross-layer highway */
export const HIGHWAY_EX = 18
/**
 * Horizontal offset per stacked row so same-column → screen edges do not share one stem.
 * Larger step keeps the lower data model’s “→ screen” path clearly separate from its
 * same-color “→ function” Z-leg (both start at the node’s right center).
 */
export const CROSS_LAYER_STEM_STAGGER = 28
/** Extra stem offset per additional cross-layer edge from the same source */
export const CROSS_LAYER_SAME_SOURCE_STAGGER = 22
/** Shifts Z-path midX for stacked data models so “→ function” does not sit under “→ screen” */
const ADJACENT_Z_STAGGER_PER_ROW = 26
/** data_model→screen: exit Y on source card (fraction from top), avoids overlap with center-out edges */
const DATA_TO_SCREEN_ATTACH_FRAC = 0.27
const NODE_EDGE_PAD = 12
/** Same-layer vertical spine: horizontal center of the column */
const SAME_LAYER_SPINE_X = (node: DiagramNode) => node.x + NODE_W / 2

function dataModelScreenAttachY(src: DiagramNode): number {
  const raw = src.y + NODE_H * DATA_TO_SCREEN_ATTACH_FRAC
  return Math.min(src.y + NODE_H - NODE_EDGE_PAD, Math.max(src.y + NODE_EDGE_PAD, raw))
}

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
    const arcY = edge.arcY
    const rowStagger = src.indexInLayer * CROSS_LAYER_STEM_STAGGER
    const slotStagger = edge.crossStemSlot * CROSS_LAYER_SAME_SOURCE_STAGGER
    const forward = src.x + NODE_W < tgt.x
    const syOut =
      forward && src.component.type === 'data_model' && tgt.component.type === 'screen'
        ? dataModelScreenAttachY(src)
        : sy

    if (forward) {
      const stemX = sx + HIGHWAY_EX + rowStagger + slotStagger
      return orthoPath(
        [
          [sx, syOut],
          [stemX, syOut],
          [stemX, arcY],
          [tx - HIGHWAY_EX, arcY],
          [tx - HIGHWAY_EX, ty],
          [tx, ty]
        ],
        CORNER_R
      )
    }

    const sxL = src.x
    const txR = tgt.x + NODE_W
    const stemXL = sxL - HIGHWAY_EX - rowStagger - slotStagger
    return orthoPath(
      [
        [sxL, syOut],
        [stemXL, syOut],
        [stemXL, arcY],
        [txR + HIGHWAY_EX, arcY],
        [txR + HIGHWAY_EX, ty],
        [txR, ty]
      ],
      CORNER_R
    )
  }

  if (src.layerIndex === tgt.layerIndex) {
    const cx = SAME_LAYER_SPINE_X(src)
    if (Math.abs(sy - ty) < 1) {
      return `M ${sx},${sy} L ${tx},${ty}`
    }
    if (tgt.y > src.y) {
      const y0 = src.y + NODE_H
      const y1 = tgt.y
      return `M ${cx},${y0} L ${cx},${y1}`
    }
    const y0 = src.y
    const y1 = tgt.y + NODE_H
    return `M ${cx},${y0} L ${cx},${y1}`
  }

  if (Math.abs(sy - ty) < 1) {
    // Same row — straight horizontal line
    return `M ${sx},${sy} L ${tx},${ty}`
  }
  // Z-shape: right → down/up → right, split at midpoint
  let midX = (sx + tx) / 2
  if (src.component.type === 'data_model') {
    midX += src.indexInLayer * ADJACENT_Z_STAGGER_PER_ROW
    midX = Math.min(tx - NODE_EDGE_PAD, Math.max(sx + NODE_EDGE_PAD, midX))
  }
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
    const rowStagger = src.indexInLayer * CROSS_LAYER_STEM_STAGGER
    const slotStagger = edge.crossStemSlot * CROSS_LAYER_SAME_SOURCE_STAGGER
    const forward = src.x + NODE_W < tgt.x
    const x0 = forward ? sx + HIGHWAY_EX + rowStagger + slotStagger : src.x - HIGHWAY_EX - rowStagger - slotStagger
    const x1 = forward ? tx - HIGHWAY_EX : tgt.x + NODE_W + HIGHWAY_EX
    return { x: (x0 + x1) / 2, y: edge.arcY + 12 }
  }

  if (src.layerIndex === tgt.layerIndex) {
    const cx = SAME_LAYER_SPINE_X(src)
    if (Math.abs(sy - ty) < 1) {
      return { x: (sx + tx) / 2, y: sy - 10 }
    }
    if (tgt.y > src.y) {
      return { x: cx + 4, y: (src.y + NODE_H + tgt.y) / 2 }
    }
    return { x: cx + 4, y: (src.y + tgt.y + NODE_H) / 2 }
  }

  // Label sits beside the vertical segment
  let midX = (sx + tx) / 2
  if (src.component.type === 'data_model') {
    midX += src.indexInLayer * ADJACENT_Z_STAGGER_PER_ROW
    midX = Math.min(tx - NODE_EDGE_PAD, Math.max(sx + NODE_EDGE_PAD, midX))
  }
  return { x: midX + 4, y: (sy + ty) / 2 - 10 }
}
