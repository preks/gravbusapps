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
  ORCHESTRATOR_ORBIT_GEOMETRY,
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
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(baseTint),
      roughness: 0.18,
      metalness: 0.0,
      transmission: 0.55,
      thickness: 0.7,
      ior: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.92,
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

  // Selection ring material — mounted only when selected.
  const ringMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors.primary),
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  }, [colors.primary])

  // Orchestrator orbit ring — subtle thin torus that rotates around the body.
  const orbitMaterial = useMemo(() => {
    if (kind !== 'orchestrator') return null
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors.primary),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
  }, [kind, colors.primary])

  useEffect(() => {
    return () => {
      material.dispose()
      coreMaterial.dispose()
      ringMaterial.dispose()
      orbitMaterial?.dispose()
    }
  }, [material, coreMaterial, ringMaterial, orbitMaterial])

  // Refs for per-frame animation.
  const bodyRef = useRef<THREE.Mesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const orbitRef = useRef<THREE.Mesh>(null)

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
    const spinSpeed = reducedMotion
      ? 0
      : status === 'running'
        ? 0.6
        : kind === 'skill'
          ? 0.25
          : kind === 'orchestrator'
            ? 0.08
            : 0
    anim.current.rotation += spinSpeed * dt
    if (bodyRef.current) {
      bodyRef.current.rotation.y = anim.current.rotation
      // Subtle tilt so faceted shapes catch the light from multiple angles.
      bodyRef.current.rotation.x = Math.sin(t * 0.3 + radius) * 0.1
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
    anim.current.emissiveIntensity += (targetEmissive - anim.current.emissiveIntensity) * lerp
    material.emissiveIntensity = anim.current.emissiveIntensity
    // Failed: emissive shifts to red.
    if (status === 'failed') {
      material.emissive.copy(failedColour)
    } else {
      material.emissive.set(emissiveColour)
    }

    // Body opacity — dim / upcoming states fade the body without unmounting.
    const targetBodyOpacity = isDimmed ? 0.28 : isUpcoming ? 0.32 : 0.92
    anim.current.bodyOpacity += (targetBodyOpacity - anim.current.bodyOpacity) * lerp
    material.opacity = anim.current.bodyOpacity

    // Scale: highlighted neighbours puff up a touch; selected too.
    const targetScale = isSelected ? 1.08 : isHighlighted ? 1.04 : 1
    anim.current.bodyScale += (targetScale - anim.current.bodyScale) * lerp
    if (bodyRef.current) {
      bodyRef.current.scale.setScalar(radius * anim.current.bodyScale)
    }

    // Inner core: pulses opacity when active so it reads as a "live" core
    // glowing inside the glass.
    const targetCoreOpacity =
      isActive && !reducedMotion ? 0.5 + Math.sin(t * 3) * 0.25 : isActive ? 0.7 : status === 'running' ? 0.25 : 0
    anim.current.coreOpacity += (targetCoreOpacity - anim.current.coreOpacity) * lerp
    if (coreRef.current) {
      coreMaterial.opacity = anim.current.coreOpacity
      coreRef.current.visible = anim.current.coreOpacity > 0.01
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

    // Orchestrator orbit ring: rotates around the body.
    if (orbitRef.current && kind === 'orchestrator') {
      const orbitScale = radius * 1.6
      orbitRef.current.scale.setScalar(orbitScale)
      orbitRef.current.rotation.x = Math.PI / 2.5
      orbitRef.current.rotation.z = t * 0.15
    }
  })

  return (
    <group>
      {/* Glass body — the hit-target. Scale carries the kind radius. */}
      <mesh ref={bodyRef} geometry={geometry} material={material} scale={radius} />

      {/* Inner emissive core (small additive sphere). */}
      <mesh
        ref={coreRef}
        geometry={CORE_GEOMETRY}
        material={coreMaterial}
        scale={coreRadius(kind)}
        visible={false}
        renderOrder={2}
      />

      {/* Selection ring — only mounted while selected to save cost. */}
      {isSelected && <mesh ref={ringRef} geometry={SELECTION_RING_GEOMETRY} material={ringMaterial} renderOrder={3} />}

      {/* Orchestrator orbit ring — only on the central hub. */}
      {kind === 'orchestrator' && orbitMaterial && (
        <mesh ref={orbitRef} geometry={ORCHESTRATOR_ORBIT_GEOMETRY} material={orbitMaterial} renderOrder={1} />
      )}
    </group>
  )
}

export const Mesh3DNodeBody = memo(Mesh3DNodeBodyBase)
Mesh3DNodeBody.displayName = 'Mesh3DNodeBody'
