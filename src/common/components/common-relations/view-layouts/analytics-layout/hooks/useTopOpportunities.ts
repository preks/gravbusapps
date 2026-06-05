import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface TopOpportunity {
  id: string
  name: string
  value: number
  stage: string
  winChance: number
  owner: string
  currencyCode: string
}

interface OpportunityResponse {
  id: string
  name: string
  estimatedAmount?: number
  winningChance?: number
  currency?: { code: string }
  ownerEmployee?: {
    displayName?: string
    firstName?: string
    lastName?: string
  }
  [key: string]: any // For dynamic stage field names
}

/**
 * Shared hook for fetching top opportunities
 * Used by both CRM and IRM analytics modules
 *
 * @param accessToken - Authentication token
 * @param currencyCode - Optional currency code filter
 * @param entityName - Entity name ('Opportunity' for CRM, 'InvestmentOpportunity' for IRM)
 * @param stageFieldName - Stage field name ('salesPipelineStage' for CRM, 'opportunityPipelineStage' for IRM)
 * @param includeWinningChance - Whether to include winningChance field (CRM has it, IRM doesn't)
 * @param limit - Number of top opportunities to fetch (default: 5)
 */
export const useTopOpportunities = (
  accessToken: string,
  currencyCode?: string,
  entityName: 'Opportunity' | 'InvestmentOpportunity' = 'Opportunity',
  stageFieldName: 'salesPipelineStage' | 'opportunityPipelineStage' = 'salesPipelineStage',
  includeWinningChance = true,
  limit = 5
) => {
  const [data, setData] = useState<TopOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchTopOpportunities = async () => {
      if (!accessToken) return

      try {
        setIsLoading(true)
        const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''
        const winningChanceField = includeWinningChance ? 'winningChance' : ''

        const query = `
          query GetTopOpportunities {
            ${entityName}(
              where: { isDeleted: { _eq: false }${currencyFilter} }
              orderBy: { estimatedAmount: DESC }
              limit: ${limit}
            ) {
              id
              name
              estimatedAmount
              ${winningChanceField}
              ${stageFieldName} {
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

        const result = await graphqlClient.request<Record<string, OpportunityResponse[]>>(query)
        const topOpportunities = (result[entityName] || []).map((opp: OpportunityResponse) => ({
          id: opp.id,
          name: opp.name,
          value: opp.estimatedAmount || 0,
          stage: opp[stageFieldName]?.value || 'Unknown',
          winChance: opp.winningChance || 0,
          owner:
            opp.ownerEmployee?.displayName ||
            `${opp.ownerEmployee?.firstName} ${opp.ownerEmployee?.lastName}` ||
            'Unknown',
          currencyCode: opp.currency?.code || 'EUR'
        }))

        setData(topOpportunities)
      } catch (error) {
        console.error('Error fetching top opportunities:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopOpportunities()
  }, [accessToken, graphqlClient, currencyCode, entityName, stageFieldName, includeWinningChance, limit])

  return { data, isLoading }
}
