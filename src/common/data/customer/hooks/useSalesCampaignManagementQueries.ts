import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type {
  SalesCampaignQueryVariables,
  SalesCampaignWithCountResponse,
  SalesCampaignStatisticsResponse
} from '../types/salesCampaignManagementTypes'
import {
  GET_SALES_CAMPAIGNS_WITH_COUNT,
  GET_SALES_CAMPAIGN_STATISTICS
} from '../queries/salesCampaignManagementQueries'

export interface UseSalesCampaignQueriesProps {
  accessToken: string
}

export interface UseSalesCampaignQueriesReturn {
  fetchSalesCampaignsWithCount: (variables?: SalesCampaignQueryVariables) => Promise<SalesCampaignWithCountResponse>
  fetchSalesCampaignStatistics: () => Promise<SalesCampaignStatisticsResponse>
}

export const useSalesCampaignManagementQueries = ({
  accessToken
}: UseSalesCampaignQueriesProps): UseSalesCampaignQueriesReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchSalesCampaignsWithCount = useCallback(
    async (variables: SalesCampaignQueryVariables = {}): Promise<SalesCampaignWithCountResponse> => {
      const { query, variables: queryVariables } = GET_SALES_CAMPAIGNS_WITH_COUNT(variables)
      return graphqlClient.request<SalesCampaignWithCountResponse>(query, queryVariables)
    },
    [graphqlClient]
  )

  const fetchSalesCampaignStatistics = useCallback(async (): Promise<SalesCampaignStatisticsResponse> => {
    const query = GET_SALES_CAMPAIGN_STATISTICS()
    return graphqlClient.request<SalesCampaignStatisticsResponse>(query)
  }, [graphqlClient])

  return {
    fetchSalesCampaignsWithCount,
    fetchSalesCampaignStatistics
  }
}
