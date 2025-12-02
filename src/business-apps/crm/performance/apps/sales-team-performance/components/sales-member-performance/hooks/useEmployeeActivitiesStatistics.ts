import { useState, useEffect, useCallback } from 'react'
import { ActivityStatistics, ActivityType, ActivityEntityType } from '../types/activitiesTypes'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'

interface UseEmployeeActivitiesStatisticsProps {
  employeeId: string
  accessToken: string
  userInfo?: any // Add userInfo for proper createdBy filtering
  periodInMonths?: number // Default to 1 for "across all references"
}

interface UseEmployeeActivitiesStatisticsReturn {
  statistics: ActivityStatistics | null
  loading: boolean
  error: Error | null
  totalCount: number
  refetch: () => void
}

export const useEmployeeActivitiesStatistics = ({
  employeeId,
  accessToken,
  periodInMonths = 1
}: UseEmployeeActivitiesStatisticsProps): UseEmployeeActivitiesStatisticsReturn => {
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const fetchStatistics = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      // Fetch activity types from catalog first
      const catalogResponse = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'SalesActivityType',
          version: 'v1'
        },
        {
          limit: 100, // Get all activity types
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale
        }
      )

      const activityTypes = catalogResponse?.data?.map((entry: any) => entry.value || entry.code || entry.id) || []

      // Calculate date ranges
      const now = dayjs()
      const currentMonthStart = now.startOf('month').format('YYYY-MM-DDTHH:mm:ss')

      // Build dynamic aggregate queries for each activity type
      const activityTypeQueries = activityTypes
        .map((type: string) => {
          const fieldName = `${type.toLowerCase().replaceAll(/[^a-z0-9]/g, '')}Activities`
          return `
          ${fieldName}: SalesActivityAggregate(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              isDeleted: { _eq: false }
              activityType: { value: { _eq: "${type}" } }
            }
          ) {
            aggregate {
              count
            }
          }
        `
        })
        .join('\n')

      // Build aggregate query to get statistics with dynamic activity types
      const query = `
        query GetActivityStatistics($employeeId: uuid!) {
          # Total count
          totalActivities: SalesActivityAggregate(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              isDeleted: { _eq: false }
            }
          ) {
            aggregate {
              count
            }
          }
          
          # Current month activities
          currentMonthActivities: SalesActivityAggregate(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              createdAt: { _gte: "${currentMonthStart}" }
              isDeleted: { _eq: false }
            }
          ) {
            aggregate {
              count
            }
          }
          
          # Activity type counts using aggregates (dynamically generated)
          ${activityTypeQueries}
          
          # Entity type counts using aggregates
          contactActivities: SalesActivityAggregate(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              isDeleted: { _eq: false }
              contactId: { _isNull: false }
            }
          ) {
            aggregate {
              count
            }
          }
          
          leadActivities: SalesActivityAggregate(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              isDeleted: { _eq: false }
              leadId: { _isNull: false }
            }
          ) {
            aggregate {
              count
            }
          }
          
          opportunityActivities: SalesActivityAggregate(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              isDeleted: { _eq: false }
              opportunityId: { _isNull: false }
            }
          ) {
            aggregate {
              count
            }
          }
          
          accountActivities: SalesActivityAggregate(
            where: {
              ownerEmployeeId: { _eq: $employeeId }
              isDeleted: { _eq: false }
              accountId: { _isNull: false }
            }
          ) {
            aggregate {
              count
            }
          }
        }
      `

      const result: any = await graphqlClient.request(query, { employeeId })

      const total = result.totalActivities.aggregate.count
      const currentMonth = result.currentMonthActivities.aggregate.count

      // Get activity type counts from aggregates (server-side counting) - dynamically process based on catalog
      const activityTypeCounts: Record<string, number> = {}
      activityTypes.forEach((type: string) => {
        const fieldName = `${type.toLowerCase().replaceAll(/[^a-z0-9]/g, '')}Activities`
        activityTypeCounts[type] = result[fieldName]?.aggregate?.count || 0
      })

      // Find most common activity type
      const activityTypeKeys = Object.keys(activityTypeCounts)
      const mostCommonActivityType: ActivityType =
        activityTypeKeys.length > 0
          ? (activityTypeKeys.reduce(
              (a, b) => (activityTypeCounts[a] > activityTypeCounts[b] ? a : b),
              activityTypeKeys[0]
            ) as ActivityType)
          : ('Task' as ActivityType)
      const mostCommonCount = activityTypeCounts[mostCommonActivityType] || 0

      // Get entity type counts from aggregates (server-side counting)
      const entityTypeCounts: Record<string, number> = {
        Contact: result.contactActivities.aggregate.count,
        Lead: result.leadActivities.aggregate.count,
        Opportunity: result.opportunityActivities.aggregate.count,
        Account: result.accountActivities.aggregate.count
      }

      // Find most worked entity type
      const entityTypeKeys = Object.keys(entityTypeCounts)
      const mostWorkedEntityType: ActivityEntityType =
        entityTypeKeys.length > 0
          ? (entityTypeKeys.reduce(
              (a, b) => (entityTypeCounts[a] > entityTypeCounts[b] ? a : b),
              entityTypeKeys[0]
            ) as ActivityEntityType)
          : ('Contact' as ActivityEntityType)
      const mostWorkedCount = entityTypeCounts[mostWorkedEntityType] || 0

      // Build statistics
      const periodLabel = periodInMonths === 1 ? 'This month' : `Last ${periodInMonths} months`

      setStatistics({
        totalActivities: { count: currentMonth, period: periodLabel },
        mostCommonActivity: {
          type: mostCommonActivityType,
          count: mostCommonCount,
          percentage: total > 0 ? Math.round((mostCommonCount / total) * 100) : 0
        },
        mostWorkedEntity: {
          entityType: mostWorkedEntityType,
          count: mostWorkedCount,
          percentage: total > 0 ? Math.round((mostWorkedCount / total) * 100) : 0
        },
        averageActivityScore: { score: 0, trend: 0 } // Not calculated in aggregate
      })

      setTotalCount(total)
    } catch (err) {
      console.error('Error fetching activity statistics:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch statistics'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, periodInMonths, graphqlClient, catalogClient, userLocale])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  return {
    statistics,
    loading,
    error,
    totalCount,
    refetch: () => {
      fetchStatistics()
    }
  }
}
