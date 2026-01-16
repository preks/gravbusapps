/**
 * Hook for fetching recent activities for Personal Workspace Overview
 * Uses centralized query builders instead of hardcoded queries
 * Returns pure functions - state management handled by consumer
 */
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildCustomerActivityQuery,
  buildCustomerActivityWhereCondition,
  buildCustomerActivityOrderBy,
  type CustomerActivityQueryVariables
} from '../queries/customerActivityQueries'
import type { CustomerActivity } from '../types/customerActivityTypes'
import { toCustomerActivity } from '../mappers/customerRelatedEntityMappers'

export interface CustomerRecentActivitiesVariables {
  employeeId: string
  limit?: number
}

export interface CustomerRecentActivitiesResult {
  activities: CustomerActivity[]
  total: number
}

/**
 * Hook to fetch recent activities for a specific employee
 * Used in Personal Workspace Overview tab
 */
export const useCustomerRecentActivities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchActivities = useCallback(
    async (variables: CustomerRecentActivitiesVariables): Promise<CustomerRecentActivitiesResult> => {
      const { employeeId, limit = 100 } = variables

      // Build query variables
      const queryVariables: CustomerActivityQueryVariables = {
        ownerEmployeeIds: [employeeId],
        limit,
        offset: 0,
        orderBy: [{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }]
      }

      // Build query using central builders
      const query = buildCustomerActivityQuery()
      const whereCondition = buildCustomerActivityWhereCondition(queryVariables)
      const orderBy = buildCustomerActivityOrderBy(queryVariables.orderBy || [])

      const graphQLVariables = {
        limit: queryVariables.limit,
        offset: queryVariables.offset,
        where: whereCondition,
        orderBy
      }

      try {
        const result = await graphqlClient.request<{
          SalesActivity: any[]
          SalesActivityAggregate: { aggregate: { count: number } }
        }>(query, graphQLVariables)

        const mappedActivities = result.SalesActivity.map(toCustomerActivity)
        const total = result.SalesActivityAggregate?.aggregate?.count || 0

        return { activities: mappedActivities, total }
      } catch (error) {
        console.error('Error fetching recent activities:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchActivities }
}
