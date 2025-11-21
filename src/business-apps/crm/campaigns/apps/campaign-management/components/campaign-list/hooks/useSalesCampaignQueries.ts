import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  SalesCampaignQueryVariables,
  SalesCampaignResponse,
  SalesCampaignWithCountResponse,
  SalesCampaignStatisticsResponse
} from '../types/SalesCampaignTypes'
import {
  GET_SALES_CAMPAIGNS,
  GET_SALES_CAMPAIGNS_WITH_COUNT,
  GET_SALES_CAMPAIGN_STATISTICS
} from '../queries/SalesCampaignQueries'

export interface UseSalesCampaignQueriesProps {
  accessToken: string
}

export interface UseSalesCampaignQueriesReturn {
  fetchSalesCampaigns: (variables?: SalesCampaignQueryVariables) => Promise<SalesCampaignResponse>
  fetchSalesCampaignsWithCount: (variables?: SalesCampaignQueryVariables) => Promise<SalesCampaignWithCountResponse>
  fetchSalesCampaignStatistics: () => Promise<SalesCampaignStatisticsResponse>
}

export const useSalesCampaignQueries = ({
  accessToken
}: UseSalesCampaignQueriesProps): UseSalesCampaignQueriesReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchSalesCampaigns = useCallback(
    async (variables: SalesCampaignQueryVariables = {}): Promise<SalesCampaignResponse> => {
      const { query, variables: queryVariables } = GET_SALES_CAMPAIGNS(variables)
      const result = await graphqlClient.request<SalesCampaignResponse>(query, queryVariables)
      return result
    },
    [graphqlClient]
  )

  const fetchSalesCampaignsWithCount = useCallback(
    async (variables: SalesCampaignQueryVariables = {}): Promise<SalesCampaignWithCountResponse> => {
      const { query, variables: queryVariables } = GET_SALES_CAMPAIGNS_WITH_COUNT(variables)
      const result = await graphqlClient.request<SalesCampaignWithCountResponse>(query, queryVariables)
      return result
    },
    [graphqlClient]
  )

  const fetchSalesCampaignStatistics = useCallback(async (): Promise<SalesCampaignStatisticsResponse> => {
    const query = GET_SALES_CAMPAIGN_STATISTICS()
    const result = await graphqlClient.request<SalesCampaignStatisticsResponse>(query)
    return result
  }, [graphqlClient])

  return {
    fetchSalesCampaigns,
    fetchSalesCampaignsWithCount,
    fetchSalesCampaignStatistics
  }
}
