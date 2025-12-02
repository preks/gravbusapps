/**
 * Chart Colors - Design System Integration
 *
 * Uses actual color values for Recharts compatibility.
 * These colors match the nw-design-system color palette.
 * Note: Recharts doesn't support CSS variables, so we use hex values.
 */

export const CHART_COLORS = {
  primary: '#3b82f6', // Blue (chart-1)
  success: '#22c55e', // Green (chart-2)
  accent: '#a855f7', // Purple (chart-3)
  warning: '#f59e0b', // Orange (chart-4)
  danger: '#ef4444', // Red (chart-5)
  info: '#06b6d4', // Cyan (chart-6)
  secondary: '#84cc16', // Lime (chart-7)
  tertiary: '#ec4899' // Pink (chart-8)
} as const

/**
 * Array of chart colors for multi-series visualizations
 * Use this for pie charts, treemaps, or other charts with multiple color-coded items
 */
export const CHART_COLOR_ARRAY = [
  CHART_COLORS.success,
  CHART_COLORS.primary,
  CHART_COLORS.accent,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary
] as const
