// A single 3D glass card.
//
// The body is a rounded glass slab (translucent clearcoat physical material -
// no transmission, see note below). The neon border is a flat rounded-rectangle ring (a real bezel)
// sitting just outside the front and back faces - not a slab behind the glass -
// so the centre stays clear, the edges read as glass, and there are no coplanar
// faces to z-fight. All text is drei <Text> pushed in front of the face to stay
// crisp. Each card floats on its own phase and pulses harder when it is running.

import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import { CARD_DEPTH, CARD_HEIGHT, CARD_WIDTH, type CardPlacement } from './glassCardLayout'
import { cardStatusStyle, type GlassCardModel } from './glassCardModel'
import { useGlassCardI18n } from './useGlassCardI18n'
import type { GlassCardTheme } from './glassCardTheme'

interface GlassCardProps {
  model: GlassCardModel
  placement: CardPlacement
  reducedMotion: boolean
  theme: GlassCardTheme
}

const TEXT_Z = CARD_DEPTH / 2 + 0.02
const FRAME_Z = CARD_DEPTH / 2 + 0.004
const LEFT = -CARD_WIDTH / 2
const RIGHT = CARD_WIDTH / 2
const TOP = CARD_HEIGHT / 2

// Trace a centred rounded rectangle onto an existing Path/Shape.
function traceRoundedRect(path: THREE.Path, width: number, height: number, radius: number): void {
  const x = -width / 2
  const y = -height / 2
  path.moveTo(x + radius, y)
  path.lineTo(x + width - radius, y)
  path.quadraticCurveTo(x + width, y, x + width, y + radius)
  path.lineTo(x + width, y + height - radius)
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  path.lineTo(x + radius, y + height)
  path.quadraticCurveTo(x, y + height, x, y + height - radius)
  path.lineTo(x, y + radius)
  path.quadraticCurveTo(x, y, x + radius, y)
}

// Shared bezel geometry: an outer rounded rect with an inner rounded-rect hole,
// triangulated once for every card (built like the agent-mesh logo geometry).
const FRAME_GEOMETRY = (() => {
  const outer = new THREE.Shape()
  traceRoundedRect(outer, CARD_WIDTH + 0.03, CARD_HEIGHT + 0.03, 0.14)
  const hole = new THREE.Path()
  traceRoundedRect(hole, CARD_WIDTH - 0.06, CARD_HEIGHT - 0.06, 0.1)
  outer.holes.push(hole)
  return new THREE.ShapeGeometry(outer)
})()

// Keep every label on a single line so a long title never wraps into the row
// below it (which previously made the title look duplicated).
function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function GlassCardBase({ model, placement, reducedMotion, theme }: GlassCardProps) {
  const { statusLabel } = useGlassCardI18n()
  const groupRef = useRef<THREE.Group>(null)
  const bodyMatRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const surface = theme.card

  const statusStyle = cardStatusStyle(model.status)
  const accent = useMemo(() => new THREE.Color(statusStyle.accent), [statusStyle.accent])
  const statusTextColor = theme.statusTextStrong ? statusStyle.accentStrong : statusStyle.accent
  const isRunning = model.status === 'running'

  // One shared material for the front + back bezel rings so the running pulse
  // animates both at once.
  const frameMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: accent.clone(),
        transparent: true,
        opacity: surface.frameOpacityIdle,
        toneMapped: false
      }),
    // accent is reapplied in the effect below; build once.
    []
  )

  const baseY = placement.position[1]
  const baseRotation = placement.rotation

  useEffect(() => {
    if (bodyMatRef.current) bodyMatRef.current.emissive = accent
    frameMaterial.color = accent
  }, [accent, frameMaterial])

  useEffect(() => {
    return () => {
      frameMaterial.dispose()
    }
  }, [frameMaterial])

  useFrame(({ clock }, dt) => {
    const group = groupRef.current
    if (!group) return
    const t = clock.elapsedTime

    if (reducedMotion) {
      group.position.y = baseY
    } else {
      const bob = Math.sin(t * placement.floatSpeed + placement.floatPhase) * placement.floatAmplitude
      group.position.y = baseY + bob
      group.rotation.x = baseRotation[0] + Math.sin(t * 0.5 + placement.floatPhase) * 0.015
      group.rotation.y = baseRotation[1] + Math.sin(t * 0.4 + placement.floatPhase) * 0.03
      group.rotation.z = baseRotation[2] + Math.sin(t * 0.45 + placement.floatPhase) * 0.012
    }

    const pulse = isRunning && !reducedMotion ? 0.5 + 0.5 * Math.sin(t * 4 + placement.floatPhase) : 0
    const ease = Math.min(1, dt * 6)

    if (bodyMatRef.current) {
      const targetEmissive = isRunning
        ? surface.emissiveRunningBase + pulse * surface.emissiveRunningPulse
        : surface.emissiveIdle
      bodyMatRef.current.emissiveIntensity += (targetEmissive - bodyMatRef.current.emissiveIntensity) * ease
    }
    const targetOpacity = isRunning
      ? surface.frameOpacityRunningBase + pulse * surface.frameOpacityRunningPulse
      : surface.frameOpacityIdle
    frameMaterial.opacity += (targetOpacity - frameMaterial.opacity) * ease

    if (isRunning && !reducedMotion) {
      group.scale.setScalar(1 + pulse * 0.02)
    } else {
      group.scale.setScalar(1)
    }
  })

  return (
    <group ref={groupRef} position={placement.position} rotation={baseRotation}>
      {/* Neon bezel rings just outside the front and back faces. */}
      <mesh geometry={FRAME_GEOMETRY} material={frameMaterial} position={[0, 0, FRAME_Z]} />
      <mesh geometry={FRAME_GEOMETRY} material={frameMaterial} position={[0, 0, -FRAME_Z]} rotation={[0, Math.PI, 0]} />

      {/* Glass body. We deliberately avoid `transmission`: its separate render
         target gets invalidated whenever this subtree re-renders (the value /
         status jitter every few seconds), which flashed the whole card black for
         a frame when combined with the Bloom EffectComposer. A translucent
         clearcoat surface with environment reflections + emissive glow reads as
         glass just as well and is completely stable. */}
      <RoundedBox args={[CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH]} radius={0.12} smoothness={5}>
        <meshPhysicalMaterial
          ref={bodyMatRef}
          color={surface.bodyColor}
          emissive={accent}
          emissiveIntensity={surface.emissiveIdle}
          roughness={surface.roughness}
          metalness={0}
          clearcoat={surface.clearcoat}
          clearcoatRoughness={surface.clearcoatRoughness}
          transparent
          opacity={surface.opacity}
          envMapIntensity={surface.envMapIntensity}
        />
      </RoundedBox>

      {/* Inner highlight strip near the top edge. */}
      <mesh position={[0, TOP - 0.16, TEXT_Z - 0.005]}>
        <planeGeometry args={[CARD_WIDTH - 0.3, 0.18]} />
        <meshBasicMaterial
          color={surface.highlightColor}
          transparent
          opacity={surface.highlightOpacity}
          toneMapped={false}
        />
      </mesh>

      {/* Icon placeholder: small rounded accent chip. */}
      <RoundedBox args={[0.34, 0.34, 0.04]} radius={0.08} smoothness={3} position={[LEFT + 0.34, TOP - 0.36, TEXT_Z]}>
        <meshBasicMaterial color={accent} transparent opacity={0.85} toneMapped={false} />
      </RoundedBox>
      <Text
        position={[LEFT + 0.34, TOP - 0.36, TEXT_Z + 0.03]}
        fontSize={0.15}
        color={surface.iconTextColor}
        anchorX="center"
        anchorY="middle"
      >
        {model.initials}
      </Text>

      {/* Title (single line) + subtitle. */}
      <Text
        position={[LEFT + 0.62, TOP - 0.3, TEXT_Z]}
        fontSize={0.15}
        color={surface.titleColor}
        anchorX="left"
        anchorY="middle"
      >
        {truncate(model.title, 18)}
      </Text>
      <Text
        position={[LEFT + 0.62, TOP - 0.53, TEXT_Z]}
        fontSize={0.105}
        color={surface.subtitleColor}
        anchorX="left"
        anchorY="middle"
      >
        {truncate(model.subtitle, 26)}
      </Text>

      {/* Value block, bottom-left. */}
      <Text
        position={[LEFT + 0.3, -TOP + 0.4, TEXT_Z]}
        fontSize={0.3}
        color={surface.titleColor}
        anchorX="left"
        anchorY="middle"
      >
        {model.value}
      </Text>
      <Text
        position={[LEFT + 0.32, -TOP + 0.18, TEXT_Z]}
        fontSize={0.1}
        color={surface.subtitleColor}
        anchorX="left"
        anchorY="middle"
      >
        {model.valueUnit}
      </Text>

      {/* Status pill text, bottom-right (kept off the title row to avoid overlap). */}
      <Text
        position={[RIGHT - 0.22, -TOP + 0.3, TEXT_Z]}
        fontSize={0.12}
        color={statusTextColor}
        anchorX="right"
        anchorY="middle"
      >
        {statusLabel(model.status)}
      </Text>
    </group>
  )
}

export const GlassCard = memo(GlassCardBase)
GlassCard.displayName = 'GlassCard'
