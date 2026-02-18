import { useState, useLayoutEffect } from 'react'

export interface MeshEdgeColors {
  active: string
  inactive: string
  selected: string
}

/**
 * Resolves design-system token colours from the DOM so they can be used as
 * literal stroke values on SVG edges.
 */
export function useMeshEdgeColors(): MeshEdgeColors {
  const [edgeColors, setEdgeColors] = useState<MeshEdgeColors>({
    active: '#22c55e',
    inactive: '#71717a',
    selected: '#3b82f6'
  })

  useLayoutEffect(() => {
    const probe = document.createElement('div')
    probe.style.position = 'absolute'
    probe.style.width = '0'
    probe.style.height = '0'
    probe.style.overflow = 'hidden'
    document.body.appendChild(probe)

    probe.className = 'gba:text-success'
    const active = getComputedStyle(probe).color
    probe.className = 'gba:text-muted-foreground'
    const inactive = getComputedStyle(probe).color
    probe.className = 'gba:text-primary'
    const selected = getComputedStyle(probe).color

    document.body.removeChild(probe)
    setEdgeColors({
      active: active || '#22c55e',
      inactive: inactive || '#71717a',
      selected: selected || '#3b82f6'
    })
  }, [])

  return edgeColors
}
