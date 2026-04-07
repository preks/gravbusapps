export interface TrendResult {
  value: string
  positive: boolean | undefined
  description: string
  badgeVariant?: 'offline'
}

/**
 * Calculate percentage trend between current and previous values.
 *
 * - positive (green dot)  → change > 0
 * - negative (red dot)    → change < 0
 * - neutral  (gray dot)   → change = 0  (`positive: undefined`, `badgeVariant: 'offline'`)
 */
export const calculateTrend = (
  current: number,
  previous: number,
  description: string = 'vs previous period'
): TrendResult => {
  if (previous === 0) {
    if (current === 0) {
      return { value: '0.0%', positive: undefined, badgeVariant: 'offline', description }
    }
    return { value: '+100.0%', positive: true, description }
  }

  const change = ((current - previous) / previous) * 100

  if (change === 0) {
    return { value: '0.0%', positive: undefined, badgeVariant: 'offline', description }
  }

  return {
    value: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
    positive: change > 0,
    description
  }
}
