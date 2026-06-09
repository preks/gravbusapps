// Scene contents for the glass card sphere.
//
// Owns the premium dark-purple environment (enclosing gradient sphere + bottom
// radial glow + sparkles), the lighting rig that makes the glass read, the
// OrbitControls camera (rotate only - zoom and pan are disabled), a very slow
// idle spin of the whole cluster, and the per-item glass cards.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, GradientTexture, OrbitControls, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { BackgroundKpiPanels } from './BackgroundKpiPanels'
import { GlassCard } from './GlassCard'
import { computeClusterLayout } from './glassCardLayout'
import type { ValueKpiTile } from './kpiModel'
import type { GlassCardModel } from './glassCardModel'
import type { GlassCardTheme, GlassGlowStops } from './glassCardTheme'

interface GlassCardClusterProps {
  cards: GlassCardModel[]
  kpis: ValueKpiTile[]
  reducedMotion: boolean
  theme: GlassCardTheme
}

const SPARKLE_COUNT = 60
const IDLE_SPIN_RADIANS_PER_SECOND = 0.05

// Soft radial gradient (bright accent core -> transparent) for the floor glow.
function createGlowTexture(stops: GlassGlowStops): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, stops.core)
    gradient.addColorStop(0.45, stops.mid)
    gradient.addColorStop(1, stops.edge)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return new THREE.CanvasTexture(canvas)
}

export function GlassCardCluster({ cards, kpis, reducedMotion, theme }: GlassCardClusterProps) {
  const clusterRef = useRef<THREE.Group>(null)

  const placements = useMemo(() => computeClusterLayout(cards.map(card => card.id)), [cards])
  const glow = theme.glow
  const glowTexture = useMemo(() => (glow ? createGlowTexture(glow) : null), [glow])

  useEffect(() => {
    return () => {
      glowTexture?.dispose()
    }
  }, [glowTexture])

  useFrame((_state, dt) => {
    if (reducedMotion || !clusterRef.current) return
    clusterRef.current.rotation.y += IDLE_SPIN_RADIANS_PER_SECOND * dt
  })

  return (
    <>
      {/* Enclosing gradient sphere paints a consistent deep-purple backdrop
         from every orbit angle. */}
      <mesh scale={40}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial side={THREE.BackSide} toneMapped={theme.gradientToneMapped}>
          <GradientTexture stops={[0, 0.5, 1]} colors={theme.gradient} size={512} />
        </meshBasicMaterial>
      </mesh>

      {/* Bottom radial glow laid flat on the floor under the cluster, so it
         reads as a ground halo beneath the cards rather than a wall behind. */}
      {glowTexture && (
        <mesh position={[0, -2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[12, 10]} />
          <meshBasicMaterial
            map={glowTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}

      <Environment preset="studio" background={false} resolution={128} />
      <ambientLight intensity={theme.ambientIntensity} />
      <directionalLight position={[4, 6, 5]} intensity={theme.keyLightIntensity} color={theme.keyLightColor} />
      <directionalLight position={[-5, -2, -3]} intensity={theme.fillLightIntensity} color={theme.fillLightColor} />
      <pointLight
        position={[3, 2, 3]}
        intensity={theme.accentLight1Intensity}
        color={theme.accentLight1Color}
        distance={20}
        decay={2}
      />
      <pointLight
        position={[-3, 3, 2]}
        intensity={theme.accentLight2Intensity}
        color={theme.accentLight2Color}
        distance={20}
        decay={2}
      />

      <Sparkles
        count={SPARKLE_COUNT}
        scale={[9, 10, 5]}
        size={2}
        speed={reducedMotion ? 0 : 0.3}
        color={theme.sparkleColor}
        opacity={theme.sparkleOpacity}
      />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.72}
      />

      {/* Distant KPIs, kept outside the spinning cluster group so they stay a
         calm backdrop. */}
      <BackgroundKpiPanels kpis={kpis} reducedMotion={reducedMotion} theme={theme.kpi} />

      <group ref={clusterRef}>
        {cards.map((card, index) => (
          <GlassCard
            key={card.id}
            model={card}
            placement={placements[index]}
            reducedMotion={reducedMotion}
            theme={theme}
          />
        ))}
      </group>
    </>
  )
}
