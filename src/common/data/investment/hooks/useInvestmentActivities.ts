import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentActivity } from '../types/investmentActivityTypes'
import {
  buildInvestmentActivityQuery,
  buildInvestmentActivityByIdQuery,
  buildInvestmentActivityWhereCondition,
  buildInvestmentActivityOrderBy,
  type InvestmentActivityQueryVariables
} from '../queries/investmentActivityQueries'
import { toInvestmentActivity } from '../mappers/investmentRelatedEntityMappers'

// Response interfaces
export interface InvestmentActivitiesQueryResponse {
  InvestmentActivity: InvestmentActivity[]
  InvestmentActivityAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface InvestmentActivityByIdData {
  activity?: InvestmentActivity
}

// Hook for getting investment activities with filtering
export const useGetInvestmentActivities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentActivities = useCallback(
    async (variables: InvestmentActivityQueryVariables = {}) => {
      // Use new query builder with fields mapping
      const query = buildInvestmentActivityQuery()

      // Use variables directly (no conversion needed)
      const queryVariables: InvestmentActivityQueryVariables = {
        ...variables
      }

      // Use new WHERE/ORDER BY builders with fields mapping
      const whereCondition = buildInvestmentActivityWhereCondition(queryVariables)
      const orderBy = buildInvestmentActivityOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentActivitiesQueryResponse>(query, graphQLVariables)

        // Transform base types to enhanced types using mapper
        const enhancedActivities = result.InvestmentActivity.map(toInvestmentActivity)

        return {
          ...result,
          InvestmentActivity: enhancedActivities
        }
      } catch (error) {
        console.error('Error fetching investment activities:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentActivities }
}

// Hook for getting investment activity by ID
export const useGetInvestmentActivityById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentActivityById = useCallback(
    async (id: string) => {
      // Use new query builder with fields mapping
      const query = buildInvestmentActivityByIdQuery(undefined, id)

      try {
        const result = await graphqlClient.request<{ InvestmentActivityByPk: InvestmentActivity }>(query)
        const baseActivity = result.InvestmentActivityByPk

        return {
          activity: baseActivity ? toInvestmentActivity(baseActivity) : undefined
        } as InvestmentActivityByIdData
      } catch (error) {
        console.error('Error fetching investment activity by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentActivityById }
}
