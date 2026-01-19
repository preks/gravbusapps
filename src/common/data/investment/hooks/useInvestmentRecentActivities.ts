/**
 * Hook for fetching recent activities for Personal Workspace Overview
 * Uses centralized query builders instead of hardcoded queries
 * Returns pure functions - state management handled by consumer
 */
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  buildInvestmentActivityQuery,
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy,
  type InvestmentActivityQueryVariables
} from '../queries/investmentActivityQueries'
import type { InvestmentActivity } from '../types/investmentActivityTypes'
import { toInvestmentActivity } from '../mappers/investmentRelatedEntityMappers'

export interface InvestmentRecentActivitiesVariables {
  employeeId: string
  limit?: number
  occurredAtFrom?: string
  occurredAtTo?: string
}

export interface InvestmentRecentActivitiesResult {
  activities: InvestmentActivity[]
  total: number
}

/**
 * Hook to fetch recent activities for a specific employee
 * Used in Personal Workspace Overview tab
 */
export const useInvestmentRecentActivities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchActivities = useCallback(
    async (variables: InvestmentRecentActivitiesVariables): Promise<InvestmentRecentActivitiesResult> => {
      const { employeeId, limit = 100, occurredAtFrom, occurredAtTo } = variables

      // Build query variables
      const queryVariables: InvestmentActivityQueryVariables = {
        ownerEmployeeIds: [employeeId],
        limit,
        offset: 0,
        orderBy: [{ field: 'occurredAt', direction: 'DESC_NULLS_LAST' }],
        occurredAtFrom,
        occurredAtTo
      }

      // Build query using central builders
      const query = buildInvestmentActivityQuery()
      const whereCondition = buildInvestmentActivityWhereCondition(queryVariables)
      const orderBy = buildInvestmentActivityOrderBy(queryVariables.orderBy || [])

      const graphQLVariables = {
        limit: queryVariables.limit,
        offset: queryVariables.offset,
        where: whereCondition,
        orderBy
      }

      try {
        const result = await graphqlClient.request<{
          InvestmentActivity: any[]
          InvestmentActivityAggregate: { aggregate: { count: number } }
        }>(query, graphQLVariables)

        const mappedActivities = result.InvestmentActivity.map(toInvestmentActivity)
        const total = result.InvestmentActivityAggregate?.aggregate?.count || 0

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
