import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface StakeVsAmountData {
  id: string
  company: string
  stake: number
  investmentAmount: number
}

/**
 * Build GraphQL query to fetch stake vs amount correlation data
 */
const BUILD_STAKE_VS_AMOUNT_QUERY = (currency: string): string => {
  return `
    query GetStakeVsAmountData {
      Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { stakePercentage: { _isNull: false } }
            { totalInvestmentAmount: { _gt: 0 } }
          ]
        }
      ) {
        id
        name
        code
        stakePercentage
        totalInvestmentAmount
      }
    }
  `
}

/**
 * Hook to fetch stake vs amount correlation data
 */
export const useGetStakeVsAmountData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchStakeVsAmountData = useCallback(
    async (currency: string): Promise<StakeVsAmountData[]> => {
      const result = await graphqlClient.request<{
        Investment: Array<{
          id: string
          name: string | null
          code: string | null
          stakePercentage: number | null
          totalInvestmentAmount: number | null
        }>
      }>(BUILD_STAKE_VS_AMOUNT_QUERY(currency))

      // Transform data
      const stakeVsAmountData: StakeVsAmountData[] = result.Investment.filter(
        inv => inv.stakePercentage && inv.totalInvestmentAmount
      ).map(inv => ({
        id: inv.id,
        company: inv.name || inv.code || 'Unknown',
        stake: inv.stakePercentage!,
        investmentAmount: inv.totalInvestmentAmount!
      }))

      return stakeVsAmountData
    },
    [graphqlClient]
  )

  return { fetchStakeVsAmountData }
}
