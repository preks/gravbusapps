import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface OpportunityStatusDistributionItem {
  status: 'Open' | 'Won' | 'Lost'
  count: number
  value: number
}

export interface OpportunityStatusDistributionConfig {
  opportunityAggregate: 'OpportunityAggregate' | 'InvestmentOpportunityAggregate'
  statusFilterField: 'code' | 'type'
  /** Additional raw GraphQL filter conditions applied to every bucket (e.g. 'dealType: {_eq: "INVESTMENT_DEAL"}') */
  additionalFilters?: string[]
}

interface AggregateResult {
  aggregate: { count: number; sum?: { estimatedAmount?: number | null } | null }
}

interface StatusDistributionResult {
  open: AggregateResult
  won: AggregateResult
  lost: AggregateResult
}

export const useOpportunityStatusDistribution = (accessToken: string, config: OpportunityStatusDistributionConfig) => {
  const [data, setData] = useState<OpportunityStatusDistributionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchStatusDistribution = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const sf = config.statusFilterField
        const extra = config.additionalFilters?.length ? `, ${config.additionalFilters.join(', ')}` : ''
        const query = `
          query GetOpportunityStatusDistribution {
            open: ${config.opportunityAggregate}(
              where: { isDeleted: {_eq: false}, opportunityStatus: {${sf}: {_nin: ["WON", "LOST"]}}${extra} }
            ) { aggregate { count sum { estimatedAmount } } }

            won: ${config.opportunityAggregate}(
              where: { isDeleted: {_eq: false}, opportunityStatus: {${sf}: {_eq: "WON"}}${extra} }
            ) { aggregate { count sum { estimatedAmount } } }

            lost: ${config.opportunityAggregate}(
              where: { isDeleted: {_eq: false}, opportunityStatus: {${sf}: {_eq: "LOST"}}${extra} }
            ) { aggregate { count sum { estimatedAmount } } }
          }
        `

        const result = await graphqlClient.request<StatusDistributionResult>(query)
        setData([
          {
            status: 'Open',
            count: result.open?.aggregate?.count || 0,
            value: result.open?.aggregate?.sum?.estimatedAmount || 0
          },
          {
            status: 'Won',
            count: result.won?.aggregate?.count || 0,
            value: result.won?.aggregate?.sum?.estimatedAmount || 0
          },
          {
            status: 'Lost',
            count: result.lost?.aggregate?.count || 0,
            value: result.lost?.aggregate?.sum?.estimatedAmount || 0
          }
        ])
      } catch (error) {
        console.error('Error fetching opportunity status distribution:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatusDistribution()
  }, [
    accessToken,
    graphqlClient,
    config.opportunityAggregate,
    config.statusFilterField,
    JSON.stringify(config.additionalFilters)
  ])

  return { data, isLoading }
}
