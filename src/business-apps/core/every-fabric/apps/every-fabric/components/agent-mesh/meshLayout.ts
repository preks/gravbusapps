// Radial layout algorithm for the Agent Mesh canvas.

import {
  ORCHESTRATOR_NODE_ID,
  type MeshEdge,
  type MeshNode as MeshNodeModel,
  type MeshNodeKind
} from '../../utils/traceModel'

/** Diameter (px) of the circular badge per node kind. */
export const NODE_SIZE: Record<MeshNodeKind, number> = {
  orchestrator: 88,
  subagent: 64,
  expert: 64,
  skill: 56,
  tool: 44
}

/** Pixel radius of the inner (agents) and outer (tools/skills) rings. */
const RING_INNER = 280
const RING_OUTER = 520
const RING_INNER_DEPTH_STEP = 140
const PERIPHERAL_ANGULAR_NUDGE = Math.PI / 12

export const KIND_CATEGORY: Record<MeshNodeKind, string> = {
  orchestrator: 'EVERY',
  subagent: 'AGENT',
  expert: 'EXPERT',
  skill: 'SKILL',
  tool: 'TOOL'
}

export const isAgentKind = (kind: MeshNodeKind): boolean => kind === 'subagent' || kind === 'expert'
const isPeripheralKind = (kind: MeshNodeKind): boolean => kind === 'tool' || kind === 'skill'

export interface RadialPositions {
  byId: Map<string, { x: number; y: number }>
}

/**
 * Radial layout: orchestrator at centre, agents on inner ring, tools/skills
 * on outer ring anchored to their parent agent's angle.
 */
export function computeRadialLayout(visibleNodes: MeshNodeModel[], visibleEdges: MeshEdge[]): RadialPositions {
  const byId = new Map<string, { x: number; y: number }>()
  if (visibleNodes.length === 0) return { byId }

  byId.set(ORCHESTRATOR_NODE_ID, { x: 0, y: 0 })

  const visibleIdSet = new Set(visibleNodes.map(n => n.id))

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

  const agentCount = agents.length
  const startAngleForCount = (count: number): number => {
    if (count === 2) return Math.PI
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
      const direction = Math.cos(parentAngle) >= 0 ? 1 : -1
      const angle = parentAngle + direction * PERIPHERAL_ANGULAR_NUDGE
      angleByNode.set(group[0].id, angle)
      byId.set(group[0].id, { x: Math.cos(angle) * RING_OUTER, y: Math.sin(angle) * RING_OUTER })
      continue
    }

    const arcSize = Math.min(Math.PI / 2.5, 0.22 * group.length)
    group.forEach((node, i) => {
      const offset = (i / (group.length - 1) - 0.5) * arcSize
      const angle = parentAngle + offset
      angleByNode.set(node.id, angle)
      byId.set(node.id, { x: Math.cos(angle) * RING_OUTER, y: Math.sin(angle) * RING_OUTER })
    })
  }

  const tail = [...peripherals.filter(n => !byId.has(n.id)), ...unknowns.filter(n => !byId.has(n.id))]
  if (tail.length > 0) {
    const step = 0.5
    const startAngle = Math.PI / 2 - ((tail.length - 1) * step) / 2
    tail.forEach((node, i) => {
      const angle = startAngle + i * step
      byId.set(node.id, { x: Math.cos(angle) * RING_OUTER, y: Math.sin(angle) * RING_OUTER })
    })
  }

  return { byId }
}
