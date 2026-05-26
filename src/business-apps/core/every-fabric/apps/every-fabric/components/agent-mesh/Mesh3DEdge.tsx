// 3D edge between two nodes — a very subtle theme-coloured quadratic bezier
// line that visually matches the 2D React Flow edges. Active edges add a
// small bright "comet" pulse that travels along the curve, providing a
// clear, modern signal of activity without overwhelming the scene.

import { memo, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import type { MeshEdgeKind } from '../../utils/traceModel'
import type { MeshPhysicsHandle } from './useMeshPhysics'
import type { MeshThemeColors } from './useMeshTheme'

export interface Mesh3DEdgeProps {
  id: string
  source: string
  target: string
  kind: MeshEdgeKind
  isActive: boolean
  isFailed: boolean
  isResolved: boolean
  isUpcoming: boolean
  isDimmed: boolean
  hasDetail: boolean
  physics: MeshPhysicsHandle
  colors: MeshThemeColors
  reducedMotion: boolean
  onSelect: (edgeId: string) => void
}

// Subtle by default: thin line, low opacity. Active state nudges it a touch
// brighter but the focus signal is the travelling pulse, not the line itself.
const BASE_LINE_WIDTH = 0.6
const ACTIVE_LINE_WIDTH = 1
const PULSE_SPEED = 0.35 // cycles per second along the curve

function edgeIdleColor(colors: MeshThemeColors): string {
  return colors.border
}

function edgeActiveColor(kind: MeshEdgeKind, colors: MeshThemeColors): string {
  switch (kind) {
    case 'delegation':
      return colors.primary
    case 'expert_call':
      return colors.secondary
    case 'tool_call':
      return colors.accent
    case 'skill_load':
      return colors.ai || colors.primary
    case 'completion':
      return colors.mutedForeground
    default:
      return colors.primary
  }
}

/** Evaluate quadratic bezier at t∈[0,1]. P(t) = (1-t)²A + 2(1-t)t·C + t²B */
function quadBezierAt(t: number, a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, out: THREE.Vector3): void {
  const u = 1 - t
  out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z
  )
}

/** Stable phase offset in [0,1) derived from the edge id so concurrent
 *  pulses on different edges don't move in lockstep. */
function edgePhase(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + (id.codePointAt(i) ?? 0)) >>> 0
  }
  return (h % 1000) / 1000
}

function resolveEdgeTargetOpacity(
  isDimmed: boolean,
  isUpcoming: boolean,
  isResolved: boolean,
  isActive: boolean
): number {
  if (isDimmed) return 0.06
  if (isUpcoming) return 0.08
  if (isResolved && !isActive) return 0.22
  if (isActive) return 0.45
  return 0.18
}

interface EdgePulseUpdateContext {
  pulseScale: number
  state: { clock: { elapsedTime: number } }
  id: string
  start: THREE.Vector3
  mid: THREE.Vector3
  end: THREE.Vector3
  pulsePos: THREE.Vector3
  pulseRef: RefObject<THREE.Mesh | null>
  pulseGlowRef: RefObject<THREE.Mesh | null>
  isFailed: boolean
  failedColor: THREE.Color
  activeColor: THREE.Color
}

function updateEdgePulseMeshes(ctx: EdgePulseUpdateContext): void {
  const { pulseRef, pulseGlowRef, pulseScale } = ctx
  if (!pulseRef.current || !pulseGlowRef.current) return
  if (pulseScale <= 0.01) {
    pulseRef.current.visible = false
    pulseGlowRef.current.visible = false
    return
  }
  const phase = (ctx.state.clock.elapsedTime * PULSE_SPEED + edgePhase(ctx.id)) % 1
  quadBezierAt(phase, ctx.start, ctx.mid, ctx.end, ctx.pulsePos)
  pulseRef.current.position.copy(ctx.pulsePos)
  pulseGlowRef.current.position.copy(ctx.pulsePos)
  pulseRef.current.scale.setScalar(pulseScale)
  pulseGlowRef.current.scale.setScalar(pulseScale)
  pulseRef.current.visible = true
  pulseGlowRef.current.visible = true
  const coreMat = pulseRef.current.material as THREE.MeshBasicMaterial
  const glowMat = pulseGlowRef.current.material as THREE.MeshBasicMaterial
  if (ctx.isFailed) {
    coreMat.color.copy(ctx.failedColor)
    glowMat.color.copy(ctx.failedColor)
    return
  }
  coreMat.color.copy(ctx.activeColor)
  glowMat.color.copy(ctx.activeColor)
}

function Mesh3DEdgeBase({
  id,
  source,
  target,
  kind,
  isActive,
  isFailed,
  isResolved,
  isUpcoming,
  isDimmed,
  hasDetail,
  physics,
  colors,
  reducedMotion,
  onSelect
}: Readonly<Mesh3DEdgeProps>) {
  const lineRef = useRef<any>(null)
  const pulseRef = useRef<THREE.Mesh>(null)
  const pulseGlowRef = useRef<THREE.Mesh>(null)
  const [start] = useState(() => new THREE.Vector3())
  const [end] = useState(() => new THREE.Vector3())
  const [mid] = useState(() => new THREE.Vector3())

  const idleColor = useMemo(() => new THREE.Color(edgeIdleColor(colors)), [colors])
  const activeColor = useMemo(() => new THREE.Color(edgeActiveColor(kind, colors)), [kind, colors])
  const failedColor = useMemo(() => new THREE.Color(colors.destructive), [colors.destructive])

  const animState = useRef({
    active: 0,
    opacity: 0.18,
    width: BASE_LINE_WIDTH,
    pulseScale: 0
  })

  const normal = useMemo(() => new THREE.Vector3(), [])
  const chord = useMemo(() => new THREE.Vector3(), [])
  const pulsePos = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const a = physics.getPosition(source)
    const b = physics.getPosition(target)
    if (!a || !b || !lineRef.current) return

    start.set(a.x, a.y, a.z)
    end.set(b.x, b.y, b.z)
    mid.copy(start).add(end).multiplyScalar(0.5)

    chord.copy(end).sub(start)
    const chordLen = chord.length() || 1
    normal.set(-chord.z, chord.x * 0.2, chord.x).normalize()
    if (!Number.isFinite(normal.x)) normal.set(0, 1, 0)
    const bow = Math.min(40, chordLen * 0.15)
    mid.add(normal.multiplyScalar(bow))

    lineRef.current.setPoints(start, end, mid)

    const mat = lineRef.current.material
    if (!mat) return

    const targetActive = isActive ? 1 : 0
    animState.current.active += (targetActive - animState.current.active) * Math.min(1, dt * 6)
    const a01 = animState.current.active

    if (isFailed) {
      mat.color.copy(failedColor)
    } else {
      mat.color.copy(idleColor).lerp(activeColor, a01)
    }

    // Much more subtle baseline opacity — the pulse carries the signal,
    // not the line. Resolved/upcoming dim further. Active gets a slight boost.
    const targetOpacity = resolveEdgeTargetOpacity(isDimmed, isUpcoming, isResolved, isActive)
    animState.current.opacity += (targetOpacity - animState.current.opacity) * Math.min(1, dt * 6)
    mat.opacity = animState.current.opacity
    mat.transparent = true

    const targetWidth = isActive ? ACTIVE_LINE_WIDTH : BASE_LINE_WIDTH
    animState.current.width += (targetWidth - animState.current.width) * Math.min(1, dt * 6)
    mat.linewidth = animState.current.width
    mat.dashed = false

    // ── Travelling pulse ──────────────────────────────────────────────────
    // Eases in/out when active toggles so it doesn't pop. When fully off,
    // the pulse meshes are scaled to 0 (effectively invisible, no overdraw).
    const targetPulseScale = isActive && !reducedMotion ? 1 : 0
    animState.current.pulseScale += (targetPulseScale - animState.current.pulseScale) * Math.min(1, dt * 8)
    const pulseScale = animState.current.pulseScale

    updateEdgePulseMeshes({
      pulseScale,
      state,
      id,
      start,
      mid,
      end,
      pulsePos,
      pulseRef,
      pulseGlowRef,
      isFailed,
      failedColor,
      activeColor
    })
  })

  return (
    <group
      onPointerDown={
        hasDetail
          ? e => {
              e.stopPropagation()
              onSelect(id)
            }
          : undefined
      }
    >
      <QuadraticBezierLine
        ref={lineRef}
        start={start}
        end={end}
        mid={mid}
        color={idleColor}
        lineWidth={BASE_LINE_WIDTH}
        transparent
        opacity={0.18}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
      {/* Travelling pulse: R3F three.js intrinsics (see reactThreeFiber.d.ts). */}
      <mesh ref={pulseGlowRef} visible={false} renderOrder={2}>
        {' '}
        {/* NOSONAR S6747 */}
        <sphereGeometry args={[7, 16, 16]} /> {/* NOSONAR S6747 */}
        <meshBasicMaterial
          color={activeColor}
          transparent // NOSONAR S6747
          opacity={0.35}
          blending={THREE.AdditiveBlending} // NOSONAR S6747
          depthWrite={false} // NOSONAR S6747
        />
      </mesh>
      <mesh ref={pulseRef} visible={false} renderOrder={3}>
        {' '}
        {/* NOSONAR S6747 */}
        <sphereGeometry args={[2.6, 16, 16]} /> {/* NOSONAR S6747 */}
        <meshBasicMaterial
          color={activeColor}
          transparent // NOSONAR S6747
          opacity={0.95}
          blending={THREE.AdditiveBlending} // NOSONAR S6747
          depthWrite={false} // NOSONAR S6747
          toneMapped={false} // NOSONAR S6747
        />
      </mesh>
    </group>
  )
}

export const Mesh3DEdge = memo(Mesh3DEdgeBase)
Mesh3DEdge.displayName = 'Mesh3DEdge'
