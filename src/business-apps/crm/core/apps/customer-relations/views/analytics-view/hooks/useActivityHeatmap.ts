import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ActivityHeatmapData {
  date: string
  fullDate: string
  activities: number
}

export const useActivityHeatmap = (accessToken: string) => {
  const [activityData, setActivityData] = useState<ActivityHeatmapData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchActivityTimeline = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const currentDate = new Date()
        const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        thirtyDaysAgo.setHours(0, 0, 0, 0)

        // Create daily data structure for last 30 days with zero counts
        const dailyData = new Map<string, number>()
        for (let i = 0; i < 30; i++) {
          const date = new Date(thirtyDaysAgo)
          date.setDate(date.getDate() + i)
          const dateKey = date.toISOString().split('T')[0]
          dailyData.set(dateKey, 0)
        }

        // Build aggregate queries for each day
        const aggregateQueries = Array.from(dailyData.keys())
          .map((dateKey, index) => {
            const nextDay = new Date(dateKey)
            nextDay.setDate(nextDay.getDate() + 1)
            const nextDayISO = nextDay.toISOString().split('T')[0]

            return `
            day_${index}: SalesActivityAggregate(
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

        const query = `
          query GetActivityTimelineAggregates {
            ${aggregateQueries}
          }
        `

        const result = await graphqlClient.request<Record<string, { aggregate: { count: number } }>>(query)

        // Extract counts from aggregates
        const dates = Array.from(dailyData.keys())
        dates.forEach((dateKey, index) => {
          const aggData = result[`day_${index}`]
          dailyData.set(dateKey, aggData?.aggregate?.count || 0)
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

    if (accessToken) {
      fetchActivityTimeline()
    }
  }, [accessToken, graphqlClient])

  return { activityData, isLoading, error }
}
