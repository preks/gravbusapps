// Visual themes for the reusable 3D glass card sphere.
//
// All hex/rgba values here are Three.js scene/material colours (not UI tokens),
// so the design-system token rules do not apply - the HTML fallback grid uses
// Tailwind tokens instead. Two presets ship: the original deep-purple DARK look
// (workforce overview) and a white, ultra-modern LIGHT look (agent mesh) that
// matches the bright mesh canvas. Both keep the exact same animations.

export interface GlassGlowStops {
  core: string
  mid: string
  edge: string
}

export interface GlassCardSurfaceTheme {
  bodyColor: string
  opacity: number
  // Reflection strength from the environment map (high = glossy/blooms more).
  envMapIntensity: number
  // Base surface roughness (higher = more diffuse, fewer blown-out highlights).
  roughness: number
  // Clearcoat gloss layer (high = mirror-like, sweeps bright reflections on spin).
  clearcoat: number
  clearcoatRoughness: number
  // Idle emissive glow; running cards pulse between the running base + pulse.
  emissiveIdle: number
  emissiveRunningBase: number
  emissiveRunningPulse: number
  // Neon bezel ring opacity (idle vs the running pulse envelope).
  frameOpacityIdle: number
  frameOpacityRunningBase: number
  frameOpacityRunningPulse: number
  titleColor: string
  subtitleColor: string
  iconTextColor: string
  highlightColor: string
  highlightOpacity: number
}

export interface GlassKpiTheme {
  textColor: string
  panelColor: string
  panelOpacity: number
}

export interface GlassCardTheme {
  // Canvas clear colour (behind the enclosing gradient sphere).
  clearColor: number
  // Enclosing gradient sphere stops (top -> middle -> bottom).
  gradient: [string, string, string]
  gradientToneMapped: boolean
  // Soft floor halo under the cluster; null hides it.
  glow: GlassGlowStops | null
  ambientIntensity: number
  keyLightColor: string
  keyLightIntensity: number
  fillLightColor: string
  fillLightIntensity: number
  accentLight1Color: string
  accentLight1Intensity: number
  accentLight2Color: string
  accentLight2Intensity: number
  sparkleColor: string
  sparkleOpacity: number
  bloomIntensity: number
  bloomThreshold: number
  bloomSmoothing: number
  // Use the darker status accent for status text (readable on light cards).
  statusTextStrong: boolean
  card: GlassCardSurfaceTheme
  kpi: GlassKpiTheme
}

// Original deep-purple premium look (workforce overview).
export const DARK_GLASS_THEME: GlassCardTheme = {
  clearColor: 0x060309,
  gradient: ['#0b0617', '#241046', '#060309'],
  gradientToneMapped: false,
  glow: { core: 'rgba(168, 85, 247, 0.9)', mid: 'rgba(124, 58, 237, 0.35)', edge: 'rgba(124, 58, 237, 0)' },
  ambientIntensity: 0.5,
  keyLightColor: '#ffffff',
  keyLightIntensity: 1.1,
  fillLightColor: '#7c3aed',
  fillLightIntensity: 0.5,
  accentLight1Color: '#a855f7',
  accentLight1Intensity: 0.7,
  accentLight2Color: '#22d3ee',
  accentLight2Intensity: 0.5,
  sparkleColor: '#c4b5fd',
  sparkleOpacity: 0.6,
  bloomIntensity: 0.9,
  bloomThreshold: 0.35,
  bloomSmoothing: 0.85,
  statusTextStrong: false,
  card: {
    bodyColor: '#2a1d4a',
    opacity: 0.55,
    envMapIntensity: 1.4,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    emissiveIdle: 0.12,
    emissiveRunningBase: 0.22,
    emissiveRunningPulse: 0.5,
    frameOpacityIdle: 0.5,
    frameOpacityRunningBase: 0.65,
    frameOpacityRunningPulse: 0.35,
    titleColor: '#f5f3ff',
    subtitleColor: '#c4b5fd',
    iconTextColor: '#1b1033',
    highlightColor: '#f5f3ff',
    highlightOpacity: 0.06
  },
  kpi: { textColor: '#c4b5fd', panelColor: '#2a1d4a', panelOpacity: 0.22 }
}

// White, ultra-modern look (agent mesh) - matches the bright mesh canvas while
// keeping crisp neon status accents and every animation.
export const LIGHT_GLASS_THEME: GlassCardTheme = {
  clearColor: 0xdfe3ef,
  // Cool-grey gradient with real depth so white cards keep crisp, visible edges.
  gradient: ['#e4e8f3', '#cfd5e8', '#b9c1da'],
  gradientToneMapped: true,
  // No floor glow on light: additive haze washes out text contrast.
  glow: null,
  ambientIntensity: 0.75,
  keyLightColor: '#ffffff',
  keyLightIntensity: 0.95,
  fillLightColor: '#cbd5e1',
  fillLightIntensity: 0.25,
  accentLight1Color: '#c4b5fd',
  accentLight1Intensity: 0.18,
  accentLight2Color: '#a5f3fc',
  accentLight2Intensity: 0.15,
  sparkleColor: '#94a3b8',
  sparkleOpacity: 0.18,
  // Bloom off: the white scene must stay crisp; running pulse uses emissive only.
  bloomIntensity: 0,
  bloomThreshold: 1.5,
  bloomSmoothing: 0.1,
  statusTextStrong: true,
  card: {
    bodyColor: '#ffffff',
    // Opaque white so nothing bleeds through behind the text.
    opacity: 1,
    // Matte white so reflections do not sweep across text while rotating.
    envMapIntensity: 0.15,
    roughness: 0.6,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    emissiveIdle: 0.015,
    emissiveRunningBase: 0.06,
    emissiveRunningPulse: 0.18,
    frameOpacityIdle: 0.85,
    frameOpacityRunningBase: 1,
    frameOpacityRunningPulse: 0,
    titleColor: '#0f172a',
    subtitleColor: '#475569',
    iconTextColor: '#ffffff',
    highlightColor: '#ffffff',
    highlightOpacity: 0.06
  },
  kpi: { textColor: '#475569', panelColor: '#ffffff', panelOpacity: 0.6 }
}
