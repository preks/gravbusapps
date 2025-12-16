/**
 * Voice Overlay Color Utilities
 * Extracts design system token colors for use in canvas rendering
 *
 * This utility bridges CSS design tokens with canvas RGB values by:
 * 1. Reading computed CSS variable values from the DOM
 * 2. Converting CSS color strings to RGB components
 * 3. Providing fallback values for SSR/initial render
 */

/**
 * Parse a CSS color string to RGB components
 * Supports: rgb(), rgba(), hex (#RRGGBB, #RGB)
 */
function parseColorToRGB(colorString: string): { r: number; g: number; b: number } | null {
  // Handle rgb/rgba format
  const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    }
  }

  // Handle hex format
  const hexMatch = colorString.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16)
    }
  }

  // Handle short hex format (#RGB)
  const shortHexMatch = colorString.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i)
  if (shortHexMatch) {
    return {
      r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
      g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
      b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16)
    }
  }

  return null
}

/**
 * Get the computed color value from a CSS variable
 * Returns RGB components for use in canvas rendering
 */
function getCSSVariableColor(
  variableName: string,
  fallbackRGB: { r: number; g: number; b: number }
): {
  r: number
  g: number
  b: number
} {
  if (typeof window === 'undefined') {
    return fallbackRGB
  }

  try {
    const computedValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()

    if (!computedValue) {
      console.warn(`[VoiceColors] CSS variable ${variableName} not found, using fallback`)
      return fallbackRGB
    }

    const rgb = parseColorToRGB(computedValue)
    if (rgb) {
      return rgb
    }

    console.warn(`[VoiceColors] Could not parse color ${computedValue} for ${variableName}, using fallback`)
    return fallbackRGB
  } catch (error) {
    console.warn(`[VoiceColors] Error reading ${variableName}:`, error)
    return fallbackRGB
  }
}

/**
 * Design system voice state colors
 * Maps voice overlay states to design system tokens
 */
export const VOICE_STATE_COLORS = {
  // Listening state - uses success (green) tokens
  listening: {
    cssVar: '--nw-success',
    fallback: { r: 34, g: 197, b: 94 }, // green-500
    getColor: () => getCSSVariableColor('--nw-success', { r: 34, g: 197, b: 94 })
  },

  // Speaking state - uses info (blue) tokens
  speaking: {
    cssVar: '--nw-info',
    fallback: { r: 59, g: 130, b: 246 }, // blue-500
    getColor: () => getCSSVariableColor('--nw-info', { r: 59, g: 130, b: 246 })
  },

  // Idle state - uses AI (purple) tokens
  idle: {
    cssVar: '--nw-ai',
    fallback: { r: 139, g: 92, b: 246 }, // purple-500
    getColor: () => getCSSVariableColor('--nw-ai', { r: 139, g: 92, b: 246 })
  },

  // Core glow (white/light)
  core: {
    r: 255,
    g: 255,
    b: 255
  }
} as const

/**
 * Get voice state color with proper design token resolution
 * Use this in your canvas rendering instead of hardcoded RGB values
 *
 * @example
 * ```typescript
 * const listeningColor = getVoiceStateColor('listening')
 * ctx.fillStyle = `rgba(${listeningColor.r}, ${listeningColor.g}, ${listeningColor.b}, 0.6)`
 * ```
 */
export function getVoiceStateColor(state: 'listening' | 'speaking' | 'idle' | 'core'): {
  r: number
  g: number
  b: number
} {
  if (state === 'core') {
    return VOICE_STATE_COLORS.core
  }

  return VOICE_STATE_COLORS[state].getColor()
}

/**
 * Create a canvas gradient color string from RGB components
 * Helper for canvas rendering with design token colors
 */
export function rgbaString(rgb: { r: number; g: number; b: number }, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}
