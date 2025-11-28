import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_INVESTMENT_ACTIVITIES_BY_INVESTMENT_ID } from '@/common/data/investment/queries/investmentQueries'
import type { BaseInvestmentActivity, InvestmentActivity } from '@/common/data/investment/types/investmentActivityTypes'
import { toInvestmentActivity } from '@/common/data/investment/mappers/investmentRelatedEntityMappers'

interface InvestmentActivitiesByInvestmentIdResponse {
  InvestmentActivity: BaseInvestmentActivity[]
}

export const useGetInvestmentActivitiesByInvestmentId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentActivitiesByInvestmentId = useCallback(
    async (investmentId: string): Promise<InvestmentActivity[]> => {
      const query = GET_INVESTMENT_ACTIVITIES_BY_INVESTMENT_ID(investmentId)

      try {
        const result = await graphqlClient.request<InvestmentActivitiesByInvestmentIdResponse>(query)
        // Transform base types to enhanced types using mapper
        return result.InvestmentActivity.map(toInvestmentActivity)
      } catch (error) {
        console.error('Error fetching investment activities by investment ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentActivitiesByInvestmentId }
}
