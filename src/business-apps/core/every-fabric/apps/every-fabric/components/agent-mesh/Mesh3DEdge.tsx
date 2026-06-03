// 3D edge between two nodes — a very subtle theme-coloured quadratic bezier
// line that visually matches the 2D React Flow edges. Active edges add a
// small bright "comet" pulse that travels along the curve, providing a
// clear, modern signal of activity without overwhelming the scene.

import { memo, useMemo, useRef, useState } from 'react'
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
  liveCount: number
  activityHeat: number
  hasDetail: boolean
  physics: MeshPhysicsHandle
  colors: MeshThemeColors
  reducedMotion: boolean
  onSelect: (edgeId: string) => void
}

// Subtle by default: thin line, low opacity. Active state nudges it a touch
// brighter but the focus signal is the travelling pulse, not the line itself.
const BASE_LINE_WIDTH = 0.6
const ACTIVE_LINE_WIDTH = 1.0
const PULSE_SPEED = 0.28 // cycles per second along the curve
const MAX_PULSES_PER_EDGE = 3

function edgeIdleColor(colors: MeshThemeColors): string {
  return colors.border
}

// Saturated warm-metal palette — the previous champagne yellows
// disappeared against the light environment map; these copper/amber tones
// pop on both light and dark themes while staying inside the "premium
// neural" aesthetic (no violet/cyan).
function edgeActiveColor(kind: MeshEdgeKind, _colors: MeshThemeColors): string {
  switch (kind) {
    case 'delegation':
      return '#f59e0b' // rich amber — orchestrator hand-off
    case 'expert_call':
      return '#ea580c' // deep amber-orange — expert routing
    case 'tool_call':
      return '#c2410c' // copper — tool invocation
    case 'skill_load':
      return '#fb923c' // bright champagne-orange — skill load
    case 'completion':
      return _colors.mutedForeground
    default:
      return '#f59e0b'
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
  liveCount,
  activityHeat,
  hasDetail,
  physics,
  colors,
  reducedMotion,
  onSelect
}: Mesh3DEdgeProps) {
  const lineRef = useRef<any>(null)
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([])
  const pulseGlowRefs = useRef<(THREE.Mesh | null)[]>([])
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
    if (!isFinite(normal.x)) normal.set(0, 1, 0)
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
    const targetOpacity = isDimmed
      ? 0.05
      : isUpcoming
        ? 0.07
        : isResolved && !isActive
          ? 0.18
          : isActive
            ? 0.42 + activityHeat * 0.22
            : 0.14
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

    const pulseCount = pulseScale > 0.01 ? Math.min(MAX_PULSES_PER_EDGE, Math.max(1, liveCount || 1)) : 0
    for (let i = 0; i < MAX_PULSES_PER_EDGE; i++) {
      const core = pulseRefs.current[i]
      const glow = pulseGlowRefs.current[i]
      if (!core || !glow) continue
      if (i < pulseCount) {
        const speed = PULSE_SPEED * (1 + Math.min(liveCount, 10) * 0.035)
        const phase = (state.clock.elapsedTime * speed + edgePhase(id) + i / pulseCount) % 1
        quadBezierAt(phase, start, mid, end, pulsePos)
        core.position.copy(pulsePos)
        glow.position.copy(pulsePos)
        core.scale.setScalar(pulseScale)
        glow.scale.setScalar(pulseScale * (0.8 + activityHeat * 0.2))
        core.visible = true
        glow.visible = true
        const coreMat = core.material as THREE.MeshBasicMaterial
        const glowMat = glow.material as THREE.MeshBasicMaterial
        if (isFailed) {
          coreMat.color.copy(failedColor)
          glowMat.color.copy(failedColor)
        } else {
          coreMat.color.copy(activeColor)
          glowMat.color.copy(activeColor)
        }
      } else {
        core.visible = false
        glow.visible = false
      }
    }
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
      {Array.from({ length: MAX_PULSES_PER_EDGE }).map((_, i) => (
        <group key={i}>
          {/* Wide soft halo — the "atmosphere" around the comet. */}
          <mesh
            ref={node => {
              pulseGlowRefs.current[i] = node
            }}
            visible={false}
            renderOrder={2}
          >
            <sphereGeometry args={[7.5, 20, 20]} />
            <meshBasicMaterial
              color={activeColor}
              transparent
              opacity={0.32}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* Bright sharp core — the comet head. toneMapped=false keeps it
             punchy regardless of overall scene exposure. */}
          <mesh
            ref={node => {
              pulseRefs.current[i] = node
            }}
            visible={false}
            renderOrder={3}
          >
            <sphereGeometry args={[2.6, 20, 20]} />
            <meshBasicMaterial
              color={activeColor}
              transparent
              opacity={1}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Stable phase offset in [0,1) derived from the edge id so concurrent
 *  pulses on different edges don't move in lockstep. */
function edgePhase(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return (h % 1000) / 1000
}

export const Mesh3DEdge = memo(Mesh3DEdgeBase)
Mesh3DEdge.displayName = 'Mesh3DEdge'
