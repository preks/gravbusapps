import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Mesh3DEveryLogoProps {
  isActive: boolean
  isDimmed: boolean
  activityHeat: number
  reducedMotion: boolean
}

const LINK_COUNT = 10
const LINK_RADIUS = 13
const LINK_SCALE: [number, number, number] = [5.15, 3.25, 2.45]

// The brand mark is approximated as interlocked 3D links. It keeps the same
// "woven ring" read as the design-system icon, but avoids HTML/SVG scaling
// blur and participates in real scene lighting.
const LINK_GEOMETRY = new THREE.TorusGeometry(1, 0.24, 24, 56)

// Approximate the attached/design-system icon: the chain is mostly dark
// graphite/ink, with controlled Every/AI accents (orange/red on one side,
// cyan/blue on the other). Avoid a full rainbow, which reads as generic.
const LINK_COLORS = [
  '#1f2533',
  '#23283a',
  '#f97316',
  '#f59e0b',
  '#fbbf24',
  '#22c7d7',
  '#3b82f6',
  '#2f3150',
  '#ef4444',
  '#2b2440'
]

function Mesh3DEveryLogoBase({ isActive, isDimmed, activityHeat, reducedMotion }: Mesh3DEveryLogoProps) {
  const objectRef = useRef<THREE.Group>(null)
  const logoRef = useRef<THREE.Group>(null)
  const materials = useMemo(
    () =>
      LINK_COLORS.map(
        color =>
          new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(color),
            roughness: 0.075,
            metalness: 0.08,
            clearcoat: 1,
            clearcoatRoughness: 0.04,
            envMapIntensity: 1.35,
            emissive: new THREE.Color(color),
            emissiveIntensity: 0.05
          })
      ),
    []
  )

  useEffect(() => {
    return () => {
      for (const material of materials) material.dispose()
    }
  }, [materials])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (objectRef.current) {
      const targetScale = isDimmed ? 0.72 : isActive ? 1.05 : 0.92
      objectRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), Math.min(1, dt * 6))
    }
    if (logoRef.current && !reducedMotion) {
      logoRef.current.rotation.z = Math.sin(t * 0.55) * 0.04
      logoRef.current.rotation.x = 0.12 + Math.sin(t * 0.35) * 0.025
    }
    const glow = isActive && !reducedMotion ? 0.1 + Math.sin(t * 3) * 0.05 : 0.04
    const emissive = Math.max(glow, activityHeat * 0.18)
    for (const material of materials) {
      material.emissiveIntensity += (emissive - material.emissiveIntensity) * Math.min(1, dt * 6)
    }
  })

  return (
    <group ref={objectRef} renderOrder={5}>
      <group ref={logoRef}>
        {Array.from({ length: LINK_COUNT }).map((_, index) => {
          const angle = (index / LINK_COUNT) * Math.PI * 2 - Math.PI / 2
          const x = Math.cos(angle) * LINK_RADIUS
          const y = Math.sin(angle) * LINK_RADIUS
          const tiltX = Math.sin(angle) * 0.18
          const tiltY = -Math.cos(angle) * 0.18
          return (
            <mesh
              key={index}
              geometry={LINK_GEOMETRY}
              material={materials[index % materials.length]}
              position={[x, y, 0]}
              rotation={[tiltX, tiltY, angle + Math.PI / 2]}
              scale={LINK_SCALE}
            />
          )
        })}
      </group>
    </group>
  )
}

export const Mesh3DEveryLogo = memo(Mesh3DEveryLogoBase)
Mesh3DEveryLogo.displayName = 'Mesh3DEveryLogo'
