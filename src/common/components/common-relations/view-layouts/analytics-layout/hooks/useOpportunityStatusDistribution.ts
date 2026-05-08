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
}

interface StatusDistributionResult {
  open: { aggregate: { count: number; sum?: { estimatedAmount?: number | null } | null } }
  won: { aggregate: { count: number; sum?: { estimatedAmount?: number | null } | null } }
  lost: { aggregate: { count: number; sum?: { estimatedAmount?: number | null } | null } }
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
        const statusField = config.statusFilterField
        const query = `
          query GetOpportunityStatusDistribution {
            open: ${config.opportunityAggregate}(
              where: {
                isDeleted: {_eq: false}
                opportunityStatus: {${statusField}: {_nin: ["WON", "LOST"]}}
              }
            ) {
              aggregate {
                count
                sum { estimatedAmount }
              }
            }

            won: ${config.opportunityAggregate}(
              where: {
                isDeleted: {_eq: false}
                opportunityStatus: {${statusField}: {_eq: "WON"}}
              }
            ) {
              aggregate {
                count
                sum { estimatedAmount }
              }
            }

            lost: ${config.opportunityAggregate}(
              where: {
                isDeleted: {_eq: false}
                opportunityStatus: {${statusField}: {_eq: "LOST"}}
              }
            ) {
              aggregate {
                count
                sum { estimatedAmount }
              }
            }
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
  }, [accessToken, graphqlClient, config.opportunityAggregate, config.statusFilterField])

  return { data, isLoading }
}
