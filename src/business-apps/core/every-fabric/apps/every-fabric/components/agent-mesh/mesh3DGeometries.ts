// Shared geometry singletons + per-kind metadata for the 3D agent mesh.
//
// Each node kind has a distinct silhouette so the type is readable from any
// orbit angle without an icon. Geometries are constructed once at module
// load and reused across every node of that kind — three.js shares the
// underlying GPU buffers, so 200 nodes only cost five geometries' worth of
// VRAM.

import * as THREE from 'three'
import type { MeshNodeKind } from '../../utils/traceModel'
import type { MeshThemeColors } from './useMeshTheme'

/**
 * Body radius per kind in world units. Roughly mirrors `NODE_SIZE` from the
 * 2D layout (which is in CSS pixels) but compressed for 3D so the scene
 * doesn't feel sparse.
 */
export const NODE_BODY_RADIUS: Record<MeshNodeKind, number> = {
  orchestrator: 36,
  subagent: 22,
  expert: 22,
  skill: 18,
  tool: 16
}

/** Selection torus radius — wraps around the body with a small gap. */
export function selectionRingRadius(kind: MeshNodeKind): number {
  return NODE_BODY_RADIUS[kind] * 1.35
}

/** Inner emissive core — sits inside the glass body and pulses on active. */
export function coreRadius(kind: MeshNodeKind): number {
  return NODE_BODY_RADIUS[kind] * 0.45
}

// ── Singleton geometries ────────────────────────────────────────────────────
// Three.js can share a single BufferGeometry between many meshes. We build
// one per shape at unit-ish radius and let mesh `scale` handle the rest.

export const ORCHESTRATOR_GEOMETRY = new THREE.IcosahedronGeometry(1, 1)
export const AGENT_SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 32, 24)
export const EXPERT_GEOMETRY = new THREE.IcosahedronGeometry(1, 0)
export const SKILL_GEOMETRY = new THREE.OctahedronGeometry(1, 0)
// Hex prism: a cylinder with 6 radial segments. Slightly squashed so it
// reads as a coin/token rather than a tall pillar.
export const TOOL_GEOMETRY = new THREE.CylinderGeometry(1, 1, 0.55, 6, 1)
export const DEFAULT_GEOMETRY = new THREE.TetrahedronGeometry(1, 0)

// Selection ring + inner core share geometries across all node kinds, since
// they're always rendered at unit radius and scaled.
export const SELECTION_RING_GEOMETRY = new THREE.TorusGeometry(1, 0.04, 16, 64)
export const CORE_GEOMETRY = new THREE.SphereGeometry(1, 16, 12)
// Thin orbiting ring only used by the orchestrator.
export const ORCHESTRATOR_ORBIT_GEOMETRY = new THREE.TorusGeometry(1, 0.025, 12, 80)

export function geometryFor(kind: MeshNodeKind): THREE.BufferGeometry {
  switch (kind) {
    case 'orchestrator':
      return ORCHESTRATOR_GEOMETRY
    case 'subagent':
    case 'expert':
      // Both render as smooth glass spheres so the user reads them as one
      // category ("enterprise agent") regardless of whether they were
      // spawned as a generic subagent or invoked as a pre-registered expert.
      return AGENT_SPHERE_GEOMETRY
    case 'skill':
      return SKILL_GEOMETRY
    case 'tool':
      return TOOL_GEOMETRY
    default:
      return DEFAULT_GEOMETRY
  }
}

/**
 * Per-kind base tint, picked specifically to read as *glass* (not a dark
 * sphere) at the material settings used in `Mesh3DNodeBody`. We deliberately
 * sidestep the theme tokens like `--card` / `--border` here because they
 * resolve to near-background colours in dark mode and turn the glass body
 * into a near-black blob.
 *
 * Mid-tone, slightly desaturated colours look glassy in both light and dark
 * themes: bright enough to catch the envmap highlight, low-enough saturation
 * to read as a tinted glass rather than a coloured plastic.
 */
export function tintFor(kind: MeshNodeKind, colors: MeshThemeColors): string {
  switch (kind) {
    case 'orchestrator':
      // Use the brand primary directly — the hub gets to be saturated.
      return colors.primary
    case 'subagent':
    case 'expert':
      // Soft cool steel-blue — both kinds read as "enterprise agent" so they
      // share a tint with the sphere geometry.
      return '#8aa0c8'
    case 'skill':
      // Warm desaturated amber.
      return '#e0b878'
    case 'tool':
      // Light steel.
      return '#9aa8be'
    default:
      return '#9aa8be'
  }
}

/** Emissive base colour used for the inner core pulse and selection ring. */
export function emissiveFor(kind: MeshNodeKind, colors: MeshThemeColors): string {
  switch (kind) {
    case 'orchestrator':
      return colors.primary
    case 'expert':
      return colors.secondary || colors.primary
    case 'skill':
      return '#f0b048'
    case 'tool':
      return colors.accent || colors.primary
    case 'subagent':
    default:
      return colors.primary
  }
}
