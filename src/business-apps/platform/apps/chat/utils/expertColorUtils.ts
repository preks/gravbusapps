/**
 * Expert Color Utilities
 * Provides design system compliant color handling for AI experts
 *
 * Experts can have custom colors from the database, but we need proper fallbacks
 * to design system tokens instead of hardcoded values.
 */

/**
 * Get the computed color value from a CSS variable
 * Returns hex color string for use in inline styles
 */
function getCSSVariableColor(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const computedValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()

    if (!computedValue) {
      console.warn(`[ExpertColors] CSS variable ${variableName} not found, using fallback`)
      return fallback
    }

    // If it's already a hex/rgb value, return it
    if (computedValue.startsWith('#') || computedValue.startsWith('rgb')) {
      return computedValue
    }

    // If it's an HSL value, we need to convert it or use fallback
    // For simplicity, use fallback for now (HSL conversion is complex)
    console.warn(`[ExpertColors] Could not use color ${computedValue} for ${variableName}, using fallback`)
    return fallback
  } catch (error) {
    console.warn(`[ExpertColors] Error reading ${variableName}:`, error)
    return fallback
  }
}

/**
 * Design system colors for AI experts
 * Used as fallbacks when expert doesn't have a custom color
 */
export const EXPERT_DESIGN_COLORS = {
  // Default expert color - uses info (blue) token
  default: {
    cssVar: '--nw-info',
    fallback: '#3b82f6' // blue-500
  },

  // Alternative expert colors from design system
  primary: {
    cssVar: '--nw-primary',
    fallback: '#3b82f6' // blue-500
  },

  ai: {
    cssVar: '--nw-ai',
    fallback: '#8b5cf6' // purple-500
  },

  success: {
    cssVar: '--nw-success',
    fallback: '#22c55e' // green-500
  },

  warning: {
    cssVar: '--nw-warning',
    fallback: '#f59e0b' // orange-500
  }
} as const

/**
 * Get expert color with design system fallback
 *
 * @param expertColor - Custom expert color from database (optional)
 * @param fallbackToken - Which design token to use as fallback (default: 'default')
 * @returns Hex color string safe for inline styles
 *
 * @example
 * ```typescript
 * // With custom color
 * const color = getExpertColor('#ff0000') // Returns: '#ff0000'
 *
 * // Without custom color - uses design system
 * const color = getExpertColor() // Returns: value of --nw-info or fallback
 *
 * // With specific fallback token
 * const color = getExpertColor(undefined, 'ai') // Returns: value of --nw-ai or fallback
 * ```
 */
export function getExpertColor(
  expertColor?: string | null,
  fallbackToken: keyof typeof EXPERT_DESIGN_COLORS = 'default'
): string {
  // If expert has a custom color, use it
  if (expertColor && typeof expertColor === 'string' && expertColor.trim()) {
    return expertColor
  }

  // Otherwise, use design system token
  const token = EXPERT_DESIGN_COLORS[fallbackToken]
  return getCSSVariableColor(token.cssVar, token.fallback)
}

/**
 * Create an alpha/opacity variant of a color
 * Useful for backgrounds and borders
 *
 * @example
 * ```typescript
 * const bgColor = withOpacity('#3b82f6', 0.2) // Returns: '#3b82f633'
 * ```
 */
export function withOpacity(color: string, opacity: number): string {
  // If hex color, append alpha
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const alpha = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, '0')
    return `#${hex}${alpha}`
  }

  // If rgb, convert to rgba
  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`)
  }

  // If already rgba, update alpha
  if (color.startsWith('rgba(')) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${opacity})`)
  }

  // Fallback: return as-is
  return color
}

/**
 * Get expert color styles for common use cases
 * Returns an object with pre-calculated style properties
 *
 * @example
 * ```typescript
 * const styles = getExpertColorStyles('#3b82f6')
 * // Returns: {
 * //   color: '#3b82f6',
 * //   backgroundColor: '#3b82f633',
 * //   borderColor: '#3b82f6'
 * // }
 *
 * <div style={styles.badge}>Expert</div>
 * ```
 */
export function getExpertColorStyles(expertColor?: string | null) {
  const color = getExpertColor(expertColor)

  return {
    // Text color
    text: {
      color
    },

    // Background color (20% opacity)
    background: {
      backgroundColor: withOpacity(color, 0.2)
    },

    // Border color
    border: {
      borderColor: color
    },

    // Avatar (solid color)
    avatar: {
      backgroundColor: color,
      color: '#ffffff' // white text on colored background
    },

    // Badge (colored background + colored text)
    badge: {
      backgroundColor: withOpacity(color, 0.2),
      color
    },

    // Combined (border + background + text)
    combined: {
      borderColor: color,
      backgroundColor: withOpacity(color, 0.1),
      color
    }
  }
}

/**
 * Check if a color string is valid
 */
export function isValidColor(color?: string | null): boolean {
  if (!color || typeof color !== 'string') return false

  const trimmed = color.trim()

  // Check hex format
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return true

  // Check rgb/rgba format
  if (/^rgba?\([\d\s,./]+\)$/.test(trimmed)) return true

  // Check hsl/hsla format
  if (/^hsla?\([\d\s,%./]+\)$/.test(trimmed)) return true

  return false
}
