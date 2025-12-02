import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ActivityHeatmapData {
  day: string
  hour: number
  activities: number
  dayIndex: number
}

export const useActivityHeatmap = (accessToken: string) => {
  const [activityData, setActivityData] = useState<ActivityHeatmapData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchActivityHeatmap = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const currentDate = new Date()
        const thirtyDaysAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const query = `
          query GetActivityHeatmap {
            activities: SalesActivity(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${thirtyDaysAgo}"}
              }
            ) {
              createdAt
            }
          }
        `

        const result = await graphqlClient.request(query)

        const allActivities = result.activities || []

        // Create heatmap data structure (7 days × 24 hours = 168 data points)
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        const heatmapData: ActivityHeatmapData[] = []

        // Initialize data structure with zeros
        dayNames.forEach((day, dayIndex) => {
          for (let hour = 0; hour < 24; hour++) {
            heatmapData.push({
              day,
              hour,
              activities: 0,
              dayIndex
            })
          }
        })

        // Process activities and count by day/hour
        allActivities.forEach((activity: any) => {
          const date = new Date(activity.createdAt)
          const dayOfWeek = (date.getDay() + 6) % 7 // Convert Sunday=0 to Monday=0
          const hour = date.getHours()

          const dataPoint = heatmapData.find(d => d.dayIndex === dayOfWeek && d.hour === hour)
          if (dataPoint) {
            dataPoint.activities++
          }
        })

        setActivityData(heatmapData)
      } catch (err) {
        // console.error('Error fetching activity heatmap:', err);
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchActivityHeatmap()
    }
  }, [accessToken, graphqlClient])

  return { activityData, isLoading, error }
}
