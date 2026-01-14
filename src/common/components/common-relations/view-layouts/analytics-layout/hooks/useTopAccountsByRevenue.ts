import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface TopAccountData {
  id: string
  name: string
  industry: string
  totalValue: number
  wonOpportunities: number
}

interface TopAccountsConfig {
  accountEntity: string // "Account" | "InvestmentAccount"
  opportunityEntity: string // "Opportunity" | "InvestmentOpportunity"
  industryField: string // "industry" | "industryClass"
  opportunityRelation?: string // "opportunity" | "opportunityAccounts" (junction table for IRM)
  isJunctionTable?: boolean // true if using junction table (IRM uses opportunityAccounts)
  currencyCode?: string // Optional currency filter
}

/**
 * Dedicated hook for fetching top accounts by revenue
 * Separate from main accounts data so currency changes only refetch this section
 */
export const useTopAccountsByRevenue = (accessToken: string, config: TopAccountsConfig) => {
  const [data, setData] = useState<TopAccountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchTopAccounts = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Step 1: Get distinct account IDs with won opportunities
        // When using junction tables, need to navigate through the opportunity relationship
        const opportunityStatusFilter = config.isJunctionTable
          ? `${config.opportunityRelation || 'opportunity'}: {
              opportunity: {
                opportunityStatus: {code: {_eq: "WON"}}
              }
            }`
          : `${config.opportunityRelation || 'opportunity'}: {opportunityStatus: {code: {_eq: "WON"}}}`

        const accountIdsQuery = `
          query GetTopAccountIds {
            accounts: ${config.accountEntity}(
              where: {
                isDeleted: {_eq: false}
                ${opportunityStatusFilter}
              }
              distinctOn: [id]
            ) {
              id
              name
              ${config.industryField} {
                value
              }
            }
          }
        `

        const accountsResult = await graphqlClient.request<{
          accounts: Array<{
            id: string
            name: string
            [key: string]: any
          }>
        }>(accountIdsQuery)

        const accounts = accountsResult.accounts || []

        if (accounts.length === 0) {
          setData([])
          return
        }

        // Step 2: Get revenue aggregates with currency filter
        const currencyFilter = config.currencyCode ? `, currency: {code: {_eq: "${config.currencyCode}"}}` : ''

        const accountAggregates = accounts
          .map((account, index: number) => {
            // Build correct where condition based on junction table vs direct relationship
            const whereCondition = config.isJunctionTable
              ? `opportunityAccounts: { accountId: { _eq: "${account.id}" } }`
              : `accountId: { _eq: "${account.id}" }`

            return `
            acc_${index}_revenue: ${config.opportunityEntity}Aggregate(
              where: {
                isDeleted: {_eq: false}
                ${whereCondition}
                opportunityStatus: {code: {_eq: "WON"}}${currencyFilter}
              }
            ) {
              aggregate {
                sum { estimatedAmount }
                count
              }
            }
          `
          })
          .join('\n')

        const revenueQuery = `
          query GetAccountRevenueAggregates {
            ${accountAggregates}
          }
        `

        const revenueResult = await graphqlClient.request(revenueQuery)

        // Combine and sort by revenue
        const topAccounts = accounts
          .map((account, index: number) => {
            const revenue = revenueResult[`acc_${index}_revenue`]?.aggregate?.sum?.estimatedAmount || 0
            const wonCount = revenueResult[`acc_${index}_revenue`]?.aggregate?.count || 0

            return {
              id: account.id,
              name: account.name,
              industry: account[config.industryField]?.value || 'Unknown',
              totalValue: revenue,
              wonOpportunities: wonCount
            }
          })
          .filter(acc => acc.totalValue > 0) // Only accounts with revenue in selected currency
          .sort((a, b) => b.totalValue - a.totalValue)
          .slice(0, 5)

        setData(topAccounts)
      } catch (err) {
        console.error('Error fetching top accounts by revenue:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTopAccounts()
  }, [accessToken, config.accountEntity, config.opportunityEntity, config.currencyCode]) // Only refetch on currency change

  return { data, isLoading, error }
}
