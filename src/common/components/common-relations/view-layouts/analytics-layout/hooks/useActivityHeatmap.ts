import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ActivityHeatmapData {
  date: string
  fullDate: string
  activities: number
}

interface UseActivityHeatmapConfig {
  accessToken: string
  /**
   * Array of GraphQL aggregate entity names to query.
   * Examples:
   * - CRM: ['SalesActivityAggregate']
   * - IRM: ['InvestmentLeadAggregate', 'InvestmentAccountAggregate', 'InvestmentOpportunityAggregate', 'InvestmentContactAggregate']
   */
  entityAggregates: string[]
  /**
   * Number of days to fetch activity data for (default: 30)
   */
  days?: number
}

/**
 * Generic hook to fetch activity heatmap data for the last N days.
 * Supports single or multiple entity aggregates.
 *
 * @example CRM Usage
 * const { activityData, isLoading, error } = useActivityHeatmap({
 *   accessToken,
 *   entityAggregates: ['SalesActivityAggregate']
 * })
 *
 * @example IRM Usage
 * const { activityData, isLoading, error } = useActivityHeatmap({
 *   accessToken,
 *   entityAggregates: [
 *     'InvestmentLeadAggregate',
 *     'InvestmentAccountAggregate',
 *     'InvestmentOpportunityAggregate',
 *     'InvestmentContactAggregate'
 *   ]
 * })
 */
export const useActivityHeatmap = (config: UseActivityHeatmapConfig) => {
  const { accessToken, entityAggregates, days = 30 } = config
  const [activityData, setActivityData] = useState<ActivityHeatmapData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  // Create stable string representation of entityAggregates for dependency comparison
  const entityAggregatesKey = entityAggregates.join(',')

  useEffect(() => {
    const fetchActivityTimeline = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const currentDate = new Date()
        const startDate = new Date(currentDate.getTime() - days * 24 * 60 * 60 * 1000)
        startDate.setHours(0, 0, 0, 0)

        // Create daily data structure with zero counts
        const dailyData = new Map<string, number>()
        for (let i = 0; i < days; i++) {
          const date = new Date(startDate)
          date.setDate(date.getDate() + i)
          const dateKey = date.toISOString().split('T')[0]
          dailyData.set(dateKey, 0)
        }

        // Build aggregate queries for each day and entity
        const aggregateQueries = Array.from(dailyData.keys())
          .map((dateKey, dayIndex) => {
            const nextDay = new Date(dateKey)
            nextDay.setDate(nextDay.getDate() + 1)
            const nextDayISO = nextDay.toISOString().split('T')[0]

            // Create queries for all entity aggregates for this day
            return entityAggregates
              .map((entityAggregate, entityIndex) => {
                const queryAlias =
                  entityAggregates.length === 1
                    ? `day_${dayIndex}` // Single entity: simple alias
                    : `day_${dayIndex}_entity_${entityIndex}` // Multiple entities: include entity index

                return `
                  ${queryAlias}: ${entityAggregate}(
                    where: {
                      isDeleted: { _eq: false }
                      createdAt: { _gte: "${dateKey}T00:00:00Z", _lt: "${nextDayISO}T00:00:00Z" }
                    }
                  ) {
                    aggregate { count }
                  }
                `
              })
              .join('\n')
          })
          .join('\n')

        const query = `
          query GetActivityTimelineAggregates {
            ${aggregateQueries}
          }
        `

        const result = await graphqlClient.request<Record<string, { aggregate: { count: number } }>>(query)

        // Extract counts from aggregates and sum for each day
        const dates = Array.from(dailyData.keys())
        dates.forEach((dateKey, dayIndex) => {
          let dayTotal = 0

          if (entityAggregates.length === 1) {
            // Single entity: simple key
            const aggData = result[`day_${dayIndex}`]
            dayTotal = aggData?.aggregate?.count || 0
          } else {
            // Multiple entities: sum all entity counts for this day
            entityAggregates.forEach((_, entityIndex) => {
              const aggData = result[`day_${dayIndex}_entity_${entityIndex}`]
              dayTotal += aggData?.aggregate?.count || 0
            })
          }

          dailyData.set(dateKey, dayTotal)
        })

        // Convert to array and format for chart
        const timelineData: ActivityHeatmapData[] = Array.from(dailyData.entries())
          .map(([dateKey, count]) => {
            const date = new Date(dateKey)
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return {
              date: formattedDate,
              fullDate: dateKey,
              activities: count
            }
          })
          .sort((a, b) => a.fullDate.localeCompare(b.fullDate))

        setActivityData(timelineData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken && entityAggregates.length > 0) {
      fetchActivityTimeline()
    }
    // Note: graphqlClient is a singleton, only accessToken changes matter
  }, [accessToken, days, entityAggregatesKey])

  return { activityData, isLoading, error }
}
