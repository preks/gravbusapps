/**
 * Calendar Color Utilities
 * Provides design system aligned colors for calendar events
 *
 * Calendar event colors are user-selectable (like Google Calendar), but should
 * align with the design system palette for consistency and theme compatibility.
 */

/**
 * Extract hex color from CSS custom property
 * Falls back to provided value if CSS var isn't available
 */
function getCSSVariableHex(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const computedValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim()

    if (!computedValue) {
      return fallback
    }

    // If already hex, return it
    if (computedValue.startsWith('#')) {
      return computedValue
    }

    // For simplicity, return fallback for non-hex values
    // (We could add RGB/HSL conversion here if needed)
    return fallback
  } catch {
    return fallback
  }
}

/**
 * Calendar event color option
 */
export interface CalendarColorOption {
  name: string
  value: string
  cssVar?: string // Optional CSS variable reference
}

/**
 * Design system aligned calendar colors
 * These match the design system palette while providing good visual distinction
 *
 * Note: These are USER-SELECTABLE colors (like Google Calendar color picker),
 * not semantic tokens. They should be visually distinct and work with themes.
 */
export const CALENDAR_COLORS: CalendarColorOption[] = [
  {
    name: 'Blue',
    value: '#3B82F6', // blue-500 (matches --nw-primary)
    cssVar: '--nw-primary'
  },
  {
    name: 'Green',
    value: '#10B981', // emerald-500 (matches --nw-success)
    cssVar: '--nw-success'
  },
  {
    name: 'Purple',
    value: '#8B5CF6', // violet-500 (matches --nw-ai)
    cssVar: '--nw-ai'
  },
  {
    name: 'Orange',
    value: '#F97316', // orange-500 (matches --nw-warning)
    cssVar: '--nw-warning'
  },
  {
    name: 'Pink',
    value: '#EC4899', // pink-500
    cssVar: undefined
  },
  {
    name: 'Teal',
    value: '#14B8A6', // teal-500
    cssVar: undefined
  },
  {
    name: 'Red',
    value: '#EF4444', // red-500 (matches --nw-destructive)
    cssVar: '--nw-destructive'
  },
  {
    name: 'Yellow',
    value: '#F59E0B', // amber-500
    cssVar: undefined
  }
]

/**
 * Get resolved calendar colors with design system integration
 * Attempts to read from CSS variables for theme-aware colors
 *
 * @returns Array of color options with resolved values
 *
 * @example
 * ```typescript
 * const colors = getCalendarColors()
 * // Returns colors that match current theme
 * ```
 */
export function getCalendarColors(): CalendarColorOption[] {
  return CALENDAR_COLORS.map(color => ({
    ...color,
    value: color.cssVar ? getCSSVariableHex(color.cssVar, color.value) : color.value
  }))
}

/**
 * Get a specific calendar color by name
 *
 * @param colorName - Name of the color (e.g., 'Blue', 'Green')
 * @param fallbackIndex - Index to use if color not found (default: 0)
 * @returns Color option
 */
export function getCalendarColorByName(colorName: string, fallbackIndex: number = 0): CalendarColorOption {
  const colors = getCalendarColors()
  const found = colors.find(c => c.name.toLowerCase() === colorName.toLowerCase())
  return found || colors[fallbackIndex]
}

/**
 * Validate if a color value is in the calendar palette
 *
 * @param colorValue - Hex color string to validate
 * @returns True if color is in the palette
 */
export function isCalendarColor(colorValue: string): boolean {
  return CALENDAR_COLORS.some(c => c.value.toLowerCase() === colorValue.toLowerCase())
}

/**
 * Get the default calendar color
 * Uses the first color (Blue/Primary)
 */
export function getDefaultCalendarColor(): string {
  return getCalendarColors()[0].value
}

/**
 * Calculate text color (white or black) for a given background color
 * Uses relative luminance formula for WCAG accessibility
 *
 * @param hexColor - Background color in hex format
 * @returns 'white' or 'black' for optimal contrast
 *
 * @example
 * ```typescript
 * const textColor = getContrastTextColor('#3B82F6')
 * // Returns: 'white' (blue needs white text)
 * ```
 */
export function getContrastTextColor(hexColor: string): 'white' | 'black' {
  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255

  // Calculate relative luminance (WCAG formula)
  const luminance =
    0.2126 * (r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)) +
    0.7152 * (g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)) +
    0.0722 * (b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4))

  // Use white text for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? 'black' : 'white'
}

/**
 * Create a lighter/darker variant of a color
 * Useful for hover states or secondary elements
 *
 * @param hexColor - Base color
 * @param amount - Amount to lighten (positive) or darken (negative), range: -1 to 1
 * @returns Modified hex color
 */
export function adjustColorBrightness(hexColor: string, amount: number): string {
  const hex = hexColor.replace('#', '')

  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  const adjust = (value: number) => {
    const adjusted = value + amount * 255
    return Math.max(0, Math.min(255, Math.round(adjusted)))
  }

  const newR = adjust(r).toString(16).padStart(2, '0')
  const newG = adjust(g).toString(16).padStart(2, '0')
  const newB = adjust(b).toString(16).padStart(2, '0')

  return `#${newR}${newG}${newB}`
}

/**
 * Add opacity to a hex color
 *
 * @param hexColor - Base color
 * @param opacity - Opacity value (0-1)
 * @returns Hex color with alpha channel
 */
export function withOpacity(hexColor: string, opacity: number): string {
  const hex = hexColor.replace('#', '')
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, '0')
  return `#${hex}${alpha}`
}
