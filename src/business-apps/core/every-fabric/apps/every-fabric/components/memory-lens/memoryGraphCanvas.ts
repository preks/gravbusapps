import type { GraphLink, GraphNode } from './memoryGraphModel'
import type { GraphPalette } from './useGraphTokens'

/**
 * Pure canvas painting for the Memory Mind Map.
 *
 * All drawing happens in world coordinates under a pan/zoom transform that the
 * view applies before calling {@link drawScene}. Sizes are world-space so nodes
 * grow naturally on zoom; level-of-detail keeps labels uncluttered.
 */

export interface DrawState {
  nodes: GraphNode[]
  links: GraphLink[]
  palette: GraphPalette
  /** Current zoom scale, used for level-of-detail decisions. */
  k: number
  hoverId: string | null
  selectedId: string | null
  /** selected node + its neighbors; when set, everything else dims. */
  focusIds: Set<string> | null
  /** search matches; when non-empty (and no focus), non-matches dim. */
  matchIds: Set<string> | null
}

const MEMORY_MIN_R = 3.5
const MEMORY_MAX_EXTRA = 3
const HUB_MIN_R = 7
const HUB_MAX_R = 26
const DIM_ALPHA = 0.12
const LINK_DIM_ALPHA = 0.05
const LABEL_ZOOM_THRESHOLD = 1.5

export const nodeRadius = (node: GraphNode): number => {
  if (node.kind === 'memory') {
    const salience = typeof node.salience === 'number' ? Math.max(0, Math.min(10, node.salience)) : 1
    return MEMORY_MIN_R + (salience / 10) * MEMORY_MAX_EXTRA
  }
  const weight = node.count ?? node.degree ?? 0
  return Math.max(HUB_MIN_R, Math.min(HUB_MAX_R, HUB_MIN_R + Math.sqrt(weight) * 2.4))
}

export const hitRadius = (node: GraphNode): number => nodeRadius(node) + (node.kind === 'memory' ? 5 : 7)

const positioned = (node: GraphNode | undefined): node is GraphNode & { x: number; y: number } =>
  !!node && node.x != null && node.y != null

const endNode = (end: string | GraphNode, byId: Map<string, GraphNode>): GraphNode | undefined =>
  typeof end === 'string' ? byId.get(end) : end

const truncate = (label: string, max = 22): string => (label.length > max ? `${label.slice(0, max - 1)}…` : label)

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void => {
  const radius = Math.min(r, h / 2, w / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

const isActive = (id: string, state: DrawState): boolean => {
  if (state.focusIds) return state.focusIds.has(id) || id === state.selectedId
  if (state.matchIds && state.matchIds.size > 0) return state.matchIds.has(id)
  return true
}

const drawLinks = (ctx: CanvasRenderingContext2D, state: DrawState, byId: Map<string, GraphNode>): void => {
  for (const link of state.links) {
    const source = endNode(link.source, byId)
    const target = endNode(link.target, byId)
    if (!positioned(source) || !positioned(target)) continue

    const active = isActive(source.id, state) && isActive(target.id, state)
    ctx.globalAlpha = active ? 0.5 : LINK_DIM_ALPHA
    ctx.strokeStyle = active && state.focusIds ? state.palette.primary : state.palette.mutedForeground
    ctx.lineWidth = active && state.focusIds ? 1.4 : 0.8

    // Subtle curve for a softer, less grid-like feel.
    const mx = (source.x + target.x) / 2
    const my = (source.y + target.y) / 2
    const dx = target.x - source.x
    const dy = target.y - source.y
    const offset = 0.12
    ctx.beginPath()
    ctx.moveTo(source.x, source.y)
    ctx.quadraticCurveTo(mx - dy * offset, my + dx * offset, target.x, target.y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

const drawHub = (ctx: CanvasRenderingContext2D, node: GraphNode, state: DrawState, active: boolean): void => {
  const x = node.x as number
  const y = node.y as number
  const isTopic = node.kind === 'topic'
  const label = `${isTopic ? '#' : ''}${truncate(node.label)}`
  const fontSize = Math.max(5.5, Math.min(11, nodeRadius(node) * 0.85))
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`
  const padX = fontSize * 0.7
  const textW = ctx.measureText(label).width
  const w = textW + padX * 2
  const h = fontSize + fontSize * 0.9
  const selected = node.id === state.selectedId

  ctx.globalAlpha = active ? 1 : DIM_ALPHA

  if (selected) {
    roundRect(ctx, x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, (h + 6) / 2)
    ctx.fillStyle = state.palette.primary
    ctx.globalAlpha = active ? 0.25 : DIM_ALPHA
    ctx.fill()
    ctx.globalAlpha = active ? 1 : DIM_ALPHA
  }

  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2)
  if (isTopic) {
    ctx.fillStyle = state.palette.primary
    ctx.fill()
    ctx.fillStyle = state.palette.primaryForeground
  } else {
    ctx.fillStyle = state.palette.card
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = state.palette.border
    ctx.stroke()
    ctx.fillStyle = state.palette.foreground
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x, y + 0.5)
  ctx.globalAlpha = 1
}

const drawMemory = (ctx: CanvasRenderingContext2D, node: GraphNode, state: DrawState, active: boolean): void => {
  const x = node.x as number
  const y = node.y as number
  const r = nodeRadius(node)
  const selected = node.id === state.selectedId
  const hovered = node.id === state.hoverId

  ctx.globalAlpha = active ? 1 : DIM_ALPHA
  if (selected || hovered) {
    ctx.beginPath()
    ctx.arc(x, y, r + 3, 0, Math.PI * 2)
    ctx.fillStyle = state.palette.primary
    ctx.globalAlpha = active ? 0.25 : DIM_ALPHA
    ctx.fill()
    ctx.globalAlpha = active ? 1 : DIM_ALPHA
  }
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = state.focusIds && active ? state.palette.primary : state.palette.mutedForeground
  ctx.fill()

  const showLabel = state.k >= LABEL_ZOOM_THRESHOLD || selected || hovered
  if (showLabel) {
    ctx.font = '500 4px Inter, system-ui, sans-serif'
    ctx.fillStyle = state.palette.foreground
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.globalAlpha = active ? 0.9 : DIM_ALPHA
    ctx.fillText(truncate(node.label, 28), x, y + r + 2)
  }
  ctx.globalAlpha = 1
}

/** Paint the whole scene. The context must already carry the pan/zoom transform. */
export const drawScene = (ctx: CanvasRenderingContext2D, state: DrawState): void => {
  const byId = new Map(state.nodes.map(node => [node.id, node]))
  drawLinks(ctx, state, byId)

  // Hubs under memories? Draw memories first, hubs on top so labels read clearly.
  for (const node of state.nodes) {
    if (node.kind !== 'memory' || !positioned(node)) continue
    drawMemory(ctx, node, state, isActive(node.id, state))
  }
  for (const node of state.nodes) {
    if (node.kind === 'memory' || !positioned(node)) continue
    drawHub(ctx, node, state, isActive(node.id, state))
  }
  ctx.globalAlpha = 1
}
