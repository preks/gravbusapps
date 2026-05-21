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

/**
 * Bounding box dimensions per kind.
 * Width accounts for the label text below the icon (truncated with ellipsis).
 * Height accounts for icon + label + category tag.
 */
const BBOX_WIDTH: Record<MeshNodeKind, number> = {
  orchestrator: 92,
  subagent: 150,
  expert: 150,
  skill: 110,
  tool: 95
}

const BBOX_HEIGHT: Record<MeshNodeKind, number> = {
  orchestrator: 100,
  subagent: 90,
  expert: 90,
  skill: 78,
  tool: 68
}

const MIN_GAP = 10
const RING_INNER_DEPTH_STEP = 130

export const KIND_CATEGORY: Record<MeshNodeKind, string> = {
  orchestrator: 'EVERY',
  subagent: 'ENTERPRISE AGENT',
  expert: 'ENTERPRISE AGENT',
  skill: 'SKILL',
  tool: 'TOOL'
}

export const isAgentKind = (kind: MeshNodeKind): boolean => kind === 'subagent' || kind === 'expert'
const isPeripheralKind = (kind: MeshNodeKind): boolean => kind === 'tool' || kind === 'skill'

export interface RadialPositions {
  byId: Map<string, { x: number; y: number }>
}

interface BBox {
  halfW: number
  halfH: number
}

function getBBox(kind: MeshNodeKind): BBox {
  return { halfW: BBOX_WIDTH[kind] / 2, halfH: BBOX_HEIGHT[kind] / 2 }
}

function computeMinRingRadius(nodeCount: number, kind: MeshNodeKind): number {
  if (nodeCount <= 1) return 200
  if (nodeCount <= 3) return 240
  const itemFootprint = BBOX_WIDTH[kind] + MIN_GAP
  const circumference = nodeCount * itemFootprint
  return Math.max(240, circumference / (2 * Math.PI))
}

/**
 * Radial layout: orchestrator at centre, agents on inner ring, tools/skills
 * on outer ring anchored to their parent agent's angle.
 * Uses AABB collision resolution to guarantee no overlap.
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

  const ringInner = computeMinRingRadius(agents.length, 'subagent')

  const agentCount = agents.length

  if (agentCount > 0) {
    // Distribute agents evenly around the circle. Start angle avoids pure
    // vertical stacking for 1-2 agents by using a diagonal offset.
    const startAngle = agentCount === 1 ? -Math.PI / 4 : agentCount === 2 ? Math.PI : -Math.PI / 2
    agents.forEach((node, i) => {
      const angle = startAngle + (i * 2 * Math.PI) / agentCount
      angleByNode.set(node.id, angle)
      const depth = depthByNode.get(node.id) ?? 1
      const radius = ringInner + Math.max(0, depth - 1) * RING_INNER_DEPTH_STEP
      byId.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
    })
  }

  const totalPeripherals = peripherals.length + unknowns.length
  const ringOuter = Math.max(
    ringInner + BBOX_HEIGHT.subagent + MIN_GAP + BBOX_HEIGHT.tool,
    computeMinRingRadius(totalPeripherals, 'tool')
  )

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
      // Offset single child slightly sideways so it doesn't stack on the parent
      const nudge = Math.PI / 8
      const angle = parentAngle + nudge
      angleByNode.set(group[0].id, angle)
      byId.set(group[0].id, { x: Math.cos(angle) * ringOuter, y: Math.sin(angle) * ringOuter })
      continue
    }

    // Spread evenly across an arc centered on the parent's angle
    const itemArcLen = (BBOX_WIDTH.tool + MIN_GAP) / ringOuter
    const minArc = group.length * itemArcLen
    const arcSize = Math.max(minArc, 0.4 * group.length)
    group.forEach((node, i) => {
      const offset = (i / (group.length - 1) - 0.5) * arcSize
      const angle = parentAngle + offset
      angleByNode.set(node.id, angle)
      byId.set(node.id, { x: Math.cos(angle) * ringOuter, y: Math.sin(angle) * ringOuter })
    })
  }

  const tail = [...peripherals.filter(n => !byId.has(n.id)), ...unknowns.filter(n => !byId.has(n.id))]
  if (tail.length > 0) {
    const step = Math.max((2 * Math.PI) / Math.max(tail.length, 1), (BBOX_WIDTH.tool + MIN_GAP) / ringOuter)
    const startAngle = -Math.PI / 2
    tail.forEach((node, i) => {
      const angle = startAngle + i * step
      byId.set(node.id, { x: Math.cos(angle) * ringOuter, y: Math.sin(angle) * ringOuter })
    })
  }

  resolveAABBCollisions(byId, visibleNodes)

  return { byId }
}

/**
 * AABB-based collision resolution. Each node occupies a rectangle defined by
 * BBOX_WIDTH × BBOX_HEIGHT. When two rectangles overlap (including MIN_GAP),
 * the nodes are pushed apart along the axis of smallest overlap.
 * The orchestrator is fixed; only the other node moves.
 */
function resolveAABBCollisions(byId: Map<string, { x: number; y: number }>, nodes: MeshNodeModel[]) {
  const MAX_ITERATIONS = 80
  const allIds = nodes.map(n => n.id)
  const bboxById = new Map(nodes.map(n => [n.id, getBBox(n.kind)]))

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let maxOverlap = 0

    for (let i = 0; i < allIds.length; i++) {
      for (let j = i + 1; j < allIds.length; j++) {
        const idA = allIds[i]
        const idB = allIds[j]
        const a = byId.get(idA)!
        const b = byId.get(idB)!
        const bboxA = bboxById.get(idA)!
        const bboxB = bboxById.get(idB)!

        // Required separation on each axis (half-widths + half gap)
        const sepX = bboxA.halfW + bboxB.halfW + MIN_GAP
        const sepY = bboxA.halfH + bboxB.halfH + MIN_GAP

        const dx = b.x - a.x
        const dy = b.y - a.y
        const overlapX = sepX - Math.abs(dx)
        const overlapY = sepY - Math.abs(dy)

        if (overlapX <= 0 || overlapY <= 0) continue

        const overlap = Math.min(overlapX, overlapY)
        maxOverlap = Math.max(maxOverlap, overlap)

        // Push along axis of minimum overlap
        const aFixed = idA === ORCHESTRATOR_NODE_ID
        const bFixed = idB === ORCHESTRATOR_NODE_ID

        if (overlapX < overlapY) {
          const push = overlapX + 1
          const dir = dx >= 0 ? 1 : -1
          if (aFixed) {
            b.x += dir * push
          } else if (bFixed) {
            a.x -= dir * push
          } else {
            a.x -= dir * (push / 2)
            b.x += dir * (push / 2)
          }
        } else {
          const push = overlapY + 1
          const dir = dy >= 0 ? 1 : -1
          if (aFixed) {
            b.y += dir * push
          } else if (bFixed) {
            a.y -= dir * push
          } else {
            a.y -= dir * (push / 2)
            b.y += dir * (push / 2)
          }
        }
      }
    }

    // Converged — no overlaps remain
    if (maxOverlap <= 0) break
  }
}
