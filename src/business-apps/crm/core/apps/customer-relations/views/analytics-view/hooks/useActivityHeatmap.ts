import { useMemo } from 'react'
import {
  useActivityHeatmap as useSharedActivityHeatmap,
  type ActivityHeatmapData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

/**
 * CRM-specific wrapper for activity heatmap data.
 * Fetches SalesActivity aggregates for the last 30 days.
 */
const useActivityHeatmap = (accessToken: string) => {
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

export { useActivityHeatmap, type ActivityHeatmapData }
