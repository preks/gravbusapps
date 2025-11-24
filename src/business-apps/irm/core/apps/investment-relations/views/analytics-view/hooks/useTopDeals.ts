import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface TopDeal {
  id: string
  name: string
  value: number
  stage: string
  winChance: number
  owner: string
  currencyCode: string
}

export const useTopDeals = (accessToken: string, currencyCode?: string) => {
  const [data, setData] = useState<TopDeal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchTopDeals = async () => {
      if (!accessToken) return

      try {
        setIsLoading(true)
        const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

        const query = `
          query GetTopDeals {
            InvestmentOpportunity(
              where: { isDeleted: { _eq: false }${currencyFilter} }
              orderBy: { estimatedAmount: DESC }
              limit: 10
            ) {
              id
              name
              estimatedAmount
              opportunityPipelineStage {
                value
              }
              currency {
                code
              }
              ownerEmployee {
                firstName
                lastName
                displayName
              }
            }
          }
        `

        const result = await graphqlClient.request<any>(query)
        const topDeals = (result.InvestmentOpportunity || []).map((opp: any) => ({
          id: opp.id,
          name: opp.name,
          value: opp.estimatedAmount || 0,
          stage: opp.opportunityPipelineStage?.value || 'Unknown',
          winChance: 0, // Investment opportunities don't have winningChance
          owner:
            opp.ownerEmployee?.displayName ||
            `${opp.ownerEmployee?.firstName} ${opp.ownerEmployee?.lastName}` ||
            'Unknown',
          currencyCode: opp.currency?.code || 'EUR'
        }))

        setData(topDeals)
      } catch (error) {
        console.error('Error fetching top deals:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopDeals()
  }, [accessToken, graphqlClient, currencyCode])

  return { data, isLoading }
}
