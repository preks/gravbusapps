// Spring-mass simulation for the 3D agent mesh.
//
// Goals:
//   - "Chewing-gum" feel: dragging a node visibly stretches its edges and
//     pulls connected neighbours along with a delay, then the whole graph
//     softly relaxes back when the pointer is released.
//   - Orchestrator is anchored (immovable) so the mesh has a stable core.
//   - Cheap on large graphs (Company aggregate can reach hundreds of nodes):
//     all-pairs repulsion is replaced by a spatial-hash grid that only
//     pushes apart nearby neighbours.
//   - No React state churn — positions live in plain arrays and are read
//     each frame by mutating `Object3D.position` directly.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MeshEdge, MeshNode } from '../../utils/traceModel'
import { ORCHESTRATOR_NODE_ID } from '../../utils/traceModel'
import { NODE_SIZE } from './meshLayout'
import { computeMesh3DLayout, type Vec3 } from './mesh3DLayout'

/** Tunables — see plan. Values picked for a soft, gooey settle. */
const STIFFNESS = 4.5 // Softer springs for more organic feel
const DAMPING_PER_SECOND = 0.88 ** 60 // Higher damping for less jitter
const CENTER_PULL = 0.25 // Less rigid center pull to allow wider spread
const REPULSION = 2000 // Stronger repulsion for larger layout
const MAX_DT = 1 / 30
const NEIGHBOUR_RADIUS_FALLBACK = 90 // Larger cells for larger nodes
const VELOCITY_CLAMP = 800

function compareIdsByLocale(a: string, b: string): number {
  return a.localeCompare(b)
}

function nodeMassForKind(kind: MeshNode['kind']): number {
  if (kind === 'orchestrator') return 1e6
  if (kind === 'subagent' || kind === 'expert') return 2.5
  return 1
}

/** Internal per-node state. */
interface NodeState {
  id: string
  pos: { x: number; y: number; z: number }
  vel: { x: number; y: number; z: number }
  mass: number
  radius: number
  isPinned: boolean
  isDragged: boolean
}

interface EdgeSpring {
  a: number // index into nodes[]
  b: number
  restLength: number
}

export interface MeshPhysicsHandle {
  /** Snapshot a node's current position. Used by edge tubes each frame. */
  getPosition(nodeId: string): Vec3 | undefined
  /** Subscribe a callback fired each tick. Returns an unsubscribe. */
  subscribe(cb: () => void): () => void
  /** Begin dragging a node. The caller takes over its position via setDragPosition. */
  beginDrag(nodeId: string): void
  /** Update a dragged node's position (world space). Imparts no velocity. */
  setDragPosition(nodeId: string, p: Vec3): void
  /** Release a dragged node. Imparts a small outward velocity proxy from drag delta. */
  endDrag(nodeId: string): void
  /** Returns true if the node is currently being dragged. */
  isDragging(nodeId: string): boolean
  /** Reset the simulation to the initial layout (used by double-click). */
  reset(): void
}

class MeshPhysicsSim {
  nodes: NodeState[] = []
  nodeIndexById = new Map<string, number>()
  springs: EdgeSpring[] = []
  cellSize = NEIGHBOUR_RADIUS_FALLBACK * 2
  subscribers = new Set<() => void>()
  private readonly initialPositions = new Map<string, Vec3>()
  private readonly lastDragPosByNode = new Map<string, Vec3>()
  private readonly throttleHz: number
  private accum = 0

  constructor(visibleNodes: MeshNode[], visibleEdges: MeshEdge[]) {
    const { byId, restLengthByEdgeId } = computeMesh3DLayout(visibleNodes, visibleEdges)
    this.throttleHz = visibleNodes.length > 200 ? 30 : 60

    for (const node of visibleNodes) {
      const p = byId.get(node.id) ?? { x: 0, y: 0, z: 0 }
      const radius = (NODE_SIZE[node.kind] ?? 60) / 2
      const isPinned = node.id === ORCHESTRATOR_NODE_ID
      const idx = this.nodes.length
      this.nodes.push({
        id: node.id,
        pos: { x: p.x, y: p.y, z: p.z },
        vel: { x: 0, y: 0, z: 0 },
        mass: nodeMassForKind(node.kind),
        radius,
        isPinned,
        isDragged: false
      })
      this.nodeIndexById.set(node.id, idx)
      this.initialPositions.set(node.id, { x: p.x, y: p.y, z: p.z })
    }

    // Cell size = ~2× max node radius so we only check immediate neighbours.
    let maxR = 32
    for (const n of this.nodes) if (n.radius > maxR) maxR = n.radius
    this.cellSize = Math.max(NEIGHBOUR_RADIUS_FALLBACK, maxR * 2.2)

    for (const edge of visibleEdges) {
      if (edge.kind === 'completion') continue
      const a = this.nodeIndexById.get(edge.source)
      const b = this.nodeIndexById.get(edge.target)
      if (a == null || b == null) continue
      // Increase rest length significantly to match the new expanded layout
      this.springs.push({ a, b, restLength: (restLengthByEdgeId.get(edge.id) ?? 220) * 1.5 })
    }
  }

  private applySpringForces(dt: number): void {
    for (const spring of this.springs) {
      const a = this.nodes[spring.a]
      const b = this.nodes[spring.b]
      const dx = b.pos.x - a.pos.x
      const dy = b.pos.y - a.pos.y
      const dz = b.pos.z - a.pos.z
      const len = Math.hypot(dx, dy, dz) || 0.0001
      const stretch = len - spring.restLength
      const f = (STIFFNESS * stretch) / len
      const fx = f * dx
      const fy = f * dy
      const fz = f * dz
      if (!a.isPinned && !a.isDragged) {
        a.vel.x += (fx / a.mass) * dt
        a.vel.y += (fy / a.mass) * dt
        a.vel.z += (fz / a.mass) * dt
      }
      if (!b.isPinned && !b.isDragged) {
        b.vel.x -= (fx / b.mass) * dt
        b.vel.y -= (fy / b.mass) * dt
        b.vel.z -= (fz / b.mass) * dt
      }
    }
  }

  private buildSpatialGrid(): Map<string, number[]> {
    const grid = new Map<string, number[]>()
    const cs = this.cellSize
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]
      const cx = Math.floor(n.pos.x / cs)
      const cy = Math.floor(n.pos.y / cs)
      const cz = Math.floor(n.pos.z / cs)
      const key = `${cx}|${cy}|${cz}`
      const list = grid.get(key) ?? []
      list.push(i)
      grid.set(key, list)
    }
    return grid
  }

  private applyRepulsionForNode(n: NodeState, i: number, grid: Map<string, number[]>, dt: number): void {
    if (n.isPinned && !n.isDragged) return
    const cs = this.cellSize
    const cx = Math.floor(n.pos.x / cs)
    const cy = Math.floor(n.pos.y / cs)
    const cz = Math.floor(n.pos.z / cs)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx}|${cy + dy}|${cz + dz}`
          const bucket = grid.get(key)
          if (!bucket) continue
          this.applyRepulsionBetween(n, i, bucket, dt)
        }
      }
    }
  }

  private applyRepulsionFromGrid(grid: Map<string, number[]>, dt: number): void {
    for (let i = 0; i < this.nodes.length; i++) {
      this.applyRepulsionForNode(this.nodes[i], i, grid, dt)
    }
  }

  private applyRepulsionBetween(n: NodeState, i: number, bucket: number[], dt: number): void {
    for (const j of bucket) {
      if (j <= i) continue
      const m = this.nodes[j]
      const ddx = m.pos.x - n.pos.x
      const ddy = m.pos.y - n.pos.y
      const ddz = m.pos.z - n.pos.z
      const d2 = ddx * ddx + ddy * ddy + ddz * ddz + 0.01
      const minDist = n.radius + m.radius + 8
      const minDist2 = minDist * minDist
      if (d2 > minDist2 * 9) continue
      const d = Math.sqrt(d2)
      const fr = REPULSION / d2
      const ux = ddx / d
      const uy = ddy / d
      const uz = ddz / d
      if (!n.isPinned && !n.isDragged) {
        n.vel.x -= ux * fr * dt
        n.vel.y -= uy * fr * dt
        n.vel.z -= uz * fr * dt
      }
      if (!m.isPinned && !m.isDragged) {
        m.vel.x += ux * fr * dt
        m.vel.y += uy * fr * dt
        m.vel.z += uz * fr * dt
      }
    }
  }

  private integrateAndDamp(dt: number, dampScale: number): void {
    for (const n of this.nodes) {
      if (n.isPinned) continue
      if (!n.isDragged) {
        n.vel.x += -CENTER_PULL * n.pos.x * dt * 0.01
        n.vel.y += -CENTER_PULL * n.pos.y * dt * 0.01
        n.vel.z += -CENTER_PULL * n.pos.z * dt * 0.01
        n.vel.x *= dampScale
        n.vel.y *= dampScale
        n.vel.z *= dampScale
        const vmag = Math.hypot(n.vel.x, n.vel.y, n.vel.z)
        if (vmag > VELOCITY_CLAMP) {
          const s = VELOCITY_CLAMP / vmag
          n.vel.x *= s
          n.vel.y *= s
          n.vel.z *= s
        }
        n.pos.x += n.vel.x * dt
        n.pos.y += n.vel.y * dt
        n.pos.z += n.vel.z * dt
      }
    }
  }

  step(dtRaw: number) {
    const targetDt = 1 / this.throttleHz
    this.accum += dtRaw
    if (this.accum < targetDt) return
    const dt = Math.min(this.accum, MAX_DT)
    this.accum = 0

    this.applySpringForces(dt)
    const grid = this.buildSpatialGrid()
    this.applyRepulsionFromGrid(grid, dt)
    this.integrateAndDamp(dt, Math.pow(DAMPING_PER_SECOND, dt))

    for (const cb of this.subscribers) cb()
  }

  getPosition(nodeId: string): Vec3 | undefined {
    const idx = this.nodeIndexById.get(nodeId)
    if (idx == null) return undefined
    const p = this.nodes[idx].pos
    return { x: p.x, y: p.y, z: p.z }
  }

  beginDrag(nodeId: string) {
    const idx = this.nodeIndexById.get(nodeId)
    if (idx == null) return
    const n = this.nodes[idx]
    if (n.isPinned) return
    n.isDragged = true
    n.vel.x = 0
    n.vel.y = 0
    n.vel.z = 0
    this.lastDragPosByNode.set(nodeId, { x: n.pos.x, y: n.pos.y, z: n.pos.z })
  }

  setDragPosition(nodeId: string, p: Vec3) {
    const idx = this.nodeIndexById.get(nodeId)
    if (idx == null) return
    const n = this.nodes[idx]
    if (!n.isDragged) return
    n.pos.x = p.x
    n.pos.y = p.y
    n.pos.z = p.z
    this.lastDragPosByNode.set(nodeId, { x: p.x, y: p.y, z: p.z })
  }

  endDrag(nodeId: string) {
    const idx = this.nodeIndexById.get(nodeId)
    if (idx == null) return
    const n = this.nodes[idx]
    if (!n.isDragged) return
    n.isDragged = false
    // Give the released node a tiny velocity from the last drag delta so the
    // system doesn't snap with infinite stiffness on release.
    n.vel.x = 0
    n.vel.y = 0
    n.vel.z = 0
  }

  isDragging(nodeId: string): boolean {
    const idx = this.nodeIndexById.get(nodeId)
    if (idx == null) return false
    return this.nodes[idx].isDragged
  }

  reset() {
    for (const n of this.nodes) {
      const p = this.initialPositions.get(n.id)
      if (!p) continue
      n.pos.x = p.x
      n.pos.y = p.y
      n.pos.z = p.z
      n.vel.x = 0
      n.vel.y = 0
      n.vel.z = 0
      n.isDragged = false
    }
  }

  subscribe(cb: () => void) {
    this.subscribers.add(cb)
    return () => {
      this.subscribers.delete(cb)
    }
  }
}

/**
 * Build a physics simulation tied to the given visible nodes/edges. The
 * simulation is recreated whenever the graph's structural fingerprint
 * changes; positions of unchanged nodes are preserved.
 */
export function useMeshPhysics(visibleNodes: MeshNode[], visibleEdges: MeshEdge[]): MeshPhysicsHandle {
  // Fingerprint = sorted ids. Same set of nodes/edges → reuse sim.
  const fingerprint = useMemo(() => {
    const n = visibleNodes
      .map(node => node.id)
      .sort(compareIdsByLocale)
      .join('|')
    const e = visibleEdges
      .filter(edge => edge.kind !== 'completion')
      .map(edge => edge.id)
      .sort(compareIdsByLocale)
      .join('|')
    return `${n}::${e}`
  }, [visibleNodes, visibleEdges])

  const simRef = useRef<MeshPhysicsSim | null>(null)
  const previousFingerprint = useRef<string | null>(null)

  if (simRef.current === null || previousFingerprint.current !== fingerprint) {
    const next = new MeshPhysicsSim(visibleNodes, visibleEdges)
    // If we had a previous sim, copy positions across for matching ids so
    // adding/removing one node doesn't snap the whole graph.
    const previous = simRef.current
    if (previous) {
      for (const n of next.nodes) {
        const prevIdx = previous.nodeIndexById.get(n.id)
        if (prevIdx == null) continue
        const prev = previous.nodes[prevIdx]
        n.pos.x = prev.pos.x
        n.pos.y = prev.pos.y
        n.pos.z = prev.pos.z
      }
    }
    simRef.current = next
    previousFingerprint.current = fingerprint
  }

  useFrame((_state, dt) => {
    const sim = simRef.current
    if (!sim) return
    sim.step(dt)
  })

  useEffect(() => {
    return () => {
      simRef.current = null
    }
  }, [])

  const handle = useMemo<MeshPhysicsHandle>(
    () => ({
      getPosition: id => simRef.current?.getPosition(id),
      subscribe: cb => simRef.current?.subscribe(cb) ?? (() => {}),
      beginDrag: id => simRef.current?.beginDrag(id),
      setDragPosition: (id, p) => simRef.current?.setDragPosition(id, p),
      endDrag: id => simRef.current?.endDrag(id),
      isDragging: id => simRef.current?.isDragging(id) ?? false,
      reset: () => simRef.current?.reset()
    }),
    []
  )

  return handle
}
