import { useMemo } from 'react'
import { useActivityHeatmap as useSharedActivityHeatmap } from '@/common/hooks/analytics/useActivityHeatmap'

export type { ActivityHeatmapData } from '@/common/hooks/analytics/useActivityHeatmap'

/**
 * IRM-specific wrapper for activity heatmap data.
 * Fetches aggregates for all investment entity types (leads, accounts, opportunities, contacts) for the last 30 days.
 */
export const useActivityHeatmap = (accessToken: string) => {
  const config = useMemo(
    () => ({
      accessToken,
      entityAggregates: [
        'InvestmentLeadAggregate',
        'InvestmentAccountAggregate',
        'InvestmentOpportunityAggregate',
        'InvestmentContactAggregate'
      ],
      days: 30
    }),
    [accessToken]
  )

  return useSharedActivityHeatmap(config)
}
