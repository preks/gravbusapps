// 3D mesh node — renders the same 2D node UI (white card, icon, label,
// category, skill dots, running ring) as an Html billboard in 3D space.
// The mesh under it is an invisible sphere that owns raycasting + drag
// pointer events; the visible card is plain HTML so it looks identical to
// the 2D view at any orbit angle.

import { memo, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MeshNodeKind, MeshNodeStatus } from '../../utils/traceModel'
import { NODE_SIZE } from './meshLayout'
import { MeshNodeCardContent, meshNodeCardOpacityClass, meshNodeCircleShadow, meshNodeHitRadius } from './MeshNodeCard'
import type { MeshPhysicsHandle } from './useMeshPhysics'
import type { MeshThemeColors } from './useMeshTheme'

export interface Mesh3DNodeProps {
  id: string
  kind: MeshNodeKind
  label: string
  category: string
  status: MeshNodeStatus
  isSelected: boolean
  isActive: boolean
  isUpcoming: boolean
  isDimmed: boolean
  isHighlighted: boolean
  skillNames: string[]
  physics: MeshPhysicsHandle
  colors: MeshThemeColors
  reducedMotion: boolean
  /** Drag callbacks supplied by the scene — owns the raycast plane and click/drag arbitration. */
  onPointerDown: (id: string, event: ThreePointerEvent) => void
  onPointerMove: (id: string, event: ThreePointerEvent) => void
  onPointerUp: (id: string, event: ThreePointerEvent) => void
  onPointerEnter: (id: string) => void
  onPointerLeave: (id: string) => void
}

type ThreePointerEvent = Parameters<NonNullable<JSX.IntrinsicElements['mesh']['onPointerDown']>>[0]

function Mesh3DNodeBase({
  id,
  kind,
  label,
  category,
  status,
  isSelected,
  isActive,
  isUpcoming,
  isDimmed,
  isHighlighted,
  skillNames,
  physics,
  colors,
  reducedMotion,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerEnter,
  onPointerLeave
}: Readonly<Mesh3DNodeProps>) {
  const groupRef = useRef<THREE.Group>(null)
  const hitRadius = meshNodeHitRadius(kind)

  // Per-frame: sync the group position with the physics handle so the node
  // tracks drag + spring updates without React state churn.
  useFrame(() => {
    const p = physics.getPosition(id)
    if (p && groupRef.current) {
      groupRef.current.position.set(p.x, p.y, p.z)
    }
  })

  const size = NODE_SIZE[kind] ?? 60

  const stop = (e: ThreePointerEvent) => {
    e.stopPropagation()
  }

  // Memoize the card markup so React doesn't churn through the Html portal
  // every frame. The Html wrapper updates its style.transform on every frame
  // anyway, but the inner DOM tree should be stable to avoid layout reflows
  // (which is the main source of label flicker during orbit).
  const card = useMemo(
    () => (
      <div
        className={`gba:flex gba:flex-col gba:items-center gba:transition-opacity gba:duration-200 ${meshNodeCardOpacityClass(isUpcoming, isDimmed, isHighlighted, isSelected)}`}
        data-mesh-active={isActive ? 'true' : 'false'}
        data-mesh-selected={isSelected ? 'true' : 'false'}
        // translateZ(0) + will-change promote the card to its own compositor
        // layer, eliminating the sub-pixel text antialiasing flicker that
        // happens when Html updates style.transform every frame.
        style={{ transform: 'translateZ(0)', willChange: 'transform', backfaceVisibility: 'hidden' }}
      >
        <MeshNodeCardContent
          kind={kind}
          label={label}
          category={category}
          status={status}
          size={size}
          isSelected={isSelected}
          isActive={isActive}
          skillNames={skillNames}
          reducedMotion={reducedMotion}
          ringSurface="canvas3d"
          badgeClassName="gba:relative gba:flex gba:items-center gba:justify-center gba:rounded-full gba:border gba:bg-card/95 gba:backdrop-blur-sm gba:transition-shadow gba:duration-200"
          badgeStyle={{
            width: size,
            height: size,
            boxShadow: meshNodeCircleShadow(status, isSelected, isActive, colors.primary, colors.destructive)
          }}
        />
      </div>
    ),
    [
      kind,
      label,
      category,
      status,
      size,
      isSelected,
      isActive,
      isUpcoming,
      isDimmed,
      isHighlighted,
      skillNames,
      colors.primary,
      colors.destructive,
      reducedMotion
    ]
  )

  return (
    <group
      ref={groupRef}
      onPointerDown={e => {
        stop(e)
        onPointerDown(id, e)
      }}
      onPointerMove={e => onPointerMove(id, e)}
      onPointerUp={e => {
        stop(e)
        onPointerUp(id, e)
      }}
      onPointerOver={e => {
        stop(e)
        onPointerEnter(id)
      }}
      onPointerOut={() => onPointerLeave(id)}
    >
      {/* Invisible hitbox owns the pointer events + drag raycasting. */}
      <mesh>
        {' '}
        {/* NOSONAR S6747 */}
        <sphereGeometry args={[hitRadius, 12, 12]} /> {/* NOSONAR S6747 */}
        <meshBasicMaterial transparent opacity={0} depthWrite={false} /> {/* NOSONAR S6747 */}
      </mesh>

      {/* Visible 2D-style card rendered in default Html mode. `distanceFactor`
         scales the card relative to camera distance so it shrinks when you
         zoom out and grows when you zoom in — mirroring React Flow's pan/zoom
         feel. pointerEvents=none so the invisible mesh below still receives
         drag/hover events. */}
      <Html
        center
        distanceFactor={1500}
        zIndexRange={[10, 0]}
        pointerEvents="none"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {card}
      </Html>
    </group>
  )
}

export const Mesh3DNode = memo(Mesh3DNodeBase)
Mesh3DNode.displayName = 'Mesh3DNode'
