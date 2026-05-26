// 3D initial layout for the Mesh3DGraph renderer.
//
// This is intentionally not the 2D radial layout lifted by a tiny z offset.
// Agents live on a real spherical shell around the orchestrator; skills/tools
// orbit their parent agent in small local 3D clusters. That keeps the graph
// volumetric from every orbit angle instead of collapsing into a flat disk.

import type { MeshEdge, MeshNode } from '../../utils/traceModel'
import { ORCHESTRATOR_NODE_ID } from '../../utils/traceModel'
import { isAgentKind } from './meshLayout'

export interface Vec3 {
  x: number
  y: number
  z: number
}

// Deterministic hash → [0,1) so the same id always lifts to the same z.
function hash01(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.codePointAt(i) ?? 0
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  }
}

function fibonacciSpherePoint(index: number, count: number, radius: number, id: string): Vec3 {
  if (count <= 1) return { x: radius * 0.72, y: radius * 0.36, z: radius * 0.52 }
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const t = (index + 0.5) / count
  // Keep some breathing room near the poles so labels don't stack vertically.
  const yNorm = 1 - 2 * t
  const horizontal = Math.sqrt(Math.max(0, 1 - yNorm * yNorm))

  // Add organic noise to the distribution
  const noise = (hash01(id) - 0.5) * 0.4
  const theta = index * goldenAngle + noise

  // Add slight radius variation for a less perfect sphere
  const r = radius * (1 + (hash01(id + 'r') - 0.5) * 0.15)

  return {
    x: Math.cos(theta) * horizontal * r,
    y: yNorm * r * 0.82,
    z: Math.sin(theta) * horizontal * r
  }
}

export interface Mesh3DLayout {
  byId: Map<string, Vec3>
  /** Edge id → rest length derived from the initial 3D distance. Spring uses this. */
  restLengthByEdgeId: Map<string, number>
}

function buildParentByChild(visibleEdges: MeshEdge[], visibleIdSet: Set<string>): Map<string, string> {
  const parentByChild = new Map<string, string>()
  for (const edge of visibleEdges) {
    if (edge.kind === 'completion') continue
    if (edge.source === edge.target) continue
    if (!visibleIdSet.has(edge.source) || !visibleIdSet.has(edge.target)) continue
    if (!parentByChild.has(edge.target)) parentByChild.set(edge.target, edge.source)
  }
  return parentByChild
}

function groupPeripheralsByAnchor(
  peripherals: MeshNode[],
  parentByChild: Map<string, string>,
  nodesById: Map<string, MeshNode>,
  byId: Map<string, Vec3>
): Map<string, MeshNode[]> {
  const childrenByParent = new Map<string, MeshNode[]>()
  for (const node of peripherals) {
    const parentId = parentByChild.get(node.id)
    const parent = parentId ? nodesById.get(parentId) : undefined
    const anchorId = parent && byId.has(parent.id) ? parent.id : ORCHESTRATOR_NODE_ID
    const list = childrenByParent.get(anchorId) ?? []
    list.push(node)
    childrenByParent.set(anchorId, list)
  }
  return childrenByParent
}

function layoutPeripheralOrbits(
  childrenByParent: Map<string, MeshNode[]>,
  byId: Map<string, Vec3>,
  agentShellRadius: number
): void {
  for (const [parentId, children] of childrenByParent) {
    const parentPos = byId.get(parentId) ?? { x: 0, y: 0, z: 0 }
    const radial = normalize(parentId === ORCHESTRATOR_NODE_ID ? { x: 0.6, y: 0.35, z: 0.72 } : parentPos)
    let tangentA = cross(radial, { x: 0, y: 1, z: 0 })
    if (Math.abs(tangentA.x) + Math.abs(tangentA.y) + Math.abs(tangentA.z) < 0.001) {
      tangentA = cross(radial, { x: 1, y: 0, z: 0 })
    }
    tangentA = normalize(tangentA)
    const tangentB = normalize(cross(radial, tangentA))
    const orbitRadius = Math.min(300, Math.max(120, 80 + children.length * 8))
    const outward = parentId === ORCHESTRATOR_NODE_ID ? agentShellRadius * 0.75 : 120
    children.forEach((node, index) => {
      const angle = (index / Math.max(children.length, 1)) * Math.PI * 2 + (hash01(node.id) - 0.5) * 1.2
      const helix = (index - (children.length - 1) / 2) * 15
      const local = add(
        scale(tangentA, Math.cos(angle) * orbitRadius),
        scale(tangentB, Math.sin(angle) * orbitRadius + helix)
      )
      const zNudge = scale(radial, outward + (hash01(`${node.id}:out`) - 0.5) * 60)
      byId.set(node.id, add(add(parentPos, zNudge), local))
    })
  }
}

function buildRestLengths(visibleEdges: MeshEdge[], byId: Map<string, Vec3>): Map<string, number> {
  const restLengthByEdgeId = new Map<string, number>()
  for (const edge of visibleEdges) {
    const a = byId.get(edge.source)
    const b = byId.get(edge.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dz = b.z - a.z
    const len = Math.hypot(dx, dy, dz)
    restLengthByEdgeId.set(edge.id, Math.max(60, len))
  }
  return restLengthByEdgeId
}

export function computeMesh3DLayout(visibleNodes: MeshNode[], visibleEdges: MeshEdge[]): Mesh3DLayout {
  const byId = new Map<string, Vec3>()
  const visibleIdSet = new Set(visibleNodes.map(node => node.id))

  byId.set(ORCHESTRATOR_NODE_ID, { x: 0, y: 0, z: 0 })

  const parentByChild = buildParentByChild(visibleEdges, visibleIdSet)
  const nodesById = new Map(visibleNodes.map(node => [node.id, node]))
  const nonOrchestrator = visibleNodes.filter(node => node.id !== ORCHESTRATOR_NODE_ID)
  const agents = nonOrchestrator.filter(node => isAgentKind(node.kind)).sort((a, b) => a.firstSeenSeq - b.firstSeenSeq)
  const peripherals = nonOrchestrator.filter(node => node.kind === 'skill' || node.kind === 'tool')
  const otherNodes = nonOrchestrator.filter(
    node => !isAgentKind(node.kind) && node.kind !== 'skill' && node.kind !== 'tool'
  )

  const agentShellRadius = Math.min(1200, Math.max(400, 300 + Math.sqrt(Math.max(agents.length, 1)) * 60))
  agents.forEach((node, index) => {
    byId.set(node.id, fibonacciSpherePoint(index, agents.length, agentShellRadius, node.id))
  })

  const childrenByParent = groupPeripheralsByAnchor(peripherals, parentByChild, nodesById, byId)
  layoutPeripheralOrbits(childrenByParent, byId, agentShellRadius)

  const outerShellRadius = agentShellRadius + 300
  otherNodes.forEach((node, index) => {
    byId.set(node.id, fibonacciSpherePoint(index, otherNodes.length, outerShellRadius, node.id))
  })

  let fallbackIndex = 0
  for (const node of visibleNodes) {
    if (byId.has(node.id)) continue
    byId.set(node.id, fibonacciSpherePoint(fallbackIndex++, visibleNodes.length, outerShellRadius, node.id))
  }

  return { byId, restLengthByEdgeId: buildRestLengths(visibleEdges, byId) }
}

/** Helpers to convert between three.js space (y-up) and our world space which is the same. */
export function vec3Distance(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  return Math.hypot(dx, dy, dz)
}
