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

        // Build aggregate queries for each day (for all entity types)
        const aggregateQueries = Array.from(dailyData.keys())
          .map((dateKey, index) => {
            const nextDay = new Date(dateKey)
            nextDay.setDate(nextDay.getDate() + 1)
            const nextDayISO = nextDay.toISOString().split('T')[0]

            return `
            day_${index}_leads: InvestmentLeadAggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${dateKey}T00:00:00Z", _lt: "${nextDayISO}T00:00:00Z" }
              }
            ) {
              aggregate { count }
            }
            day_${index}_accounts: InvestmentAccountAggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${dateKey}T00:00:00Z", _lt: "${nextDayISO}T00:00:00Z" }
              }
            ) {
              aggregate { count }
            }
            day_${index}_opportunities: InvestmentOpportunityAggregate(
              where: {
                isDeleted: { _eq: false }
                createdAt: { _gte: "${dateKey}T00:00:00Z", _lt: "${nextDayISO}T00:00:00Z" }
              }
            ) {
              aggregate { count }
            }
            day_${index}_contacts: InvestmentContactAggregate(
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

        // Sum counts from all entity types for each day
        const dates = Array.from(dailyData.keys())
        dates.forEach((dateKey, index) => {
          const leadCount = result[`day_${index}_leads`]?.aggregate?.count || 0
          const accountCount = result[`day_${index}_accounts`]?.aggregate?.count || 0
          const opportunityCount = result[`day_${index}_opportunities`]?.aggregate?.count || 0
          const contactCount = result[`day_${index}_contacts`]?.aggregate?.count || 0
          const totalCount = leadCount + accountCount + opportunityCount + contactCount
          dailyData.set(dateKey, totalCount)
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
