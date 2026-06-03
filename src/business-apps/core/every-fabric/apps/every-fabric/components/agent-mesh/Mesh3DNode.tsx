// 3D mesh node — a glass 3D body (per kind) plus a slim floating Html label
// below it. No icon on the body itself; kinds are read from silhouette +
// colour + label. The body mesh is the raycast target, so pointer events
// on the parent <group> fire on hover/click/drag.

import { memo, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MeshNodeKind, MeshNodeStatus } from '../../utils/traceModel'
import type { MeshPhysicsHandle } from './useMeshPhysics'
import type { MeshThemeColors } from './useMeshTheme'
import { Mesh3DEveryLogo } from './Mesh3DEveryLogo'
import { Mesh3DNodeBody } from './Mesh3DNodeBody'
import { NODE_BODY_RADIUS } from './mesh3DGeometries'

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
  isHovered: boolean
  liveCount: number
  activityHeat: number
  activityLabel?: string
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
  isHovered,
  liveCount,
  activityHeat,
  activityLabel,
  physics,
  colors,
  reducedMotion,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerEnter,
  onPointerLeave
}: Mesh3DNodeProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Per-frame: sync the group position with the physics handle so the node
  // tracks drag + spring updates without React state churn.
  useFrame(() => {
    const p = physics.getPosition(id)
    if (p && groupRef.current) {
      groupRef.current.position.set(p.x, p.y, p.z)
    }
  })

  const radius = NODE_BODY_RADIUS[kind] ?? 22

  // Label visibility rule: the screen is too crowded if every node shows its
  // text all the time, so we keep labels off by default and only reveal them
  // for nodes the user is currently looking at or that are doing something.
  //
  //   - selected node and its neighbours (`isHighlighted` from selection path)
  //   - hovered node and its neighbours
  //   - active nodes during replay
  //
  // Everything else stays unlabeled until hovered or selected.
  const showLabel = kind !== 'orchestrator' && (isSelected || isHovered || isHighlighted || isActive || liveCount > 0)

  const stop = (e: ThreePointerEvent) => {
    e.stopPropagation()
  }

  // Memoize the label markup so the Html portal doesn't churn every frame.
  // GPU compositor layer hint prevents text antialiasing flicker as the
  // wrapper's CSS transform updates 60×/s.
  const label3d = useMemo(
    () => (
      <div
        className={`gba:flex gba:flex-col gba:items-center gba:transition-opacity gba:duration-200 ${isUpcoming ? 'gba:opacity-30' : isDimmed ? 'gba:opacity-25' : ''}`}
        data-mesh-active={isActive ? 'true' : 'false'}
        data-mesh-selected={isSelected ? 'true' : 'false'}
        style={{ transform: 'translateZ(0)', willChange: 'transform', backfaceVisibility: 'hidden' }}
      >
        <span
          className="gba:max-w-[160px] gba:truncate gba:text-center gba:text-[12px] gba:font-semibold gba:text-foreground gba:drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          title={label}
        >
          {label}
        </span>
        {liveCount >= 2 && (
          <span
            className="gba:mt-1 gba:rounded-full gba:border gba:border-primary/30 gba:bg-primary/15 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-bold gba:text-primary"
            title={activityLabel}
          >
            •{liveCount} live
          </span>
        )}
        {category && (
          <span className="gba:mt-0.5 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
            {category}
          </span>
        )}
      </div>
    ),
    [label, category, isSelected, isActive, isUpcoming, isDimmed, liveCount, activityLabel]
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
      {/* The glass 3D body — also the raycast target. */}
      <Mesh3DNodeBody
        kind={kind}
        status={status}
        isSelected={isSelected}
        isActive={isActive}
        isUpcoming={isUpcoming}
        isDimmed={isDimmed}
        isHighlighted={isHighlighted}
        liveCount={liveCount}
        activityHeat={activityHeat}
        colors={colors}
        reducedMotion={reducedMotion}
      />

      {kind === 'orchestrator' && (
        <Mesh3DEveryLogo
          isActive={isActive}
          isDimmed={isDimmed}
          activityHeat={activityHeat}
          reducedMotion={reducedMotion}
        />
      )}

      {kind === 'orchestrator' && (
        <group position={[0, -radius - 10, 0]}>
          <Html
            center
            distanceFactor={760}
            zIndexRange={[10, 0]}
            pointerEvents="none"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'geometricPrecision'
            }}
          >
            <span
              className="gba:text-center gba:text-[16px] gba:font-bold gba:tracking-[-0.03em] gba:text-foreground gba:drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
              title={label}
            >
              {label}
            </span>
          </Html>
        </group>
      )}

      {/* Floating Html label, anchored just below the body. Only mounted
         when the label should be visible — this keeps the scene dramatically
         cleaner at rest (no overlapping text on every node), and avoids
         paying the Html portal cost for hundreds of hidden labels. */}
      {showLabel && (
        <group position={[0, -radius - 14, 0]}>
          <Html
            center
            distanceFactor={820}
            zIndexRange={[10, 0]}
            pointerEvents="none"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'geometricPrecision'
            }}
          >
            {label3d}
          </Html>
        </group>
      )}
    </group>
  )
}

export const Mesh3DNode = memo(Mesh3DNodeBase)
Mesh3DNode.displayName = 'Mesh3DNode'
