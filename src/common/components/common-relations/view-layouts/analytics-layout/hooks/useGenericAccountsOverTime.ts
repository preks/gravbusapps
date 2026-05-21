import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { generateTimePeriods, TimePeriod } from '@/common/utils/analytics/dateRangeUtils'

export type AccountsTimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface AccountsOverTimePoint {
  date: string
  endDate: string
  count: number
  accountsCreated: number
  accountsWithOpportunities: number
}

export interface AccountsOverTimeConfig {
  accountEntity: string // "Account" | "InvestmentAccount"
  opportunityRelation: string // "opportunity" | "opportunityAccounts" (junction table for IRM)
  isOpportunityRelationList?: boolean // true for IRM (list relationship), false for CRM (singular)
  isJunctionTable?: boolean // true if using junction table (IRM uses opportunityAccounts)
}

// Helper function to build opportunity filter based on configuration
const buildOpportunityFilter = (config: AccountsOverTimeConfig): string => {
  if (config.isJunctionTable) {
    return `${config.opportunityRelation}: {opportunity: {isDeleted: {_eq: false}}}`
  }
  if (config.isOpportunityRelationList) {
    return `${config.opportunityRelation}: {isDeleted: {_eq: false}}`
  }
  return `${config.opportunityRelation}: {id: {_isNull: false}}`
}

/**
 * Generic hook for fetching accounts lifecycle chart data
 * Configurable for both CRM and IRM modules
 */
export const useGenericAccountsOverTime = (
  accessToken: string,
  config: AccountsOverTimeConfig,
  timeFilter: AccountsTimeFilter = 'quarter'
) => {
  const [accountsOverTime, setAccountsOverTime] = useState<AccountsOverTimePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchAccountsOverTime = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Generate time periods based on the selected filter
        const periods = generateTimePeriods(timeFilter)

        // Build aggregate queries for each period
        const periodAggregates = periods
          .map(
            (period: TimePeriod, index: number) => `
          # Accounts created in period ${index}
          accountsCreated_period${index}: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
            }
          ) { aggregate { count } }
          
          # Accounts with opportunities created in this period
          accountsWithOpportunities_period${index}: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
              ${buildOpportunityFilter(config)}
            }
          ) { aggregate { count } }
        `
          )
          .join('\n')

        const query = `
          query GetAccountsOverTime {
            ${periodAggregates}
          }
        `

        const result = await graphqlClient.request(query)

        // Transform result into AccountsOverTimePoint array
        const transformedData: AccountsOverTimePoint[] = periods.map((period: TimePeriod, index: number) => {
          const accountsCreated = result[`accountsCreated_period${index}`]?.aggregate?.count || 0
          const accountsWithOpportunities = result[`accountsWithOpportunities_period${index}`]?.aggregate?.count || 0

          return {
            date: period.start,
            endDate: period.end,
            count: accountsCreated,
            accountsCreated,
            accountsWithOpportunities
          }
        })

        setAccountsOverTime(transformedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchAccountsOverTime()
    }
  }, [accessToken, timeFilter, config.accountEntity, config.opportunityRelation])

  return { accountsOverTime, isLoading, error }
}
