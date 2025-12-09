import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { generateTimePeriods, TimePeriod } from '@/common/utils/analytics/dateRangeUtils'

export type AccountsTimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface AccountsOverTimePoint {
  date: string
  count: number
  accountsCreated: number
  accountsWithOpportunities: number
  accountsActive: number
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

// Helper function to build active opportunity filter with date range
const buildActiveOpportunityFilter = (config: AccountsOverTimeConfig, cutoffDate: string): string => {
  if (config.isJunctionTable) {
    return `${config.opportunityRelation}: {opportunity: {isDeleted: {_eq: false}, updatedAt: {_gte: "${cutoffDate}"}}}`
  }
  if (config.isOpportunityRelationList) {
    return `${config.opportunityRelation}: {isDeleted: {_eq: false}, updatedAt: {_gte: "${cutoffDate}"}}`
  }
  return `${config.opportunityRelation}: {updatedAt: {_gte: "${cutoffDate}"}}`
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
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Generate time periods based on the selected filter
        const periods = generateTimePeriods(timeFilter)

        // Build aggregate queries for each period
        const periodAggregates = periods
          .map((period: TimePeriod, index: number) => {
            const ninetyDaysAgo = new Date(new Date(period.end).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
            return `
          # Accounts created in period ${index}
          accountsCreated_period${index}: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${period.start}", _lt: "${period.end}"}
            }
          ) { aggregate { count } }
          
          # Accounts with opportunities (cumulative up to period end)
          accountsWithOpportunities_period${index}: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_lt: "${period.end}"}
              ${buildOpportunityFilter(config)}
            }
          ) { aggregate { count } }
          
          # Active accounts (accounts with opportunities in the last 90 days from period end)
          accountsActive_period${index}: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_lt: "${period.end}"}
              ${buildActiveOpportunityFilter(config, ninetyDaysAgo)}
            }
          ) { aggregate { count } }
        `
          })
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
          const accountsActive = result[`accountsActive_period${index}`]?.aggregate?.count || 0

          return {
            date: period.start,
            count: accountsCreated, // For backward compatibility
            accountsCreated,
            accountsWithOpportunities,
            accountsActive
          }
        })

        setAccountsOverTime(transformedData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccountsOverTime()
  }, [accessToken, timeFilter, config.accountEntity, config.opportunityRelation])

  return { accountsOverTime, isLoading, error }
}
