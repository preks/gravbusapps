// Faint KPI panels floating far behind the glass cluster.
//
// These echo the card styling (rounded translucent slab + lavender text) but
// sit deep on the Z axis, dimmed and slightly hazed, so they read as distant
// context rather than competing with the foreground cards.

import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { ValueKpiTile } from './kpiModel'
import type { GlassKpiTheme } from './glassCardTheme'

interface BackgroundKpiPanelsProps {
  kpis: ValueKpiTile[]
  reducedMotion: boolean
  theme: GlassKpiTheme
}

const PANEL_WIDTH = 2.1
const PANEL_HEIGHT = 1.3
const PANEL_GAP = 2.55
const DEPTH_Z = -6.5
const BASE_Y = 0.8

function BackgroundKpiPanelsBase({ kpis, reducedMotion, theme }: BackgroundKpiPanelsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const mid = (kpis.length - 1) / 2

  useFrame(({ clock }) => {
    if (reducedMotion || !groupRef.current) return
    // Very slow collective drift so the backdrop feels alive but calm.
    groupRef.current.position.y = BASE_Y + Math.sin(clock.elapsedTime * 0.25) * 0.12
  })

  return (
    <group ref={groupRef} position={[0, BASE_Y, DEPTH_Z]}>
      {kpis.map((kpi, index) => {
        const x = (index - mid) * PANEL_GAP
        const tilt = (index - mid) * -0.05
        return (
          <group key={kpi.id} position={[x, 0, 0]} rotation={[0, tilt, 0]}>
            <RoundedBox args={[PANEL_WIDTH, PANEL_HEIGHT, 0.1]} radius={0.12} smoothness={4}>
              <meshBasicMaterial
                color={theme.panelColor}
                transparent
                opacity={theme.panelOpacity}
                depthWrite={false}
                toneMapped={false}
              />
            </RoundedBox>
            <Text
              position={[0, 0.18, 0.08]}
              fontSize={0.42}
              color={theme.textColor}
              anchorX="center"
              anchorY="middle"
              fillOpacity={0.55}
            >
              {kpi.value}
            </Text>
            <Text
              position={[0, -0.32, 0.08]}
              fontSize={0.13}
              color={theme.textColor}
              anchorX="center"
              anchorY="middle"
              fillOpacity={0.4}
            >
              {kpi.label}
            </Text>
          </group>
        )
      })}
    </group>
  )
}

export const BackgroundKpiPanels = memo(BackgroundKpiPanelsBase)
BackgroundKpiPanels.displayName = 'BackgroundKpiPanels'
