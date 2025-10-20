import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { BaseInvestmentActivity, InvestmentActivity } from '../types'
import {
  GET_INVESTMENT_ACTIVITY_BY_ID,
  GET_INVESTMENT_ACTIVITIES,
  type InvestmentActivityQueryVariables
} from '../queries'
import { toInvestmentActivity } from '../mappers'

// Response interfaces
export interface InvestmentActivitiesQueryResponse {
  InvestmentActivity: BaseInvestmentActivity[]
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
      const query = GET_INVESTMENT_ACTIVITIES(variables)

      try {
        const result = await graphqlClient.request<InvestmentActivitiesQueryResponse>(query)

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
      const query = GET_INVESTMENT_ACTIVITY_BY_ID(id)

      try {
        const result = await graphqlClient.request<{ InvestmentActivity: BaseInvestmentActivity[] }>(query)
        const baseActivity = result.InvestmentActivity[0]

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
