// Background environment for the 3D mesh.
//
// The 2D view has no stars, no grid, no gradient overlays — just the theme
// background. We mirror that by rendering nothing here. The canvas clear
// colour (set in `Mesh3DGraph.tsx`) provides the surface.

import type { FC } from 'react'
import type { MeshThemeColors } from './useMeshTheme'

export type Mesh3DBackgroundProps = {
  colors: MeshThemeColors
  reducedMotion: boolean
}

/** Intentionally empty — canvas clear colour is set in `Mesh3DGraph.tsx`. */
export const Mesh3DBackground: FC<Mesh3DBackgroundProps> = () => null
