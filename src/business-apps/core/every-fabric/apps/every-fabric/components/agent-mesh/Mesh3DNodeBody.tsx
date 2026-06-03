// Glass 3D body for a single agent-mesh node. Encapsulates per-kind
// geometry choice, the cloned MeshPhysicalMaterial, the inner emissive core,
// the optional selection torus ring, and the per-frame animation that
// translates node state into visual behaviour (rotation, emissive pulse,
// failure tint, dim opacity, highlight scale).
//
// The mesh under the body is what raycasts catch — there's no separate
// invisible hitbox, the glass body itself is the hit target. Pointer
// listeners live on the parent <group> in Mesh3DNode.

import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MeshNodeKind, MeshNodeStatus } from '../../utils/traceModel'
import type { MeshThemeColors } from './useMeshTheme'
import {
  CORE_GEOMETRY,
  NODE_BODY_RADIUS,
  SELECTION_RING_GEOMETRY,
  coreRadius,
  emissiveFor,
  geometryFor,
  selectionRingRadius,
  tintFor
} from './mesh3DGeometries'

export interface Mesh3DNodeBodyProps {
  kind: MeshNodeKind
  status: MeshNodeStatus
  isSelected: boolean
  isActive: boolean
  isUpcoming: boolean
  isDimmed: boolean
  isHighlighted: boolean
  liveCount: number
  activityHeat: number
  colors: MeshThemeColors
  reducedMotion: boolean
}

function Mesh3DNodeBodyBase({
  kind,
  status,
  isSelected,
  isActive,
  isUpcoming,
  isDimmed,
  isHighlighted,
  liveCount,
  activityHeat,
  colors,
  reducedMotion
}: Mesh3DNodeBodyProps) {
  const radius = NODE_BODY_RADIUS[kind] ?? 22
  const geometry = useMemo(() => geometryFor(kind), [kind])

  // Glass body material — cloned per instance so we can animate emissive /
  // opacity independently. Disposed on unmount.
  const baseTint = tintFor(kind, colors)
  const emissiveColour = emissiveFor(kind, colors)
  const material = useMemo(() => {
    // Hyperreal glass: low roughness and clearcoat roughness create crisp
    // highlights, while transmission/thickness make the body feel refractive
    // instead of matte plastic. The scene uses a clean studio environment, so
    // sharper reflections add realism without reflecting rooms/windows.
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(baseTint),
      roughness: 0.045,
      metalness: 0.02,
      transmission: 0.72,
      thickness: 1.25,
      ior: 1.52,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
      envMapIntensity: 1.65,
      transparent: true,
      opacity: 0.8,
      emissive: new THREE.Color(emissiveColour),
      emissiveIntensity: 0
    })
    return m
    // We intentionally rebuild the material whenever the kind or theme
    // changes so the base tint/emissive defaults are correct. Per-frame
    // animation mutates the same instance below.
  }, [kind, baseTint, emissiveColour])

  // Inner emissive core — only matters when active. We always mount it
  // (toggle `visible` instead of unmounting) so React doesn't churn the
  // scene graph during replay.
  const coreMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(emissiveColour),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  }, [emissiveColour])

  const haloMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(emissiveColour),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  }, [emissiveColour])

  // Selection ring material — mounted only when selected.
  const ringMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(emissiveColour),
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  }, [emissiveColour])

  useEffect(() => {
    return () => {
      material.dispose()
      coreMaterial.dispose()
      haloMaterial.dispose()
      ringMaterial.dispose()
    }
  }, [material, coreMaterial, haloMaterial, ringMaterial])

  // Refs for per-frame animation.
  const bodyRef = useRef<THREE.Mesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  // Smoothed animation state.
  const anim = useRef({
    rotation: 0,
    coreOpacity: 0,
    emissiveIntensity: 0,
    bodyOpacity: 0.92,
    bodyScale: 1,
    failedMix: 0
  })

  // Cached colour for failed-state lerping.
  const failedColour = useMemo(() => new THREE.Color(colors.destructive), [colors.destructive])
  const baseColour = useMemo(() => new THREE.Color(baseTint), [baseTint])

  // Reusable tmp colour to avoid per-frame allocations.
  const tmpColour = useMemo(() => new THREE.Color(), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const lerp = Math.min(1, dt * 6)

    // Body rotation — running spins gently; skills always rotate (crystal feel);
    // orchestrator has a subtle perpetual rotation; others are static unless
    // highlighted (small wobble).
    const heatSpinMultiplier = 1 + Math.min(liveCount, 8) * 0.12
    const spinSpeed = reducedMotion
      ? 0
      : status === 'running'
        ? 0.6 * heatSpinMultiplier
        : kind === 'skill'
          ? 0.25 * heatSpinMultiplier
          : kind === 'orchestrator'
            ? 0.08 * heatSpinMultiplier
            : 0
    anim.current.rotation += spinSpeed * dt
    if (bodyRef.current) {
      if (kind === 'orchestrator') {
        // The orchestrator is a TorusGeometry — keep it tipped slightly so the
        // ring reads as a 3D object, and let it precess gently around Z. We
        // skip the X-axis wobble that other kinds use because it'd look like
        // the ring is flopping rather than rotating.
        bodyRef.current.rotation.x = Math.PI / 2.4
        bodyRef.current.rotation.z = anim.current.rotation * 0.5
        bodyRef.current.rotation.y = 0
      } else {
        bodyRef.current.rotation.y = anim.current.rotation
        // Subtle tilt so faceted shapes catch the light from multiple angles.
        bodyRef.current.rotation.x = Math.sin(t * 0.3 + radius) * 0.1
      }
    }

    // Failed colour mix
    const targetFailedMix = status === 'failed' ? 1 : 0
    anim.current.failedMix += (targetFailedMix - anim.current.failedMix) * lerp
    tmpColour.copy(baseColour).lerp(failedColour, anim.current.failedMix)
    material.color.copy(tmpColour)

    // Emissive intensity — pulses when active, lifts a touch when running,
    // glows red when failed.
    let targetEmissive = 0
    if (status === 'failed') targetEmissive = 0.45
    else if (isActive && !reducedMotion) targetEmissive = 0.55 + Math.sin(t * 3) * 0.25
    else if (isActive) targetEmissive = 0.55
    else if (status === 'running') targetEmissive = 0.18
    else if (isSelected) targetEmissive = 0.25
    targetEmissive = Math.max(targetEmissive, activityHeat * 0.65)
    anim.current.emissiveIntensity += (targetEmissive - anim.current.emissiveIntensity) * lerp
    material.emissiveIntensity = anim.current.emissiveIntensity
    // Failed: emissive shifts to red.
    if (status === 'failed') {
      material.emissive.copy(failedColour)
    } else {
      material.emissive.set(emissiveColour)
    }

    // Body opacity — dim / upcoming states fade the body without unmounting.
    const targetBodyOpacity = isDimmed ? 0.24 : isUpcoming ? 0.3 : 0.82
    anim.current.bodyOpacity += (targetBodyOpacity - anim.current.bodyOpacity) * lerp
    material.opacity = anim.current.bodyOpacity

    // Scale: highlighted neighbours puff up a touch; selected too.
    const targetScale = isSelected ? 1.08 : isHighlighted ? 1.04 : 1
    anim.current.bodyScale += (targetScale - anim.current.bodyScale) * lerp
    if (bodyRef.current) {
      bodyRef.current.scale.setScalar(radius * anim.current.bodyScale)
    }

    // Inner core: pulses opacity when active so it reads as a "live" core
    // glowing inside the glass. Skip for orchestrator — the Every logo sits
    // in the centre of the ring and a glowing sphere behind it would muddy
    // the brand mark.
    const targetCoreOpacity =
      kind === 'orchestrator'
        ? 0
        : isActive && !reducedMotion
          ? Math.max(0.5 + Math.sin(t * 3) * 0.25, activityHeat * 0.65)
          : isActive
            ? 0.7
            : status === 'running'
              ? 0.25
              : activityHeat * 0.35
    anim.current.coreOpacity += (targetCoreOpacity - anim.current.coreOpacity) * lerp
    if (coreRef.current) {
      coreMaterial.opacity = anim.current.coreOpacity
      coreRef.current.visible = anim.current.coreOpacity > 0.01
    }

    if (haloRef.current) {
      const haloOpacity = activityHeat > 0 ? 0.08 + activityHeat * 0.18 : 0
      haloMaterial.opacity += (haloOpacity - haloMaterial.opacity) * lerp
      haloRef.current.visible = haloMaterial.opacity > 0.01
      haloRef.current.scale.setScalar(radius * (1.45 + Math.min(activityHeat, 1) * 0.35))
    }

    // Selection ring: gentle pulse + slow rotation so it reads as a target lock.
    if (ringRef.current && isSelected) {
      const ringScale = selectionRingRadius(kind) * (1 + Math.sin(t * 2.5) * 0.025)
      ringRef.current.scale.setScalar(ringScale)
      ringRef.current.rotation.z = t * 0.4
      // Face the camera-ish — keep on XY plane but tilt slightly toward the
      // camera for a nicer 3/4 view. We don't `lookAt` every frame to save
      // cycles; the static rotation reads fine across orbits.
      ringRef.current.rotation.x = Math.PI / 2
    }
  })

  return (
    <group>
      {/* Glass body — the hit-target. Scale carries the kind radius. The
         orchestrator is now represented by the 3D Every logo itself, so we
         intentionally do not render the old oversized torus body around it. */}
      {kind !== 'orchestrator' && <mesh ref={bodyRef} geometry={geometry} material={material} scale={radius} />}

      {kind !== 'orchestrator' && (
        <>
          {/* Inner emissive core (small additive sphere). */}
          <mesh
            ref={coreRef}
            geometry={CORE_GEOMETRY}
            material={coreMaterial}
            scale={coreRadius(kind)}
            visible={false}
            renderOrder={2}
          />

          <mesh ref={haloRef} geometry={CORE_GEOMETRY} material={haloMaterial} visible={false} renderOrder={1} />
        </>
      )}

      {/* Selection ring — only mounted while selected to save cost. */}
      {isSelected && kind !== 'orchestrator' && (
        <mesh ref={ringRef} geometry={SELECTION_RING_GEOMETRY} material={ringMaterial} renderOrder={3} />
      )}
    </group>
  )
}

export const Mesh3DNodeBody = memo(Mesh3DNodeBodyBase)
Mesh3DNodeBody.displayName = 'Mesh3DNodeBody'
