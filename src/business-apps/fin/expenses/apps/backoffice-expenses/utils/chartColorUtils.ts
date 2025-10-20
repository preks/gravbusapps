/**
 * Resolves CSS custom properties (variables) to their computed values.
 * Required for charts (recharts) which need actual color values, not CSS variables.
 * Handles SSR gracefully by returning a fallback hex color if window/document are unavailable.
 *
 * @param cssVar - CSS variable string (e.g., "var(--nw-primary)")
 * @param fallbackHex - Fallback hex color to use if variable cannot be resolved
 * @returns Resolved color value as hex string
 *
 * @example
 * resolveCssVar("var(--nw-primary)", "#3b82f6") // Returns computed value or fallback
 */
export const resolveCssVar = (cssVar: string, fallbackHex: string): string => {
  // Not a CSS variable: return as-is
  if (!cssVar.startsWith('var(')) return cssVar

  // SSR or environments without DOM → return fallback
  if (
    globalThis.window === undefined ||
    globalThis.document === undefined ||
    typeof globalThis.getComputedStyle !== 'function'
  ) {
    return fallbackHex
  }

  // Extract variable name from var(--name)
  const varName = cssVar.substring(4, cssVar.length - 1).trim()

  // Get computed value from document root element
  const resolved = globalThis.getComputedStyle(globalThis.document.documentElement).getPropertyValue(varName).trim()

  // Return resolved value or fallback
  return resolved || fallbackHex
}

/**
 * Design system color tokens for charts
 * Using CSS variables from nw-design-system that will be resolved at runtime
 */
export const CHART_DESIGN_TOKENS = {
  // Chart-specific colors (--nw-chart-1, --nw-chart-2, etc.)
  chart1: {
    token: 'var(--nw-chart-1)',
    fallback: '#3b82f6' // Blue
  },
  chart2: {
    token: 'var(--nw-chart-2)',
    fallback: '#10b981' // Green
  },
  chart3: {
    token: 'var(--nw-chart-3)',
    fallback: '#f59e0b' // Orange
  },
  chart4: {
    token: 'var(--nw-chart-4)',
    fallback: '#ef4444' // Red
  },
  chart5: {
    token: 'var(--nw-chart-5)',
    fallback: '#8b5cf6' // Purple
  },
  // Semantic colors (--nw-primary, --nw-success, etc.)
  primary: {
    token: 'var(--nw-primary)',
    fallback: '#3b82f6' // Blue - matches design system primary
  },
  success: {
    token: 'var(--nw-success)',
    fallback: '#10b981' // Green - matches design system success
  },
  warning: {
    token: 'var(--nw-warning)',
    fallback: '#f59e0b' // Orange - matches design system warning
  },
  destructive: {
    token: 'var(--nw-destructive)',
    fallback: '#ef4444' // Red - matches design system destructive
  },
  info: {
    token: 'var(--nw-info)',
    fallback: '#3b82f6' // Blue - matches design system info
  },
  muted: {
    token: 'var(--nw-muted)',
    fallback: '#6b7280' // Gray - matches design system muted
  }
} as const

/**
 * Get a resolved chart color from design tokens
 * @param tokenName - Name of the design token (e.g., 'primary', 'warning', 'chart1')
 * @returns Resolved hex color value
 */
export const getChartColor = (tokenName: keyof typeof CHART_DESIGN_TOKENS): string => {
  const { token, fallback } = CHART_DESIGN_TOKENS[tokenName]
  return resolveCssVar(token, fallback)
}
