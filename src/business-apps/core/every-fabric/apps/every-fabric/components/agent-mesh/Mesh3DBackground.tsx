// Background environment for the 3D mesh.
//
// The 2D view has no stars, no grid, no gradient overlays — just the theme
// background. We mirror that by rendering nothing here. The canvas clear
// colour (set in `Mesh3DGraph.tsx`) provides the surface.

import type { MeshThemeColors } from './useMeshTheme'

interface Mesh3DBackgroundProps {
  colors: MeshThemeColors
  reducedMotion: boolean
}

export function Mesh3DBackground({ colors, reducedMotion }: Mesh3DBackgroundProps) {
  void colors
  void reducedMotion
  return null
}
