import { useMemo } from 'react'
import { useActivityHeatmap as useSharedActivityHeatmap } from '@/common/hooks/analytics/useActivityHeatmap'

export type { ActivityHeatmapData } from '@/common/hooks/analytics/useActivityHeatmap'

/**
 * CRM-specific wrapper for activity heatmap data.
 * Fetches SalesActivity aggregates for the last 30 days.
 */
export const useActivityHeatmap = (accessToken: string) => {
  const config = useMemo(
    () => ({
      accessToken,
      entityAggregates: ['SalesActivityAggregate'],
      days: 30
    }),
    [accessToken]
  )

  return useSharedActivityHeatmap(config)
}
