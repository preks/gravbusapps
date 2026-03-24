/**
 * Design-system chart tokens for CRM campaigns analytics.
 *
 * - Use `NW_CHART_COLOR_VARS` for rotating fills (pie slices, treemap cells, dynamic series).
 * - With `ChartContainer` + `ChartConfig`, Recharts uses `var(--color-{configKey})` where
 *   `configKey` is the lowercase series key from `chartConfig` (see HistogramWidget pattern).
 */

export const NW_CHART_COLOR_VARS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)',
  'var(--nw-chart-7)',
  'var(--nw-chart-8)'
] as const

export type NwChartColorVar = (typeof NW_CHART_COLOR_VARS)[number]

/** Stable key for chartConfig / data (matches LeadSourceChart). */
export function toChartConfigKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function nwChartColorAt(index: number): string {
  return NW_CHART_COLOR_VARS[index % NW_CHART_COLOR_VARS.length]!
}

/**
 * Resolve a CSS color token to a computed color for APIs that reject `var()` (e.g. some gradients).
 */
export function resolveCssColor(token: string, fallback: string): string {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return fallback
  }
  try {
    const el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    el.style.setProperty('background-color', token)
    el.style.setProperty('position', 'absolute')
    el.style.setProperty('visibility', 'hidden')
    el.style.setProperty('pointer-events', 'none')
    document.body.appendChild(el)
    const resolved = window.getComputedStyle(el).backgroundColor
    document.body.removeChild(el)
    return resolved && resolved !== 'rgba(0, 0, 0, 0)' && resolved !== 'transparent' ? resolved : fallback
  } catch {
    return fallback
  }
}
